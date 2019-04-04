import { capture, id, toLevel } from '../../fn/module.js';
import * as normalise from '../../fn/modules/normalisers.js';
import * as denormalise from '../../fn/modules/denormalisers.js';
import { numberToFrequency } from '../../midi/module.js';

export const transforms = {
    // From Fn

    'pass': {
        tx: id,
        ix: id
    },

    'linear': {
        tx: (value, min, max) => denormalise.linear(min, max, value),
        ix: (value, min, max) => normalise.linear(min, max, value)
    },

    'quadratic': {
        tx: (value, min, max) => denormalise.quadratic(min, max, value),
        ix: (value, min, max) => normalise.quadratic(min, max, value)
    },

    'cubic': {
        tx: (value, min, max) => denormalise.cubic(min, max, value),
        ix: (value, min, max) => normalise.cubic(min, max, value)
    },

    'logarithmic': {
        tx: (value, min, max) => denormalise.logarithmic(min, max, value),
        ix: (value, min, max) => normalise.logarithmic(min, max, value)
    },

    'linear-logarithmic': {
        // The bottom 1/9th of the fader travel is linear from 0 to min, while
        // the top 8/9ths is dB linear from min to max.
        tx: (value, min, max) => denormalise.linearLogarithmic(min, max, value),
        ix: (value, min, max) => normalise.linearLogarithmic(min, max, value)
    },


    // From MIDI

    'frequency': {
        tx: (value, min, max) => {
            return (numberToFrequency(value) - min) * (max - min) / numberToFrequency(127) + min ;
        },

        ix: function(value, min, max) {
            // Todo
        }
    },


    // Soundstage

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
            // Todo
        }
    }
};

export const parseValue = capture(/-?[\d\.]+\s*(?:(dB))/, {
    // dB
    1: (n, tokens) => toLevel(parseFloat(tokens[0]))
}, null);
