
function throwParseFloat32() {
    throw new Error('Cannot parse value "' + value + '" as Float32');
}

export default function parseFloat32(value) {
    const number = Math.fround(value);
    return Number.isNaN(number) ?
        throwParseFloat32() :
        number ;
}
