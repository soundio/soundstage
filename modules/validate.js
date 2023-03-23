export function validateOscillatorType(string) {
    if (!/sine|triangle|square|sawtooth/.test(string)) {
        throw new Error('"' + string + '" is not a valid oscillator type');
    }
}
