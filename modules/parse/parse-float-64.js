
function throwParseNumber() {
    throw new Error('Cannot parse value "' + value + '" as Number');
}

/**
parseFloat()
Like JavaScript's `parseFloat`, but with a check for `NaN`.
**/

export default function parseFloat64(value) {
    const number = Number(value);
    return Number.isNaN(number) ?
        throwParseNumber() :
        number ;
}
