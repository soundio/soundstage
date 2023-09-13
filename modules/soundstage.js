
import get           from '../../fn/modules/get.js';
import isDefined     from '../../fn/modules/is-defined.js';
import noop          from '../../fn/modules/noop.js';
import nothing       from '../../fn/modules/nothing.js';
import matches       from '../../fn/modules/matches.js';
import overload      from '../../fn/modules/overload.js';
import Privates      from '../../fn/modules/privates.js';
import Stream        from '../../fn/modules/stream.js';
import config        from '../config.js';

//import Control       from './control.js';
import Graph         from './graph.js';
import Transport     from './transport.js';
import Sequencer     from './sequencer.js';
//import Metronome     from '../nodes/metronome.js';

import { print, printGroup, printGroupEnd }     from './print.js';
import { context, domTimeAtTime, timeAtDomTime, getOutputLatency } from './context.js';
//import { isKeyboardInputSource } from './control-sources/keyboard-input-source.js';
//import { isMIDIInputSource } from './control-sources/midi-input-source.js';
import { connect, disconnect } from './connect.js';
import requestMedia  from './request-media.js';
import { automato__ } from './automate.js';

const DEBUG        = window.DEBUG || false;
const assign       = Object.assign;
const define       = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

const defaults = {
    context: context
};

const defaultData = {
    nodes: [{ id: '0', type: 'output' }]
};

import constructors  from './constructors.js';
import Input         from '../nodes/input.js';
import Tone          from '../nodes/tone.js';
import Instrument    from '../nodes/instrument.js';

assign(constructors, {
    'input':      Input,
    'instrument': Instrument,
    'tone':       Tone
});


// Nodes

function createOutputMerger(context, target) {
    // Safari sets audio.destination.maxChannelCount to
    // 0 - possibly something to do with not yet
    // supporting multichannel audio, but still annoying.
    var count = target.maxChannelCount > config.channelCountLimit ?
        config.channelCountLimit :
        target.maxChannelCount ;

    var merger = new ChannelMergerNode(context, {
        numberOfInputs: count
    });

    // Used by meter-canvas controller - there is no way to automatically
    // determine the number of channels in a signal.
    //
    // Huh? What about numberOfInputs?
    merger.outputChannelCount = count;

    // Make sure incoming connections do not change the number of
    // output channels (number of output channels is determined by
    // the sum of channels from all inputs).
    merger.channelCountMode = 'explicit';

    // Upmix/downmix incoming connections.
    merger.channelInterpretation = 'discrete';

    return merger;
}


/**
Soundstage()

```js
const stage = new Soundstage();
```

A stage is a graph of AudioNodes and a sequencer of events.
**/

export default function Soundstage(data = defaultData, settings = nothing) {
    if (!Soundstage.prototype.isPrototypeOf(this)) {
        // Soundstage has been called without `new`
        return new Soundstage(data, settings);
    }

    if (isDefined(data.version) && data.version !== this.version) {
        throw new Error('Soundstage: data version mismatch.', this.version, data.version);
    }

    if (DEBUG) { printGroup('Soundstage()'); }

    // Soundstage
    const privates    = Privates(this);
    const context     = settings.context || defaults.context;
    const destination = settings.destination || context.destination;
    const merger      = createOutputMerger(context, destination);
    merger.connect(destination);

    // Hmmm.
    const notify    = settings.notify || noop;
    privates.notify = notify;

    // Transport
    const transport = new Transport(context);

    // Stream of events going to the stage. TODO: make this a multi-input,
    // always hot stream.
    const automation = Stream.of();

    // Cascade automation events to nodes
    automation.each((event) => {
        // Get node from first part of event type
        const i    = event[1].indexOf('.');
        const id   = event[1].slice(0, i);
        const node = this.getNode(id);

        // Update event type by lopping off name of node
        event[1] = event[1].slice(i + 1);
        return node.push(event);
    });



    // Properties

    /**
    .label
    A string name for this Soundstage document.
    **/

    this.label = data.label || '';

    /**
    .mediaChannelCount
    **/

    define(this, {
        mediaChannelCount: { value: undefined, writable: true, configurable: true }
    });

    // .nodes
    // .connections
    // .get(id)
    // .createNode(type, data)
    // .createConnection(source, target)
    Graph.call(this, context, merger, data, transport);

    // .context
    // .transport
    // .events
    // .sequences
    // .startTime
    // .startLocation
    // .stopTime
    // .start(time)
    // .stop(time)
    // .beatAtTime(time)
    // .timeAtBeat(beat)
    // .beatAtBar(bar)
    // .barAtBeat(beat)
    Sequencer.call(this, transport, automation, data.events, data.sequences);

    privates.outputs = {
        default: merger,
        rate:    this.transport.outputs.rate,
        beat:    this.transport.outputs.beat
    };

    console.log(context.resume());


    // Initialise as a recorder...
    //var recordStream   = RecordStream(this, this.sequences);


    // Create metronome.
    //this.metronome = new Metronome(context, data.metronome, this);
    //this.metronome.start(0);
    // Todo: is this really necessary? Is there another way of getting
    // transport inside sound.io?
    //this.transport = transport;


    if (DEBUG) { printGroupEnd(); }
}

