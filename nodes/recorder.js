
import { noop, nothing } from '../../fn/module.js';
import { Privates } from '../../fn/module.js';
import PlayNode from './play-node.js';

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
        PlayNode.prototype.start.apply(this, arguments);

        this.port.postMessage({
            type: 'start',
            sample: Math.ceil((time - this.context.currentTime) * this.context.sampleRate),
            bufferLength: Math.ceil(this.duration * this.context.sampleRate)
        });

        return this;
    }

    stop(time) {
        PlayNode.prototype.stop.call(this, time);

        // Round duration such that stopTime - startTime is a duration
        // corresponding to an exact number of samples
        const length = Math.ceil((this.stopTime - this.startTime) * this.context.sampleRate);
        this.stopTime = this.startTime + length / this.context.sampleRate;

        // Tell the worklet to stop recording
        this.port.postMessage({
            type: 'stop',
            bufferLength: length
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

Recorder.preload = function(context) {
    return context
    .audioWorklet
    .addModule('./nodes/recorder.worklet.js');
};
