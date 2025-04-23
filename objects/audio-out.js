
import Data        from 'fn/data.js';
import GraphObject from '../modules/graph-object.js';

const define = Object.defineProperties;

const graph = {
    nodes: {
        input:  { type: 'channel-merger', data: { numberOfInputs: 2 } },
        meter:  { type: 'meter' }
    },

    connections: [
        'input', 'meter',
    ]
};

export default class AudioOut extends GraphObject {
    constructor(transport) {
        const destination = transport.context.destination;

        // Set channel merger inputs to number of destination channels
        graph.nodes.input.data.numberOfInputs = destination.channelCount;

        // Set up graph
        super(transport, graph, 0, 0);
        this.get('input').connect(destination);

        define(this, {
            blob:       { writable: true },
            recordings: { value: [] },
            recorder:   { writable: true }
        });
    }

    record() {
        // Recorder chunks
        const chunks = [];

        // Media stream
        const stream = new MediaStreamAudioDestinationNode(this.transport.context);
        this.get('input').connect(stream);

        // Use MediaRecorder for MP4/AAC encoding
        Data.of(this).recorder = new MediaRecorder(stream.stream, {
            mimeType: 'audio/mp4',
            audioBitsPerSecond: 192000
        });

        this.recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        this.promise = new Promise((resolve, reject) => {
            this.recorder.onstop = () => {
                try {
                    resolve(new Blob(chunks, { type: 'audio/mp4' }));
                } catch (error) {
                    reject(error);
                }
            };
        });

        // Start the recording
        this.recorder.start();
        return this.recorder;
    }

    stop() {
        if (!this.recorder) return;

        // Stop recording
        this.recorder.stop();
        Data.of(this).recorder = undefined;
        return this.promise;
    }
}
