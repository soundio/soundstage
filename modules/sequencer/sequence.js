
import get      from '../../../fn/modules/get.js';
import nothing  from '../../../fn/modules/nothing.js';
import Privates from '../../../fn/modules/privates.js';

import Event, { isRateEvent, isValidEvent } from '../event.js';
import Clock                                from '../clock.js';
import { createId, matchesId }              from '../utilities.js';
import { beatAtLocation, locationAtBeat }   from '../location.js';

const A      = Array.prototype;
const assign = Object.assign;
const freeze = Object.freeze;

const rate0 = freeze(new Event(0, 'rate', 1));


export default function Sequence(transport, data) {
    //const privates = Privates(this);

    // Super
    Clock.call(this, transport.context);

    // Transport and sequence
    this.transport = transport;
    this.events    = data.events;
    this.sequences = data.sequences;
}

assign(Sequence.prototype, Clock.prototype, {
    /**
    .beatAtTime(time)
    Returns the beat at a given `time`.
    **/
    beatAtTime: function(time) {
        if (window.DEBUG && time < 0) {
            throw new Error('Sequence.beatAtTime(time) does not accept -ve time values');
        }

        const startLoc = this.startLocation
            || (this.startLocation = this.transport.beatAtTime(this.startTime));
        const events   = this.events ?
            this.events.filter(isRateEvent) :
            nothing ;
        const timeLoc  = this.transport.beatAtTime(time);

        return beatAtLocation(events, rate0, timeLoc - startLoc);
    },

    /**
    .timeAtBeat(beat)
    Returns the time at a given `beat`.
    **/
    timeAtBeat: function(beat) {
        const startLoc  = this.startLocation
            || (this.startLocation = this.transport.beatAtTime(this.startTime));
        const events    = this.events ?
            this.events.filter(isRateEvent) :
            nothing ;
        const beatLoc = locationAtBeat(events, rate0, beat);

        return this.transport.timeAtBeat(startLoc + beatLoc);
    }
});
