import { functions }  from '../../../../sparky/module.js';
import { frameClass } from '../../../../dom/module.js';
import * as MIDI from '../../../../midi/module.js';

const flashClass = frameClass('flash');

functions['midi-status'] = function(node, input) {
    MIDI.on('', (e) => flashClass(node));
};
