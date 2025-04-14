
/**
Envelope(context, settings)

```js
const envelope = stage.createNode('envelope', {
    // An array of param events describing a attack curve
    attack: [
        [0.01, 'linear', 1]
    ],

    // An array of param events describing a release curve
    release: [
        [0, 'target', 0, 0.2]
    ],

    gain: 1,
    rate: 1
});
```

<p class="warn">
Take care not to connect an envelope directly to your outputs – expecially if
you have expensive speakers attached. They are capable of producing DC signal.
</p>
**/

import Graph    from '../modules/graph.js';
import Playable from '../modules/playable.js';
import { t60 }  from '../modules/constants.js';
import { schedule } from '../modules/param.js';
//import config from '../config.js';
//import { assignSettingz__ } from '../modules/assign-settings.js';

const assign = Object.assign;
const define = Object.defineProperties;

const properties = {
    /** .attack
    An array of param events describing an arbitrary attack curve for the
    envelope. Param events have the form [time, type, value] (or if type is
    `'target'`, [time, type, value, duration]), where `time` is the time since
    the time passed to `.start(time)`.

    The default envelope value at time `0` is `0`.
    **/

    attack:  { writable: true, enumerable: true },

    /** .release
    An array of param events describing the release curve of the envelope. Param
    events have the form [time, type, value] (or if type is `'target'`
    [time, type, value, duration]), where `time` is the time since the time
    passed to `.stop(time)`.

    Values are scaled to the current value of the envelope – if the attack
    envelope decays to a value of `0.5`, say, by the scheduled stop time, all
    values in the release envelope are multiplied by `0.5`. The last event
    should have a value of `0`, otherwise the envelope will never stop.
    **/

    release: { writable: true, enumerable: true },

    /** .gain
    A float, nominally in the rage `0–1`, that is read on `.start()` to
    determine the gain to apply to the curve.
    **/

    gain:    { writable: true, enumerable: true },

    /** .rate
    A float that is read on `.start()` or `.stop()` to determine the rate of
    playback to apply to the curve.
    **/

    rate:    { writable: true, enumerable: true }
};

const defaults = {
    attack:  [
        // Ramp to 1 in 18ms
        [0,     'target', Math.E / (Math.E - 1), 0.018],
        [0.018, 'step',   1]
    ],
    release: [
        // Ramp to -60dB in 120ms
        [0, 'target', 0, 0.12 / t60]
    ],
    offset:  0,
    gain:    1,
    rate:    1
};

const graph = {
    nodes: {
        constant: { type: 'constant', data: { offset: 0 } },
        output:   { type: 'gain', data: { gain: 1, numberOfChannels: 1 } }
    },

    connections: ['constant', 'output']
};

export default class Envelope extends Graph {
    #output;

    constructor(context, settings = defaults) {
        // Set up the node graph and define .context, .connect, .disconnect, .get
        super(context, graph);
        // Mix in playable
        new Playable(context, this);

        this.attack  = settings.attack  ?? defaults.attack.slice();
        this.release = settings.release ?? defaults.release.slice();
        this.gain = 1;
        this.rate = 1;

        this.get('constant').start(context.currentTime);

        // Properties
        //define(this, properties);

        // Set properties and params
        //assignSettingz__(this, assign({}, defaults, settings));
    }

    /**
    .start(time)
    Start playback of envelope at `time`.
    Returns envelope.
    **/
    start(time) {
        // Update this.startTime
        Playable.prototype.start.apply(this, arguments);

        if (!this.attack || this.attack.length === 0) return this;

        // Reset offset, used for attack, to 0, and output gain, used for
        // release phase, to 1
        const c = this.get('constant');
        const o = this.get('output');

        c.offset.setValueAtTime(0, this.startTime);
        o.gain.setValueAtTime(1, this.startTime);

        // Cue attack phase on offset
        schedule(c.offset, this.startTime, this.attack, this.rate, this.gain);
        return this;
    }

    /**
    .stop(time)
    Stop playback of envelope at `time`.
    Returns envelope.
    **/
    stop(time) {
        // Update this.stopTime
        Playable.prototype.stop.apply(this, arguments);

        if (!this.release || this.release.length === 0) return this;

        // Stop further attack automation
        const c = this.get('constant');
        const o = this.get('output');

        // Arrest attack phase (or should we allow it to continue? Good question.)
        c.offset.cancelAndHoldAtTime(this.stopTime);

        // Cue release phase on gain, update stopTime to include release tail
        this.stopTime = schedule(o.gain, this.stopTime, this.release, this.rate, 1);
        return this;
    }

    static config = {
        gain:    { min: 0.25,   max: 4,  law: 'log' },
        rate:    { min: 0.0625, max: 16, law: 'log' },
        attack:  { display: 'envelope' },
        release: { display: 'envelope' }
    }
}

// Mixin property definitions
define(Envelope.prototype, {
    status: Object.getOwnPropertyDescriptor(Playable.prototype, 'status'),
});
