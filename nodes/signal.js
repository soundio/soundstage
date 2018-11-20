
import { noop, nothing } from '../../fn/fn.js';

const assign = Object.assign;

export default class SignalDetector extends AudioWorkletNode {
    constructor(context, settings, stage = nothing, notify = noop) {
        super(context, 'signal-detector');
        const node = this;

        this.connectedChannelCount = 0;

        this.port.onmessage = (e) => {
            let n = Math.max(node.connectedChannelCount, e.data.connectedChannelCount);

            while (n--) {
                if (node[n] !== e.data[n]) {
                    node[n] = e.data[n];
                    notify(node, n);
                }
            }

            if (node.connectedChannelCount !== e.data.connectedChannelCount) {
                node.connectedChannelCount = e.data.connectedChannelCount;
                notify(node, 'connectedChannelCount');
            }
        };

        // It's ok, this doesn't emit anything
        this.connect(context.destination);
    }
}
