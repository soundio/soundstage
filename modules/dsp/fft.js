
const vector = [0, 0];

/*
subtract(bx, by, ax, ay)
Adds vector `b` to vector `a`, returns an `[x, y]` array.
*/

function add(bx, by, ax, ay) {
    vector[0] = ax + bx;
    vector[1] = ay + by;
    return vector;
}

/*
subtract(bx, by, ax, ay)
Subtracts vector `b` from vector `a`, returns an `[x, y]` array.
*/

function subtract(bx, by, ax, ay) {
    vector[0] = ax - bx;
    vector[1] = ay - by;
    return vector;
}

/*
multiply(bx, by, ax, ay)
Multiplies vectors `a` by `b`, returns an `[x, y]` array.
*/

function multiply(bx, by, ax, ay) {
    vector[0] = ax * bx - ay * by;
    vector[1] = ax * by + ay * bx;
    return vector;
}

/* exponent()
By Eulers Formula: `e^(i*x) = cos(x) + i*sin(x)` and in DFT: `x = -2*PI*(k/N)`.
Returns a complex `[r, i]` number array.
Nicked from https://github.com/vail-systems/node-fft/blob/master/src/fftutil.js.
*/

const cache = {};

function exponent(k, n) {
    const key = k / n;
    if (cache[key]) return cache[key];

    const x = -2 * Math.PI * key;
    return cache[key] = Float64Array.of(Math.cos(x), Math.sin(x));
}


/**
fft(samples)
Calculates the fourier transform of `samples`. `samples` must be an Array or
TypedArray of length `2^n`, ie. `512`, `1024`, `2048`, etc..

fft(vectors, size, offset)
Used for internal recursion. Calculates the fourier transform from `vectors`,
where `vectors` is a flat Array of `[real, imaginary, ...]` numbers, `size` is
the `2^n` distance between vectors, and `offset` index of the first vector to be
read. `fft(samples)` is equivalent to `fft(samples, 1, 0)`.

fft(vectors, size, offset, buffer)
Pass in an optional `buffer` - an Array or TypedArray - to use as the return value.
**/

export function fft(vectors, size = 1, offset = 0, buffer) {
    // Return same array type as vectors by getting its constructor
    const TypedArray = vectors.constructor;

    // Convert a 1D array of samples to a 2D array of complex numbers
    if (size === 1) {
        const samples = vectors;
        let n = samples.length;
        size    = 2;
        vectors = new TypedArray(size * n);
        while (n--) vectors[size * n] = samples[n];
    }

    // Sanity check for size/offset values
    //if (window.DEBUG && offset >= size) throw new Error('fft() offset cannot be greater than size');

    const length = vectors.length / size;

    // If length is 1 return a single vector
    if (length === 1) return TypedArray.BYTES_PER_ELEMENT ?
        new TypedArray(
            vectors.buffer,
            offset * TypedArray.BYTES_PER_ELEMENT,
            2
        ) :
        [vectors[offset], vectors[offset + 1]] ;

    const phasors = buffer || new TypedArray(length * 2);
    const evens   = fft(vectors, size * 2, offset);
    const odds    = fft(vectors, size * 2, size + offset);

    // Perform length / 2 operations
    let n = -1;
    let i, ax, ay, bx, by, cx, cy, ex, ey;
    while (++n < length / 2) {
        i  = n * 2;
        ax = evens[i];
        ay = evens[i + 1];
        bx = odds[i];
        by = odds[i + 1];
        [ex, ey] = exponent(n, length);
        [cx, cy] = multiply(ex, ey, bx, by);

        // Add a + c
        phasors[i]     = ax + cx;
        phasors[i + 1] = ay + cy;

        // Subtract a - c
        phasors[i + length]     = ax - cx;
        phasors[i + length + 1] = ay - cy;
    }

    return phasors;
}

export function ifft(vectors, buffer = new vectors.constructor(vectors.length)) {
    if (window.DEBUG && typeof buffer !== 'object') throw new Error('ifft() buffer must be an Array or TypedArray');

    const length = vectors.length;

    // Read into buffer, swap real and imaginary parts
    let n = length;
    while (n) {
        buffer[--n] = vectors[n - 1];
        buffer[--n] = vectors[n + 1];
    }

    // Apply FFT to 2-dimensional buffer
    const phasors = fft(buffer, 2);

    // Read into buffer, swap real and imaginary parts and normalise
    n = length;
    while (n) {
        buffer[--n] = phasors[n - 1] * 2 / length;
        buffer[--n] = phasors[n + 1] * 2 / length;
    }

    return buffer;
}
