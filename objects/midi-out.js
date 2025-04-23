
import Data            from 'fn/data.js';
import Signal          from 'fn/signal.js';
import { MIDIOutputs } from 'midi/ports.js';
import MIDIDistributor from '../modules/object/midi-distributor.js';
import StageObject     from '../modules/stage-object.js';


const assign   = Object.assign;
const defaults = {};
const names = Array.from({ length: 16 }, (n, i) => 'Channel ' + (i + 1));


/*
MIDIOut()
Schema:
```js
{
    data {
        port // MIDI output port
    }
}
```
*/

function updateInputs(inputs, port) {
    let i;
    for (i in inputs) {
        if (!/^\d/.test(i)) continue;
        inputs[i].port = port;
    }
}

export default class MIDIOut extends StageObject {
    constructor(transport, settings = {}) {
        const ports   = {};
        const inputs  = { size: 16, names };
        const outputs = { size: 0 };

        super(transport, inputs, outputs);
        this.data = Data.of(settings);

        Signal.tick(() => {
            const id = this.data.port;
            this.port = ports[id];
            const inputs = StageObject.getInputs(this);
            updateInputs(inputs, this.port);
        });

        MIDIOutputs.each((port) => {
            ports[port.id] = port;
            if (this.data.id === port.id) {
                this.port = port;
                const inputs = StageObject.getInputs(this);
                updateInputs(inputs, this.port);
            }
        });
    }

    input(n = 0) {
        const inputs = StageObject.getInputs(this);

        if (n >= inputs.size) {
            throw new Error('StageObject attempt to get .input(' + n + '), object has ' + this.outputs.size + ' outputs');
        }

        return inputs[n] || (inputs[n] = assign(
            new MIDIDistributor(undefined, n + 1, (event) => console.log(event)),
            { object: this }
        ));
    }
};
