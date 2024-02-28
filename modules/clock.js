
import Privates from '../../fn/modules/privates.js';
import Playable from './mixins/playable.js';

const DEBUG  = false;//window.DEBUG;

const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

const properties = {
    /**
    .context
    The AudioContext.
    **/
    context:       { writable: false },

    /**
    .startTime
    The time at which the clock was scheduled to start.
    **/
    startTime:     { writable: true, value: undefined },

    /**
    .startLocation
    **/
    startLocation: { writable: true, value: undefined },

    /**
    .stopTime
    The time at which the clock has been scheduled to stop.
    **/
    stopTime:      { writable: true, value: undefined }
};

export default function Clock(context) {
    // Properties
    properties.context.value = context;
    define(this, properties);
}

assign(Clock.prototype, {
    // Todo: Inherit start/stop from Playable

    start: function(time) {
        // If clock is running, don't start it again
        if (this.startTime !== undefined && this.stopTime === undefined) {
            if (DEBUG) { console.warn('Attempted clock.start() when clock is already started (or scheduled to start)'); }
            return this;
        }

        if (this.context.currentTime < this.stopTime) {
            if (DEBUG) { throw new Error('Attempted clock.start() at a time before clock.stopTime'); }
            return this;
        }

        this.startTime     = time !== undefined ? time : this.context.currentTime ;
        this.startLocation = undefined;
        this.stopTime      = undefined;

        //Privates(this).notify(this, 'playing');

        return this;
    },

    stop: function(time) {
        // If clock is running, don't start it again
        if (this.startTime === undefined || this.startTime < this.stopTime) {
            if (DEBUG) { throw new Error('Clock .stop(time) attempted on stopped clock'); }
            else { return this; }
        }

        time = time === undefined ? this.context.currentTime : time ;

        if (time < this.startTime) {
            throw new Error('Clock .stop(time) attempted with time less than .startTime');
        }

        this.stopTime = time;
        //Privates(this).notify(this, 'playing');

        return this;
    }
});

// Mix in property definitions
define(Clock.prototype, {
    status: getOwnPropertyDescriptor(Playable.prototype, 'status')
});
