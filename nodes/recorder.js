
import { noop, nothing, Privates } from '../../fn/module.js';
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
console.log('Data', e.data);
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
            time: this.startTime
        });

        return this;
    }

    stop(time) {
        PlayNode.prototype.stop.call(this, time);

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

Recorder.preload = function(base, context) {
    return context
    .audioWorklet
    .addModule(base + '/nodes/recorder.worklet.js?cachebuster=1');
};
