function multiply(b, a) {
    // Signal a * b
    const gain = a.context.createGain();
    a.connect(gain);
    b.connect(gain.gain);
    return gain;
}

function square(a) {
    // Signal a * a
    return multiply(a, a);
}

function add(b, a) {
    // Signal a + b
    const gain = a.context.createGain();
    a.connect(gain);
    b.connect(gain);
    return gain;
}

function subtract(b, a) {
    // Signal a - b
    const gain1 = a.context.createGain({ gain: -1 });
    const gain2 = a.context.createGain();

    gain1.connect(gain2);
    b.connect(gain1);
    a.connect(gain2);

    return gain2;
}









// Waveshaper curves

const resolution   = 16384;
const headroom     = 8;
const gainSettings = { gain: 1 / headroom };

let n;

// Square root

const sqrtCurve    = new Float32Array(resolution);
const sqrtSettings = { curve: sqrtCurve, oversample: '4x' };

n = sqrtCurve.length;
while (n--) {
    const x = headroom * 2 * n / (resolution - 1) - 1;
    sqrtCurve[n] = x < 0 ? 0 : Math.sqrt(x);
}

// Invert

const inverterCurve    = new Float32Array(resolution);
const inverterSettings = { curve: inverterCurve, oversample: '4x' };

n = inverterCurve.length;
while (n--) {
    const x = headroom * 2 * n / (resolution - 1) - 1;
    inverterCurve[n] = 1 / x;
}

function sqrt(a) {
    const gain       = a.context.createGain(gainSettings);
    const waveshaper = a.context.createWaveShaper(sqrtSettings);
    a.connect(gain);
    gain.connect(waveshaper);
    return waveshaper;
}

function invert(a) {
    // Signal 1 / a
    const gain     = a.context.createGain(gainSettings);
    const inverter = a.context.createWaveShaper(inverterSettings);
    a.connect(gain);
    gain.connect(inverter);
    return inverter;
}

function divide(b, a) {
    // Signal a / b
    const inverter = invert(b);
    const gain     = a.context.createGain();
    b.connect(inverter);
    inverter.connect(gain.gain);
    a.connect(gain);
    return gain;
}
