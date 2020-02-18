
import { get, isDefined, noop, nothing, map, matches, Privates }   from '../../fn/module.js';
import requestInputSplitter   from './request-input-splitter.js';
import { print, printGroup, printGroupEnd }     from './utilities/print.js';
import audio, { timeAtDomTime } from './context.js';
import constructors  from './constructors.js';
import { isKeyboardInputSource } from './control-sources/keyboard-input-source.js';
import { isMIDIInputSource } from './control-sources/midi-input-source.js';
import { connect, disconnect } from './connect.js';
import Control       from './control.js';
import Input         from '../nodes/input.js';
import Output        from '../nodes/output.js';
import Metronome     from '../nodes/metronome.js';
import Graph         from './graph.js';
import requestPlugin from './request-plugin.js';
import Timer         from './timer.js';
import Transport     from './transport.js';
import Sequencer     from './sequencer.js';
import config        from '../config.js';

const DEBUG        = window.DEBUG || false;
const assign       = Object.assign;
const define       = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

const defaultData = {
    nodes: [{ id: '0', type: 'output' }]
};

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

    merger.connect(target);
    return merger;
}

function rewriteURL(basePath, url) {
    // Append relative URLs, including node types, to basePath
    return /^https?:\/\/|^\//.test(url) ? url : basePath + url;
}

function requestAudioNode(type, context, settings, transport, basePath) {
    return (
        constructors[type] ?
            Promise.resolve(constructors[type]) :
            // settings.type is a URL
            requestPlugin(rewriteURL(basePath, type))
    )
    .then(function(Node) {
        // If the constructor has a preload fn, it has special things
        // to prepare (such as loading AudioWorklets) before it can
        // be used.
        return Node.preload ?
            Node.preload(basePath, context).then(() => {
                print('Node', Node.name, 'preloaded');
                return Node;
            }) :
            Node ;
    })
    .then(function(Node) {
        // Create the audio node
        return new Node(context, settings, transport);
    });
}


/*
Soundstage(data, settings)

Import Soundstage and create a new Soundstage object, passing in some setup
data.

```
import Soundstage from 'http://sound.io/soundstage/module.js';

const stage = new Soundstage({
    nodes: [
        { id: '1', type: 'instrument', data: {...} },
        { id: '2', type: 'output', data: {...} }
    ],

    connections: [
        { source: '1', target: '2' }
    ],

    sequences: [...],
    events: [...]
});
```

A stage is a graph of AudioNodes and connections, and a sequencer of events
targeted at those nodes. A stage also quacks like an AudioNode, and can
be connected to other nodes (although by default it is connected to
`context.destination`). Finally, a stage can be stringified to JSON, and
that JSON can be used to recreate the same node graph elsewhere.

```
const json = JSON.stringify(stage);

// '{
//     "nodes": [...],
//     "connections": [...],
//     "sequences": [...],
//     "events": [...]
// }'

// Elsewhere
const stage = new Soundstage(JSON.parse(json));
```
*/

/*
Options

The Soundstage constructor also accepts an optional second object, options.

`.context`

By default an AudioContext is created and shared by all stages. Pass in an
AudioContext to have the stage use a different context.

`.destination`

[Todo: rename as a boolean option.]
By default the output of the stage graph is connected to `context.destination`.
Pass in `null` to create a disconnected stage (and use `stage.connect()`
to route it elsewhere).

`.notify`

```
const stage = new Soundstage({...}, {
    notify: function(node, property, value) {...}
});
```

A function that is called when an AudioParam is scheduled to change. A
fundamental problem when creating a UI for a WebAudio graph is the lack of
observability. Everything happens on a seperate thread, and cannot be
interrogated. Use notify to have Soundstage notify changes to AudioParam values.
*/

