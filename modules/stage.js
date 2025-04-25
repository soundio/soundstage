
import Data           from 'fn/data.js';
import get            from 'fn/get.js';
import matches        from 'fn/matches.js';
import nothing        from 'fn/nothing.js';
import toDashCase     from 'fn/to-dash-case.js';
import Transport      from './transport.js';
import * as nodes     from './nodes.js';
import AudioObject    from './audio-object.js';
import Sequencer      from '../objects/sequencer.js';
import { createContext } from './context.js';
import { isAudioParam } from './param.js';
import { log }        from './log.js';


const assign  = Object.assign;
const define  = Object.defineProperties;
const version = '0.1';
const types   = {};


function generateId(objects) {
    let id = 0;
    while (++id && objects.find((node) => node.id === id));
    return id;
}

function remove(objects, object) {
    const i = objects.indexOf(object);
    if (i === -1) return objects;
    // Make operation observable
    Data.of(objects).splice(i, 1);
    return objects;
}

function isPipedTo(stream1, stream2) {
    let n = 0;
    while (stream2[--n]) if (stream2[n] === stream1) return true;
}

function getPipesFromObject(pipes = [], inputObject) {
    const inputs = Soundstage.getInputs(inputObject);
    return Object.entries(inputs).reduce((pipes, [inputKey, input]) => {
        // Ignore non-numeric output indexes ('size', 'names', etc.)
        if (!/^\d/.test(inputKey)) return pipes;
        // Loop over outputs
        let i = 0, output;
        while (output = input[--i]) {
            const outputObject = output.object;
            let outputKey;
            for (outputKey in Soundstage.getOutputs(outputObject)) {
                // Ignore non-numeric input indexes ('size', 'names', etc.)
                if (!/^\d/.test(outputKey)) continue;
                // Check if output stream is piped to this input stream... why are we checking this tho?
                if (!isPipedTo(outputObject.output(outputKey), input)) continue;
                // Push the numbers into the pipes array
                pipes.push(outputObject.id, parseInt(outputKey, 10), inputObject.id, parseInt(inputKey, 10));
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

    create(type, settings = {}, id = generateId(this.objects)) {
        if (window.DEBUG && !types[type]) {
            throw new Error('Soundstage.create() cannot create object of unregistered type "' + type + '"');
        }

        if (type === 'audio-in' && this.objects.find((object) => object.type === 'audio-in')) {
            throw new Error('Soundstage.create() only 1 audio-in object allowed');
        }

        if (type === 'audio-out' && this.objects.find((object) => object.type === 'audio-out')) {
            throw new Error('Soundstage.create() only 1 audio-out object allowed');
        }

        const stage = Data.objectOf(this);

        // Create object
        const object = new types[type](stage.transport, settings);

        // Assign stage properties
        define(object, {
            id:    { value: id, enumerable: true },
            // TEMP: Support sound.io UI which attaches style to objects
            style: { value: settings.style || {}, writable: true }
        });

        // Operate on Data proxy of objects so that changes are observed
        Data.of(stage.objects).push(object.done(() => remove(stage.objects, object)));

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
    pipes:       { value: nothing, writable: false },
    parameters:  { value: nothing, writable: false },
    status: Object.getOwnPropertyDescriptor(Sequencer.prototype, 'status')
});
