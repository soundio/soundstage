
import { get, overload } from '../../fn/module.js';
import PlayNode from './play-node.js';
import { automate, getAutomation } from '../modules/automate.js';

const assign = Object.assign;
const create = Object.create;
const define = Object.defineProperties;
const getDefinition = Object.getOwnPropertyDescriptor;

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


function mock(param) {
    param._setValueAtTime = param.setValueAtTime;
    param._exponentialRampToValueAtTime = param.exponentialRampToValueAtTime;
    param._linearRampToValueAtTime = param.linearRampToValueAtTime;
    param._setTargetAtTime = param.setTargetAtTime;
    param._cancelAndHoldAtTime = param.cancelAndHoldAtTime;

    param.setValueAtTime = function(value, time) {
        console.log(time.toFixed(3), 'step', value)
        return param._setValueAtTime.apply(this, arguments);
    };

    param.exponentialRampToValueAtTime = function(value, time) {
        console.log(time.toFixed(3), 'exponential', value)
        return param._exponentialRampToValueAtTime.apply(this, arguments);
    };

    param.linearRampToValueAtTime = function(value, time) {
        console.log(time.toFixed(3), 'linear', value)
        return param._linearRampToValueAtTime.apply(this, arguments);
    };

    param.setTargetAtTime = function(value, time) {
        console.log(time.toFixed(3), 'target', value)
        return param._setTargetAtTime.apply(this, arguments);
    };

    param.cancelAndHoldAtTime = function(time) {
        console.log(time.toFixed(3), 'hold')
        return param._cancelAndHoldAtTime.apply(this, arguments);
    };
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
        PlayNode.prototype.start.apply(this, arguments);

        if (this[name]) {
            cueAutomation(this.offset, this[name], this.startTime, gain, rate, 'ConstantSource.offset');
        }

        return this;
    }

    stop(time) {
        return PlayNode.prototype.stop.apply(this, arguments);
    }
}

define(Envelope.prototype, {
    playing: getDefinition(PlayNode.prototype, 'playing')
});
