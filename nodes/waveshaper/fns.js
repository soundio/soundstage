
import id from 'fn/id.js';


// Length of test arrays
const samples = 512;


/**
generate(fn, n = 16384)
Generates a waveshape array of length `n` form `fn`.

generate(fn, n, xmax = 1)
The optional `xmax` scales the waveshape for cases where input range is
scaled, with a gain node, say, before the waveshaper.

generate(fn, n, xmax, parameters)
Callback `fn` is called with `fn(x, parameters)`.
**/
export function generate(fn, resolution = 16384, headroom = 1, parameters) {
    const array = new Float32Array(resolution);

    let n = resolution;
    while (n--) {
        const x = headroom * (2 * n / (resolution - 1) - 1);
        array[n] = fn(x, parameters);
    }

    return array;
}

/**
calculateArrayRMS(array)
Calculates the RMS value of an array of samples.
**/
export function calculateArrayRMS(array) {
    let sumOfSquares = 0;
    let n = array.length;
    while (n--) sumOfSquares += array[n] * array[n];
    return Math.sqrt(sumOfSquares / array.length);
}

/**
calculateFnRMS(fn, samples)
Calculates the RMS value of a function over the range [-1, 1].
**/
export function calculateFnRMS(fn, samples) {
    const array = generate(fn, samples, 1);
    return calculateArrayRMS(array);
}
