
import { get, isDefined, map, nothing }   from '../../fn/fn.js';
import AudioObject   from '../../audio-object/modules/audio-object.js';

import { print }     from './print.js';
import audio         from './audio-context.js';
import AudioGraph    from './audio-graph.js';
import ControlRoutes from './control-routes.js';
import Sequence      from './sequence.js';
import Sequencer     from './sequencer.js';
import Metronome     from './metronome.js';
import config        from './config.js';

const assign       = Object.assign;
const define       = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const setPrototypeOf = Object.setPrototypeOf;


function hasId(id) {
    return (object) => object.id === id;
}

// Events

var eventDistributors = {

    // Event types
    //
    // [time, "rate", number, curve]
    // [time, "meter", numerator, denominator]
    // [time, "note", number, velocity, duration]
    // [time, "noteon", number, velocity]
    // [time, "noteoff", number]
    // [time, "param", name, value, curve]
    // [time, "pitch", semitones]
    // [time, "chord", root, mode, duration]
    // [time, "sequence", name || events, target, duration, transforms...]

    "note": function(object, event) {
        return object.start(event[0], event[2], event[3]);
    },

    "noteon": function(object, event) {
        return object.start(event[0], event[2], event[3]);
    },

    "noteoff": function(object, event) {
        return object.stop(event[0], event[2]);
    },

    "param": function(object, event) {
        return object.automate(event[0], event[2], event[3], event[4]);
    },

    "default": function(object, event) {
        console.log('Soundstage: Cannot distribute unknown event type', event);
    }
};


// Soundstage

