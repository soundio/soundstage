
//import AudioObject from '../../context-object/modules/context-object.js';
import { printGroup, printGroupEnd, log } from './print.js';
import { Privates } from '../../fn/module.js';
import { assignSettingz__ } from '../modules/assign-settings.js';
import PlayNode  from './play-node.js';
import NodeGraph from './graph.js';

if (!NodeGraph.prototype.get) {
    throw new Error('NodeGraph is not fully formed?')
}

const DEBUG  = false; //window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

export const config = {
    tuning: 440
};

const graph = {
    nodes: [{
        id:   'output',
        type: 'tick',
        data: {
            channelInterpretation: 'speakers',
            channelCountMode: 'clamped-max',
            channelCount: 1
        }
    }],

    connections: [],

    params: { gain: 'output.gain' }
};

const defaults = {
    decay:     0.06,
    resonance: 22,
    gain:      0.25,

    tick: [72, 1,   0.03125],
    tock: [64, 0.6, 0.03125],
    events: [
        [0,  'tick'],
        [1,  'tock'],
        [2,  'tock'],
        [3,  'tock'],
        [4,  'tock'],
        [5,  'tock'],
        [6,  'tock'],
        [7,  'tock'],
        [8,  'tock'],
        [9,  'tock'],
        [10, 'tock'],
        [11, 'tock'],
        [12, 'tock']
    ]
};

const properties = {
    "tick":   { enumerable: true, writable: true },
    "tock":   { enumerable: true, writable: true },
    "events": { enumerable: true, writable: true },

    "resonance": {
        get: function() { return this.get('output').resonance; },
        set: function(value) { this.get('output').resonance = value; }
    },

    "decay": {
        get: function() { return this.get('output').decay; },
        set: function(value) { this.get('output').decay = value; }
    }
};

const events = [];

function Event(b1, beat, type) {
    // A cheap object pool
    const event = events.find((event) => event[0] < b1);

    if (event) {
        event[0] = beat;
        event[1] = type;
        return event;
    }

    this[0] = beat;
    this[1] = type;
    events.push(this);
}

function fillEventsBuffer(transport, events, buffer, frame) {
    const b1   = frame.b1;
    const b2   = frame.b2;
    const bar1 = transport.barAtBeat(b1);
    const bar2 = transport.barAtBeat(b2);

    let bar      = bar1;
    let bar1Beat = transport.beatAtBar(bar1);
    let localB1  = b1 - bar1Beat;
    let localB2, bar2Beat;
    let n = -1;

    //console.log('FRAME events', bar, localB1, events.length);
    buffer.length = 0;

    // Ignore events before b1
    while (++n < events.length && events[n][0] < localB1);
    --n;

    // Cycle through bars if there are whole bars left
    while (bar < bar2) {
        bar2Beat = transport.beatAtBar(bar + 1);
        localB2  = bar2Beat - bar1Beat;

        while (++n < events.length && events[n][0] < localB2) {
            //events[n].time = transport.timeAtBeat(events[n][0] + bar1Beat);
            buffer.push(new Event(b1, bar1Beat + events[n][0], events[n][1]));
        }

        bar += 1;
        n = -1;
        bar1Beat = bar2Beat;
    }

    // Cycle through final, partial bar
    localB2  = b2 - bar1Beat;

    while (++n < events.length && events[n][0] < localB2) {
        //console.log('timeAtBeat', events[n][0], bar1Beat)
        //events[n].time = transport.timeAtBeat(bar1Beat + events[n][0]);
        buffer.push(new Event(b1, bar1Beat + events[n][0], events[n][1]));
    }

    if (DEBUG && buffer.length) { log('frame', frame.t1.toFixed(3) + '–' + frame.t2.toFixed(3) + 's (' + frame.b1.toFixed(3) + '–' + frame.b2.toFixed(3) + 'b)', buffer.length, buffer.map((e) => { return e[0].toFixed(3) + 'b ' + e[1]; }).join(', ')); }

    return buffer;
}

export default function Metronome(context, settings, transport) {
    if (DEBUG) { printGroup('Metronome'); }
    if (!transport.sequence) { throw new Error('Metronome requires access to transport.'); }

    // Graph
    NodeGraph.call(this, context, graph);
    const voice = this.get('output');

    // Private
    const privates = Privates(this);
    privates.voice = voice;
    privates.transport = transport;

    // Properties
    define(this, properties);

    // Params
    this.gain = voice.gain;

    // Update settings
    assignSettingz__(this, assign({}, defaults, settings));

    if (DEBUG) { printGroupEnd(); }
}

assign(Metronome.prototype, PlayNode.prototype, NodeGraph.prototype, {
    start: function(time) {
        const privates  = Privates(this);
        const transport = privates.transport;
        const metronome = this;
        const voice     = this.get('output');
        const buffer    = [];

        PlayNode.prototype.start.apply(this, arguments);

        privates.sequence = transport
        .sequence((data) => fillEventsBuffer(transport, this.events, buffer, data))
        .each(function distribute(e) {
            const options = metronome[e[1]];
            voice.start(e.time, options[0], options[1]);
        })
        .start(this.startTime);

        return this;
    },

    stop: function(time) {
        const privates = Privates(this);
        PlayNode.prototype.stop.apply(this, arguments);
        privates.sequence.stop(this.stopTime);
        return this;
    }
});

// Mix in property definitions
define(Metronome.prototype, {
    playing: getOwnPropertyDescriptor(PlayNode.prototype, 'playing')
});

Metronome.defaults  = {
    filterQ:         { min: 0,   max: 100,   transform: 'quadratic',   value: 0.25 },
    filterFrequency: { min: 16,  max: 16000, transform: 'logarithmic', value: 16 }
};
