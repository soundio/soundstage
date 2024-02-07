
import toGain     from '../../../fn/modules/to-gain.js';
import parseValue from '../../../fn/modules/parse-value.js';
import parseFloat from './parse-float-64.js';

export default parseValue({
    '':   parseFloat,
    'db': toGain,
    'dB': toGain
});
