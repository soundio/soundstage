
import { remove } from '../../fn/fn.js';
import globalConfig from './config.js';

const assign         = Object.assign;
const defineProperty = Object.defineProperty;

export const config = {
	lookahead: 0.08,
    interval:  0.08
};

const worker = new Worker(globalConfig.basePath + 'modules/timer.worker.js');

const startMessage = {
    command: 'start',
    duration: config.interval
};

const stopMessage = {
    command: 'stop'
};

let active = false;
let timers = [];

function stop() {
    worker.postMessage(stopMessage);
    active = false;
}

worker.onmessage = function frame(count) {
    let n = -1;

    while (++n < timers.length) {
        timers[n].frame(count);
    }

    if (!timers.length) {
        stop();
    }
};

export default function Timer(now) {
	this.now         = now;
    this.requests    = [];
    this.buffer      = [];
	this.currentTime = 0;
}

assign(Timer.prototype, {
    frame: function(count) {
        const currentRequests = this.requests;

        this.requests    = this.buffer;
        this.buffer      = currentRequests;
        this.currentTime = this.now() + config.interval + config.lookahead;

        let request;

        while (request = currentRequests.shift()) {
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
