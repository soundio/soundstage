/**
Polyphonic(transport, settings)

```
const polyphonic = new Polyphonic(transport, {
    voice: {
        // Inherited from Graph
        nodes: [...],
        connections: [...],
        commands: [...],
        properties: {...},
        output: 'id',
    }
});
```

A Polyphonic is a polyphonic controller for multiple voice nodes. The `voice`
property describes an arbitrary node graph that is used to build and play
a voice node each time `Polyphonic.start()` is called.

For efficiency, voices are pooled and reused when they are idle.

The voice settings `nodes`, `connections`, `properties` and `output` are
inherited from Graph.
**/

import isDefined from '../../fn/modules/is-defined.js';
import remove from '../../fn/modules/remove.js';
import Pool from '../modules/pool.js';
import GraphObject from '../modules/graph-object.js';
import Monophonic, { defaults as voiceDefaults } from '../nodes/monophonic.js';

const DEBUG = window.DEBUG;
const assign = Object.assign;

export const config = {
    tuning: 440
};

const graph = {
    nodes: {
        sink: { type: 'sink' },
        pitch: { type: 'constant', data: { offset: 0 } },
        modulation: { type: 'constant', data: { offset: 120 } },
        output: { type: 'gain', data: {
            gain: 1,
            channelCount: 2,
            channelCountMode: 'explicit',
            channelInterpretation: 'speakers'
        }}
    },

    connections: [
        // Params are not attached to anything by default - they wait
        // to be attached to voices. You can't automate them until they have
        // a route to context.destination. That's just the way things work, so
        // attach them to sink to get them nice and active.
        'pitch', 'sink',
        'modulation', 'sink'
    ],

    properties: {
        pitch: { path: 'pitch.offset', enumerable: false },
        modulation: { path: 'modulation.offset', enumerable: false },
        output: 'output.gain'
    }
};

// Declare some useful defaults
const defaults = {
    gain: 1,
    pitch: 0,
    modulation: 1,
    output: 1
};

export default class Polyphonic extends GraphObject {
    #voice;
    #monophonics;

    constructor(transport, settings = {}) {
        // Initialize GraphObject with the graph
        // We want 1 event input (for MIDI events), 0 event outputs, and graph handles audio I/O
        super(transport, graph, 1, 0, settings);

        // Pool of monophonic sources
        this.#monophonics = new Pool(Monophonic, Monophonic.isIdle, (monophonic) => {
            if (DEBUG) {
                console.log('MONOPHONIC', monophonic);
            }

            this.get('pitch').connect(monophonic.pitch);
            this.get('modulation').connect(monophonic.modulation);
            monophonic.connect(this.get('output'));
        });

        // Start constants
        this.get('pitch').start();
        this.get('modulation').start();

        // Default voice
        this.voice = settings.voice || voiceDefaults;
    }

    /**
    .voice
    Get or set the voice definition for new polyphonic voices.
    **/
    set voice(object) {
        // Empty the pool, we are about to change the voice definition
        let n = this.#monophonics.length;
        let voice;
        while (voice = this.#monophonics[--n]) {
            // End-of-life active voices, mark them for removal
            if (voice.name) voice.EOL = true;
            // Remove inactive voices
            else this.#monophonics.splice(n, 1);
        }

        this.#voice = object;
    }

    get voice() {
        return this.#voice;
    }

    /**
    .start(time, note, velocity)

    Creates a voice node from the data in `.voice`, then calls its `.start()`
    method with the same parameters. Returns the voice node, enabling the
    pattern:

    ```
    polyphonic
    .start(startTime, note, velocity)
    .stop(stopTime);
    ```
    **/
    start(time, note = 60, gain = 1) {
        const monophonic = this.#monophonics.create(this.transport.context, this.voice, this.transport);
        monophonic.name = note;
        return monophonic.start(time, note, gain);
    }

    /**
    .stop(time, note)

    Stops the first playing voice node found to match `note`. Provided as a
    convenience: normally voice nodes are stopped using their own `.stop()`
    method.

    Returns this.
    **/
    stop(time, note, gain) {
        time = time || this.transport.context.currentTime;

        // Stop all notes
        if (!isDefined(note)) {
            this.#monophonics.forEach((monophonic) => monophonic.stop(time));
            return this;
        }

        if (note === undefined) return this;

        const monophonic = this.#monophonics.find((monophonic) =>
            monophonic.name === note
            && monophonic.startTime !== undefined
            && (monophonic.stopTime === undefined || monophonic.stopTime > time)
        );

        if (monophonic) {
            monophonic.stop(time, note);

            // Make sure we don't try stopping it again
            delete monophonic.name;

            // If voice has been end-of-lifed remove it from pool
            if (monophonic.EOL) remove(this.#monophonics, monophonic);
        }
        else if (DEBUG) {
            console.log('No voice to stop?');
        }

        return this;
    }

    destroy() {
        super.destroy();
        this.get('pitch').disconnect();
        this.get('modulation').disconnect();
        this.get('output').disconnect();
        this.#monophonics.forEach((monophonic) => monophonic.disconnect());
        return this;
    }

    static config = {
        output: { min: 0, max: 2, default: 1, law: 'log-36db', display: 'db', unit: 'dB' }
    }
}

// Make properties enumerable
Object.defineProperties(Polyphonic.prototype, {
    voice: { enumerable: true }
});
