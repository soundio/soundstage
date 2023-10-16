
import toGain from '../../../fn/modules/to-gain.js';

// Be generous in what we accept, space-wise, but exclude spaces between the
// number and the unit
const runit = /\d([^\s\d]*)\s*$/;

const units = {
    '':    Math.fround,
    'db':  (value) => Math.fround(toGain(value)),
    'khz': (value) => Math.fround(value * 1000),
    'hz':  Math.fround,
    'ms':  (value) => Math.fround(value / 1000),
    's':   Math.fround
};

export default function parseValue32(value) {
    // Return 32-bit representation of number
    if (typeof value === 'number') {
        return Math.fround(value);
    }

    var entry = runit.exec(value);
    if (!entry) {
        throw new Error('Cannot parse value "' + value + '" (accepted units ' + Object.keys(units).join(', ') + ')');
    }

    const unit = entry[1].toLowerCase();
    if (!units[unit]) {
        throw new Error('Cannot parse value "' + string + '" (accepted units ' + Object.keys(units).join(', ') + ')');
    }

    return units[unit](parseFloat(value));
};
