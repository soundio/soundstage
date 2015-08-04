# Soundio

Soundio is a Graph Object Model for Web Audio processing graphs. It provides an API
for creating, manipulating and observing graphs, and a JSONify-able structure for
exporting and importing them.

Soundio is the library that powers <a href="http://sound.io">sound.io</a>.


## Dependencies and tests

Soundio is in development. It is currently dependent on three repos that can be
installed as git submodules:

- <a href="https://github.com/cruncher/collection">github.com/cruncher/collection</a>
- <a href="https://github.com/soundio/audio-object">github.com/soundio/audio-object</a>
- <a href="https://github.com/soundio/clock">github.com/soundio/clock</a> (optional)
- <a href="https://github.com/soundio/midi">github.com/soundio/midi</a> (optional)

Install with submodules:

	git clone https://github.com/soundio/soundio.git
	cd soundio
	git submodule update --init

Tests use Karma. To run tests:

	npm install
	karma start

## Soundio(data, options)

Soundio <code>data</code> is an object that looks something like this:

	var data = {
		objects: [
			{ id: 0, type: "input" },
			{ id: 1, type: "flange", frequency: 0.33, feedback: 0.9, delay: 0.16 },
			{ id: 2, type: "output" }
		],
		
		connections: [
			{ source: 0, destination: 1 },
			{ source: 1, destination: 2 }
		],

		midi: [
			{ message: [176, 8], object: 1, property: "frequency" }
		]
	};

It contains three arrays, <code>objects</code>, <code>connections</code> and
<code>midi</code>. <code>objects</code> is a collection of
<a href="http://github.com/soundio/audio-object">audio objects</a> (an audio
object is a wrapper for one or more Web Audio nodes). Audio objects must have an
<code>id</code> and <code>type</code>, while other properties depend on the
type. <code>connections</code> is a collection of objects defining connections
between the audio objects, and <code>midi</code> defines routes for incoming
MIDI messages.

Call Soundio with this data to set it up as an audio graph:

	var soundio = Soundio(data);

Turn your volume down a bit, enable the mic when prompted by the browser, and
you will hear your voice being flanged. Changes to object properties are
reflected 'live' in the Web Audio graph.

The resulting object, <code>soundio</code>, has the same structure as
<code>data</code>, so the graph can be converted back to data with:

	JSON.stringify(soundio);

This means you can <b>export an audio graph</b> you have made at, say,
<a href="http://sound.io">sound.io</a> – open the console and run this line –
and <b>import it into your own web page</b> – call <code>Soundio()</code> with
the data.

Soundio also accepts an <code>options</code> object with one option. Where you
have an existing AudioContext, pass it in to avoid creating a new one:

	var soundio = Soundio(data, {
			audio: AudioContext
		});

## soundio

### soundio.create(data)

Create objects from data. As with <code>Soundio(data)</code>, but
<code>soundio.create(data)</code> adds objects, connections and midi routes to
the existing graph.

### soundio.clear()

Remove and destroy all objects and connections.

### soundio.destroy()

Removes and destroys all objects and connections, disconnects any media
inputs from soundio's input, and disconnects soundio's output from audio
destination.

### soundio.objects

A collecton of <a href="http://github.com/soundio/audio-object">audio objects</a>.
An audio object controls one or more audio nodes. In soundio, audio objects have
an <code>id</code> and a <code>type</code>. <code>name</code> is optional. Other
properties depend on the type.

	var flanger = soundio.objects.find(1);
	
	{
	    id: 7,
	    type: "flange",
	    frequency: 256
	}

Changes to <code>flanger.frequency</code> are reflected immediately in the
Web Audio graph.

	flanger.frequency = 480;
	
	// flanger.automate(name, value, time, curve)
	flanger.automate('frequency', 2400, audio.currentTime + 0.8, 'exponential');

For more about audio objects see
<a href="http://github.com/soundio/audio-object">github.com/soundio/audio-object</a>.

#### soundio.objects.create(type, settings)

Create an audio object.

<code>type</code> is a string.

These audio objects connect to the sound card input and output respectively:

- "input"
- "output"

These audio objects wrap sub-graphs of audio nodes and are kind of equivalent to
plugins in a DAW:

- "compress"
- "filter"
- "flange"
- "loop"
- "saturate"
- "send"

These audio objects wrap single Web Audio nodes and can be useful for testing:

- "biquad filter"
- "compressor"
- "convolver"
- "delay"
- "oscillator"
- "waveshaper"

