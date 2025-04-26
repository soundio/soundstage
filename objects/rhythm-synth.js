import get          from 'fn/get.js';
import overload     from 'fn/overload.js';
import Data         from 'fn/data.js';
import Signal       from 'fn/signal.js';
import Stream       from 'fn/stream/stream.js';
import Events       from '../modules/events.js';
import StageObject  from '../../modules/graph-node.js';
import Waveform     from '../../modules/waveform.js';
import { eventsToSamples, samplesToEvents } from '../../modules/rhythm.js';


const assign   = Object.assign;
const defaults = {};


function mergeEvents(events, incomes) {
    let n = -1, event;
    while (event = events[++n]) {
        // No more incoming events, shorten events and get out of here
        if (!incomes[n]) {
            events.length = n;
            return events;
        }

        // Set existing event to incoming event data
        event[0] = incomes[n][0];
        event[2] = incomes[n][2];
        event[3] = incomes[n][3];
    }

    // Push any extra incomes into events
    --n;
    while (incomes[++n]) events.push(Events.from(incomes[n]));
    return events;
}


/* RhythmSynth */

export default class RhythmSynth extends StageObject {
    #events;

    constructor(transport, settings = {}) {
        // extends StageNode super(id, inputs, outputs)
        const inputs = {
            0: Stream.each(overload(get(1), {
                // TODO
                meter: (event) => {},
                start: (event) => {}
            })),
            size: 1
        };
        const outputs = { size: 1 };
        super(transport, inputs, outputs);

        this.duration = settings.duration || 1;
        this.events   = settings.events;

        const output0 = this.output(0);
        let h = 0;
        this.PLAY = () => {
            const events = this.events;
            let n = -1;
            while (events[++n]) output0.push(Events.of(
                events[n][0] + (++h),
                events[n][1],
                events[n][2],
                events[n][3]
            ));
            if (!this.STOPPED) setTimeout(this.PLAY, 1000);
        }
    }

    get events() {
        // TEMP pitch = 60
        const incoming = samplesToEvents(this.wave.samples, this.duration, 60);
        return mergeEvents(this.#events, incoming);
    }

    set events(events) {
        this.#events = events.map(event => Events.from(event));
        const samples = eventsToSamples(Data.of(this.#events), this.duration);
console.log('RhythmDesigner: new waveform from events, samples: ' + samples.length + ' duration: ' + this.duration);
        Data.of(this).wave = Waveform.from(samples);
    }

    start() {
        this.PLAY();
    }

    stop() {
        // TEMP
        this.STOPPED = true;
    }
}
