import Signal, { TimedSignal } from 'fn/signal.js';
import { t60 } from './constants.js';
import { schedule } from './param.js';


/**
ParamSignal(name, object)
A signal that wraps an AudioParam and remains invalid until some time in the
future after a call to `invalidateUntil(time)`.
**/

export default class ParamSignal extends TimedSignal {
    constructor(context, param) {
        if (!(param instanceof AudioParam)) {
            throw new Error(`Signal.param() param is not an AudioParam`);
        }

        // Return signal already cached on param
        if (param.signal instanceof ParamSignal) return param.signal;

        super();
        this.context = context;
        this.param   = param;

        // Cache signal on param
        param.signal = this;
    }

    // Overrides TimedSignal.evaluate()
    evaluate() {
        return this.param.value;
    }

    // Overrides TimedSignal.getTime()
    getTime() {
        return this.context.currentTime;
    }

    static from(name, node) {
        return new ParamSignal(node.context, node[name]);
    }

    /*
    stop() {
        delete this.param.signal;
        return super.stop();
    }

    // Helper methods for scheduling observable automation
    setValueAtTime(value, time) {
        this.object.setValueAtTime(value, time);
        if (this.scheduledTime > time) return;
        this.scheduledTime = time;
        this.invalidateUntil(time);
    }

    exponentialRampToValueAtTime(value, time) {
        this.object.exponentialRampToValueAtTime(value, time);
        if (this.scheduledTime > time) return;
        this.scheduledTime = time;
        this.invalidateUntil(time);
    }

    linearRampToValueAtTime(value, time) {
        this.object.linearRampToValueAtTime(value, time);
        if (this.scheduledTime > time) return;
        this.scheduledTime = time;
        this.invalidateUntil(time);
    }

    setTargetAtTime(value, time, duration) {
        this.object.setTargetAtTime(value, time, duration);
        if (this.scheduledTime > time + duration / t60) return;
        this.scheduledTime = time + duration / t60;
        this.invalidateUntil(time);
    }

    setValueCurveAtTime(values, time, duration) {
        this.object.setValueCurveAtTime(values, time, duration);
        if (this.scheduledTime > time + duration) return;
        this.scheduledTime = time + duration;
        this.invalidateUntil(time);
    }

    cancelAndHoldAtTime(time) {
        this.object.cancelAndHoldAtTime(time);
        if (this.scheduledTime < time) return;
        this.scheduledTime = time;
        this.invalidateUntil(time);
    }

    cancelScheduledValues(time) {
        this.object.cancelScheduledValues(time);
        if (this.scheduledTime < time) return;
        this.scheduledTime = time;
        this.invalidateUntil(time);
    }

    schedule(time, events, rate = 1, scale = 1) {
        time = schedule(this.object, time || this.getTime(), events, rate = 1, scale = 1);
        if (this.scheduledTime > time) return;
        this.scheduledTime = time;
        this.invalidateUntil(time);
    }
    */
}

Signal.param = ParamSignal.from;
