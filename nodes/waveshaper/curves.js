
/*
function transformBram1(a) {
    return function bram1(x) {
        return (2 * (a+1)) * (a + (x-a) / (1 + pow((x-a)/(1-a), 2)));
    }
}

function transformBram2(a) {
    // a must be in range -0.9999 to 0.9999

    return function bram2(x) {
        var k = 2 * a / (1 - a);
        return (1 - a) * (1 + k) * x / (1 + k * abs(x));
    }
}
*/

/**
chebyshev(x, coefficients)

This function calculates a Chebyshev polynomial approximation. The function
takes an input value `x` and an array of `coefficients`.

It iteratively computes Chebyshev polynomials using the recurrence relation:
- T₀(x) = 1
- T₁(x) = x
- Tₙ(x) = 2x·Tₙ₋₁(x) - Tₙ₋₂(x)

Then it calculates the weighted sum of these polynomials using the coefficients.

Typical values for Chebyshev coefficients depend on the desired harmonic
distortion effect:

- For subtle harmonic generation: small values like [0.5, 0.25, 0.125, 0.0625]
- For specific harmonics: set particular coefficients higher (e.g., [0, 0.8, 0, 0.2] emphasizes 2nd and 4th harmonics)
- For odd harmonics only: [0, 0.7, 0, 0.3, 0, 0.1] (non-zero values at odd indices)
- For even harmonics only: [0.5, 0, 0.3, 0, 0.1] (non-zero values at even indices)
- For waveshaping: values that sum to approximately 1, like [0.5, 0.3, 0.1, 0.07, 0.03]

The first coefficient controls the fundamental, while subsequent ones control
higher harmonics. Larger values produce more distortion.
**/

// TODO: Enable Chebyshev parameters in the Saturator!!
/*
export function chebyshev(x, coefficients) {
    const order = coefficients.length;

    let tn2 = 1;
    let tn1 = x;
    let tn;
    let out = coefficients[0] * tn1;

    for (let n = 2; n <= order; n++) {
        tn  = 2 * x * tn1 - tn2;
        out += coefficients[n - 1] * tn;
        tn2 = tn1;
        tn1 = tn;
    }

    return out;
}
*/

/**
gloubiBoulga(x)
**/
export function gloubiBoulga(x) {
    var x1 = x * 0.686306;
    var a = 1 + Math.exp(Math.sqrt(Math.abs(x1)) * -0.75);
    var b = Math.exp(x1);
    return (b - Math.exp(-x * a)) * b / (b * b + 1);
}

/**
sigmoid(x)
The sigmoid s-curve function using 1 / (1 + e^(-x)) gives results in the range [0, 1].
This sigmoid function normalizes the output to the range [-1, 1].
**/
export function sigmoid(x) {
    return (1 / (1 + Math.exp(-x))) * 2 - 1;
}

/**
softclip(x)
**/
export function softclip(x) {
    return x / (1 + Math.abs(x));
}

/**
tube(x)
Tube-like transfer functions for analogue warmth. Takes a params object `{ q }`.
**/
export function tube(x, params) {
    // Asymmetrical tube-like response
    // q controls even/odd harmonic balance (0.5-2.0)
    const q  = params?.q || 1.2;
    const x2 = x * x;
    const x3 = x2 * x;

    if (x >= 0) {
        return x - q * x3;
    } else {
        return x + q * x3;
    }
}

/**
tubeMesh(x)
Tube-like transfer functions for analogue warmth. Takes a params
object `{ bias, drive }`.
**/
export function tubeMesh(x, params) {
    // Tube with more sophisticated mesh current simulation
    const bias  = params?.bias || 0.2; // 0.1-0.4 for varying "warmth"
    const drive = params?.drive || 1;

    x = x * drive;
    if (x > 0) {
        return 1 - Math.exp(-x * (1 + bias * x));
    } else {
        return -1 + Math.exp(x * (1 - bias * x));
    }
}

/**
sweeten(x)
Enhances even harmonics through symmetrical distortion.
Uses x² terms to create a warm, tube-like character with subtle
saturation that's musically pleasing on full-spectrum material.
**/
export function sweeten(x) {
    const x2 = x * x;
    return x * (1 - 0.2 * x2);
}

/**
crunch(x)
Enhances odd harmonics through asymmetrical distortion.
Creates more aggressive tones with presence and bite,
suitable for adding edge to bass or lead sounds.
**/
export function crunch(x) {
    const absX = Math.abs(x);
    return x * (1 - 0.3 * absX);
}

/**
tape(x)
Simulates analog tape saturation characteristics.
Creates gentle compression with subtle high-frequency
rolloff and increased harmonic content at higher levels.
**/
export function tape(x) {
    const absX = Math.abs(x);
    const sign = x < 0 ? -1 : 1;
    return sign * (1 - Math.exp(-3 * absX));
}

/**
asymTanh(x)
Asymmetric version of tanh that processes positive and negative values differently.
Adds more harmonics on the negative side while keeping the positive side cleaner.
**/
export function asymTanh(x) {
    return x >= 0 ?
        Math.tanh(x) :
        Math.tanh(x * 1.5) * 0.8;
}

/**
diodeClip(x)
Models asymmetric clipping characteristics of a diode clipper circuit.
Positive side has a gentler knee, while the negative side clips more sharply.
**/
export function diodeClip(x) {
    if (x > 0) {
        return 1 - Math.exp(-3 * x);
    } else {
        return -0.8 * (1 - Math.exp(4 * x));
    }
}

/**
vintageMixer(x)
Simulates the subtle distortion characteristics of vintage mixing consoles.
Different gain staging and soft saturation for positive and negative signals.
**/
export function vintageMixer(x) {
    const posGain = 1.2;
    const negGain = 0.95;
    const posBias = 0.1;
    const negBias = 0.05;

    if (x > 0) {
        return Math.tanh(x * posGain) + posBias * x * x;
    } else {
        return Math.tanh(x * negGain) - negBias * x * x;
    }
}

/**
smashed(x)
More aggressive asymmetric curve with different characteristics for positive and negative values.
Positive values get a faster rolloff, creating more obvious harmonics at higher levels.
**/
export function smashed(x) {
    if (x > 0) {
        return x / (1 + x * x);
    } else {
        return x / (1 + Math.abs(x));
    }
}
