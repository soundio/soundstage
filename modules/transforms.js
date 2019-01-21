import { capture, id, toLevel } from '../../fn/fn.js';
import { numberToFrequency } from '../../midi/midi.js';

const config = {

};

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

    'logarithmic-zero': {
        // The bottom 1/9th of the fader travel is linear from 0 to min, while
        // the top 8/9ths is dB linear from min to max.
        tx: (value, min, max) => {
            if (min <= 0) { throw new Error('logarithmic transform min cannot be ' + min); }
            return value <= 0.1111111111111111 ?
                value * 9 * min :
                min * Math.pow(max / min, (value - 0.1111111111111111) * 1.125);
        },

        ix: (value, min, max) => {
            if (min <= 0) { throw new Error('logarithmic transform min cannot be ' + min); }
            return value <= min ?
                value / min / 9 :
                Math.log((0.1111111111111111 + value / 1.125) / min) / Math.log(max / min) ;
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

export const parseValue = capture(/-?[\d\.]+\s*(?:(dB))/, {
    // dB
    1: (n, tokens) => toLevel(parseFloat(tokens[0]))
}, null);
