
import id          from 'fn/id.js';
import matches     from 'fn/matches.js';
import noop        from 'fn/noop.js';
import Stream      from 'fn/stream/stream.js';
import Distributor from '../modules/object/distributor.js';
import Playable    from '../modules/playable.js';
import Sequence    from '../modules/sequence.js';
import StageObject from '../modules/stage-object.js';
import Events      from '../modules/events.js';
import { isAudioParam } from '../modules/param.js';


const define = Object.defineProperties;


export default class Sequencer extends StageObject {
    #sequences = {};

    constructor(transport, settings = {}) {
        super(transport, 1, 1024);

        // Mix in playable for .start(), .stop(), .startTime, .stopTime and .status
        new Playable(transport.context, this);

        // Define .events
        this.events = settings.events ?
            // Is it an Events object or Float32Array already?
            settings.events instanceof Float32Array ? settings.events :
            // Or another sort of array, that may need parsing?
            settings.events.length !== undefined ? Events.from(settings.events) :
            // A string, god forbid?
            typeof settings.events === 'string' ? parseEvents(settings.events) :
            // Something else?
            ((value) => { throw new TypeError('Sequencer() does not accept object for settings.events'); })(settings.events):
            // Create an empty events array
            new Events({ size: 0, maxSize: 128 }) ;

        // Define .sequences
        this.sequences = settings.sequences || [];
    }

    start(time, id = 0) {
        Playable.prototype.start.call(this, time);

        const transport = this.transport;
        const events = id ?
            this.sequences.find(matches({ id })) :
            this.events ;
        const sequence = new Sequence(this.events, this.input(0));

        // Maintain a registry of playing sequences
        const sequences = this.#sequences[id] || (this.#sequences[id] = []);
        sequences.push(sequence);

        // At the moment launching transport AFTER sequence gaurantees we get an
        // immediate frame. But it may be already running so that's problem.
        // TODO! Make frames() spit out a frame whenever it's connected to!
        // Ok, done, but we still need to start sequence before piping it
        const startLocation = transport.beatAtTime(this.startTime);
        sequence.start(startLocation);
        transport.frames.pipe(sequence);

        // If transport is not running run it
        if (transport.status === 'idle') transport.start(this.startTime);
        return this;
    }

    stop(time, id) {
        if (id) {
            if (this.#sequences[id]) {
                let n = -1, sequence;
                while (sequence = this.#sequences[id][++n]) sequence.stop(this.stopTime);
            }

            return this;
        }

console.log('Sequencer.stop()', this.stopTime);
        Playable.prototype.stop.call(this, time);
        const transport = this.transport;
        for (id in this.#sequences) this.stop(transport.beatAtTime(this.stopTime), id);
        return this;
    }
}

define(Sequencer.prototype, {
    status: Object.getOwnPropertyDescriptor(Playable.prototype, 'status')
});
