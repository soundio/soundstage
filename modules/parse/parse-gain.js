
import toGain     from 'fn/to-gain.js';
import parseValue from 'fn/parse-value.js';
import parseFloat from './parse-float-64.js';

export default parseValue({
    '':   parseFloat,
    'db': toGain,
    'dB': toGain
});
