
import id            from '../../fn/modules/id.js';
import isDefined     from '../../fn/modules/is-defined.js';
import nothing       from '../../fn/modules/nothing.js';
import matches       from '../../fn/modules/matches.js';
import mixin         from '../../fn/modules/mix.js';
import Privates      from '../../fn/modules/privates.js';
import config        from '../config.js';
import requestMedia  from './request/request-media.js';
import { context, domTimeAtTime, timeAtDomTime, getOutputLatency } from './context.js';
import { connect, disconnect } from './connect.js';
import constructors  from './graph/constructors.js';
import Objects       from './graph/objects.js';
import Connectors    from './graph/connectors.js';
import Playable, { IDLE } from './mixins/playable.js';
import Sequencer     from './sequencer/sequencer.js';
import Transport     from './transport.js';
// TODO: get frames form transport? Give plugins access to Frames via transport?
import Frames        from './sequencer/frames.js';
import PlayHead      from './sequencer/play-head.js';

import NodeGraph     from '../nodes/graph.js';
import Input         from '../nodes/input.js';
import Instrument    from '../nodes/instrument.js';
import Metronome     from '../nodes/metronome.js';
import Mix           from '../nodes/mix.js';
import Sample        from '../nodes/sample-set.js';
import Tick          from '../nodes/tick.js';
import Tone          from '../nodes/tone.js';

import { log, printGroup, printGroupEnd }     from './print.js';


const assign = Object.assign;
const define = Object.defineProperties;

const defaults = {
    context: context,
    objects: [{ id: '0', type: 'output' }]
};

const properties = {
    version:           { value: 0 },
    mediaChannelCount: { enumerable: true },
    transport:         {},
    objects:           { enumerable: true },
    connectors:        { enumerable: true }
};

/* Nodes */

// Assign Soundstage-specific AudioNode constructors to the Graph
assign(constructors, {
    'input':      Input,
    'instrument': Instrument,
    'metronome':  Metronome,
    'mix':        Mix,
    'tick':       Tick,
    'tone':       Tone
});

// Assign nodes to NodeGraph
assign(NodeGraph.types, {
    'mix':     Mix,
    'samples': Sample,
    'tick':    Tick,
    'tone':    Tone
});

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

    merger.connect(target);
    return merger;
}


/**
Soundstage()

```js
const stage = new Soundstage(objects, connectors, events, sequences, options);
const stage = Soundstage.from(data);
```

A stage is a graph of AudioNodes and a sequencer of events that control those
AudioNodes.
**/

export default function Soundstage(objects = defaults.objects, connectors = [], events = [], sequences = [], settings = nothing) {

    if (window.DEBUG) { printGroup('Soundstage()'); }

    // Soundstage
    const privates    = Privates(this);
    const context     = settings.context || defaults.context;
    const destination = settings.destination || context.destination;
    const merger      = createOutputMerger(context, destination);

    /** .transport **/
    const transport = new Transport(context);

    privates.beat    = 0;
    privates.outputs = {
        default: merger,
        rate:    transport.outputs.rate,
        beat:    transport.outputs.beat
    };

    properties.transport.value = transport;

    /** .mediaChannelCount **/
    properties.mediaChannelCount.value = settings.mediaChannelCount || 2;

    /** .objects **/
    /** .connectors **/
    /** .pipes TODO **/
    properties.objects.value = new Objects(this, objects, context, merger, transport);
    properties.connectors.value = new Connectors(properties.objects.value, connectors);

    // Define properties
    define(this, properties);

    // .context
    // .events
    // .sequences
    // .startTime
    // .stopTime
    // .stop()
    Sequencer.call(this, context, events, sequences);

    if (window.DEBUG) { printGroupEnd(); }
}

assign(Soundstage, {
    from: (data) => {
        if (data && isDefined(data.version) && data.version !== Soundstage.version) {
            throw new Error('Soundstage: no adapter for data version ' + data.version);
        }

        return new Soundstage(data.objects, data.connectors, data.events, data.sequences, data.settings);
    }
});

mixin(Soundstage.prototype, Sequencer.prototype/*, Graph.prototype, Meter.prototype*/);

