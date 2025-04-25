import Signal      from 'fn/signal.js';
import Stream      from 'fn/stream/stream.js';
import StageObject from '../modules/stage-object.js';
import Events      from '../modules/events.js';
import signaling   from '../modules/webrtc-signaling.js';

const assign = Object.assign;
const define = Object.defineProperties;

/**
RTCIn()
WebRTC receiver for Soundstage events
**/

export default class RTCIn extends StageObject {
    #peerConnections = {};
    #pendingCandidates = {};
    #activeConnection = null;
    
    constructor(transport, settings = {}) {
        const inputs  = { size: 0 };
        const outputs = { size: 1 };

        super(transport, inputs, outputs, settings);
        
        // Join signaling room
        this.roomId = settings.roomId || 'soundstage-default';
        signaling.joinRoom(this.roomId);
        
        // Set up listeners for signaling events
        signaling.onOffer((peerId, offer) => {
            this._handleOffer(peerId, offer);
        });
        
        signaling.onCandidate((peerId, candidate) => {
            this._handleCandidate(peerId, candidate);
        });
    }
    
    // Handle incoming offers
    async _handleOffer(peerId, offer) {
        try {
            const answer = await this._createAnswer(peerId, offer);
            if (answer) {
                signaling.sendAnswer(peerId, answer);
            }
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }
    
    // Handle ICE candidates
    async _handleCandidate(peerId, candidate) {
        const peerConnection = this.#peerConnections[peerId];
        
        if (peerConnection) {
            try {
                if (peerConnection.remoteDescription) {
                    await peerConnection.addIceCandidate(candidate);
                } else {
                    // Queue candidate if remote description isn't set yet
                    if (!this.#pendingCandidates[peerId]) {
                        this.#pendingCandidates[peerId] = [];
                    }
                    this.#pendingCandidates[peerId].push(candidate);
                }
            } catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
        }
    }
    
    // Create an answer for an offer
    async _createAnswer(peerId, offer) {
        // Create peer connection if it doesn't exist
        if (!this.#peerConnections[peerId]) {
            const peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            
            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    signaling.sendCandidate(peerId, event.candidate);
                }
            };
            
            // Set up data channel handler
            peerConnection.ondatachannel = (event) => {
                const channel = event.channel;
                
                channel.onopen = () => {
                    this.#activeConnection = peerConnection;
                };
                
                channel.onmessage = (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        // Create a Soundstage event
                        const event = Events.event(
                            data[0],  // time
                            data[1],  // address
                            data[2],  // value1
                            data[3]   // value2
                        );
                        
                        // Pass to outputs
                        const outputs = StageObject.getOutputs(this);
                        let n = -1;
                        while (outputs[++n]) {
                            outputs[n].push(event);
                        }
                    } catch (error) {
                        console.error('Error processing message:', error);
                    }
                };
            };
            
            this.#peerConnections[peerId] = peerConnection;
        }
        
        const peerConnection = this.#peerConnections[peerId];
        
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            
            // Apply any pending candidates
            if (this.#pendingCandidates[peerId]) {
                const candidates = this.#pendingCandidates[peerId];
                this.#pendingCandidates[peerId] = [];
                
                for (const candidate of candidates) {
                    await peerConnection.addIceCandidate(candidate);
                }
            }
            
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            return answer;
        } catch (error) {
            console.error('Error creating answer:', error);
            return null;
        }
    }
    
    output(n = 0) {
        const outputs = StageObject.getOutputs(this);
        if (n >= outputs.size) {
            throw new Error('RTCIn attempt to get .output(' + n + '), object has ' + outputs.size + ' outputs');
        }

        return outputs[n] || (outputs[n] = assign(
            Stream.of(),
            { object: this }
        ));
    }
    
    // Clean up on destruction
    destroy() {
        // Close all peer connections
        Object.values(this.#peerConnections).forEach(connection => {
            if (connection.connectionState !== 'closed') {
                connection.close();
            }
        });
        
        // Leave the signaling room
        signaling.leaveRoom();
        
        return super.destroy();
    }
};