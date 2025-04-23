import Signal         from 'fn/signal.js';
import Stream         from 'fn/stream/stream.js';
import StageObject    from '../modules/stage-object.js';
import Events         from '../modules/events.js';
import RTCDistributor from '../modules/object/rtc-distributor.js';

const assign = Object.assign;
const define = Object.defineProperties;

/**
RTCOut()
Transmits Soundstage events over a WebRTC peer connection.
**/

// Same convention as MIDIOut
const names = Array.from({ length: 16 }, (n, i) => 'Channel ' + (i + 1));

function updateInputs(inputs, connection) {
    let i;
    for (i in inputs) {
        if (!/^\d/.test(i)) continue;
        inputs[i].connection = connection;
    }
}

// RTCDistributor is now imported from ../modules/object/rtc-distributor.js

export default class RTCOut extends StageObject {
    #connections = {};
    #connection;
    #connectionId;
    #peerConnections = {};
    #dataChannels = {};

    constructor(transport, settings = {}) {
        const inputs  = { size: 16, names };
        const outputs = { size: 0 };

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
            console.log(`RTCOut: ICE connection state changed to ${peerConnection.iceConnectionState}`);
        };

        peerConnection.onconnectionstatechange = () => {
            console.log(`RTCOut: Connection state changed to ${peerConnection.connectionState}`);

            if (peerConnection.connectionState === 'connected') {
                this.#connection = peerConnection;
                this.#connectionId = id;

                const inputs = StageObject.getInputs(this);
                updateInputs(inputs, peerConnection);
            }
        };

        this.#peerConnections[id] = peerConnection;
        return peerConnection;
    }

    // Create a data channel for sending events
    createDataChannel(id, channelId = 'soundstage-events') {
        const peerConnection = this._getPeerConnection(id);

        try {
            const dataChannel = peerConnection.createDataChannel(channelId);

            dataChannel.onopen = () => {
                console.log(`RTCOut: Data channel '${dataChannel.label}' opened`);
                // Update all inputs to use this channel
                const inputs = StageObject.getInputs(this);
                for (let i = 0; i < inputs.size; i++) {
                    if (inputs[i] && inputs[i] instanceof RTCDistributor) {
                        inputs[i].dataChannel = dataChannel;
                    }
                }
            };

            dataChannel.onclose = () => {
                console.log(`RTCOut: Data channel '${dataChannel.label}' closed`);
                // Remove channel from inputs
                const inputs = StageObject.getInputs(this);
                for (let i = 0; i < inputs.size; i++) {
                    if (inputs[i] && inputs[i] instanceof RTCDistributor) {
                        inputs[i].dataChannel = null;
                    }
                }
            };

            this.#dataChannels[channelId] = dataChannel;
            return dataChannel;
        } catch (error) {
            console.error('RTCOut: Error creating data channel', error);
            throw error;
        }
    }

    // Method to connect to a peer (creates an offer)
    async connect(id, channelId = 'soundstage-events') {
        const dataChannel = this.createDataChannel(id, channelId);
        const peerConnection = this._getPeerConnection(id);

        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            return offer;
        } catch (error) {
            console.error('RTCOut: Error creating offer', error);
            throw error;
        }
    }

    // Method to accept an answer
    async acceptAnswer(id, answer) {
        const peerConnection = this._getPeerConnection(id);

        try {
            const rtcAnswer = new RTCSessionDescription(answer);
            await peerConnection.setRemoteDescription(rtcAnswer);
            console.log('RTCOut: Answer set as remote description');
        } catch (error) {
            console.error('RTCOut: Error accepting answer', error);
            throw error;
        }
    }

    // Method to add an ICE candidate
    async addIceCandidate(id, candidate) {
        const peerConnection = this._getPeerConnection(id);

        try {
            await peerConnection.addIceCandidate(candidate);
            console.log('RTCOut: Added ICE candidate');
        } catch (error) {
            console.error('RTCOut: Error adding ICE candidate', error);
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
            console.error('RTCOut: Error accepting offer', error);
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
        const inputs = StageObject.getInputs(this);
        updateInputs(inputs, this.#connection);
    }

    input(n = 0) {
        const inputs = StageObject.getInputs(this);

        if (n >= inputs.size) {
            throw new Error('StageObject attempt to get .input(' + n + '), object has ' + inputs.size + ' inputs');
        }

        // Create a new RTCDistributor if it doesn't exist
        return inputs[n] || (inputs[n] = assign(
            new RTCDistributor(this.#connection, n + 1),
            { object: this }
        ));
    }
};

define(RTCOut.prototype, {
    connection: { enumerable: true }
});
