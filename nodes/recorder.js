
import noop     from '../../fn/modules/noop.js';
import nothing  from '../../fn/modules/nothing.js';
import Privates from '../../fn/modules/privates.js';
import Playable from '../modules/mixins/playable.js';

const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

function resolve(privates, buffers) {
    privates.resolve(buffers);
    privates.promise = undefined;
    privates.resolve = undefined;
}

export default class Recorder extends AudioWorkletNode {
    constructor(context, settings, stage = nothing, notify = noop) {
        super(context, 'recorder');
        const privates = Privates(this);

        this.startTime = undefined;
        this.stopTime  = undefined;
        this.duration  = settings && settings.duration || 120;

        this.port.onmessage = (e) => {
            if (e.data.type === 'done') {
                this.buffers = e.data.buffers;
                notify(this, 'buffers');
                if (privates.promise) {
                    resolve(privates, e.data.buffers);
                }
            }
        };

        // It's ok, this doesn't emit anything
        this.connect(context.destination);
    }

    start(time) {
        Playable.prototype.start.apply(this, arguments);

        this.port.postMessage({
            type: 'start',
            time: this.startTime
        });

        return this;
    }

    stop(time) {
        time = time || this.context.currentTime;

        // Adjust stopTime such that the difference between startTime and
        // stopTime is equivalent to an integer number of sample frames
        time = this.startTime + Math.round((time - this.startTime) * this.context.sampleRate) / this.context.sampleRate;

        Playable.prototype.stop.call(this, time);

        // Tell the worklet to stop recording
        this.port.postMessage({
            type: 'stop',
            time: this.stopTime
        });

        return this;
    }

    then(fn) {
        const privates = Privates(this);

        if (!privates.promise) {
            privates.promise = new Promise((resolve, reject) => {
                privates.resolve = resolve;
            });
        }

        return privates.promise.then(fn);
    }
}

// Mix in property definitions
define(Recorder.prototype, {
    status: getOwnPropertyDescriptor(Playable.prototype, 'status')
});

Recorder.preload = function(base, context) {
    return context
    .audioWorklet
    .addModule(base + '/nodes/recorder.worklet.js?cachebuster=1');
};
