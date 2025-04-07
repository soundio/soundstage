
import overload       from 'fn/overload.js';
import toType         from 'fn/to-type.js';
import parseFrequency from './parse-frequency.js';

export default overload(toType, {
    'number': (n) => [n],
    'string': (string) => string.split(/\s+/).map(parseFrequency),
    'object': (array) => array.map(parseFrequency)
});
