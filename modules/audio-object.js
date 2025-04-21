
/**
AudioObject(transport, inputs = 1, outputs = 0)
Intended to be subclassed, `AudioObject` provides `.connect()`, `.disconnect()`
and `AudioObject.getConnections(object)` which returns an array of tracked
connections.
**/

import StageObject from './stage-object.js';

const define = Object.defineProperties;

export default class AudioObject extends StageObject {
    #connections = [];

    constructor(transport, inputs = 1, outputs = 0) {
        // Events inputs and outputs
        super(inputs, outputs);

        // Attach transport
        define(this, { transport: { value: transport } });
    }

    /**
    .connect(object, outputName = 0, inputName = 0)
    Connects this audio object to another audio object and registers the
    connection in the tracking graph.
    **/
    connect(object, outputName = 0, inputName = 0) {
        // First, check if we implement the audio connection using get()
        if (!object.get) throw new Error('AudioObject attempt to connect to object ' + object.id + ' with no .get()');

        const outputNode = this.get('output');
        if (!outputNode) throw new Error('AudioObject.connect() attempt to connect object ' + this.id + ' with no audio outputs');

        const inputNode = object.get('input');
        if (!inputNode) throw new Error('AudioObject.connect() attempt to connect to object ' + object.id + ' with no audio inputs');

        // Make the actual audio connection
        outputNode.connect(inputNode, outputName, inputName);

        // Track the audio connection
        const connections = this.#connections;
        connections.push(this.id, outputName, object.id, inputName);
        return this;
    }

    /**
    .disconnect(object, outputName = 0, inputName = 0)
    Disconnects this audio object from another audio object and removes the
    connection from the tracking graph.
    **/
    disconnect(object, outputName = 0, inputName = 0) {
        // First, check if we implement the audio disconnection using get()
        if (!object.get) throw new Error('AudioObject attempt to disconnect object ' + object.id + ' with no .get()');

        const outputNode = this.get('output');
        if (!outputNode) throw new Error('AudioObject.disconnect() attempt to disconnect from object ' + this.id + ' with no audio outputs');

        const inputNode = object.get ? object.get('input') : null;
        if (!inputNode) throw new Error('AudioObject.disconnect() attempt to disconnect object ' + object.id + ' with no audio inputs');

        // Make the actual audio disconnection
        outputNode.disconnect(inputNode, outputName, inputName);

        // Always untrack the connection in our model
        const connections = this.#connections;
        let c = connections.length;
        while (connections[c -= 4]) {
            if (connections[c] === this.id
                && connections[c + 2] === object.id
                && connections[c + 1] === outputName
                && connections[c + 3] === inputName
            ) {
                connections.splice(c, 4);
            }
        }

        return this;
    }

    /** .get must be overridden by a sub-class **/
    get() {}

    /**
    AudioObject.getConnections(object)
    Get audio connections array for an object.
    **/
    static getConnections(object) {
        return object instanceof AudioObject ?
            object.#connections :
            undefined ;
    }
}
