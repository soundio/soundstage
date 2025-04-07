
import id       from 'fn/id.js';
import overload from 'fn/overload.js';
import toType   from 'fn/to-type.js';
import { toNoteNumber, floatToFrequency } from 'midi/note.js';

export default overload(toType, {
    // Value is a frequency
    'number': id,
    // Value is a string
    'string': (name, tuning = 440) => {
        let number = Number(name);
        return Number.isNaN(number) ?
            // name is of the form "nHz"
            name.slice(-2) === 'Hz' ? parseFloat(name) :
            // name is a note name
            floatToFrequency(toNoteNumber(name), tuning) :
        // name is a number
        floatToFrequency(number, tuning) ;
    }
});
