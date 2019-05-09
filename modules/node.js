
import { Privates } from '../../fn/module.js';
import { automate, isAudioParam } from './automate.js';
//import Sequence from './sequence.js';

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

    seal(this);
}

assign(Node.prototype, {
    automate: function(type, time, name, value, duration) {
        const privates = Privates(this.graph);

        //        if (this.record) {
        //            if (!this.recordDestination) {
        //                const data = {
        //                    id: this.id + '-take-' + (this.recordCount++),
        //                    events: []
        //                };
        //
        //                this.recordDestination = (new Sequence(this.graph, data)).start(time);
        //                this.graph.sequences.push(data);
        //                this.graph.record(time, 'sequence', data.id, this.id, arguments[4]);
        //            }
        //
        //            this.recordDestination.record.apply(this.recordDestination, arguments);
        //        }

        return typeof this.data[type] === 'function' ?
            this.data[type](time, name, value) :
        isAudioParam(this.data[type]) ?
            // param, time, curve, value, duration, notify, context
            automate(this.data[type], time, name, value, duration, privates.notify, this.data.context) :
        undefined ;
    },

    save: function() {
        return this.data.save && this.data.save()
        .map((record) => {
            record.nodeId = this.id;
            return record;
        });
    }
});
