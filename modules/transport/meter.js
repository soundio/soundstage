
import nothing from 'fn/nothing.js';
import Events  from '../events.js';


var assign = Object.assign;
var freeze = Object.freeze;
var meter0 = freeze({ 0: 0, 1: 'meter', 2: 4, 3: 1, bar: 0 });


export function barAtBeat(events, beat) {
    let barCount = 0;
    let event = meter0;
    let n = -1;

    while (events[++n] && events[n][0] < beat) {
        barCount += Math.floor((events[n][0] - event[0]) / event[2]) ;
        event = events[n];
    }

    return barCount + (beat - event[0]) / event[2];
}

export function beatAtBar(events, bar) {
    let barCount = 0;
    let event = meter0;
    let n = -1;

    while (events[++n]) {
        const bars = barCount + (events[n][0] - event[0]) / event[2] ;
        if (bars >= bar) { break; }
        barCount = bars;
        event = events[n];
    }

    return event[0] + (bar - barCount) * event[2];
}

export default function Meter(events) {
    this.events = events;
}

assign(Meter.prototype, {
    /**
    .barAtBeat(beat)
    Returns the bar at a given `beat`.
    **/
    barAtBeat: function(beat) {
        return barAtBeat(this.events && this.events.filter(Events.isMeterEvent) || nothing, beat);
    },

    /**
    .beatAtBar(bar)
    Returns the beat at the start of a given `bar`.
    **/
    beatAtBar: function(bar) {
        return beatAtBar(this.events && this.events.filter(Events.isMeterEvent) || nothing, bar);
    },

    /**
    .meterAtTime()
    **/
    meterAtTime: function(time) {
        const { meters } = Privates(this);
        const beat = this.beatAtTime(time);

        let n = -1;
        while(++n < meters.length && meters[n][0] <= beat);
        console.log(time, beat, n, meters[n]);
        return meters[n - 1];
    }
});