<code>settings</code> depend on the type of audio object being created.

Returns the created audio object. Created objects can also be found in
<code>soundio.objects</code>, as well as in <code>soundio.inputs</code> and
<code>soundio.outputs</code> if they are of type <code>"input"</code> or
<code>"output"</code> respectively.

#### soundio.objects.delete(object || id)

Destroy an audio object in the graph. Both the object and any connections to or
from the object are destroyed.

#### soundio.objects.find(id || query)
#### soundio.objects.query(query)

### soundio.connections

A collection of connections between the audio objects in the graph. A connection
has a <code>source</code> and a <code>destination</code> that point to
<code>id</code>s of objects in <code>soundio.objects</code>:

	{
		source: 7,
		destination: 12
	}

In addition a connection can define a named output node on the source object
and/or a named input node on the destination object:

	{
		source: 7,
		output: "send",
		destination: 12,
		input: "default"
	}


#### soundio.connections.create(data)

Connect two objects. <code>data</code> must have <code>source</code> and
<code>destination</code> defined. Naming an <code>output</code> or
<code>input</code> is optional. They will default to <code>"default"</code>.

    soundio.connections.create({
        source: 7,
        output: "send",
        destination: 12
    });


#### soundio.connections.delete(query)

Removes all connections whose properties are equal to the properties defined in
the <code>query</code> object. For example, disconnect all connections to
object with id <code>3</code>:

    soundio.connections.query({ destination: 3 });


#### soundio.connections.query(query)

Returns an array of all objects in <code>connections</code> whose properties
are equal to the properties defined in the <code>query</code> object. For
example, get all connections from object with id <code>6</code>:

    soundio.connections.query({ source: 6 });


### soundio.clock

An instance of <code><a href="http://github.com/soundio/clock">Clock</a></code>,
which requires the repo <a href="http://github.com/soundio/clock">github.com/soundio/clock</a>.
If <code>Clock</code> is not found, <code>soundio.clock</code> is <code>undefined</code>.

<code>soundio.clock</code> is a Collection of tempo data that maps a
<code>beat</code> clock against the audio context's <code>time</code> clock. It
is a library of properties and methods for scheduling function calls. It is also
an <a href="http://github.com/soundio/audio-object">AudioObject</a> with two
output nodes, <code>"rate"</code> and <code>"duration"</code>, for syncing Web
Audio parameters to the tempo.

#### .time

The current time. Gets <code>audio.currentTime</code>. Read-only.

#### .beat

The current beat. Gets <code>clock.beatAtTime(audio.currentTime)</code>. Read-only.

#### .rate

The current rate, in beats per second.

#### .timeAtBeat(beat)

Returns the audio context time at <code>beat</code>.

#### .beatAtTime(time)

Returns the beat at <code>time</code>.

#### .automate(name, value, time)

    // Move to 120bpm in 2.5 seconds
    clock.automate('rate', 2, clock.time + 2.5);

Inherited from <a href="http://github.com/soundio/audio-object">AudioObject</a>.

#### .tempo(beat, tempo)

Creates a tempo change at a time given by <code>beat</code>. If beat is not
defined, the clock creates a tempo change at the current <code>beat</code>.

#### .find(beat)

Returns tempo change found at <code>beat</code> or <code>undefined</code>.

#### .remove(beat)

Removes tempo change found at <code>beat</code>.

#### .on(beat, fn)

Shorthand for <code>clock.cue(beat, fn, 0)</code>, calls <code>fn</code>
at the beat specified (<code>0</code> ms lookahead).

#### .cue(beat, fn)

Cue a function to be called just before <code>beat</code>.
<code>fn</code> is called with the argument <code>time</code>, which can used to
accurately schedule Web Audio changes.

    clock.cue(42, function(time) {
        gainParam.setValueAtTime(time, 0.25);
        bufferSourceNode.start(time);
    });

Pass in a third parameter <code>lookahead</code> to override the default
(<code>0.05</code>s) lookahead:

    clock.cue(44, function(time) {
        gainParam.setValueAtTime(time, 1);
        bufferSourceNode.stop(time);
    }, 0.08);

#### .uncue(beat, fn)

Removes <code>fn</code> at <code>beat</code> from the timer queue.
Either, neither or both <code>beat</code> and <code>fn</code> can be given.

Remove all cues from the timer queue:

    clock.uncue();

