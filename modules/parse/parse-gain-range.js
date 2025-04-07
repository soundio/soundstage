
import overload  from 'fn/overload.js';
import toType    from 'fn/to-type.js';
import parseGain from './parse-gain.js';

export default overload(toType, {
    'number':    (n) => [n],
    'string':    (string) => string.split(/\s+/).map(parseGain),
    'object':    (array) => array.map(parseGain),
    'undefined': [0, 2]
});
