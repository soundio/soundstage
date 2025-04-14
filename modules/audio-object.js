
import Graph       from '../modules/graph-3.js';
import StageObject from './object.js';

const define = Object.defineProperties;

export default class AudioObject extends StageObject {
    constructor(transport, graph) {
        // Events inputs and outputs
        super(1, 0);

        // Attach transport
        define(this, { transport: { value: transport } });

        // Mix in audio Graph
        if (graph) new Graph(transport.context, graph, this);
    }

    connect(inputObject, outputName = 0, inputName = 0) {
        //log('Connect', connections[c] + '-' + connections[c + 1] + ' to ' + connections[c + 2] + '-' + connections[c + 3]);

        const outputNode = this.node || Graph.get('output', this);
        if (!outputNode) throw new Error('Object.connect() attempt to connect object ' + this.id + ' with no audio outputs');

        const inputNode = inputObject.node || Graph.get('input', inputObject);
        if (!inputNode) throw new Error('Object.connect() attempt to connect to object ' + inputObject.id + ' with no audio inputs');

        // Keep record of connections
        outputNode.connect(inputNode, outputName, inputName);
        this.connections = this.connections || [];
        this.connections.push(this.id, outputName, inputObject.id, inputName);
    }

    disconnect(inputObject, outputName = 0, inputName = 0) {
        //log('Connect', connections[c] + '-' + connections[c + 1] + ' to ' + connections[c + 2] + '-' + connections[c + 3]);

        const outputNode = this.node || Graph.get('output', this);
        if (!outputNode) throw new Error('Object.connect() attempt to disconnect from object ' + this.id + ' with no audio outputs');

        const inputNode  = inputObject.node || Graph.get('input', inputObject);
        if (!inputNode) throw new Error('Object.connect() attempt to disconnect object ' + inputObject.id + ' with no audio inputs');

        // Keep record of connections
        outputNode.disconnect(inputNode, outputName, inputName);
        const connections = this.connections;

        // Cycle through connections and remove reference(s) to this connection
        let c = connections.length;
        while (connections[c -= 4]) if (connections[c] === this.id && connections[c + 2] === inputObject.id) {
            if (connections[c + 1] === outputName && connections[c + 3] === inputName) {
                connections.splice(c, 4);
            }
        }
    }

    destroy() {
        super.destroy();
        Graph.prototype.destroy.apply(this);
    }
}
