
/**
Tick(context, settings)

```
const tick = stage.createNode('tick', {
    resonance:         // Todo
    decay:             // Todo
    gain: 1            // Output gain nominally in the range `0–1`
});
```

A tick object is a signal generator that emits a 'tick' sound on `.start()`.
Used inside the metronome.
**/

/**
.resonance
A float?? Todo.
**/

/**
.decay
A float?? Todo.
**/

/**
.gain
An AudioParam representing output gain.
**/

import noop     from '../../fn/modules/noop.js';
import Playable from '../modules/playable.js';
import { floatToFrequency, toNoteNumber } from '../../midi/modules/data.js';
import { dB48 } from '../modules/constants.js';

const assign = Object.assign;


// Define

export const defaults = {
    gain:      0.25,
    decay:     0.06,
    resonance: 22
};


// Tick

export default function Tick(context, options) {
    if (!Tick.prototype.isPrototypeOf(this)) {
        return new Tick(context, options);
    }

    // Define .startTime and .stopTime
    Playable.call(this, context);

    var settings   = assign({}, defaults, options);
    var oscillator = context.createOscillator();
    var filter     = context.createBiquadFilter();
    var gain       = context.createGain();
    var output     = context.createGain();
    //var merger     = audio.createChannelMerger(2);

    //NodeGraph.call(this, {
    //	nodes: [
    //		{ id: 'oscillator', type: 'oscillator',    settings: { channelCount: 1 } },
    //		{ id: 'filter',     type: 'biquad-filter', settings: { channelCount: 1 } },
    //		{ id: 'gain',       type: 'gain',          settings: { channelCount: 1 } },
    //		{ id: 'output',     type: 'gain',          settings: { channelCount: 1 } },
    //	],
    //
    //	connections: [
    //		{ source: 'oscillator', target: 'filter' },
    //		{ source: 'filter',     target: 'gain' },
    //		{ source: 'gain',       target: 'output' },
    //	]
    //})

    oscillator.channelCount = 1;
    filter.channelCount     = 1;
    gain.channelCount       = 1;
    gain.gain.value         = 0;
    output.channelCount     = 1;

    function schedule(time, frequency, level, decay, resonance) {
        var attackTime = time > 0.002 ? time - 0.002 : 0 ;

        // Todo: Feature test setTargetAtTime in the AudioObject namespace.
        // Firefox is REALLY flakey at setTargetAtTime. More often than not
        // it acts like setValueAtTime. Avoid using it where possible.

        oscillator.frequency.setValueAtTime(frequency, attackTime);
        oscillator.frequency.exponentialRampToValueAtTime(frequency / 1.06, time + decay);

        filter.frequency.cancelAndHoldAtTime(attackTime);
        filter.frequency.setValueAtTime(frequency * 1.1, attackTime);
        filter.frequency.exponentialRampToValueAtTime(frequency * 4.98, time);
        //filter.frequency.setTargetAtTime(frequency + 300, time + 0.003, 0.0625);
        filter.frequency.exponentialRampToValueAtTime(frequency * 1.5, time + decay);

        filter.Q.cancelAndHoldAtTime(attackTime);
        filter.Q.setValueAtTime(0, attackTime);
        filter.Q.linearRampToValueAtTime(resonance, time);
        //filter.Q.setTargetAtTime(0, time + 0.05, 0.0625);
        filter.Q.linearRampToValueAtTime(0, time + decay);

        gain.gain.cancelAndHoldAtTime(attackTime);
        gain.gain.setValueAtTime(0, attackTime);
        gain.gain.linearRampToValueAtTime(level, time);
        //gain.gain.setTargetAtTime(0, time, decay);
        gain.gain.exponentialRampToValueAtTime(dB48, time + decay);
        // Todo: work out the gradient of the exponential at time + decay,
        // us it to schedule the linear ramp of the same gradient.
        gain.gain.linearRampToValueAtTime(0, time + decay * 1.25);
    }

    function unschedule(time, decay) {
        gain.gain.cancelAndHoldAtTime(time + decay * 1.25);
    }

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(300, context.currentTime);
    oscillator.start();
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(output);

    this.gain      = output.gain;
    this.resonance = settings.resonance;
    this.decay     = settings.decay;

    /**
    .start(time, note, velocity)
    Todo: move parameters to be properties of tick object, echoing other signal generators
    **/
    this.start = function(time, frequency, level) {
        Playable.prototype.start.apply(this, arguments);
        schedule(time || context.currentTime, frequency, level, this.decay, this.resonance);
        return this;
    };

    //this.stop = function(time) {
    //	// Don't. It's causing problems. I think we'll simply live with the
    //	// fact that the metronome doesn't stop immediately when you stop
    //	// the sequencer.
    //	//unschedule(time, this.decay);
    //	return this;
    //};

    this.destroy = function() {
        oscillator.disconnect();
        filter.disconnect();
        gain.disconnect();
        output.disconnect();
    };

    this.connect = function() {
        return output.connect.apply(output, arguments);
    };

    this.disconnect = function() {
        return output.disconnect.apply(output, arguments);
    };
}


/**
.stop()
A noop method, provided to echo the interface of other generators.
**/

assign(Tick.prototype, Playable.prototype, {
    stop: noop
});
