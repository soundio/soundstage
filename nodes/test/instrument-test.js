import run        from '../../../fn/modules/test.js';
import toGain     from '../../../fn/modules/to-gain.js';
import context    from '../../modules/context.js';
import Instrument from '../instrument.js';

import Mix    from '../mix.js';
import Sample from '../sample.js';
import Tone   from '../tone.js';
import { constructors } from '../graph.js';

const assign = Object.assign;

assign(constructors, {
    sample: Sample,
    mix:    Mix,
    tone:   Tone
});

run('Start context', [], function(test, done) {
    context.resume().then(done);
});

/*
run('Instrument() sample', [false], function(test, done) {
    const duration = 0.1;
    const instrument = new Instrument(context, {
        voice: {
            nodes: [{
                id:   'sample',
                type: 'sample',
                data: {
                    src: '/soundstage/audio/gretsch-kit/samples.js',
                    nominalFrequency: 440
                }
            }, {
                id:   'mix',
                type: 'mix',
                data: { gain: 1, pan: 0 }
            }, {
                id:   'output',
                type: 'gain',
                data: { gain: 1 }
            }],

            connections: [
                { source: 'sample', target: 'mix' },
                { source: 'mix', target: 'output' }
            ],

            commands: [
                { target: 'sample' }
            ],

            output: 'output'
        },

        output: 1
    });

    instrument.connect(context.destination);

    setTimeout(() => {
        var t = context.currentTime;

        const voice = instrument.start(t, 'C3', 0.5).stop(t + 0.1);

        test(voice === instrument);

        instrument.start(t + 0.2, 31, 1)   .stop(t  + 0.3);
        instrument.start(t + 0.2, 43, 0.5) .stop(t  + 0.3);
        instrument.start(t + 0.4, 31, 0.75).stop(t  + 0.5);
        instrument.start(t + 0.4, 43, 0.25).stop(t  + 0.5);
        instrument.start(t + 0.6, 38, 0.75).stop(t  + 0.7);
        instrument.start(t + 0.6, 43, 0.5) .stop(t  + 0.7);
        instrument.start(t + 0.8, 43, 0.25).stop(t  + 0.9);
        instrument.start(t + 1.0, 43, 0.5) .stop(t  + 1.1);
        instrument.start(t + 1.2, 38, 0.25).stop(t  + 1.3);
        instrument.start(t + 1.2, 43, 0.25).stop(t  + 1.3);
        instrument.start(t + 1.4, 31, 1)   .stop(t  + 1.5);
        instrument.start(t + 1.4, 43, 0.5) .stop(t  + 1.5);
        instrument.start(t + 1.6, 43, 0.25).stop(t  + 1.7);
        instrument.start(t + 1.8, 31, 0.75).stop(t  + 1.9);
        instrument.start(t + 1.8, 38, 0.75).stop(t  + 1.9);
        instrument.start(t + 1.8, 43, 0.75).stop(t  + 1.9);

        setTimeout(function() {
            const currentTime = context.currentTime;

            instrument
            .start(currentTime + 1, 'D2', 0.0009765625)
            .stop(currentTime + 1.5);

            instrument
            .start(currentTime + 1.6, 'D2', 1)
            .stop(currentTime + 1.9);

            done();
        }, 2000);
    }, 1000);
});

run('Instrument() tone', [false], function(test, done) {
    const duration = 0.1;
    const instrument = new Instrument(context, {
        voice: {
            nodes: [{
                id:   'tone',
                type: 'tone',
                data: {
                    type: 'square'
                }
            }, {
                id:   'mix',
                type: 'mix',
                data: { gain: 1, pan: 0 }
            }, {
                id:   'output',
                type: 'gain',
                data: { gain: 1 }
            }],

            connections: [
                { source: 'tone', target: 'mix' },
                { source: 'mix', target: 'output' }
            ],

            commands: [
                { target: 'tone' }
            ],

            output: 'output'
        },

        output: 1
    });

    instrument.connect(context.destination);

    setTimeout(() => {
        var t = context.currentTime;

        const voice = instrument.start(t, 'C3', 0.5).stop(t + 0.1);

        test(voice === instrument);

        instrument.start(t + 0.2, 31, 1)   .stop(t  + 0.3);
        instrument.start(t + 0.2, 43, 0.5) .stop(t  + 0.3);
        instrument.start(t + 0.4, 31, 0.75).stop(t  + 0.5);
        instrument.start(t + 0.4, 43, 0.25).stop(t  + 0.5);
        instrument.start(t + 0.6, 38, 0.75).stop(t  + 0.7);
        instrument.start(t + 0.6, 43, 0.5) .stop(t  + 0.7);
        instrument.start(t + 0.8, 43, 0.25).stop(t  + 0.9);
        instrument.start(t + 1.0, 43, 0.5) .stop(t  + 1.1);
        instrument.start(t + 1.2, 38, 0.25).stop(t  + 1.3);
        instrument.start(t + 1.2, 43, 0.25).stop(t  + 1.3);
        instrument.start(t + 1.4, 31, 1)   .stop(t  + 1.5);
        instrument.start(t + 1.4, 43, 0.5) .stop(t  + 1.5);
        instrument.start(t + 1.6, 43, 0.25).stop(t  + 1.7);
        instrument.start(t + 1.8, 31, 0.75).stop(t  + 1.9);
        instrument.start(t + 1.8, 38, 0.75).stop(t  + 1.9);
        instrument.start(t + 1.8, 43, 0.75).stop(t  + 1.9);

        setTimeout(function() {
            const currentTime = context.currentTime;

            instrument
            .start(currentTime + 1, 'D2', 0.0009765625)
            .stop(currentTime + 1.5);

            instrument
            .start(currentTime + 1.6, 'D2', 1)
            .stop(currentTime + 1.9);

            done();
        }, 2000);
    }, 1000);
});

run('Instrument() sample and tone', [false], function(test, done) {
    const duration = 0.1;
    const instrument = new Instrument(context, {
        voice: {
            nodes: [{
                id:   'sample',
                type: 'sample',
                data: {
                    src: '/soundstage/audio/gretsch-kit/samples.js',
                    nominalFrequency: 440,
                    // TOdo: gain is working? Do we need gain?
                    gain: 3
                }
            }, {
                id:   'tone',
                type: 'tone',
                data: {
                    type: 'square',
                    // TOdo: gain is working? Do we need gain? Gain comes via start()
                    gain: 0.25,
                    attack: 0.5,
                    release: 0.3
                }
            }, {
                id:   'mix',
                type: 'mix',
                data: { gain: 1, pan: 0 }
            }, {
                id:   'output',
                type: 'gain',
                data: { gain: 1 }
            }],

            connections: [
                { source: 'sample', target: 'mix' },
                { source: 'tone', target: 'mix' },
                { source: 'mix', target: 'output' }
            ],

            commands: [
                { target: 'sample' },
                { target: 'tone' }
            ],

            output: 'output'
        },

        output: 1
    });

    instrument.connect(context.destination);

    setTimeout(() => {
        var t = context.currentTime;

        const voice = instrument.start(t, 'C3', 0.5).stop(t + 0.1);

        test(voice === instrument);

        instrument.start(t + 0.2, 31, 1)   .stop(t  + 0.3);
        instrument.start(t + 0.2, 43, 0.5) .stop(t  + 0.3);
        instrument.start(t + 0.4, 31, 0.75).stop(t  + 0.5);
        instrument.start(t + 0.4, 43, 0.25).stop(t  + 0.5);
        instrument.start(t + 0.6, 38, 0.75).stop(t  + 0.7);
        instrument.start(t + 0.6, 43, 0.5) .stop(t  + 0.7);
        instrument.start(t + 0.8, 43, 0.25).stop(t  + 0.9);
        instrument.start(t + 1.0, 43, 0.5) .stop(t  + 1.1);
        instrument.start(t + 1.2, 38, 0.25).stop(t  + 1.3);
        instrument.start(t + 1.2, 43, 0.25).stop(t  + 1.3);
        instrument.start(t + 1.4, 31, 1)   .stop(t  + 1.5);
        instrument.start(t + 1.4, 43, 0.5) .stop(t  + 1.5);
        instrument.start(t + 1.6, 43, 0.25).stop(t  + 1.7);
        instrument.start(t + 1.8, 31, 0.75).stop(t  + 1.9);
        instrument.start(t + 1.8, 38, 0.75).stop(t  + 1.9);
        instrument.start(t + 1.8, 43, 0.75).stop(t  + 1.9);

        setTimeout(function() {
            const currentTime = context.currentTime;

            instrument
            .start(currentTime + 1, 'D2', 0.0009765625)
            .stop(currentTime + 1.5);

            instrument
            .start(currentTime + 1.6, 'D2', 1)
            .stop(currentTime + 1.9);

            done();
        }, 2000);
    }, 1000);
});
*/

