
/*
Envelope(context, settings)

```
const envelope = stage.create('envelope', {
    [Todo]
});
```
*/

import PlayNode from './play-node.js';
import { automate, getValueAtTime, validateParamEvent } from '../modules/automate.js';
import config from '../config.js';
import { assignSettingz__ } from '../modules/assign-settings.js';

const assign = Object.assign;
const define = Object.defineProperties;
const getDefinition = Object.getOwnPropertyDescriptor;

// Time multiplier to wait before we accept target value has 'arrived'
const targetDurationFactor = config.targetDurationFactor;

const properties = {
    /* .attack
    An array of param events describing the attack curve of the envelope.
    */

    attack:  { writable: true, enumerable: true },

    /* .release
    An array of param events describing the release curve of the envelope.
    */

    release: { writable: true, enumerable: true },

    /* .gain
    A float, nominally in the rage `0–1`, that is read on `.start()` to
    determine the gain to apply to the curve.
    */

    gain:    { writable: true, enumerable: true },

    /* .rate
    A float that is read on `.start()` to determine the rate of playback to
    apply to the curve.
    */

    rate:    { writable: true, enumerable: true }
};

const defaults = {
    attack: [
        [0.008, 'linear', 1]
    ],

    release: [
        [0.008, 'linear', 0]
    ],

    offset: 0,
    gain: 1,
    rate: 1
};

function cueAutomation(param, events, time, gain, rate) {
    var event;
    automate(param, time, 'hold');

    for (event of events) {
        validateParamEvent(event);

        // param, time, curve, value, decay
        automate(param, time + event[0] / rate, event[1], event[2] * gain, event[3]);
    }
}

export default class Envelope extends ConstantSourceNode {
    constructor(context, settings) {
        super(context);
        super.start.call(this, context.currentTime);

        // Define .start(), .stop(), .startTime and .stopTime
        PlayNode.call(this, context);

        // Properties
        define(this, properties);

        // Set properties and params
        assignSettingz__(this, assign({}, defaults, settings));
    }

    /* .start(time)

    Start playback of envelope at `time`.

    Returns `this`.
    */

    start(time) {
        if (!this.attack) { return this; }
        PlayNode.prototype.start.apply(this, arguments);
        cueAutomation(this.offset, this.attack, this.startTime, this.gain, this.rate, 'ConstantSource.offset');
        return this;
    }

    /* .stop(time)

    Stop playback of envelope at `time`.

    Returns `this`.
    */

    stop(time) {
        if (!this.release) { return this; }
        PlayNode.prototype.stop.apply(this, arguments);

        // Use the current signal as the start gain of the release
        const gain = getValueAtTime(this.offset, this.stopTime);
        cueAutomation(this.offset, this.release, this.stopTime, gain, this.rate, 'ConstantSource.offset');

        // Update stopTime to include release tail
        const last = this.release[this.release.length - 1];
        if (last[2] !== 0) {
            console.warn('Envelope.release does not end with value 0. Envelope will never stop.', this);
            this.stopTime = Infinity;
        }
        else {
            this.stopTime += last[1] === 'target' ?
                last[0] + last[3] * targetDurationFactor :
                last[0] ;
        }

        return this;
    }
}

define(Envelope.prototype, {
    playing: getDefinition(PlayNode.prototype, 'playing')
});
