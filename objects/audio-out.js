
import StageObject from '../modules/object.js';

export default class AudioOut extends StageObject {
    constructor(id, setting = {}, context) {
        super(id, { size: 0 }, { size: 0 });
        this.context = context;
        this.node    = this.context.destination;
    }
}