define(Soundstage.prototype, {
    version: { value: 1 },
    //time:    getOwnPropertyDescriptor(Sequencer.prototype, 'time'),
    //rate:    getOwnPropertyDescriptor(Sequencer.prototype, 'rate'),
    //tempo:   getOwnPropertyDescriptor(Sequencer.prototype, 'tempo'),
    //meter:   getOwnPropertyDescriptor(Sequencer.prototype, 'meter'),
    //beat:    getOwnPropertyDescriptor(Sequencer.prototype, 'beat'),
    //bar:     getOwnPropertyDescriptor(Sequencer.prototype, 'bar'),
    status:  Object.getOwnPropertyDescriptor(Sequencer.prototype, 'status'),

    //blockDuration:  getOwnPropertyDescriptor(Transport.prototype, 'blockDuration'),
    //frameDuration:  getOwnPropertyDescriptor(Transport.prototype, 'frameDuration'),
    //frameLookahead: getOwnPropertyDescriptor(Transport.prototype, 'frameLookahead'),

    outputLatency: {
        enumerable: true,

        get: function() {
            return getOutputLatency(this.context);
        }
    },

    /**
    .metronome

    A boolean property that is a shortcut control the first metronome node in
    the graph. Indicates whether a metronome is playing at the current time.
    Setting .metronome to true will create a metronome node (if there inspect
    not already one in the graph, and then start it.
    **/

/*    metronome: {
        enumerable: true,

        get: function() {
            const node = this.nodes.find(matches({ type: 'metronome' }));
            if (!node) { return false; }
            const metronome = node.data;
            return metronome.startTime < this.context.currentTime && (metronome.stopTime === undefined || metronome.stopTime > this.context.currentTime);
        },

        set: function(value) {
            const node = this.nodes.find(matches({ type: 'metronome' }));

            if (value) {
                if (!node) {
                    this.create('metronome').then(function(m) {
                        connect(m, this.get('output'));
                    });
                }
                else {
                    const metronome = node.data;
                    metronome.start(this.context.currentTime);
                }
            }
            else if (node) {
                const metronome = node.data;
                metronome.stop(metronome.context.currentTime);
            }
        }
    }
*/
});

assign(Soundstage.prototype, Sequencer.prototype, Graph.prototype, {
    createControl: function(source, target, options) {
        const privates = Privates(this);

        // Target must be the graph node
        target = typeof target === 'string' ?
            this.nodes.find((object) => object.id === target) :
            target ;

        return new Control(this.controls, source, target, options, privates.notify);
    },

    automate: function(time, type) {
        const { automation } = Privates(this);
        const event = new Event(...arguments);
        event.target = automation.push(event);
        return this;
    },

/*
    connect: function(input, port, channel) {
        const outputs = Privates(this).outputs;
        const output = typeof port === 'string' ? outputs[port] : outputs.default ;

        if (!output) { throw new Error('Output "' + port + '" not found'); }
        connect(output, input, typeof port === 'string' ? 0 : port, channel);

        return input;
    },

    disconnect: function(input, port, channel) {
        const outputs = Privates(this).outputs;
        const output = typeof port === 'string' ? outputs[port] : outputs.default ;

        if (!port) { throw new Error('Output "' + port + '" not found'); }
        disconnect(output, input, typeof port === 'string' ? 0 : port, channel);

        return this;
    },
*/
    /**
    .timeAtDomTime(domTime)
    Returns audio context time at the given `domTime`, where `domTime` is a
    time in milliseconds relative to window.performance.now().
    **/

    timeAtDomTime: function(domTime) {
        return timeAtDomTime(this.context, domTime);
    },

    /**
    .domTimeAtTime(time)
    Returns DOM performance time at the given context `time`.
    **/

    domTimeAtTime: function(domTime) {
        return domTimeAtTime(this.context, domTime);
    },

    destroy: function() {
        // Destroy the playhead.
        //Head.prototype.destroy.call(this);

        // Remove soundstage's input node from mediaInputs, and disconnect
        // media from it.
        //var input = AudioObject.getInput(this);
        //var i     = mediaInputs.indexOf(input);

        //if (i > -1) {
        //    mediaInputs.splice(i, 1);
        //}

        //requestMedia(this.audio).then(function(media) {
        //    media.disconnect(input);
        //});

        const privates = Privates(this);
        var output = privates.outputs.default;
        output.disconnect();

        //this[$store].modify('clear');
        return this;
    },

    /**
    .records()
    Returns an array of record objects containing unsaved data.
    **/

    records: function() {
        return this.nodes.reduce((list, node) => {
            const data = node.records && node.records();
            return data ? list.concat(data) : list ;
        }, []);
    }
});
