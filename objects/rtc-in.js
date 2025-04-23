import Signal      from 'fn/signal.js';
import Stream      from 'fn/stream/stream.js';
import StageObject from '../modules/stage-object.js';
import Events      from '../modules/events.js';

const assign = Object.assign;
const define = Object.defineProperties;

/**
RTCIn()
Accepts WebRTC peer connection data and converts it to Soundstage events.
**/

// Same convention as MIDIIn
const names = Array.from({ length: 16 }, (n, i) => 'Channel ' + (i + 1));

function updateOutputs(outputs, connection) {
    let i;
    for (i in outputs) {
        if (!/^\d/.test(i)) continue;
        outputs[i].connection = connection;
    }
}

export default class RTCIn extends StageObject {
    #connections = {};
    #connection;
    #connectionId;
    #peerConnections = {};
    #dataChannels = {};

    constructor(transport, settings = {}) {
        const inputs  = { size: 0 };
        const outputs = { size: 16, names };

        super(transport, inputs, outputs, settings);
    }

    // Create or get a peer connection
    _getPeerConnection(id) {
        if (this.#peerConnections[id]) {
            return this.#peerConnections[id];
        }

        // Create new RTCPeerConnection
        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        peerConnection.oniceconnectionstatechange = () => {
            console.log(`RTCIn: ICE connection state changed to ${peerConnection.iceConnectionState}`);
        };
        
        peerConnection.onconnectionstatechange = () => {
            console.log(`RTCIn: Connection state changed to ${peerConnection.connectionState}`);
            
            if (peerConnection.connectionState === 'connected') {
                this.#connection = peerConnection;
                this.#connectionId = id;
                
                const outputs = StageObject.getOutputs(this);
                updateOutputs(outputs, peerConnection);
            }
        };
        
        this.#peerConnections[id] = peerConnection;
        return peerConnection;
    }

    // Create a data channel for receiving events
    createDataChannel(id, channelId = 'soundstage-events') {
        const peerConnection = this._getPeerConnection(id);
        
        // Set up to handle incoming data channel
        peerConnection.ondatachannel = (event) => {
            const channel = event.channel;
            this.#dataChannels[channel.label] = channel;
            
            channel.onopen = () => {
                console.log(`RTCIn: Data channel '${channel.label}' opened`);
            };
            
            channel.onclose = () => {
                console.log(`RTCIn: Data channel '${channel.label}' closed`);
            };
            
            // Handle incoming messages - directly receive Soundstage event arrays
            channel.onmessage = (e) => {
                try {
                    // Parse the incoming event array
                    const data = JSON.parse(e.data);
                    
                    // Create a Soundstage event
                    const event = Events.event(
                        data[0],  // time
                        data[1],  // address
                        data[2],  // value1
                        data[3]   // value2
                    );
                    
                    // Pass the event to all outputs
                    const outputs = StageObject.getOutputs(this);
                    let n = -1;
                    while (outputs[++n]) {
                        outputs[n].push(event);
                    }
                } catch (error) {
                    console.error('RTCIn: Error processing message', error);
                }
            };
        };
        
        return peerConnection;
    }

    // Method to start listening (creates an offer)
    async listen(id, channelId = 'soundstage-events') {
        const peerConnection = this.createDataChannel(id, channelId);
        
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            return offer;
        } catch (error) {
            console.error('RTCIn: Error creating offer', error);
            throw error;
        }
    }

    // Method to accept an answer
    async acceptAnswer(id, answer) {
        const peerConnection = this._getPeerConnection(id);
        
        try {
            const rtcAnswer = new RTCSessionDescription(answer);
            await peerConnection.setRemoteDescription(rtcAnswer);
            console.log('RTCIn: Answer set as remote description');
        } catch (error) {
            console.error('RTCIn: Error accepting answer', error);
            throw error;
        }
    }

    // Method to add an ICE candidate
    async addIceCandidate(id, candidate) {
        const peerConnection = this._getPeerConnection(id);
        
        try {
            await peerConnection.addIceCandidate(candidate);
            console.log('RTCIn: Added ICE candidate');
        } catch (error) {
            console.error('RTCIn: Error adding ICE candidate', error);
            throw error;
        }
    }

    // Accept an offer and generate an answer
    async acceptOffer(id, offer) {
        const peerConnection = this._getPeerConnection(id);
        
        try {
            const rtcOffer = new RTCSessionDescription(offer);
            await peerConnection.setRemoteDescription(rtcOffer);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            return answer;
        } catch (error) {
            console.error('RTCIn: Error accepting offer', error);
            throw error;
        }
    }

    get connection() {
        return this.#connectionId;
    }

    set connection(id) {
        this.#connectionId = id;
        this.#connection = this.#peerConnections[id];
        if (!this.#connection) return;
        const outputs = StageObject.getOutputs(this);
        updateOutputs(outputs, this.#connection);
    }

    output(n = 0) {
        const outputs = StageObject.getOutputs(this);
        if (n >= outputs.size) {
            throw new Error('StageObject attempt to get .output(' + n + '), object has ' + outputs.size + ' outputs');
        }

        return outputs[n] || (outputs[n] = assign(
            Stream.of(),
            { object: this }
        ));
    }
};

define(RTCIn.prototype, {
    connection: { enumerable: true }
});