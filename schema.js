{
    version: '1.0.0',
    name:    'my-stage',
    label:   'My Stage',
    author:  '',

    nodes: [

    /* Sampler */

    {
        id:   '0',
        type: 'sampler',
        data: {
            // rename as simply envelope, I think
            amplitudeEnvelope: {
                velocityToGain: 1,
                velocityToRate: 0,
                attack: [[0, 'step', 0.4]],
                decay:  [[0, 'target', 0]]
            },

            filterEnvelope: {
                velocityToGain: 1,
                velocityToRate: 0,
                attack: [[0, 'step', 0.4]],
                decay:  [[0, 'target', 0]]
            },

            filterFrequency: 200,
            filterQ: 0.71,

            velocityToFilterDetune: 12,
            velocityToFilterQ: 0.2,
            velocityToDetune: 0,

            map: 'path/to/map.json' || [{
                // Todo: lets call this buffer
                sample: {
                    url: 'path/to/audio.wav',
                    nominalFrequency: 0
                },

                noteRange: [36],
        		velocityRange: [0/7, 1/7],
        		velocityToGain: 0.25,
                velocityToDetune: 0,
                randomGain: 0,
                randomDetune: 0,
        		gain: 1.5,
        		decay: 0.2,
        		muteDecay: 0.08
            }]
        }
    },



    {
        /* Tone synth */
        id:   '1',
        type: 'tone-synth',
        data: {
            // rename as simply envelope, I think
            envelope1: {
                velocityToGain: 1,
                velocityToRate: 0,
                attack: [[0, 'step', 0.4]],
                decay:  [[0, 'target', 0]]
            },

            envelope2: {
                velocityToGain: 1,
                velocityToRate: 0,
                attack: [[0, 'step', 0.4]],
                decay:  [[0, 'target', 0]]
            },

            filterEnvelope: {
                velocityToGain: 1,
                velocityToRate: 0,
                attack: [[0, 'step', 0.4]],
                decay:  [[0, 'target', 0]]
            },

            filterFrequency: 200,
            filterQ: 0.71,

            velocityToFilterDetune: 12,
            velocityToFilterQ: 0.2,

            // Rename as velocityToEnvelope
            velocityToDetune: 0,
            level: 1
        }
    }],

    connections: [{
        source: 'id',
        target: 'id'
    }],

    controls: [{
        /* MIDI control */

        source: {
            device:  'midi',
            port:    'id',
            channel: 1,
            type:    'control',
            param:   1,
            value:   undefined
        },

        target: 'id.prop'

        data: {
            param: 'pitch',
            transform: 'linear',
            min: 0,
            max: 1,
        }
    },

    {
        /* Keyboard control */

        source: {
            device:  'keyboard',
            key: 'a'
        },

        target: 'id.prop'

        data: {
            param: 'pitch',
            transform: 'linear',
            min: 0,
            max: 1,
        }
    }],

    events: [
        [0, 'rate', 3],
        [0, 'meter', 4, 1]
    ],

    sequences: [{}],

    regions: [{

    }],

    // Properties unenumerable
    //rate:      2,
    context:   context,
    tempo:     120,
    meter: {
        duration: 4,
        division: 1
    },
    tuning:    440,
    beat:      0,
    bar:       0,
    startTime: undefined,
    stopTime:  undefined,

    // Lifecycle methods
    then(fn),

    // Graph methods
    create(type, settings),
    get(id),
    connect(node, output, input),
    disconnect(node, output, input),

    // Sequencer methods
    start(time),
    stop(time),
    beatAtBar(bar),
    beatAtTime(time),
    rateAtTime(time),
    meterAtTime(time),
    barAtBeat(beat),
    timeAtBeat(beat),
    cue(time, fn),

    // DOM stuff
    domTimeAtTime(time),
    timeAtDomTime(domTime)
}
