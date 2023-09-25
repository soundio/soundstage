
import id               from '../../../fn/modules/id.js';
import overload         from '../../../fn/modules/overload.js';
import toType           from '../../../fn/modules/to-type.js';
import { toNoteNumber } from '../../../midi/modules/data.js';
import parseFloat       from './parse-float-64.js';

const rdigit = /^\d/;

export default overload(toType, {
    'number': id,
    'string': (value, tuning = 440) => (
        rdigit.test(value) ? parseFloat(value) : toNoteNumber(value)
    )
});
