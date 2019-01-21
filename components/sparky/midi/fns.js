import { functions }  from '../../../../sparky/sparky.js';
import { frameClass } from '../../../../dom/dom.js';
import * as MIDI from '../../../../midi/midi.js';

const flashClass = frameClass('flash');

functions['midi-status'] = function(node, input) {
    MIDI.on('', (e) => flashClass(node));
};
