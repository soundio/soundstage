
import PlayNode from './play-node.js';
import { automate, getAutomationEvents } from '../modules/automate.js';

const assign = Object.assign;
const create = Object.create;

// Time multiplier to wait before we accept target value has 'arrived'
const decayFactor = 12;

const defaults = {
    attack: [
        [0, 'step', 1]
    ],

    release: [
        [0, 'step', 0]
    ]
};

const constantOptions = {
    offset: 0
};

function cueAutomation(param, events, time, gain, rate) {
    param.cancelAndHoldAtTime(time);

    for (let event of events) {
        // param, time, curve, value, decay
        automate(param, time + event[0] / rate, event[1], event[2] * gain, event[3]);
    }
}

export default class Envelope extends ConstantSourceNode {
    constructor(context, options) {
        super(context, constantOptions);
        super.start.call(this, context.currentTime);

        PlayNode.call(this, context);

        this.attack  = (options && options.attack)  || defaults.attack;
        this.release = (options && options.release) || defaults.release;
    }

    start(time, name, gain = 1, rate = 1) {
        // Envelopes may be 'start'ed multiple times with new named envelopes -
        // We don't want PlayNode to error in this case.
        this.startTime = undefined;
        //if (this.startTime === undefined) {
            PlayNode.prototype.start.apply(this, arguments);
        //}

        if (this[name]) {
            cueAutomation(this.offset, this[name], this.startTime, gain, rate, 'ConstantSource.offset');
        }

        return this;
    }

    stop(time) {
        return PlayNode.prototype.stop.apply(this, arguments);
    }
}
