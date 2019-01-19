
// Red          #d60a3f
// Muted red    #b5002f
// Orange       #d8841d
// Palegreen fg #acb9b8
// Darkgreen bg #1c2726

import { print } from './modules/utilities/print.js';

print(' - http://github.com/soundio/soundstage');

import Soundstage from './modules/soundstage.js';

export default Soundstage;
export { transforms } from './modules/transforms.js';
export { automate, isAudioParam, getValueAtTime } from './modules/automate.js';
