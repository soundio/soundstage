import { id } from '../../fn/fn.js';
import { numberToFrequency } from '../../midi/midi.js';

export const transforms = {
    'pass': {
        tx: id,
        ix: id
    },

    'linear': {
        tx: function(value, min, max) {
            return value * (max - min) + min;
        },

        ix: function(value, min, max) {
            return (value - max) / (max - min);
        }
    },

    'quadratic': {
        tx: function(value, min, max) {
            return Math.pow(value, 2) * (max - min) + min;
        },

        ix: function(value, min, max) {
            return Math.pow((value - min) / (max - min), 1/2);
        }
    },

    'cubic': {
        tx: function(value, min, max) {
            return Math.pow(value, 3) * (max - min) + min;
        },

        ix: function(value, min, max) {
            return Math.pow((value - min) / (max - min), 1/3);
        }
    },

    'logarithmic': {
        tx: function(value, min, max) {
            if (!min) { throw new Error('logarithmic transform min cannot be ' + min); }
            return min * Math.pow(max / min, value);
        },

        ix: function(value, min, max) {
            if (!min) { throw new Error('logarithmic transform min cannot be ' + min); }
            return Math.log(value / min) / Math.log(max / min);
        }
    },

    'frequency': {
        tx: function toggle(value, min, max) {
            return (numberToFrequency(value) - min) * (max - min) / numberToFrequency(127) + min ;
        },

        ix: function() {

        }
    },

    'toggle': {
        tx: function toggle(value, min, max, current) {
            return value > 0 ?
                current <= min ? max : min :
                current ;
        },

        ix: function(value, min, max, current) {
            return value > 0 ?
                current <= min ? max : min :
                current ;
        }
    },

    'switch': {
        tx: function toggle(min, max, current, n) {
            return n < 0.5 ? min : max ;
        },

        ix: function() {

        }
    },

    'continuous': {
        tx: function toggle(min, max, current, n) {
            return current + 64 - n ;
        },

        ix: function() {

        }
    }
};
