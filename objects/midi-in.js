
import Data                 from 'fn/data.js';
import get                  from 'fn/get.js';
import noop                 from 'fn/noop.js';
import overload             from 'fn/overload.js';
import Signal               from 'fn/signal.js';
import { int7ToFloat, int7ToSignedFloat } from 'midi/bytes.js';
import { toRootName, toNoteName, frequencyToFloat } from 'midi/note.js';
import { isNoteOn, isControl, toChannel, toSignedFloat } from 'midi/message.js';
import { MIDIInputs }       from 'midi/ports.js';
import MIDIEvents           from 'midi/events.js';
import StageObject          from '../modules/stage-object.js';
import { timeAtDomTime, domTimeAtTime, getPerformanceLatency } from '../modules/context.js';
import { TYPEBITS }         from '../modules/events/address.js';
import Events               from '../modules/events.js';

const assign = Object.assign;
const define = Object.defineProperties;

const createEvent = overload((time, message) => (message[0] >> 4), {
    // Event time, name, type, value1, value2
    // noteoff
    8: (time, message) => Events.event(time, 'stop', 0, message[1], int7ToFloat(message[2])),
    // noteon
    9: (time, message) => message[2] === 0 ?
        // Velocity 0, really a noteoff
        Events.event(time, 'stop', 0, message[1], 0) :
        // Velocity > 0, noteon
        Events.event(time, 'start', 0, message[1], int7ToFloat(message[2])) ,
    // TODO polytouch
    10: noop,
    // Control messages - Soundstage event names correspond to MIDI control
    // names for those in the first 128 that have standard names
    11: overload((time, message) => message[1], {
        // Balance and pan must be in the range -1 to 1, with MIDI 64 weighted to 0
        [Events.NAMENUMBERS.balance]: (time, message) => Events.event(time, message[1], 0, int7ToSignedFloat(message[2]), 0),
        [Events.NAMENUMBERS.pan]:     (time, message) => Events.event(time, message[1], 0, int7ToSignedFloat(message[2]), 0),
        // Other controllers coerced to range 0 to 1
        default: (time, message) => Events.event(time, message[1], 0, int7ToFloat(message[2]), 0)
    }),
    // program
    12: noop,
    // TODO channeltouch
    13: noop,
    // pitch
    14: (time, message) => Events.event(time, 'pitch', 0, toSignedFloat(message), 0),
    // polytouch
    default: (time, message) => console.log('Unhandled MIDI message', message)
});

function toEvent(context, e) {
    const time    = timeAtDomTime(context, e.timeStamp);
    const latency = getPerformanceLatency(context);
    const message = e.data;
    return createEvent(time + latency, message);
}

const names = Array.from({ length: 16 }, (n, i) => 'Channel ' + (i + 1));

function updateOutputs(outputs, port) {
    let i;
    for (i in outputs) {
        if (!/^\d/.test(i)) continue;
        outputs[i].port = port;
    }
}


/**
MIDIIn()
**/

export default class MIDIIn extends StageObject {
    #port;
    #portId;

    constructor(transport, settings = {}) {
        const ports   = {};
        const inputs  = { size: 0 };
        const outputs = { size: 16, names };

        super(transport, inputs, outputs, settings);
        define(this, { ports: { value: ports }});

        MIDIInputs.each((port) => {
            ports[port.id] = port;
            if (this.#portId === port.id) this.port = port.id;
        });
    }

    get port() {
        return this.#portId;
    }

    set port(id) {
        console.log('SET PORT', id);
        this.#portId = id;
        this.#port = this.ports[id];
        if (!this.#port) throw new Error('MIDIIn port "' + id + '" not in ports');
        const outputs = StageObject.getOutputs(this);
        updateOutputs(outputs, this.#port);
    }

    output(n = 0) {
        const outputs = StageObject.getOutputs(this);
        if (n >= outputs.size) {
            throw new Error('StageObject attempt to get .output(' + n + '), object has ' + this.outputs.size + ' outputs');
        }

        const context = this.transport.context;
        return outputs[n] || (outputs[n] = assign(
            MIDIEvents({ channel: n + 1 }).map((e) => toEvent(context, e)),
            { object: this }
        ));
    }
};

define(MIDIIn.prototype, {
    port: { enumerable: true }
});
