
import toGain from 'fn/to-gain.js';


/**
dB0,
dB6,
dB12,
dB18,
dB24,
dB30,
dB36,
dB42,
dB48,
dB54,
dB60,
dB66,
dB72,
dB78,
dB84,
dB90,
dB96
Gain values for 0dB, -6dB, -12dB ... -96dB respectively.
**/

export const dB0  = 1;
export const dB6  = toGain(-6);
export const dB12 = toGain(-12);
export const dB18 = toGain(-18);
export const dB24 = toGain(-24);
export const dB30 = toGain(-30);
export const dB36 = toGain(-36);
export const dB42 = toGain(-42);
export const dB48 = toGain(-48);
export const dB54 = toGain(-54);
export const dB60 = 0.001;
export const dB66 = toGain(-66);
export const dB72 = toGain(-72);
export const dB78 = toGain(-78);
export const dB84 = toGain(-84);
export const dB90 = toGain(-90);
export const dB96 = toGain(-96);

/**
t30,
t60,
t90
The time after which a target decay to `0` with a time constant of `1`, ie.
`param.setTargetAtTime(0, time, 1)`, arrives at -30dB, -60dB and -90dB
respectively of its initial value.
**/

export const t30 = -1 * Math.log(dB30);
export const t60 = -1 * Math.log(dB60);
export const t90 = -1 * Math.log(dB90);
