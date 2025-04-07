
import Graph          from '../modules/graph.js';
import Playable       from '../modules/playable.js';
import StageObject    from '../modules/object.js';
import { create }     from '../modules/nodes.js';
import parseFrequency from '../modules/parse/parse-frequency.js';
import parseGain      from '../modules/parse/parse-gain.js';

const define = Object.defineProperties;

export default class Metronome extends StageObject {
    #transport;
    #playstream;

    constructor(id, data, context, transport) {
        super(id, data);

        Playable.call(this, context);
        this.node = create(context, 'tick');
        this.#transport = transport;

        this.pitchOnBar  = 600;
        this.pitchOnBeat = 300;

        this.start();
    }

    start(time) {
        Playable.prototype.start.apply(this, arguments);

        const context       = this.context;
        const node          = this.node;
        const transport     = this.#transport;
        const frequencyBeat = parseFrequency(this.pitchOnBeat);
        const frequencyBar  = parseFrequency(this.pitchOnBar);

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
                .start(time, bar % 1 ? frequencyBeat : frequencyBar)
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
}

// Mixin property definitions
define(Metronome.prototype, {
    status: Object.getOwnPropertyDescriptor(Playable.prototype, 'status'),
});
