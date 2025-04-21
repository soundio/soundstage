
import * as nodes     from './modules/nodes.js';
import Soundstage     from './modules/stage.js';

import Envelope       from './nodes/envelope.js';
import Enveloper      from './nodes/enveloper.js';
import Flanger        from './nodes/flanger.js';
import Meter          from './nodes/meter.js';
import Noise          from './nodes/noise.js';
import SampleMap      from './nodes/sample-map.js';
import Tick           from './nodes/tick.js';
import Tone           from './nodes/tone.js';
import Saturator      from './nodes/saturator.js';
import BufferRecorder from './nodes/buffer-recorder.js';
import TapeSaturator  from './nodes/tape-saturator.js';


export default Soundstage;


// Register nodes

nodes.register('envelope',        Envelope);
nodes.register('enveloper',       Enveloper);
nodes.register('flanger',         Flanger);
nodes.register('meter',           Meter);
nodes.register('noise',           Noise);
nodes.register('sample',          SampleMap);
nodes.register('tick',            Tick);
nodes.register('tone',            Tone);
nodes.register('saturator',       Saturator);
nodes.register('buffer-recorder', BufferRecorder);
nodes.register('tape-saturator',  TapeSaturator);


// Register objects

import NodeObject      from './modules/node-object.js';
import AudioIn         from './objects/audio-in.js';
import AudioOut        from './objects/audio-out.js';
import Merger          from './objects/merger.js';
import Splitter        from './objects/splitter.js';
import Compressor      from './objects/compressor.js';
import Delay           from './objects/delay.js';
import EQ              from './objects/eq.js';
import Filter          from './objects/filter.js';
import FlangerObject   from './objects/flanger.js';
import Gain            from './objects/gain.js';
import Looper          from './objects/looper.js';
import MeterObject     from './objects/meter.js';
import MetronomeObject from './objects/metronome.js';
import MidiInObject    from './objects/midi-in.js';
import MidiOutObject   from './objects/midi-out.js';
import Mix             from './objects/mix.js';
import Oscillator      from './objects/oscillator.js';
import Panner          from './objects/panner.js';
import ParallelEQ      from './objects/parallel-eq.js';
import Polyphonic      from './objects/polyphonic.js';
import SaturatorObject from './objects/saturator.js';
import StereoPanner    from './objects/stereo-panner.js';
import Sequencer       from './objects/sequencer.js';
import TapeSaturatorObject from './objects/tape-saturator.js';
import TransformObject from './objects/transform.js';
import WaveShaper      from './objects/wave-shaper.js';

const assign = Object.assign;
const define = Object.defineProperties;

Soundstage.register(
    AudioIn,
    AudioOut,
    Compressor,
    Delay,
    EQ,
    Filter,
    FlangerObject,
    Gain,
    Looper,
    Merger,
    MeterObject,
    MetronomeObject,
    MidiInObject,
    MidiOutObject,
    Mix,
    Oscillator,
    Panner,
    ParallelEQ,
    Polyphonic,
    SaturatorObject,
    Splitter,
    StereoPanner,
    Sequencer,
    TapeSaturatorObject,
    TransformObject,
    WaveShaper
);
