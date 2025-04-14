
import StageObject from '../modules/object.js';

export default class AudioOut extends StageObject {
    constructor(transport, setting = {}) {
        super(0, 0);
        this.node = transport.context.destination;
    }
}
