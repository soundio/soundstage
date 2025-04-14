
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
import StageObject          from '../modules/object.js';
import { timeAtDomTime, domTimeAtTime, getPerformanceLatency } from '../modules/context.js';
import { TYPEBITS }         from '../modules/events/address.js';
import Events               from '../modules/events.js';

const assign = Object.assign;

const createEvent = overload((time, message) => (message[0] >> 4), {
    // Event time, address, value1, value2
    // noteoff
    8: (time, message) => Events.event(time, 'stop', message[1], int7ToFloat(message[2])),
    // noteon
    9: (time, message) => message[2] === 0 ?
        // Velocity 0, really a noteoff
        Events.event(time, 'stop', message[1], 0) :
        // Velocity > 0, noteon
        Events.event(time, 'start', message[1], int7ToFloat(message[2])) ,
    // TODO polytouch
    10: noop,
    // Control messages - Soundstage event names correspond to MIDI control
    // names for those in the first 128 that have standard names so we pass
    // message[1] in directly as the event name, shifted left by TYPEBITS
    11: overload((time, message) => message[1], {
        // Balance and pan must be in the range -1 to 1, with MIDI 64 weighted to 0
        [Events.NAMENUMBERS.balance]: (time, message) => Events.event(time, message[1] << TYPEBITS, int7ToSignedFloat(message[2])),
        [Events.NAMENUMBERS.pan]:     (time, message) => Events.event(time, message[1] << TYPEBITS, int7ToSignedFloat(message[2])),
        // Other controllers coerced to range 0 to 1
        default: (time, message) => Events.event(time, message[1] << TYPEBITS, int7ToFloat(message[2]))
    }),
    // program
    12: noop,
    // TODO channeltouch
    13: noop,
    // pitch
    14: (time, message) => Events.event(time, 'pitch', toSignedFloat(message)),
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
    constructor(transport, settings = {}) {
        const ports   = {};
        const inputs  = { size: 0 };
        const outputs = { size: 16, names };

        super(inputs, outputs);

        this.context = transport.context;
        this.data    = Data.of(settings);

        Signal.tick(() => {
            const id = this.data.port;
            this.port = ports[id];
            updateOutputs(this.inputs, this.port);
        });

        MIDIInputs.each((port) => {
            ports[port.id] = port;
            if (this.data.id === port.id) {
                this.port = port;
                updateOutputs(this.outputs, this.port);
            }
        });
    }

    output(n = 0) {
        if (n >= this.outputs.size) {
            throw new Error('StageObject attempt to get .output(' + n + '), object has ' + this.outputs.size + ' outputs');
        }

        const context = this.context;
        const outputs = this.outputs;
        return outputs[n] || (outputs[n] = assign(
            MIDIEvents({ channel: n + 1 }).map((e) => toEvent(context, e)),
            { object: this }
        ));
    }
};
