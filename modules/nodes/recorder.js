
import { noop, nothing } from '../../../fn/fn.js';
import { getPrivates } from '../utilities/privates.js';

const assign = Object.assign;


function resolve(privates, buffers) {
    privates.resolve(buffers);
    privates.promise = undefined;
    privates.resolve = undefined;
}

export default class Recorder extends AudioWorkletNode {
    constructor(context, settings, stage = nothing, notify = noop) {
        super(context, 'recorder');
        const node     = this;
        const privates = getPrivates(this);

        this.startTime = undefined;
        this.stopTime  = undefined;
        this.duration  = settings.duration;

        this.port.onmessage = (e) => {
            if (e.data.type === 'done') {
//console.log('DONE', e.data.buffers);
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
        time = time || this.context.currentTime;

        this.port.postMessage({
            type: 'start',
            sample: Math.round((time - this.context.currentTime) * this.context.sampleRate),
            bufferLength: Math.round(this.duration * this.context.sampleRate)
        });

        this.startTime = time;
        return this;
    }

    stop(time) {
        time = time || this.context.currentTime;
//console.log('STOP', time, this.port);
        this.port.postMessage({
            type: 'stop',
            bufferLength: Math.round((time - this.startTime) * this.context.sampleRate)
        });

        this.stopTime = time;
        return this;
    }

    then(fn) {
        const privates = getPrivates(this);

        if (!privates.promise) {
            privates.promise = new Promise((resolve, reject) => {
                privates.resolve = resolve;
            });
        }

        return privates.promise.then(fn);
    }
}