function createOutput(audio, destination) {
    // Safari sets audio.destination.maxChannelCount to
    // 0 - possibly something to do with not yet
    // supporting multichannel audio, but still annoying.
    var count = destination.maxChannelCount > config.channelCountLimit ?
        config.channelCountLimit :
        destination.maxChannelCount ;

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

    merger.connect(destination);
    return merger;
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

    const output = createOutput(audio, settings.output || audio.destination);
    AudioObject.call(this, settings.audio || audio, undefined, output);
    Soundstage.inspector && Soundstage.inspector.drawAudioFromNode(output);


    // Initialise soundstage as a plugin graph. Assigns:
    //
    // plugins:     array
    // connections: array

    AudioGraph.call(this, audio, output, data, function done(stage) {

        // Initialise MIDI and keyboard controls. Assigns:
        //
        // controls:   array-like

        define(stage, {
            controls: {
                enumerable: true,
                value: new ControlRoutes(function Target(setting) {
                    return {
                        push: function(time, value) {
                            console.log(time, value);
                        }
                    };
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
            return Region(audio, data);
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

    const distributors = assign({
        "sequence": function(object, event, stream, transform) {
            var type = typeof event[2];
            var sequence = type === 'string' ?
                isUrl(event[2]) ?
                    fetchSequence(event[2]) :
                getPath(event[2], stage.sequences) :
            type === 'number' ?
                stage.sequences.find(hasId(event[2])) :
            event[2] ;

            if (!sequence) {
                console.warn('Soundstage: sequence not found', event);
                return;
            }

            var events = sequence.events;

            if (!events || !events.length) {
                console.warn('Soundstage: sequence has no events', event);
                return;
            }

            object = isDefined(event[3]) ?
                typeof event[3] === 'string' ?
                    getPath(event[3], stage.plugins) :
                stage.plugins.find(hasId(event[3])) :
            object;

            if (!object) {
                console.warn('Soundstage: object not found', event);
                return;
            }

            return stream
            .create(events, transform, object)
            .start(event[0]);
        },

        "meter": function(object, event) {

        }
    }, eventDistributors);

    Sequencer.call(this, audio, distributors, this.sequences, this.events);

    /*
    // Initialise as a recorder...

    var recordStream   = RecordStream(this, this.sequences);
    */


    // Create metronome.
    this.metronome = new Metronome(this.audio, data.metronome, this);
    this.metronome.start(0);


    // Define variables

    define(this, {
        mediaChannelCount: { value: undefined, writable: true, configurable: true },
        roundTripLatency:  { value: Soundstage.roundTripLatency, writable: true, configurable: true },
    });






    // Set up store
    /*
    const promises = [];

    var store = Store(actions, this, {
        // Private constants assigned to action objects
        audio: audio,

        // AudioObject constructors are given restricted access to a subset
        // of sequencer functions
        sequencer: {
            create:     stage.create.bind(stage),
            cue:        stage.cue.bind(stage),
            beatAtTime: stage.beatAtTime.bind(stage),
            timeAtBeat: stage.timeAtBeat.bind(stage),
            beatAtBar:  stage.beatAtBar.bind(stage),
            barAtBeat:  stage.barAtBeat.bind(stage),
            on:         stage.on.bind(stage),
            off:        stage.off.bind(stage),
            regions:    stage.regions
            //beatAtLoc:  stage.beatAtLoc.bind(stage),
            //locAtBeat:  stage.locAtBeat.bind(stage),
        },

        output:     output,

        distribute: function distribute(event) {
            var object = event.object;
            var result = (distributors[event[1]] || distributors.default)(object, event);

            if (event.recordable) {
                requestTick(function() {
                    recordStream.push(event);
                });
            }

            return result;
        },

        resolveObject: resolve(isObjectOrId, this.objects),

        resolveConnection: resolve(function(object, data) {
            return (object.src === data.src || object.src.id === data.src)
                && (object.dst === data.dst || object.dst.id === data.dst) ;
        }, this.connections),

        readyPromises: promises
    });

    this[$store] = store.each(noop);


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

assign(Soundstage.prototype, Sequencer.prototype, AudioGraph.prototype, {
    timeAtDomTime: function(domTime) {
        var stamps = this.audio.getOutputTimestamp();
        return stamps.contextTime + (domTime - stamps.performanceTime) / 1000;
    },

    createInputs: function() {
        var soundstage = this;

        if (this.mediaChannelCount === undefined) {
            requestMedia(this.audio)
            .then(function(media) {
                soundstage.mediaChannelCount = media.channelCount;
                createInputObjects(soundstage, soundstage.mediaChannelCount);
            });

            createInputObjects(this, 2);
        }
        else {
            createInputObjects(this, this.mediaChannelCount);
        }

        return this.inputs;
    },

    createOutputs: function() {
        // Create as many additional mono and stereo outputs
        // as the sound card will allow.
        var output = AudioObject.getOutput(this);
        createOutputObjects(this, output.channelCount);
        return this.outputs;
    },

    update: function(data) {
        // Accept data as a JSON string
        data = typeof data === 'string' ? JSON.parse(data) : data ;

        // Reject non-objects
        if (typeof data !== 'object') { return this; }

        // Treat null as an empty object
        if (!data) { data = nothing; }

        // Check version
        if (data.version > 1) {
            throw new Error('Soundstage: data version', data.version, 'not supported - you may need to upgrade Soundstage from github.com/soundio/soundstage');
        }

        var stage    = this;
        var promises = [];

        if (data.objects) {
            console.group('Soundstage: import');

            var ids = this.objects.map(get('id'));

            promises.push.apply(promises,
                data.objects
                .filter(function(settings) {
                    return !registry[settings.type];
                })
                .map(function(settings) {
                    console.log('Importing "' + settings.type + '"...');
                    return Soundstage.import(settings.type);
                })
            );

            console.groupEnd();
        }

        return Promise
        .all(promises)
        .then(function(constructors) {
            console.groupCollapsed('Soundstage: updating graph');

            if (data.name) { stage.name = data.name; }
            //if (data.slug) { stage.slug = data.slug; }
            //else { stage.slug = stage.slug || slugify(stage.name); }

            //if (data.tempo) {
            //	this.tempo = data.tempo;
            //}

            // Send action
            stage[$store].modify('update', data);

            console.groupEnd();
            return stage;
        });
    },

    clear: function() {
        Soundstage.debug && console.groupCollapsed('Soundstage: clear graph...');
        this[$store].modify('clear');
        Soundstage.debug && console.groupEnd();
        return this;
    },
/*
    connect: function(src, dst, output, input) {
        this[$store].modify('connect', {
            src:    src,
            dst:    dst,
            output: output,
            input:  input
        });

        return this;
    },

    disconnect: function(src, dst, output, input) {
        this[$store].modify('connect', {
            src:    src,
            dst:    dst,
            output: output,
            input:  input
        });

        return this;
    },
*/
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
