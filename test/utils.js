function playScaleChromatic(time, root, range) {
    equals('number', typeof time);

    let n = -1;
    while (++n < range) {
        t1 = t0 + time + n / 20;

        synth
        .start(t1, root + n, 0.5)
        .stop(t1 + 0.1)
    }
}

export function cueVelocityScale(instr, interval, note) {
    const t = instr.context.currentTime;
    const l = 12;
    let n = -1;

    while (n++ < l) {
        instr.start(t + n * interval, note, n / l).stop(t + n * interval + interval * 0.666667);
    }
}

export function cueChromaticScale(instr, interval, minNote, maxNote) {
    const t = instr.context.currentTime;
    let n = minNote - 1;

    while (++n < maxNote) {
        const time = t + interval * (n - minNote);
        const vel  = n % 2 ? 0.4 : 0.6;
        instr.start(time, n, vel).stop(time + interval, n, vel);
    }
}
