
import toGain     from '../../../fn/modules/to-gain.js';
import parseValue from '../../../fn/modules/parse-value.js';

export default parseValue({
    '':   parseFloat,
    'dB': toGain
});
