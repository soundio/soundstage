
import Data           from 'fn/data.js';
import get            from 'fn/get.js';
import matches        from 'fn/matches.js';
import nothing        from 'fn/nothing.js';
import toDashCase     from 'fn/to-dash-case.js';
import Transport      from './modules/transport.js';
import * as nodes     from './modules/nodes.js';
import AudioObject    from './modules/audio-object.js';
import Sequencer      from './objects/sequencer.js';
import { createContext } from './modules/context.js';
import { isAudioParam } from './modules/param.js';
import { log }        from './modules/log.js';

import Envelope       from './nodes/envelope.js';
import EQ             from './nodes/eq.js';
import Flanger        from './nodes/flanger.js';
import Meter          from './nodes/meter.js';
import Mix            from './nodes/mix.js';
import Noise          from './nodes/noise.js';
import Polyphonic     from './nodes/polyphonic.js';
import SampleMap      from './nodes/sample-map.js';
import Tick           from './nodes/tick.js';
import Tone           from './nodes/tone.js';
import Looper         from './nodes/looper.js';
import Saturator      from './nodes/saturator.js';
import BufferRecorder from './nodes/buffer-recorder.js';
import TapeSaturator  from './nodes/tape-saturator.js';

import AudioIn         from './objects/audio-in.js';
import AudioOut        from './objects/audio-out.js';
import MidiInObject    from './objects/midi-in.js';
import MidiOutObject   from './objects/midi-out.js';
import TransformObject from './objects/transform.js';
import MetronomeObject from './objects/metronome.js';

nodes.register('envelope',        Envelope);
nodes.register('eq',              EQ);
nodes.register('flanger',         Flanger);
nodes.register('meter',           Meter);
nodes.register('mix',             Mix);
nodes.register('noise',           Noise);
nodes.register('polyphonic',      Polyphonic);
nodes.register('sample',          SampleMap);
nodes.register('tick',            Tick);
nodes.register('tone',            Tone);
nodes.register('looper',          Looper);
nodes.register('saturator',       Saturator);
nodes.register('buffer-recorder', BufferRecorder);
nodes.register('tape-saturator',  TapeSaturator);

const assign  = Object.assign;
const define  = Object.defineProperties;
const version = '0.1';
const types   = {};


function generateId(objects) {
    let id = 0;
    while (++id && objects.find((node) => node.id === id));
    return id;
}

function remove(objects, node) {
    const i = objects.indexOf(node);
    objects.splice(i, 1);
    return objects;
}

function isPipedTo(stream1, stream2) {
    let n = 0;
    while (stream2[--n]) if (stream2[n] === stream1) return true;
}

function getPipesFromObject(pipes = [], object) {
    const outputs = Soundstage.getOutputs(object);
    return Object.entries(outputs).reduce((pipes, [outputKey, output]) => {
        // Ignore non-numeric output indexes ('size', 'names', etc.)
        if (!/^\d/.test(outputKey)) return pipes;
        // Loop over outputs
        let o = -1, input;
        while (input = output[++o]) {
            const inputObject = input.object;
            let inputKey;
            for (inputKey in Soundstage.getInputs(inputObject)) {
                // Ignore non-numeric input indexes ('size', 'names', etc.)
                if (!/^\d/.test(inputKey)) continue;
                // Check if output stream is piped to this input stream
                if (!isPipedTo(output, inputObject.input(inputKey))) continue;
                // Push the numbers into the pipes array
                pipes.push(object.id, parseInt(outputKey, 10), inputObject.id, parseInt(inputKey, 10));
            }
        }
        return pipes;
    }, pipes);
}

function getPipesFromObjects(objects) {
    return objects.reduce(getPipesFromObject, []);
}

function getConnectionsFromObject(connections = [], object) {
    const objectConnections = AudioObject.getConnections(object);
    if (objectConnections) connections.push.apply(connections, objectConnections);
    return connections;
}

function getConnectionsFromObjects(objects) {
    return objects.reduce(getConnectionsFromObject, []);
}

function destroy(object) {
    object.destroy();
}


/** Soundstage() **/

