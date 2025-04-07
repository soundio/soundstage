
import overload  from 'fn/overload.js';
import toType    from 'fn/to-type.js';
import parseNote from './parse-note.js';

export default overload(toType, {
    'number':    (n) => [n],
    'string':    (string) => string.split(/\s+/).map(parseNote),
    'object':    (array) => array.map(parseNote),
    'undefined': () => [0, 128]
});
