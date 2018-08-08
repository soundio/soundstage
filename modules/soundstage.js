// Soundstage
//
// Soundstage(data, settings)

import { cache, compose, curry, each, equals, find, get, getPath, insert, is, isDefined, matches, noop, nothing, pipe, remove, requestTick, slugify, Stream } from '../../fn/fn.js';

import config from './config.js';
import { createId } from './utilities.js';
import audioContext from './audio-context.js';
import AudioObject, { requestMedia } from '../../audio-object/modules/audio-object.js';
import Event from './event.js';
import RecordStream from './record-stream.js';
import Metronome from './metronome.js';
import MIDI from '../../midi/midi.js';
import Sequence from './sequence.js';
import Sequencer from './sequencer.js';
import Track from './track.js';
import Chain from './chain.js';
import Graph from './graph.js';
import Store from '../../fn/js/store.js';

var Collection     = window.Collection;
var events         = window.events;
var module         = window.importModule;

const assign       = Object.assign;
const define       = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const setPrototypeOf = Object.setPrototypeOf;

var get0      = get('0');
var getId     = get('id');
var insertBy0 = insert(get0);

// Todo: obviously temporary.
var isUrl     = noop;

var $store = Symbol('store');

var defaults = {};

var channelCountLimit = 12;

var findIn = curry(function(objects, id) {
    var hasId = compose(is(id), getId);
    return find(hasId, objects);
});

var selectIn = curry(function(object, selector) {
    return getPath(selector, object) ;
});

var update = curry(function update(create, object, data) {
    //if (object.update) { object.update.apply(object, data); }

    var n, item, datum, name;

    function hasDatumId(item) {
        return item.id === datum.id;
    }

    if (isDefined(object.length)) {
        n = data.length;
        while (n--) {
            datum = data[n];
            item = find(hasDatumId, object);
            if (item) {
                update(item, datum);
            }
            else {
                object.push(create(datum));
            }
        }
    }
    else {
        for (name in data) {
            if (object[name] && isDefined(object[name].length)) {
                update(object[name], data[name])
            }
            else {
                object[name] = create(data[name]);
            }
        }
    }
});

var resolve = curry(function(fn, objects, id) {
    var n = objects.length;
    var object;
    while (n--) {
        object = objects[n];
        if (fn(object, id)) { return object; }
    }
});



function fetchSequence(url) {
    var stream = Stream.of();

    Soundstage
    .fetchSequence(url)
    .then(function(sequence) {
        stream.push.apply(stream, sequence.events);
    });

    return stream;
}


// Audio Objects

var registry = {};

function register(name, fn, defaults) {
    if (registry[name]) {
        throw new Error('soundstage: Calling Soundstage.register(name, fn) but name already registered: ' + name);
    }

    fn.defaults = defaults;
    registry[name] = fn;
}

function assignUndefined(object, settings) {
    var keys = Object.keys(settings);
    var n = keys.length;
    var key;

    while (n--) {
        key = keys[n];

        // Assign only those settings that are not
        // already defined
        if (object[key] === undefined) {
            object[key] = settings[key];
        }
    }
}

function setup(object, path, settings, objects) {
    define(object, {
        'id': {
            value: settings && settings.id || createId(objects),
            enumerable: true
        }
    });

    if (!object.type) {
        // Type is not writable
        define(object, {
            "type": {
                value: path,
                enumerable: true
            }
        });
    }

    if (settings) {
        assignUndefined(object, settings);
    }

    return object;
}

function create(audio, path, settings, sequencer, output, objects) {
    path = path || settings.type;

    var Constructor = registry[path];
    var defaults    = Constructor.defaults;

    if (!Constructor) {
        throw new Error('Soundstage: unregistered audio object "' + path + '".');
    }

    var object = new Constructor(audio, settings, sequencer, output);
    setup(object, path, settings, objects);
    Soundstage.debug && console.log('Soundstage: created AudioObject', object.id, '"' + object.name + '"');

    return object;
}

function retrieveDefaults(path) {
    if (!registry[path]) { throw new Error('Soundstage: unregistered audio object "' + path + '".'); }
    return assign({}, registry[path].defaults);
}


// Inputs and outputs

function byChannels(a, b) {
    return a.channels.length > b.channels.length ? -1 :
        a.channels.length < b.channels.length ? 1 :
        a.channels > b.channels ? 1 :
        a.channels < b.channels ? -1 :
        0 ;
}

