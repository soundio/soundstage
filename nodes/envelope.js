
import { get, overload } from '../../fn/module.js';
import PlayNode from './play-node.js';
import { automate, getValueAtTime } from '../modules/automate.js';
import config from '../modules/config.js';

const define = Object.defineProperties;
const getDefinition = Object.getOwnPropertyDescriptor;

// Time multiplier to wait before we accept target value has 'arrived'
const targetDurationFactor = config.targetDurationFactor;

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

const validateEvent = overload(get(1), {
    "target": function(event) {
        if (event[3] === undefined) {
            throw new Error('Event "target" must have 2 parameters: value, duration');
        }
    },

    "hold": function(event) {
        // ????
        if (event[2] !== undefined) {
            throw new Error('Event "hold" takes 0 parameters');
        }
    },

    default: function(event) {
        if (event[2] === undefined) {
            throw new Error('Event "' + event[1] + '" must have 1 parameter: value');
        }
    }
});

function cueAutomation(param, events, time, gain, rate) {
    var event;
    automate(param, time, 'hold');

    for (event of events) {
        validateEvent(event);

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

    start(time, rate = 1, gain = 1) {
        if (!this.attack) { return this; }
        PlayNode.prototype.start.apply(this, arguments);
        cueAutomation(this.offset, this.attack, this.startTime, gain, rate, 'ConstantSource.offset');
        return this;
    }

    stop(time) {
        if (!this.release) { return this; }

        PlayNode.prototype.stop.apply(this, arguments);

        // Use the current signal value as the start gain of the release
        const gain = getValueAtTime(this.offset, this.stopTime);
        cueAutomation(this.offset, this.release, this.stopTime, gain, 1, 'ConstantSource.offset');

        // Update stopTime to include release tail
        const last = this.release[this.release.length - 1];
        if (last[2] !== 0) {
            console.warn('Envelope.release does not end with value 0. Envelope will never stop.', this);
            this.stopTime = Infinity;
        }
        else {
            this.stopTime += last[1] === 'target' ?
                last[0] + last[3] * targetDurationFactor :
                last[0] ;
        }

        return this;
    }
}

define(Envelope.prototype, {
    playing: getDefinition(PlayNode.prototype, 'playing')
});