Remove cues at <code>beat</code> from the timer queue:

    clock.uncue(beat);

Remove cues to fire <code>fn</code> from the timer queue:

    clock.uncue(fn);

Remove cues at <code>beat</code> to fire <code>fn</code> from the timer queue:

    clock.uncue(beat, fn)

#### .uncueAfter(beat, fn)

Removes <code>fn</code> after <code>beat</code> from the timer queue.
<code>fn</code> is optional.

Remove all cues after <code>beat</code> from the timer queue:

    clock.uncueAfter(beat);

Remove all cues after <code>beat</code> to fire <code>fn</code> from the timer queue:

    clock.uncueAfter(beat, fn)

#### .onTime(time, fn)

Shorthand for <code>clock.cueTime(time, fn, 0)</code>, calls <code>fn</code>
at the time specified (<code>0</code> ms lookahead).

#### .cueTime(time, fn)

Cue a function to be called just before <code>time</code>. <code>fn</code> is
called with the argument <code>time</code>, which can used to accurately
schedule changes to Web Audio parameters:

    clock.cue(42, function(time) {
        gainParam.setValueAtTime(time, 0.25);
        bufferSourceNode.start(time);
    });

Pass in a third parameter <code>lookahead</code> to override the default
(<code>0.05</code>s) lookahead:

    clock.cue(44, fn, 0.08);

#### .uncueTime(time, fn)

Removes <code>fn</code> at <code>time</code> from the timer cues.
Either, neither or both <code>time</code> and <code>fn</code> can be given.

Remove all cues from the timer queue:

    clock.uncueTime();

Remove cues at <code>time</code> from the timer queue:

    clock.uncueTime(time);

Remove cues to fire <code>fn</code> from the timer queue:

    clock.uncueTime(fn);

Remove cues at <code>time</code> to fire <code>fn</code> from the timer queue:

    clock.uncueTime(time, fn)

#### .uncueAfterTime(time, fn)

Removes <code>fn</code> after <code>time</code> from the timer queue.
<code>fn</code> is optional.

Remove all cues after <code>time</code> from the timer queue:

    clock.uncueAfterTime(time);

Remove all cues after <code>time</code> for <code>fn</code> from the timer queue:

    clock.uncueAfterTime(time, fn)















### soundio.midi

A collection of MIDI routes that make object properties controllable via
incoming MIDI events. A midi route looks like this:

    {
        message:   [191, 0],
        object:    AudioObject,
        property:  "gain",
        transform: "linear",
        min:       0,
        max:       1
    }


#### soundio.midi.create(data)

Create a MIDI route from data:

    soundio.midi.create({
        message:   [191, 0],
        object:    1,
        property:  "gain",
        transform: "cubic",
        min:       0,
        max:       2
    });

The properties <code>transform</code>, <code>min</code> and <code>max</code> are
optional. They default to different values depending on the type of the object.


#### soundio.midi.delete(query)

Removes all MIDI routes whose properties are equal to the properties defined in
the <code>query</code> object. For example, disconnect all routes to gain
properties:

    soundio.midi.query({ property: "gain" });


#### soundio.midi.query(query)

Returns an array of all objects in <code>soundio.midi</code> whose properties
are equal to the properties defined in the <code>query</code> object. For
example, get all connections from object with id <code>6</code>:

    soundio.connections.query({ object: 6 });


## Soundio

### Soundio.register(type, function)

Register an audio object factory function for creating audio objects of type
<code>type</code>.

	Soundio.register('gain', function(audio, data) {
		var gainNode = audio.createGain();

		gainNode.gain.value = settings.gain;

		return AudioObject(audio, gain, gain, {
			gain: gainNode.gain
		});
	});

<code>data</code> is an object that comes directly from data passed to
<code>soundio.objects.create(type, data)</code> or <code>Soundio(data)</code>.
You should make sure the registered audio object correctly initialises itself
from <code>data</code>, and <code>JSON.stringify</code>s back to
<code>data</code>.

Soundio comes with the following audio object factories registered:

    // Single node audio objects 
    'biquad filter'
    'compressor'
    'convolver'
    'delay'
    'oscillator'
    'waveshaper'

    // Multi node audio objects
    'compress'
    'flange'
    'loop'
    'filter'
    'saturate'
    'send'

### Soundio.isAudioParam(object)

### Soundio.isDefined(value)

Returns <code>true</code> where <code>value</code> is not <code>undefined</code>
or <code>null</code>.