function createOutput(audio, destination) {
    // Safari sets audio.destination.maxChannelCount to
    // 0 - possibly something to do with not yet
    // supporting multichannel audio, but still annoying.
    var count = destination.maxChannelCount > channelCountLimit ?
        channelCountLimit :
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

function createInputObjects(soundstage, count) {
    function hasChannelsMono(object) {
        return object.channels + '' === [count] + '';
    }

    function hasChannelsStereo(object) {
        return object.channels + '' === [count, count + 1] + '';
    }

    while (count--) {
        // Only create new inputs where an input with this
        // channel does not already exist.
        if(!soundstage.inputs.filter(hasChannelsMono).length) {
            soundstage.create('input', { channels: [count] });
        }

        // Only create a new stereo input where an input with these
        // channels does not already exist.
        if (count % 2 === 0 && !soundstage.inputs.filter(hasChannelsStereo).length) {
            soundstage.create('input', { channels: [count, count + 1] });
        }
    }

    soundstage.inputs.sort(byChannels);
}

function createOutputObjects(soundstage, count) {
    var output = AudioObject.getOutput(soundstage);

    //function hasChannelsMono(object) {
    //	return object.channels + '' === [count] + '';
    //}

    function hasChannelsStereo(object) {
        return object.channels + '' === [count, count + 1] + '';
    }

    while (count--) {
        // Only create new outputs where an input with this
        // channel does not already exist.
        if (count % 2 === 0 && !soundstage.outputs.filter(hasChannelsStereo).length) {
            soundstage.create('output', {
                output: output,
                channels: [count, count + 1]
            });
        }
    }

    soundstage.outputs.sort(byChannels);
}


// Connection

function connect(src, dst, outName, inName, outOutput, inInput) {
    var outNode = AudioObject.getOutput(src, outName);
    var inNode  = AudioObject.getInput(dst, inName);

    if (!outNode) {
        console.warn('Soundstage: trying to connect src ' + src.type + ' with no output "' + outName + '". Dropping connection.');
        return;
    }

    if (!inNode) {
        console.warn('Soundstage: trying to connect dst ' + dst.type + ' with no input "' + inName + '". Dropping connection.');
        return;
    }

    if (isDefined(outOutput) && isDefined(inInput)) {
        if (outOutput >= outNode.numberOfOutputs) {
            console.warn('AudioObject: Trying to .connect() from a non-existent output (' +
                outOutput + ') on output node {numberOfOutputs: ' + outNode.numberOfOutputs + '}. Dropping connection.');
            return;
        }

        if (inInput >= inNode.numberOfInputs) {
            console.warn('AudioObject: Trying to .connect() to a non-existent input (' +
                inInput + ') on input node {numberOfInputs: ' + inNode.numberOfInputs + '}. Dropping connection.');
            return;
        }

        outNode.connect(inNode, outOutput, inInput);
    }
    else {
        outNode.connect(inNode);
    }

    Soundstage.debug && console.log('Soundstage: created connection ', src.id, '"' + src.name + '" to', dst.id, '"' + dst.name + '"');
}

function disconnect(src, dst, outName, inName, outOutput, inInput, connections) {
    var outNode = AudioObject.getOutput(src, outName);

    if (!outNode) {
        return console.warn('AudioObject: trying to .disconnect() from an object without output "' + outName + '".');
    }

    if (!dst) {
        outNode.disconnect();
        Soundstage.debug && console.log('Soundstage: disconnected', src.id, '"' + src.name + '" to', dst.id, '"' + dst.name + '"');
        return;
    }

    var inNode = AudioObject.getInput(dst, inName);

    if (!inNode) {
        return console.warn('AudioObject: trying to .disconnect() an object with no inputs.', dst);
    }

    if (AudioObject.features.disconnectParameters) {
        outNode.disconnect(inNode, outOutput, inInput);
    }
    else {
        disconnectDestination(src, outName, outNode, inNode, outOutput, inInput, connections);
    }

    Soundstage.debug && console.log('Soundstage: disconnected', src.id, '"' + src.name + '" to', dst.id, '"' + dst.name + '"');
}

function disconnectDestination(src, outName, outNode, inNode, outOutput, inInput, connections) {
    outNode.disconnect();

    if (!inNode) { return; }

    var connects = connections.filter(function(connect) {
        return connect.src === src
            && connect.output === (outName || 'default') ;
    });

    if (connects.length === 0) { return; }

    // Reconnect all entries apart from the node we just disconnected.
    var n = connects.length;
    var dst;

    while (n--) {
        dst = connects[n].dst;
        inNode = AudioObject.getInput(dst, connects[n].input);
        outNode.connect(inNode);
    }
}

function Connection(data, resolve) {
    if (!isDefined(data.src)) {
        console.warn('Soundstage: Connection failed. Source not found.', data.src);
        return;
    }

    if (!isDefined(data.dst)) {
        console.warn('Soundstage: Connection failed. Destination not found.', data.dst);
        return;
    }

    var src = this.src = resolve(data.src);
    var dst = this.dst = resolve(data.dst);

    if (isDefined(data.output)) { this.output = data.output; }
    if (isDefined(data.input))  { this.input  = data.input; }

    connect(src, dst, this.output || 'default', this.input || 'default');

    Object.seal(this);
}

Connection.prototype.toJSON = function() {
    return {
        src:    this.src.id,
        dst:    this.dst.id,
        input:  this.input,
        output: this.output
    };
};


// Events

function timeAtDomTime(audio, time) {
    var stamps = audio.getOutputTimestamp();
    return stamps.contextTime + (time - stamps.performanceTime) / 1000;
}

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

var mediaInputs = [];

function isObjectOrId(object, id) {
    return object === id || object.id === id ;
}

function synchronize(add, remove, array1, array2) {
    // Changes in array2 are applied to array1
    var n    = -1;
    var o1, o2, i, value;

    // Loop through the updated array
    while (++n < array2.length) {
        o1 = array1[n];
        o2 = array2[n];

        if (o1 !== undefined && o1 === o2) { continue; }

        i = n;
        while ((o1 = array1[++i]) !== undefined && o1 !== o2);

        // If there are no more items in array1 to check against
        // add a new object, else splice it out of the found index
        o1 = i === array1.length ?
            add(o2) :
            array1.splice(i, 1)[0] ;

        array1.splice(n, 0, o1);
    }

    // Reordering has pushed all removed sparkies to the end of the
    // sparkies. Remove them.
    while (array1.length > array2.length) {
        remove(array1.pop());
    }
}

var actions = Store.reducer({
    objects: Store.actions({
        "create": function(objects, data, constants) {
            var audio     = constants.audio;
            var sequencer = constants.sequencer;
            var output    = constants.output;
            var type      = data.type;
            var object;

            if (!type) {
                throw new Error('Soundstage: Cannot create new object of type ' + type);
            }

            if (data && data.id) {
                object = objects.find(data.id);

                if (object) {
                    throw new Error('Soundstage: Cannot create new object with id of existing object.');
                }
            }

            object = create(audio, data.type, data, sequencer, output, objects);
            objects.push(object);

            return objects;
        },

        "update": function(objects, data, constants) {
            if (!data.objects) { return objects; }

            var audio     = constants.audio;
            var sequencer = constants.sequencer;
            var output    = constants.output;

            update(function(data) {
                return create(audio, data.type, data, sequencer, output, objects);
            }, objects, data.objects);

            return objects;
        },

        "destroy": function(objects, object) {
            remove(objects, object);
            object.destroy();
            return objects;
        },

        "clear": function(objects) {
            var n = objects.length;
            Soundstage.debug && console.log('Removing ' + n + ' objects...');
            while (n--) { objects[n].destroy(); }
            objects.length = 0;
            return objects;
        }
    }),

    connections: Store.actions({
        "update": function(connections, data, constants) {
            if (!data.connections) { return connections; }

            each(function(data) {
                // Ignore pre-existing connections
                if (connections.find(function(connect) {
                    return connect.src === data.src && connect.dst === data.dst;
                })) {
                    return;
                }

                connections.push(new Connection(data, constants.resolveObject));
            }, data.connections);

            return connections;
        },

        "destroy": function(connections, object) {
            var n = connections.length;
            var connection;

            while (n--) {
                connection = connections[n];
                if (connection.src === object || connection.dst === object) {
                    disconnect(connection.src, connection.dst, connection.outputName, connection.inputName, undefined, undefined, connections);
                    remove(connections, connection);
                }
            }

            return connections;
        },

        "connect": function connect(connections, data, constants) {
            var resolve = constants.resolveObject;

            if (connections.filter(matches(data)).length) {
                console.log('Soundstage: Connect failed. Source and dst already connected.');
                return this;
            }

            var connection = new Connection(data, resolve);

            if (!connection) { return connections; }
            connections.push(connection);

            return connections;
        },

        "disconnect": function disconnect(connections, data) {
            var connected = connections.filter(matches(data));

            if (connected.length === 0) { return connections; }

            each(function(connection) {
                var outputName  = isDefined(connection.output) ? connection.output : 'default' ;
                var inputName   = isDefined(connection.input)  ? connection.input  : 'default' ;
                disconnect(connection.src, connection.dst, outputName, inputName, undefined, undefined, connections);
                remove(connections, connection);
            }, connected);

            return connections;
        },

        "clear": function(connections, data) {
            var n = connections.length;
            var c;
            Soundstage.debug && console.log('Deleting ' + n + ' connections...');

            while (n--) {
                c = connections[n];
                disconnect(c.src, c.dst, c.output, c.input, undefined, undefined, connections);
            }

            connections.length = 0;
            return connections;
        }
    }),

    metronome: Store.actions({
        "update": function(metronome, data, constants) {
            if (!data.metronome) { return metronome; }
            return assign(metronome, data.metronome);
        }
    }),

    midi: Store.actions({
        "update": function(midi, data, constants) {
            if (!data.midi) { return midi; }

            var audio         = constants.audio;
            var resolveObject = constants.resolveObject;
            var distribute    = constants.distribute;
            var array         = data.midi;

            function assignTime(event) {
                event[0] = timeAtDomTime(audio, event[0]);
                return event;
            }

            each(function(route) {
                var object = resolveObject(route.target);
                //var transform = resolveTransform(route.transform);

                if (!object) {
                    console.warn('Soundstage: Cannot bind MIDI - object does not exist in objects', route.target, object);
                    return;
                }

                function assignProps(event) {
                    event.object     = object;
                    event.recordable = true;
                    return event;
                }

                route.pipe = pipe(
                    Event.fromMIDI,
                    assignTime,
                    assignProps,
                    distribute
                );

                MIDI.on(route.select, route.pipe);
                midi.push(route);

                Soundstage.debug && console.log('Soundstage: created MIDI stream [' + route.select.join(', ') + '] to', object.id, '"' + object.name + '"');
            }, array);

            return midi;
        },

        "midi-in": function(midi, data, constants) {
            //MIDIInputStream(data.select, resolveObject(data.object));
            midi.push(data);
            return midi;
        },

        "clear": function(midi) {
            Soundstage.debug && console.log('Removing ' + midi.length + ' midi bindings...');
            midi.length = 0;
            return midi;
        }
    }),

    events: Store.actions({
        "update": function(events, data) {
            if (!data.events) { return events; }

            each(function(datum) {
                // If any events are equal to the event we're trying to add, don't.
                if (events.filter(equals(datum)).length) { return; }
                insertBy0(events, datum);
            }, data.events);

            return events;
        }
    }),

    sequences: Store.actions({
        "update": function(sequences, data) {
            if (!data.sequences) { return sequences; }

            update(function(data) {
                var sequence = new Sequence(data);
                sequence.id = data.id || createId(sequences);
                return sequence;
            }, sequences, data.sequences);

            return sequences;
        }
    })
});

export default function Soundstage(data, settings) {
    if (this === undefined || this === window) {
        // Soundstage has been called without the new keyword
        return new Soundstage(data, settings);
    }

    data     = data || nothing;
    settings = settings || nothing;

    if (isDefined(data.version) && data.version !== this.version) {
        throw new Error('Soundstage: version mismatch.', this.version, data.version);
    }

    const soundstage = this;
    const promises   = [];


    // Assign:

    define(soundstage, {
        midi:        { value: new Collection([]), enumerable: true },
        objects:     { value: new Collection([], { index: 'id' }), enumerable: true },
        connections: { value: new Collection([]), enumerable: true },
        mediaChannelCount: { value: undefined, writable: true, configurable: true },
        roundTripLatency:  { value: Soundstage.roundTripLatency, writable: true, configurable: true },
    });


    // Initialise soundstage as an Audio Object with no inputs and
    // a channel merger as an output. Assigns:
    //
    // audio:      audio context

    const audio  = settings.audio || audioContext;
    const output = createOutput(audio, settings.output || audio.destination);

    AudioObject.call(this, audio, undefined, output);
    output.connect(audio.destination);
    Soundstage.inspector && Soundstage.inspector.drawAudioFromNode(output);


    // Initialise audio regions. Assigns:
    //
    // regions:    array

    const regions
        = this.regions
        = (settings.regions || []).map(function(data) {
            return Region(audio, data);
        });


    // Initialise soundstage as a plugin graph. Assigns:
    //
    // plugs:      array
    // connects:   array

    Graph.call(this, data);


    // Initialise soundstage as a Sequence. Assigns:
    //
    // name:       string
    // sequences:  array
    // events:     array

    Sequence.call(this, data);


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

    const findObject     = findIn(this.objects);
    const findSequence   = findIn(this.sequences);
    const selectObject   = selectIn(this.objects);
    const selectSequence = selectIn(this.sequences);
    const distributors   = assign({
        "sequence": function(object, event, stream, transform) {
            var type = typeof event[2];
            var sequence = type === 'string' ?
                isUrl(event[2]) ?
                    fetchSequence(event[2]) :
                selectSequence(event[2]) :
            type === 'number' ?
                findSequence(event[2]) :
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
                    selectObject(event[3]) :
                findObject(event[3]) :
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




    // Initialise as a recorder...

    var recordStream   = RecordStream(this, this.sequences);





    // Create metronome.

    this.metronome = new Metronome(audio, data.metronome, this);
    this.metronome.start(0);


    // Methods

    this.select = selectIn(this);


    // Set up store

    var store = Store(actions, this, {
        // Private constants assigned to action objects
        audio: audio,

        // AudioObject constructors are given restricted access to a subset
        // of sequencer functions
        sequencer: {
            create:     soundstage.create.bind(soundstage),
            cue:        soundstage.cue.bind(soundstage),
            beatAtTime: soundstage.beatAtTime.bind(soundstage),
            timeAtBeat: soundstage.timeAtBeat.bind(soundstage),
            beatAtBar:  soundstage.beatAtBar.bind(soundstage),
            barAtBeat:  soundstage.barAtBeat.bind(soundstage),
            on:         soundstage.on.bind(soundstage),
            off:        soundstage.off.bind(soundstage),
            regions:    soundstage.regions
            //beatAtLoc:  soundstage.beatAtLoc.bind(soundstage),
            //locAtBeat:  soundstage.locAtBeat.bind(soundstage),
        },

        output:     output,

        distribute: function distribute(event) {
            var object = event.object;
            var result = (distributors[event[1]] || distributors.default)(object, event);

            if (event.recordable /*&& object.record*/) {
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
}

setPrototypeOf(Soundstage.prototype, AudioObject.prototype);

define(Soundstage.prototype, {
    version: { value: 0 },
    beat:          getOwnPropertyDescriptor(Sequencer.prototype, 'beat'),
    status:        getOwnPropertyDescriptor(Sequencer.prototype, 'status')
});

assign(Soundstage.prototype, Sequencer.prototype, Graph.prototype, {
    timeAtDomTime: function(domTime) {
        return timeAtDomTime(this.audio, domTime);
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
            if (data.slug) { stage.slug = data.slug; }
            else { stage.slug = stage.slug || slugify(stage.name); }

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
    },

    toJSON: function() {
        return assign({}, this, {
            connections: this.connections.length ? this.connections : undefined,
            events:      this.events.length ?      this.events :      undefined,
            midi:        this.midi.length ?        this.midi :        undefined,
            objects:     this.objects.length ?     this.objects :     undefined,
            sequences:   this.sequences.length ?   this.sequences :   undefined
        });
    }
});


var modules = {};

assign(Soundstage, {
    debug: true,
    roundTripLatency: 0.020,

    import: function(path) {
        path = /\.js$/.test(path) ? path : path + '.js' ;

        // Don't request the module again if it's already been registered
        return modules[path] || (
            modules[path] = import(path)
            .then(function(module) {
                register(path, module.default, module.default.defaults);
                return module.default;
            })
        );
    },

    create:           create,
    register:         register,
    defaults:         retrieveDefaults
});
