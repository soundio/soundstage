
/**
crossfadeEqualPower(length, input1, i1, input2, i2)
Writes fade to `input1` at `i1`.

crossfadeEqualPower(length, input1, i1, input2, i2, output, o)
Writes fade to `output` at `o`.
**/

export function crossfadeEqualPower(length, input1, i1, input2, i2, output = input1, o = output === input1 ? i1 : 0) {
    // Check if output array is long enough
    if (output.length < o + length) {
        throw new Error(`crossfadeEqualPower(): output is not long enough (${ output.length }) to contain fade data (${ o } + ${ length })`);
    }

    let n = length;
    while (n--) {
        const ratio = n / (length - 1);
        const gain1 = Math.cos(ratio * Math.PI / 2);
        const gain2 = Math.sin(ratio * Math.PI / 2);
        output[o + n] = input1[i1 + n] * gain1 + input2[i2 + n] * gain2;
    }

    return output;
}

/**
crossfadeLinear(length, input1, i1, input2, i2)
Writes fade to `input1` at `i1`.

crossfadeLinear(length, input1, i1, input2, i2, output, o)
Writes fade to `output` at `o`.
**/

export function crossfadeLinear(length, input1, i1, input2, i2, output = input1, o = output === input1 ? i1 : 0) {
    // Check if output array is long enough
    if (output.length < o + length) {
        throw new Error('crossfadeEqualLinear(): output is not long enough to contain fade data');
    }

    let n = length;
    while (n--) {
        const gain1 = n / (length - 1);
        const gain2 = 1 - gain1;
        output[o + n] = input1[i1 + n] * gain1 + input2[i2 + n] * gain2;
    }

    return output;
}

/**
fadeinEqualPower(length, input, i)
Writes fade to `input` at `i`.

fadeinEqualPower(length, input, i, output, o)
Writes fade to `output` at `o`.
**/

export function fadeinEqualPower(length, input, i, output = input, o = output === input ? i : 0) {
    if (output.length < o + length) {
        throw new Error('fadeinEqualPower(): output is not long enough to contain fade data');
    }

    let n = length;
    while (n--) output[o + n] = input[i + n] * Math.sin(n / (length - 1) * Math.PI / 2);
    return output;
}

/**
fadeintoEqualPower(length, output, o, input, i)
Writes fade in to `output` at `o`, mixing fade into existing data in output.
**/

export function fadeintoEqualPower(length, output, o = 0, input, i) {
    if (output.length < o + length) {
        throw new Error('fadeinEqualPower(): output is not long enough to contain fade data');
    }

    let n = length;
    while (n--) output[o + n] = output[o + n] + input[i + n] * Math.sin(n / (length - 1) * Math.PI / 2);
    return output;
}

/**
fadeoutEqualPower(length, input, i)
Writes fade to `input` at `i`.

fadeoutEqualPower(length, input, i, output, o)
Writes fade to `output` at `o`.
**/

export function fadeoutEqualPower(length, input, i, output = input, o = output === input ? i : 0) {
    if (output.length < o + length) {
        throw new Error('fadeoutEqualPower(): output is not long enough to contain fade data');
    }

    let n = length;
    while (n--) output[o + n] = input[i + n] * Math.cos(n / (length - 1) * Math.PI / 2);
    return output;
}

/**
fadeinLinear(length, input, i)
Writes fade to `input` at `i`.

fadeinLinear(length, input, i, output, o)
Writes fade to `output` at `o`.
**/

export function fadeinLinear(length, input, i, output = input, o = output === input ? i : 0) {
    if (output.length < o + length) {
        throw new Error('fadeinLinear(): output is not long enough to contain fade data');
    }

    let n = length;
    while (n--) output[o + n] = input[i + n] * n / (length - 1);
    return output;
}

/**
fadeoutLinear(length, input, i)
Writes fade to `input` at `i`.

fadeoutLinear(length, input, i, output, o)
Writes fade to `output` at `o`.
**/

export function fadeoutLinear(length, input, i, output = input, o = output === input ? i : 0) {
    if (output.length < o + length) {
        throw new Error('fadeoutLinear(): output is not long enough to contain fade data');
    }

    let n = length;
    while (n--) output[o + n] = input[i + n] * (1 - n / (length - 1));
    return output;
}