define(Soundstage.prototype, {
    /**
    .bar
    The current bar count.
    **/
    bar: {
        get: function() { return this.barAtBeat(this.beat) ; }
    },

    /** .beat
    The current beat count.
    **/
    beat: {
        get: function() {
            const privates = Privates(this);
            if (this.startTime === undefined
                || this.startTime >= this.context.currentTime
                || this.stopTime < this.context.currentTime) {
                return privates.beat;
            }

            return this.beatAtTime(this.time);
        },

        set: function(value) {
            const privates = Privates(this);

            if (this.startTime === undefined
                || this.stopTime < this.context.currentTime) {
                privates.beat = value;
                // Todo: update state of entire graph with evented settings for
                // this beat   ... wot? Oh snapshot cuurent state to Graph. Ah.
            }
            else {
                // Sequence is started - can we move the beat? Ummm... I don't thunk so...
                throw new Error('Beat cannot be moved while sequencer is running');
            }
        }
    },

    /** .meter
    The current meter.
    **/
    meter: {
        get: function() {
            const { transport } = Privates(this);
            return transport.getMeterAtTime(this.context.currentTime);
        },

        set: function(meter) {
            const { transport } = Privates(this);
            transport.setMeterAtTime(meter, this.context.currentTime)
        }
    },

    /** .tempo
    The rate of the transport clock expressed in bpm.
    **/
    tempo: {
        get: function() { return getValueAtTime(this.rate, this.time) * 60; },
        set: function(tempo) { automate(this.rate, this.time, 'step', tempo / 60, null, privates.notify, this.context); }
    },

    /** .time
    The time of audio now leaving the device output. (In browsers the have not
    yet implemented `AudioContext.getOutputTimestamp()` this value is estimated
    from `currentTime` and a guess at the output latency. Which is a bit meh,
    but better than nothing.)
    **/
    time: {
        get: function() {
            return this.context.getOutputTimestamp().contextTime - this.startTime;
        },
        set: function(time) {
            console.log('TODO: set time', time);
        }
    },

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
    /*
    metronome: {
        enumerable: true,

        get: function() {
            const privates = Privates(this);
            if (!privates.metronome) {
                privates.metronome = this.nodes.create('metronome');
            }

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
    }*/

    /**
    .metronome
    A boolean indicating the state of a stage's metronome object.
    **/
    metronome: {
        get: function() {
            const privates = Privates(this);
            return privates.metronome && !privates.metronome.mute;
        },

        set: function(value) {
            if (!!value === !!this.metronome) { return; }

            const privates = Privates(this);

            if (value) {
                if (!privates.metronome) {
                    privates.metronome          = this.objects.create('metronome');
                    privates.metronomeConnector = this.connectors.create(privates.metronome, 'output');
                }
            }
            else {
                if (privates.metronome) {
                    privates.metronome.remove();
                }
            }
        }
    },
});

assign(Soundstage.prototype, Sequencer.prototype, /*Graph.prototype,*/ {
    /*createControl: function(source, target, options) {
        const privates = Privates(this);

        // Target must be the graph node
        target = typeof target === 'string' ?
            this.nodes.find((object) => object.id === target) :
            target ;

        return new Control(this.controls, source, target, options, privates.notify);
    },*/

    find: function(fn) {
        let object = this.objects && this.objects.find(fn);
        if (object) { return object; }
        object = this.sequences && this.sequences.find(fn);
        return object;
    },

    findAll: function() {
        return this.objects.findAll(fn).concat(this.connectors.findAll(fn));
    },

    /* Receive events */

    automate: function(address, name, value, curve, duration, time) {
        // TODO! Fold address into event stuff how??
        const last = /\.(\w+)$/.exec(address)[1];

        // Send 'start/stop' event
        if (last === 'start' || last === 'stop') {
            return this.push(new Event(time, last, name, value));
        }

        // Send 'param' event
        return this.push(new Event(time, 'param', name, value, curve, duration));
    },

    /* A soundstage is a pseudo-AudioNode. Give it AudioNode methods. */

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

    /* Sequencer methods */

    start: function(time) {
        // If the sequencer is running stop it first
        if (this.status !== IDLE) {
            this.stop(time);
        }

        // Sets privates.playhead internally (watch out should that change).
        //Sequencer.prototype.start.apply(this, arguments);

        // Return this, rather than the playhead, so there is only ever one
        // playhead per soundstage
        //return this;

        const privates = Privates(this);
        //const transport = this.transport;

        // Delegate this.startTime to playable
        Playable.prototype.start.call(this, time);

        //if (transport.status !== PLAYING) {
        //    transport.start(time, beat);
        //}

        const frames = new Frames(this.context);
        const head   = new PlayHead(this.events, this.sequences, id, {
            start: function(a, b, c, d, e) {
                //console.log('START', a, b, c, d, e);
                return this;
            },

            stop: function(a, b) {
                //console.log('STOP', a, b);
                return this;
            }
        });


        // Pipe frames to playback head (sneaky use of privates.playhead, be warned)
        privates.playhead = frames
        .pipe(head)
        .start(this.startTime);

        // Create dependent playheads for graph nodes that have events
        let n = -1, object;
        while(object = this.objects[++n]) {
            if (object.events && object.events.length) {
                // 'playhead', events, sequences, transform, target
                head
                .create('playhead', object.events, this.sequences, id, object)
                .start(0);
            }
        }

        if (window.DEBUG) {
            log('Sequencer start()', 'startTime', this.startTime, 'sequences', n);
        }

        return privates.playhead;
    },

    /**
    .beatAtTime(time)
    Returns the beat of this sequence given a context `time`.
    **/
    beatAtTime: function(time) {
        const privates = Privates(this);
        return privates.playhead ?
            privates.playhead.beatAtTime(time) :
            0 ;
    },

    /**
    .timeAtBeat(beat)
    Returns the context time that `beat` of the sequence plays at.
    **/
    timeAtBeat: function(beat) {
        const privates = Privates(this);
        return privates.playhead ?
            privates.playhead.timeAtBeat(time) :
            0 ;
    },

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


    /* Hmmmm... */

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
        return this.objects.reduce((list, node) => {
            const data = node.records && node.records();
            return data ? list.concat(data) : list ;
        }, []);
    }
});
