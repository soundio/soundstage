
import id       from '../../../fn/modules/id.js';
import overload from '../../../fn/modules/overload.js';
import toType   from '../../../fn/modules/to-type.js';
import { toNoteNumber, floatToFrequency } from '../../../midi/modules/data.js';

export default overload(toType, {
    'number': id,
    'string': (name, tuning = 440) => {
        let number = Number(name);
        return Number.isNaN(number) ?
            name.slice(-2) === 'Hz' ?
                parseFloat(name) :
            floatToFrequency(tuning, toNoteNumber(name)) :
        floatToFrequency(tuning, number) ;
    }
});
