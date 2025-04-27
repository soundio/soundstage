
import Graph          from '../modules/graph.js';
import Playable       from '../modules/playable.js';
import NodeObject     from '../modules/node-object.js';
import parseFrequency from '../modules/parse/parse-frequency.js';
import parseGain      from '../modules/parse/parse-gain.js';
import Tick           from '../nodes/tick.js';

const assign = Object.assign;
const define = Object.defineProperties;

export default class Metronome extends NodeObject {
    #playstream;

    constructor(transport, settings) {
        super(transport, 'tick');

        // Mix in .start(), .stop(), .status
        new Playable(transport.context, this);

        this.pitchOnBar  = 600;
        this.pitchOnBeat = 300;
        NodeObject.assign(this, settings);

        this.start();
    }

    get attack()       { return this.node.attack; }
    set attack(number) { this.node.attack = number; }

    get release()       { return this.node.release; }
    set release(number) { this.node.release = number; }

    get resonance()       { return this.node.resonance; }
    set resonance(number) { this.node.resonance = number; }

    start(time) {
        Playable.prototype.start.apply(this, arguments);

        const context       = this.context;
        const node          = this.node;
        const transport     = this.transport;
        //const frequencyBeat = parseFrequency(this.pitchOnBeat);
        //const frequencyBar  = parseFrequency(this.pitchOnBar);

        this.#playstream = transport.frames.each((frame) => {
            const { t1, t2, b1, b2 } = frame;

            // Find the first full beat before b1 – note that Math.floor() does
            // not give us what we want if b1 is already a full beat
            let beat = Math.ceil(b1) - 1;
            let time, bar;
            while (++beat < b2) {
                bar  = transport.barAtBeat(beat);
                time = transport.timeAtBeat(beat);
//console.log('Beat', beat, 'bar', bar, 'at time', time, 'in frame', t1, t2, context.currentTime < t1);
                node
                .start(time, bar % 1 ? this.pitchOnBeat : this.pitchOnBar)
                .stop(time + 0.001);
            }
        });

        return this;
    }

    stop(time) {
        Playable.prototype.stop.apply(this, arguments);
        this.#playstream.stop(this.stopTime);
        return this;
    }

    static config = assign({
        pitchOnBar:  { min: 180, max: 2880, law: 'log' },
        pitchOnBeat: { min: 180, max: 2880, law: 'log' }
    }, Tick.config)
}

// Mixin property definitions
define(Metronome.prototype, {
    attack: { enumerable: true },
    release: { enumerable: true },
    resonance: { enumerable: true },
    status: Object.getOwnPropertyDescriptor(Playable.prototype, 'status'),
});
