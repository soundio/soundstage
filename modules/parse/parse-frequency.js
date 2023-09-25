
import id       from '../../../fn/modules/id.js';
import overload from '../../../fn/modules/overload.js';
import toType   from '../../../fn/modules/to-type.js';
import { toNoteNumber, floatToFrequency } from '../../../midi/modules/data.js';

const rdigit = /^\d/;

export default overload(toType, {
    'number': id,
    'string': (value, tuning) => (
        rdigit.test(value) ?
            value.slice(-2) === 'Hz' ? parseFloat(value) :
            floatToFrequency(tuning, value) :
            floatToFrequency(tuning, toNoteNumber(value))
    )
});
