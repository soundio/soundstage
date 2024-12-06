
// Soundstage color theme
//
// Red          #d60a3f
// Muted red    #b5002f
// Orange       #d8841d
// Palegreen fg #acb9b8
// Darkgreen bg #1c2726

import { print } from './modules/print.js';

print(' - http://github.com/soundio/soundstage');

import Soundstage from './modules/stage.js';
import { register } from './modules/graph/constructors.js';

import Input      from './nodes/input.js';
import Meter      from './nodes/meter.js';
import EQ         from './nodes/eq.js';
import Mix        from './nodes/mix.js';
import Envelope   from './nodes/envelope.js';
import Tick       from './nodes/tick.js';
import Recorder   from './nodes/recorder.js';
import Sink       from './nodes/sink.js';
import Sample     from './nodes/sample-set.js';
import Tone       from './nodes/tone.js';
import Noise      from './nodes/noise.js';
import Instrument from './nodes/instrument.js';
import Metronome  from './nodes/metronome.js';

/* Register the base set of AudioNode constructors */
register('input', Input);
register('meter', Meter);
register('eq', EQ);
register('mix', Mix);
register('envelope', Envelope);
register('tick', Tick);
register('recorder', Recorder);
register('sink', Sink);
register('sample', Sample);
register('tone', Tone);
register('noise', Noise);
register('instrument', Instrument);
register('metronome', Metronome);

export default Soundstage;
export { register };
export { timeAtDomTime, domTimeAtTime, getContextTime } from './modules/context.js';
export { transforms, parseValue } from './modules/transforms.js';
export { automate, automato__, isAudioParam, getValueAtTime } from './modules/automate__.js';
export * from './modules/encode.js';
export { requestBuffer } from './modules/request/request-buffer.js';
export { getEventsDuration, getEventDuration } from './modules/events.js';
