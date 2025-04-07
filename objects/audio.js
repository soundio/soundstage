import get         from 'fn/get.js';
import noop        from 'fn/noop.js';
import overload    from 'fn/overload.js';
import Stream      from 'fn/stream/stream.js';
import Data        from 'fn/data.js';
import Signal      from 'fn/signal.js';
import * as nodes  from '../modules/nodes.js';
import { isAudioParamLike, schedule } from '../modules/param.js';
import StageObject from '../modules/object.js';
import Events from '../modules/events.js';




export default class Audio extends StageObject {
    constructor(id, setting = {}, context, transport) {
        super(id, 1, 0);
        this.node = nodes.create(context, setting.type, setting.data, transport);
    }

    async saveAudioBuffers(fn) {
        return this.node.saveAudioBuffers ?
            await this.node.saveAudioBuffers(fn) :
            null ;
    }
}
