
import NodeObject from '../modules/node-object.js';

export default class AudioOut extends NodeObject {
    constructor(transport, setting = {}) {
        const node = transport.context.destination;
        super(transport, node, 0, 0);
    }
}
