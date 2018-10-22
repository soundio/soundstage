
import { compose, get, is, isDefined, map, nothing }   from '../../fn/fn.js';
import AudioObject          from '../../audio-object/modules/audio-object.js';
import requestInputSplitter from '../../audio-object/modules/request-input-splitter.js';

import { print }     from './utilities/print.js';
import { distributeEvent } from './distribute.js';
import audio         from './audio-context.js';
import Input         from './nodes/input.js';
import Output        from './nodes/output.js';
import Graph         from './graph.js';
import requestPlugin from './request-plugin.js';
import Controls      from './controls.js';
import Sequence      from './sequence.js';
import Sequencer     from './sequencer.js';
import Metronome     from './metronome.js';
import config        from './config.js';

const assign       = Object.assign;
const define       = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const setPrototypeOf = Object.setPrototypeOf;


function isURL() {
    return false;
}

// Soundstage

function createOutputMerger(audio, target) {
    // Safari sets audio.destination.maxChannelCount to
    // 0 - possibly something to do with not yet
    // supporting multichannel audio, but still annoying.
    var count = target.maxChannelCount > config.channelCountLimit ?
        config.channelCountLimit :
        target.maxChannelCount ;

    var merger = audio.createChannelMerger(count);

    // Used by meter-canvas controller - there is no way to automatically
    // determine the number of channels in a signal.
    merger.outputChannelCount = count;

    // Make sure incoming connections do not change the number of
    // output channels (number of output channels is determined by
    // the sum of channels from all inputs).
    merger.channelCountMode = 'explicit';

    // Upmix/downmix incoming connections.
    merger.channelInterpretation = 'speakers';

    merger.connect(target);
    return merger;
}

function createObject(audio, settings) {
    return requestPlugin(settings.type).then(function(Constructor) {
        return new Constructor(audio, settings);
    });
}

export default function Soundstage(data, settings) {
    if (!Soundstage.prototype.isPrototypeOf(this)) {
        // Soundstage has been called without the new keyword
        return new Soundstage(data, settings);
    }

    data     = data || nothing;
    settings = settings || nothing;

    if (isDefined(data.version) && data.version !== this.version) {
        throw new Error('Soundstage: data version mismatch.', this.version, data.version);
    }


    // Initialise soundstage as an Audio Object with no inputs and
    // a channel merger as an output. Assigns:
    //
    // audio:      audio context

    const context     = settings.context || audio;
    const destination = settings.output || context.destination;
    const output      = createOutputMerger(context, destination);

    AudioObject.call(this, context, undefined, output);
    Soundstage.inspector && Soundstage.inspector.drawAudioFromNode(output);


    // Initialise soundstage as a plugin graph. Assigns:
    //
    // plugins:     array
    // connections: array

    const types = {
        input: function(context, data) {
            return requestInputSplitter(context).then(function(input) {
                return new Input(context, data.object, input);
            });
        },

        output: function(context, data) {
            return Promise.resolve(new Output(context, data.object, output));
        },

        default: createObject
    };

    Graph.call(this, context, types, data, {
        //create:     this.create.bind(this),
        cue:        this.cue.bind(this),
        beatAtTime: this.beatAtTime.bind(this),
        timeAtBeat: this.timeAtBeat.bind(this),
        beatAtBar:  this.beatAtBar.bind(this),
        barAtBeat:  this.barAtBeat.bind(this),
        //on:         this.on.bind(this),
        //off:        this.off.bind(this),
        regions:    this.regions
        //beatAtLoc:  this.beatAtLoc.bind(stage),
        //locAtBeat:  this.locAtBeat.bind(stage),
    });


    // Initialise MIDI and keyboard controls. Assigns:
    //
    // controls:   array-like

    this.ready(function graphReady(stage) {
        define(stage, {
            controls: {
                enumerable: true,
                value: new Controls(function getTarget(id) {
                    return stage.get(id);
                }, data.controls)
            }
        });
    });


    // Initialise soundstage as a Sequence. Assigns:
    //
    // name:       string
    // sequences:  array
    // events:     array

    Sequence.call(this, data);


    // Initialise audio regions. Assigns:
    //
    // regions:    array

    const regions
        = this.regions
        = (settings.regions || []).map(function(data) {
            return Region(context, data);
        });


    // Initialise soundstage as a Sequencer. Assigns:
    //
    // start:      fn
    // stop:       fn
    // beatAtTime: fn
    // timeAtBeat: fn
    // beatAtLoc:  fn
    // locAtBeat:  fn
    // beatAtBar:  fn
    // barAtBeat:  fn
    // create:     fn
    // cue:        fn
    // status:     string

    const stage = this;

    const distributors = {
        "sequence": function(object, event, stream, transform) {
            const type = typeof event[2];

            // Find the sequence
            const sequence = type === 'string' ?
                    isURL(event[2]) ? fetchSequence(event[2]) :
                stage.sequences.find(compose(is(event[2]), get('id'))) :
            event[2] ;

            if (!sequence) {
                console.warn('Soundstage: sequence not found', event);
                return;
            }

            // Get sequence events
            const events = sequence.events;
            if (!events || !events.length) {
                console.warn('Soundstage: sequence has no events', event);
                return;
            }

            // Get the target object
            if (isDefined(event[3])) {
                const node = stage.get(event[3]);
                object = node && node.object;
            }

            // If there is none, warn
            if (!object) {
                console.warn('Soundstage: object not found', event);
                return;
            }

            return stream
            .create(events, transform, object)
            .start(event[0]);
        },

        "meter": function(object, event) {

        },

        'default': distributeEvent
    };

    Sequencer.call(this, context, distributors, this.sequences, this.events);

    /*
    // Initialise as a recorder...

    var recordStream   = RecordStream(this, this.sequences);
    */


    // Create metronome.
    this.metronome = new Metronome(context, data.metronome, this);
    //this.metronome.start(0);


    // Define variables

    define(this, {
        mediaChannelCount: { value: undefined, writable: true, configurable: true },
        roundTripLatency:  { value: Soundstage.roundTripLatency, writable: true, configurable: true },
    });


    /*
    // Setup from data and notify when all components are loaded and ready

    const loaded = this
    .update(data)
    .then(function(stage) {
        console.log('Soundstage: ready');
    });

    this.ready = loaded.then.bind(loaded);
    */
}

setPrototypeOf(Soundstage.prototype, AudioObject.prototype);

define(Soundstage.prototype, {
    version: { value: 1 },
    beat:    getOwnPropertyDescriptor(Sequencer.prototype, 'beat'),
    status:  getOwnPropertyDescriptor(Sequencer.prototype, 'status')
});

/*
.timeAtDomTime(domTime)

Returns audio context time at a given DOM time, where `domTime` is a time in
seconds relative to window.performance.now().
*/

assign(Soundstage.prototype, Sequencer.prototype, Graph.prototype, {
    timeAtDomTime: function(domTime) {
        return timeAtDomTime(this.audio, domTime);
    },

    domTimeAtTime: function(domTime) {
        return domTimeAtTime(this.audio, domTime);
    },

    destroy: function() {
        // Destroy the playhead.
        //Head.prototype.destroy.call(this);

        // Remove soundstage's input node from mediaInputs, and disconnect
        // media from it.
        var input = AudioObject.getInput(this);
        var i     = mediaInputs.indexOf(input);

        if (i > -1) {
            mediaInputs.splice(i, 1);
        }

        requestMedia(this.audio)
        .then(function(media) {
            media.disconnect(input);
        });

        var output = AudioObject.getOutput(this);
        output.disconnect();

        this[$store].modify('clear');
        return this;
    }
});