export default class Soundstage extends Sequencer {
    constructor(context = createContext(), objects = [], pipes = [], connections = [], events, sequences, name = '') {
        const transport = new Transport(context);

        super(transport, { events, sequences });

        define(this, {
            name:     { value: name, enumerable: true, writable: true },
            context: { value: context },
            // An odd one - to support data observer proxies returning proxies
            // on 'get', a property must be writable or configurable. TODO: Really
            // this is a problem that should be addressed in fn/data.js
            objects: { value: [], enumerable: true, writable: true }
        });

        // Output 0 is our distributor. Its indexed outputs are event routes.
        // Wooo. This might be a little wiffy. let's try it tho.
        const distributor = this.input(0);

        // Create objects
        objects.forEach((setting) => {
            const object = this.create(setting.type, setting, setting.id);
            distributor[setting.id] = object.input(0);
        });

        // Pipe objects to one another
        const length = pipes.length;
        let n = -1;
        while (++n < length) {
            log('Pipe', pipes[n] + '.output(' + pipes[n+1] + ') to ' + pipes[n+2] + '.input(' + pipes[n+3] + ')');

            const outputNode = this.objects.find(matches({ id: pipes[n] }));
            const output     = outputNode.output(pipes[++n]);
            const inputNode  = this.objects.find(matches({ id: pipes[++n] }));
            const input      = inputNode.input(pipes[++n]);

            output.pipe(input);
        }

        // Connect nodes to one another
        const clength = connections.length;
        let c = -1;
        while (++c < clength) {
            log('Connect', connections[c] + '-' + connections[c + 1] + ' to ' + connections[c + 2] + '-' + connections[c + 3]);

            const outputObjectId = connections[c];
            const outputObject   = this.objects.find(matches({ id: outputObjectId }));
            const outputIndex    = connections[++c];
            const inputObjectId  = connections[++c];
            const inputObject    = this.objects.find(matches({ id: inputObjectId }));
            const inputIndex     = connections[++c];

            outputObject.connect(inputObject, outputIndex, inputIndex);
        }
    }

    get(id) {
        return this.objects.find((object) => object.id === id);
    }

    create(type, settings, id = generateId(this.objects)) {
        if (window.DEBUG && !types[type]) {
            throw new Error('Soundstage.create() cannot create object of unregistered type "' + type + '"');
        }

        if (type === 'audio-in' && this.objects.find((object) => object.type === 'audio-in')) {
            throw new Error('Soundstage.create() only 1 audio-in object allowed');
        }

        if (type === 'audio-out' && this.objects.find((object) => object.type === 'audio-out')) {
            throw new Error('Soundstage.create() only 1 audio-out object allowed');
        }

        // Warning! Soundstage may be a Data proxy at this point, make sure we are
        // dealing with an unproxied stage
        const data  = settings.node || settings.data;
        const stage = Data.objectOf(this);

        // Create object
        const object = new types[type](stage.transport, data);
        define(object, {
            id:    { value: id, enumerable: true },
            style: { value: settings.style, writable: true }
        });

        // Push to Data proxy of objects so that changes are observed
        Data.of(this.objects).push(object);
        //Data.of(this.objects).push(object.done(() => remove(this.objects, object)));

        log('Soundstage', 'create', type);
        return object;
    }

    saveAudioBuffers(fn) {
        return Promise.all(this.objects.map((object) => {
            return object.saveAudioBuffers ?
                object
                .saveAudioBuffers(fn)
                .catch((error) => {
                    console.error(`Failed to save audio buffers in object ${ object.id }`);
                    throw error;
                }) :
                null ;
        }));
    }

    destroy() {
        super.destroy();
        this.objects.forEach(destroy);
        return this;
    }

    toJSON() {
        return assign({
            version,
            pipes:       getPipesFromObjects(this.objects),
            connections: getConnectionsFromObjects(this.objects)
        }, super.toJSON());
    }

    static load(data = {}) {
        const context = createContext();
        return nodes
        .preload(context)
        .then((preloaded) => {
            if (preloaded.length) log('Soundstage', 'preloaded', preloaded.map(get('name')).join(', '));
            return new Soundstage(context, data.objects, data.pipes, data.connections, data.events, data.sequences, data.name);
        });
    }

    static types = types;

    static register() {
        let constructor, type;
        let n = -1;
        while (constructor = arguments[++n]) {
            type = toDashCase(constructor.name);
            //log('Soundstage', 'register', type);
            types[type] = constructor;
        }
    }
}

define(Soundstage.prototype, {
    connections: { value: nothing, writable: false },
    parameters:  { value: nothing, writable: false },
    status: Object.getOwnPropertyDescriptor(Sequencer.prototype, 'status')
});


Soundstage.register(MidiInObject, MidiOutObject, AudioIn, AudioOut, TransformObject, MetronomeObject, Sequencer);


Soundstage.register.apply(Soundstage,
    Object
    .entries(nodes.constructors)
    .map(([type, Node]) => {
        return define(
            class extends AudioObject {
                constructor(transport, settings) {
                    super(transport);
                    // Give audio object a single node, make the property non-enumerable
                    define(this, { node: { value: new Node(transport.context, settings) }});
                    // Expose params
                    let name;
                    for (name in this.node) {
                        if (isAudioParam(this.node[name])) this[name] = this.node[name];
                    }
                }
            },
            { name: { value: Node.name.replace(/(?:Source)?Node$/, '') }
        })
    })
);