export default function Soundstage(data = defaultData, settings = nothing) {
    if (!Soundstage.prototype.isPrototypeOf(this)) {
        // Soundstage has been called without the new keyword
        return new Soundstage(data, settings);
    }

    if (isDefined(data.version) && data.version !== this.version) {
        throw new Error('Soundstage: data version mismatch.', this.version, data.version);
    }

    if (DEBUG) { printGroup('Soundstage()'); }

    const context     = settings.context || audio;
    const destination = settings.destination === undefined ? context.destination : settings.destination ;
    const notify      = settings.notify || noop;
    const output      = createOutputMerger(context, destination);
    const rateNode    = new window.ConstantSourceNode(context, { offset: 2 });
    const rateParam   = rateNode.offset;
    const timer       = new Timer(() => context.currentTime);
    const transport   = new Transport(context, rateParam, timer, notify);

    rateNode.start(0);


    // Privates

    const privates = Privates(this);

    privates.notify = notify;
    privates.outputs = {
        default: output,
        rate:    rateNode
    };


    // Properties

    /*
    .label
    A string name or title for this Soundstage document.
    */

    this.label = data.label || '';

    /*
    .mediaChannelCount
    */

    define(this, {
        mediaChannelCount: { value: undefined, writable: true, configurable: true },
        // roundTripLatency:  { value: Soundstage.roundTripLatency, writable: true, configurable: true },
    });


    // Initialise audio regions. Assigns:
    //
    // regions:    array

    //const regions
    //    = this.regions
    //    = (settings.regions || []).map(function(data) {
    //        return Region(context, data);
    //    });


    // Initialise soundstage as a graph. Assigns:
    //
    // nodes:       array
    // connections: array

    const requestTypes = {
        input: function(type, context, data) {
            return requestInputSplitter(context).then(function(input) {
                return new Input(context, data, input);
            });
        },

        metronome: function(type, context, data) {
            return Promise.resolve(new Metronome(context, data, transport));
        },

        output: function(type, context, data) {
            return Promise.resolve(new Output(context, data, output));
        },

        default: function(type, context, data, transport) {
            return requestAudioNode(type, context, data, transport, config.basePath + 'nodes/');
        }
    };

    Graph.call(this, context, requestTypes, data, transport);


    // Initialise MIDI and keyboard controls. Assigns:
    //
    // controls:   array-like

    this.__promise = this.ready(function graphReady(stage) {
        define(stage, {
            controls: {
                enumerable: true,
                value: data.controls ?
                    data.controls.reduce(function(controls, options) {
                        // Get target graph node from target id
                        const target  = stage.nodes.find((object) => object.id === options.target);
                        new Control(controls, options.source, target, options, notify);
                        return controls;
                    }, []) :
                    []
            }
        });

        if (DEBUG) {
            const sources = map(get('source'), stage.controls);
            print('controls', sources.filter(isKeyboardInputSource).length + ' keyboard, ' + sources.filter(isMIDIInputSource).length + ' MIDI');
        }

        // Notify observers that objects have mutated
        // Todo: work out what's happening in Observer that we have to do
        // controls differently - something to do with immutable key / frozen state,
        // I suspect...
        notify(stage.nodes, '.');
        notify(stage.connections, '.');
        notify(stage, 'controls');
    })
    .then(function() {
        return context.resume();
    });


    // Initialise soundstage as a Sequencer. Assigns:
    //
    // start:       fn
    // stop:        fn
    // beatAtTime:  fn
    // timeAtBeat:  fn
    // beatAtBar:   fn
    // barAtBeat:   fn
    // cue:         fn

    Sequencer.call(this, transport, data, rateParam, timer, notify);


    // Initialise as a recorder...
    //var recordStream   = RecordStream(this, this.sequences);


    // Create metronome.
    //this.metronome = new Metronome(context, data.metronome, this);
    //this.metronome.start(0);
    // Todo: is this really necessary? Is there another way of getting
    // transport inside sound.io?
    this.transport = transport;


    if (DEBUG) { printGroupEnd(); }
}

define(Soundstage.prototype, {
    version: { value: 1 },

    time:           getOwnPropertyDescriptor(Sequencer.prototype, 'time'),
    tempo:          getOwnPropertyDescriptor(Sequencer.prototype, 'tempo'),
    meter:          getOwnPropertyDescriptor(Sequencer.prototype, 'meter'),
    beat:           getOwnPropertyDescriptor(Sequencer.prototype, 'beat'),
    bar:            getOwnPropertyDescriptor(Sequencer.prototype, 'bar'),
    playing:        getOwnPropertyDescriptor(Sequencer.prototype, 'playing'),
    //blockDuration:  getOwnPropertyDescriptor(Transport.prototype, 'blockDuration'),
    //frameDuration:  getOwnPropertyDescriptor(Transport.prototype, 'frameDuration'),
    //frameLookahead: getOwnPropertyDescriptor(Transport.prototype, 'frameLookahead'),

    /*
    .metronome

    A boolean property that is a shortcut control the first metronome node in
    the graph. Indicates whether a metronome is playing at the current time.
    Setting .metronome to true will create a metronome node (if there inspect
    not already one in the graph, and then start it.
    */

    metronome: {
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

    connect: function(input, port, channel) {
        const outputs = Privates(this).outputs;
        const output = typeof port === 'string' ? outputs[port] : outputs.default ;

        if (!output) { throw new Error('Output "' + port + '" not found'); }
        connect(output, input, typeof port === 'string' ? 0 : port, channel);

        return input;
    },

    disconnect: function(input, port) {
        const outputs = Privates(this).outputs;
        const output = typeof port === 'string' ? outputs[port] : outputs.default ;

        if (!port) { throw new Error('Output "' + port + '" not found'); }
        disconnect(output, input, typeof port === 'string' ? 0 : port, channel);

        return this;
    },

    /*
    .timeAtDomTime(domTime)
    Returns audio context time at the given `domTime`, where `domTime` is a
    time in seconds relative to window.performance.now().
    */

    timeAtDomTime: function(domTime) {
        return timeAtDomTime(this.context, domTime);
    },

    /*
    .domTimeAtTime(time)
    Returns DOM performance time at the given context `time`.
    */

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

        this[$store].modify('clear');
        return this;
    },

    /*
    .records()
    Returns an array of record objects containing unsaved data.
    */

    records: function() {
        return this.nodes.reduce((list, node) => {
            const data = node.records && node.records();
            return data ? list.concat(data) : list ;
        }, []);
    }
});
