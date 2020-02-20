
// Soundstage color theme
//
// Red          #d60a3f
// Muted red    #b5002f
// Orange       #d8841d
// Palegreen fg #acb9b8
// Darkgreen bg #1c2726

import { print } from './modules/print.js';

print(' - http://github.com/soundio/soundstage');

import Soundstage from './modules/soundstage.js';

export default Soundstage;
export { timeAtDomTime, domTimeAtTime, getContextTime } from './modules/context.js';
export { transforms, parseValue } from './modules/transforms.js';
export { automate, automato__, isAudioParam, getValueAtTime } from './modules/automate.js';
export * from './modules/encode.js';
export { requestBuffer } from './modules/request-buffer.js';
export { getEventsDuration, getEventDuration } from './modules/events.js';
