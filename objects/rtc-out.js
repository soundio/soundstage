import Signal        from 'fn/signal.js';
import Stream        from 'fn/stream/stream.js';
import StageObject   from '../modules/stage-object.js';
import RTCDistributor from '../modules/object/rtc-distributor.js';
import signaling     from '../modules/webrtc-signaling.js';

const assign = Object.assign;
const define = Object.defineProperties;

/**
RTCOut()
WebRTC sender for Soundstage events
**/

export default class RTCOut extends StageObject {
    #peerConnections = {};
    #dataChannels = {};
    #pendingCandidates = {};
    #activeConnection = null;
    #connectionAttempted = false;
    
    constructor(transport, settings = {}) {
        const inputs  = { size: 1 };
        const outputs = { size: 0 };

        super(transport, inputs, outputs, settings);
        
        // Join signaling room
        this.roomId = settings.roomId || 'soundstage-default';
        signaling.joinRoom(this.roomId);
        
        // Set up listeners for signaling events
        signaling.onAnswer((peerId, answer) => {
            this._handleAnswer(peerId, answer);
        });
        
        signaling.onCandidate((peerId, candidate) => {
            this._handleCandidate(peerId, candidate);
        });
        
        // Automatically try to establish connection
        setTimeout(() => this._autoConnect(), 500);
    }
    
    // Auto-connect to peers
    async _autoConnect() {
        if (this.#connectionAttempted) return;
        this.#connectionAttempted = true;
        
        try {
            const offer = await this._createOffer();
            signaling.sendOffer(offer);
        } catch (error) {
            console.error('Error auto-connecting:', error);
        }
    }
    
    // Handle incoming answers
    async _handleAnswer(peerId, answer) {
        try {
            await this._acceptAnswer(peerId, answer);
        } catch (error) {
            console.error('Error handling answer:', error);
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
    
    // Create an offer
    async _createOffer() {
        const peerId = signaling.peerId;
        const channelId = 'soundstage-events';
        
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
            
            // Create data channel
            const dataChannel = peerConnection.createDataChannel(channelId);
            
            dataChannel.onopen = () => {
                this.#activeConnection = peerConnection;
                
                // Assign channel to input distributor
                const inputs = StageObject.getInputs(this);
                if (inputs[0] && inputs[0] instanceof RTCDistributor) {
                    inputs[0].dataChannel = dataChannel;
                }
            };
            
            this.#peerConnections[peerId] = peerConnection;
            this.#dataChannels[channelId] = dataChannel;
        }
        
        const peerConnection = this.#peerConnections[peerId];
        
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            return offer;
        } catch (error) {
            console.error('Error creating offer:', error);
            return null;
        }
    }
    
    // Accept an answer
    async _acceptAnswer(peerId, answer) {
        const peerConnection = this.#peerConnections[peerId];
        if (!peerConnection) return;
        
        try {
            if (peerConnection.signalingState !== 'have-local-offer') {
                console.log('Cannot accept answer in current state, ignoring');
                return;
            }
            
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            
            // Apply any pending candidates
            if (this.#pendingCandidates[peerId]) {
                const candidates = this.#pendingCandidates[peerId];
                this.#pendingCandidates[peerId] = [];
                
                for (const candidate of candidates) {
                    await peerConnection.addIceCandidate(candidate);
                }
            }
        } catch (error) {
            console.error('Error accepting answer:', error);
        }
    }
    
    input(n = 0) {
        const inputs = StageObject.getInputs(this);
        
        if (n >= inputs.size) {
            throw new Error('RTCOut attempt to get .input(' + n + '), object has ' + inputs.size + ' inputs');
        }
        
        // Create a new RTCDistributor if it doesn't exist
        if (!inputs[n]) {
            const distributor = new RTCDistributor(this.#activeConnection);
            inputs[n] = assign(distributor, { object: this });
            
            // If we already have data channels, connect them
            for (const channelId in this.#dataChannels) {
                const dataChannel = this.#dataChannels[channelId];
                if (dataChannel.readyState === 'open') {
                    distributor.dataChannel = dataChannel;
                    break; // Just use the first open channel
                }
            }
        }
        
        return inputs[n];
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