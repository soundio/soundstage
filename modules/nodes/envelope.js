
import { automate, getAutomationEvents } from '../audio-param.js';

const assign = Object.assign;
const create = Object.create;

// Time multiplier to wait before we accept target value has 'arrived'
const decayFactor = 12;

const defaults = {
    attack: [
        [0,   'step', 0],
        [0.1, 'linear', 1]
    ],

    release: [
        [0,   'target', 0, 0.1]
    ]
};

function cueAutomation(param, events, time, gain, rate) {
    param.cancelAndHoldAtTime(time);

    for (let event of events) {
        automate(param, time + event[0] / rate, event[1], event[2] * gain, event[3], arguments[5]);
    }
}

export default class Envelope extends ConstantSourceNode {
    constructor(context, options) {
        super(context, options);

        this.attack = options && options.attack || defaults.attack;
        this.release = options && options.release || defaults.release;

        //assign(this, options, defaults);
    }

    start(time, name, gain, rate) {
        time = time || this.context.currentTime;
        gain = gain || 1;
        rate = rate || 1;

        let event;

        //console.log('START', name, time, name, gain, rate, this.startTime);
        cueAutomation(this.offset, this[name], time, gain, rate, 'ConstantSource.offset');

        if (!this.startTime) {
            super.start.call(this, time);
        }

        this.startTime = time;
    }

    stop(time, name, gain, rate) {
        time = time || this.context.currentTime;
        time = time > this.startTime ? time : this.startTime ;

        //console.log('STOP ', name, time, gain, rate, this.startTime);

        //this.stopTime = time + event[0] + (event[2] === 'target' ? event[3] * decayFactor : 0);
        this.stopTime = time;
        //super.stop.call(this, stopTime);
    }
}
