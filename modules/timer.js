
import remove from '../../fn/modules/remove.js';
import config from '../config.js';

const worker = new Worker(config.basePath + 'modules/timer.worker.js');
const assign = Object.assign;

export const defaults = {
    lookahead: 0.12,
    duration:  0.24
};

const startMessage = {
    command: 'start'
};

const stopMessage = {
    command: 'stop'
};

const timers = [];

let active = false;

function stop() {
    worker.postMessage(stopMessage);
    active = false;
}

worker.onmessage = function frame(e) {
    let n = -1;

    while (++n < timers.length) {
        timers[n].frame(e.data);
    }

    if (!timers.length) {
        stop();
    }
};

export default function Timer(now, duration = defaults.duration, lookahead = defaults.lookahead) {
    this.now         = now;
    this.requests    = [];
    this.buffer      = [];
    this.currentTime = 0;
    this.lookahead   = lookahead;
    this.duration    = duration;
}

assign(Timer.prototype, {
    frame: function(count) {
        const currentRequests = this.requests;

        this.requests    = this.buffer;
        this.buffer      = currentRequests;
        this.currentTime = this.now() + this.duration + this.lookahead;

        let request;

        while ((request = currentRequests.shift())) {
            request(this.currentTime);
        }

        if (!this.requests.length) {
            this.active = false;
            remove(timers, this);
        }

        // For debugging
        //if (Soundstage.inspector) {
        //	Soundstage.inspector.drawCue(now(), time);
        //}
    },

    request: function(fn) {
        if (!active) {
            startMessage.duration = this.duration;
            worker.postMessage(startMessage);
            active = true;
        }

        if (!this.active) {
            this.active = true;
            timers.push(this);
        }

        this.requests.push(fn);

        // Return the callback for use as an identifier, because why not
        return fn;
    },

    cancel: function(fn) {
        remove(this.requests, fn);

        if (this.requests.length === 0) {
            this.active = false;
            remove(timers, this);

            if (!timers.length) {
                stop();
            }
        }
    }
});
