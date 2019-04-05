
import { isDefined, noop, nothing, matches, notify }   from '../../fn/module.js';
import requestInputSplitter   from '../../audio-object/modules/request-input-splitter.js';

import { print, printGroup, printGroupEnd }     from './utilities/print.js';
import { Privates } from './utilities/privates.js';
import audio, { timeAtDomTime } from './context.js';
import constructors  from './constructors';
import { connect, disconnect } from './connect.js';
import Control       from './control.js';
import Input         from '../nodes/input.js';
import Output        from '../nodes/output.js';
import Metronome     from '../nodes/metronome.js';
import Graph         from './graph.js';
import requestPlugin from './request-plugin.js';
import Controls      from './controls.js';
import Timer         from './timer.js';
import Transport     from './transport.js';
import Sequencer     from './sequencer.js';
import config        from './config.js';

const DEBUG        = window.DEBUG || false;
const assign       = Object.assign;
const define       = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

const idSelect = { id: undefined };
const matchesId = matches(idSelect);


// Soundstage

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

function requestAudioNode(context, settings, transport) {
    return (
        constructors[settings.type] ?
            Promise.resolve(constructors[settings.type]) :
            requestPlugin(settings.type)
    )
    .then(function(Node) {
        // If the constructor has a preload fn, it has special things
        // to prepare (such as loading AudioWorklets) before it can
        // be used.
        // Todo: Need some way of passing base url from soundstage settings
        // (not these node settings) into preload fn, I fear
        return Node.preload ?

            Node.preload(context).then(() => {
                print('AudioWorklet', Node.name, 'loaded');
                return Node;
            }) :

            Node ;
    })
    .then(function(Node) {
        // Create the audio node
        return new Node(context, settings.data, transport);
    });
}

export default function Soundstage(data = nothing, settings = nothing) {
    if (!Soundstage.prototype.isPrototypeOf(this)) {
        // Soundstage has been called without the new keyword
        return new Soundstage(data, settings);
    }

    if (isDefined(data.version) && data.version !== this.version) {
        throw new Error('Soundstage: data version mismatch.', this.version, data.version);
    }

    if (DEBUG) { printGroup('Soundstage()'); }

    const context     = settings.context || audio;
    const destination = settings.destination || context.destination;
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

    this.label = data.label;

    define(this, {
        mediaChannelCount: { value: undefined, writable: true, configurable: true },
//        roundTripLatency:  { value: Soundstage.roundTripLatency, writable: true, configurable: true },
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
        input: function(context, data) {
            return requestInputSplitter(context).then(function(input) {
                return new Input(context, data.data, input);
            });
        },

        metronome: function(context, data) {
            return Promise.resolve(new Metronome(context, data.data, transport));
        },

        output: function(context, data) {
            return Promise.resolve(new Output(context, data.data, output));
        },

        default: requestAudioNode
    };

    Graph.call(this, context, requestTypes, data, transport);


    // Initialise MIDI and keyboard controls. Assigns:
    //
    // controls:   array-like

    this.ready(function graphReady(stage) {
        define(stage, {
            controls: {
                enumerable: true,
                value: new Controls(function findTarget(selector) {
                    const parts = selector.split('.');
                    const param = parts[1];

                    idSelect.id = parts[0];

                    return param === undefined ?
                        stage.nodes.find(matchesId) :
                        stage.nodes.find(matchesId)[param] ;
                }, data.controls, notify)
            }
        });

        // Notify observers that objects have mutated
        // Todo: work out what's happening in Observer that we have to do
        // controls differently - something to do with immutable key / frozen state,
        // I suspect...
        notify(stage.nodes, '.');
        notify(stage.connections, '.');
        notify(stage, 'controls');
    });


    // Initialise soundstage as a Sequencer. Assigns:
    //
    // start:      fn
    // stop:       fn
    // beatAtTime: fn
    // timeAtBeat: fn
    // beatAtBar:  fn
    // barAtBeat:  fn
    // meterAtBeat: fn
    // cue:        fn
    // status:     string

    Sequencer.call(this, transport, data, rateParam, timer, notify);


    /*
    // Initialise as a recorder...

    var recordStream   = RecordStream(this, this.sequences);
    */


    // Create metronome.
    //this.metronome = new Metronome(context, data.metronome, this);
    //this.metronome.start(0);


    if (DEBUG) { printGroupEnd(); }
}

define(Soundstage.prototype, {
    version: { value: 1 },
    tempo:           getOwnPropertyDescriptor(Sequencer.prototype, 'tempo'),
    meter:           getOwnPropertyDescriptor(Sequencer.prototype, 'meter'),
    beat:            getOwnPropertyDescriptor(Sequencer.prototype, 'beat'),
    processDuration: getOwnPropertyDescriptor(Transport.prototype, 'processDuration'),
    frameDuration:   getOwnPropertyDescriptor(Transport.prototype, 'frameDuration'),
    frameLookahead:  getOwnPropertyDescriptor(Transport.prototype, 'frameLookahead'),

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

/*
.timeAtDomTime(domTime)

Returns audio context time at a given DOM time, where `domTime` is a time in
seconds relative to window.performance.now().
*/

assign(Soundstage.prototype, Sequencer.prototype, Graph.prototype, {
    createControl: function(source, target, data) {
        const privates = Privates(this);
        const control = new Control(this.controls, source, target, data, privates.notify);
        this.controls.push(control);
        notify(this.controls, '.');
        return control;
    },

    connect: function(input, port, channel) {
        const outputs = Privates(this).outputs;
        let output = typeof port === 'string' ? outputs[port] : outputs.default ;

        if (!output) { throw new Error('Output "' + port + '" not found'); }
        connect(output, input, typeof port === 'string' ? 0 : port, channel);

        return input;
    },

    disconnect: function(input, port) {
        const outputs = Privates(this).outputs;
        let output = typeof port === 'string' ? outputs[port] : outputs.default ;

        if (!port) { throw new Error('Output "' + port + '" not found'); }
        disconnect(output, input, typeof port === 'string' ? 0 : port, channel);

        return this;
    },

    timeAtDomTime: function(domTime) {
        return timeAtDomTime(this.context, domTime);
    },

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
    }
});