const path = 'https://sound.stephen.band/';
//const path = 'http://localhost/sound.stephen.band/';

run('Instrument() Chromatic and dynamic test', [false], function(test, done) {
    const duration = 0.1;
    const instrument = new Instrument(context, {
        voice: {
            nodes: [{
                id:   'sample',
                type: 'sample',
                data: {
                    src: path + 'samples/steinway-piano/sample-map.json',
                    nominalFrequency: 440,
                    // TODO: gain is working? Do we need gain?
                    gain: 1
                }
            }, {
                id:   'mix',
                type: 'mix',
                data: { gain: 1, pan: 0 }
            }, {
                id:   'output',
                type: 'gain',
                data: { gain: 1 }
            }],

            connections: [
                { source: 'sample', target: 'mix' },
                { source: 'mix', target: 'output' }
            ],

            commands: [
                { target: 'sample' }
            ],

            output: 'output'
        },

        output: 1
    });

    instrument.connect(context.destination);

    function playDynamic(note) {
        const t = context.currentTime;
        let n = 0;
        while (++n < 13) {
            var gain = toGain(n * 2.5  - 30);
            instrument
            .start(t + 0.6 * n, note, gain)
            .stop( t + 0.6 * n + 0.6) ;
        }
    }

    playDynamic(60);
/*
    function playChromatic(min, max, gain) {
        const t = context.currentTime;
        let n = min - 1;
        while (++n < max) {
            instrument
            .start(t + 0.12 * (n - min), n, gain)
            .stop( t + 0.12 * (n - min) + 0.3) ;
        }
    }

    setTimeout(() => playChromatic(25, 108, 0.03125), 0);
    setTimeout(() => playChromatic(25, 108, 0.0625),  10000);
    setTimeout(() => playChromatic(25, 108, 0.125),   20000);
    setTimeout(() => playChromatic(25, 108, 0.25),    30000);
    setTimeout(() => playChromatic(25, 108, 0.5),     40000);
    setTimeout(() => playChromatic(25, 108, 1),       50000);
    setTimeout(() => done, 60000);
*/
});
