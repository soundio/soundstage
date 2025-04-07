
import id               from 'fn/id.js';
import overload         from 'fn/overload.js';
import toType           from 'fn/to-type.js';
import { toNoteNumber, frequencyToFloat } from 'midi/note.js';
import parseFloat       from './parse-float-64.js';

const rdigit = /^\d/;

export default overload(toType, {
    'number': id,
    'string': (value, tuning = 440) => (
        value.slice(-2) === 'Hz' ?
            // value is a frequency ending in 'Hz'
            frequencyToFloat(parseFloat(name)) :
        rdigit.test(value) ?
            // value is a note number
            parseFloat(value) :
            // value is a note name
            toNoteNumber(value)
    )
});
