
import { Distribute } from './distribute.js';
import Sequence from './sequence.js';

const assign = Object.assign;
const define = Object.defineProperties;
const seal   = Object.seal;

const properties = {
    graph:             { writable: true },
    record:            { writable: true },
    recordDestination: { writable: true },
    recordCount:       { writable: true, value: 0 }
};

export default function Node(graph, type, id, object) {
    define(this, properties);

    this.graph = graph;
    this.id    = id;
    this.type  = type;
    this.data  = object;
    this.distribute = Distribute(object);

    seal(this);
}

assign(Node.prototype, {
    automate: function(time, type) {
        this.distribute.apply(null, arguments);

        if (this.record) {
            if (!this.recordDestination) {
                const data = {
                    id: this.id + '-take-' + (this.recordCount++),
                    events: []
                };

                this.recordDestination = (new Sequence(this.graph, data)).start(time);
                this.graph.sequences.push(data);
                this.graph.record(time, 'sequence', data.id, this.id, arguments[4]);
            }

            this.recordDestination.record.apply(this.recordDestination, arguments);
        }
    }
})
