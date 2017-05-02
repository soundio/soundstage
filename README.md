# Soundstage

Soundstage is a Graph Object Model for Web Audio processing graphs. It provides an API
for creating, manipulating and observing graphs, and a JSONify-able structure for
exporting and importing them.

Soundstage is the library that powers <a href="http://sound.io">sound.io</a>.


## Soundstage(data, options) – overview

Soundstage <code>data</code> is an object with properties that define audio objects,
the connections between them, a MIDI map and playable sequences. All properties
are optional:

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
		],

		presets: [],

		sequence: []
	};

<code>objects</code> is an array of
<a href="http://github.com/soundio/audio-object">audio objects</a> (an audio
object is a wrapper for a Web Audio node graph). In Soundstage, audio objects must
have an <code>id</code> and <code>type</code>. Other properties depend on the
audio params that this type of audio object exposes.

<code>connections</code> is an array of connection objects defining connections
between the audio objects.

<code>midi</code> is an array of routes for incoming MIDI messages.

<code>presets</code> is an array of presets used by audio objects.

<code>sequence</code> is a
<a href="http://github.com/soundio/music-json">Music JSON</a> sequence array of
events. The sequence is played on <code>soundstage.sequence.start()</code>.

Call Soundstage with this data to set it up as an audio graph:

	var soundstage = Soundstage(data);

Turn your volume down a bit, enable the mic when prompted by the browser, and
you will hear your voice being flanged.

The resulting object, <code>soundstage</code>, has the same structure as
<code>data</code>, so the graph can be converted back to data with:

	JSON.stringify(soundstage);

This means you can <b>export an audio graph</b> you have made at, say,
<a href="http://sound.io">sound.io</a> – open the console and run
<code>JSON.stringify(soundstage)</code> – and <b>import it into your own web
page</b> – call <code>Soundstage(data)</code> with the data.

Soundstage also accepts an <code>options</code> object. There is currently one
option. Where your page has an existing audio context, pass it in to have
Soundstage use it:

	var soundstage = Soundstage(data, { audio: myAudioContext });

## soundstage methods

### .create()

    soundstage.create(type, settings);

Creates an audio object of <code>type</code>, with <code>settings</code> giving
values for it's properties.

    var delay = soundstage.create('delay', { time: 1 });
    var output = soundstage.outputs[0];

    soundstage.connect(delay, output);

Soundstage comes with audio object types:

    "input"
    "output"
    "biquad-filter"
    "compressor"
    "convolver"
    "delay"
    "filter"
    "flanger"
    "loop"
    "oscillator"
    "pan"
    "saturate"
    "sampler"
    "send"
    "signal-detector"
    "tone-synth"
    "waveshaper"

You can also add your own audio objects with <code>Soundstage.register(type, fn, settings)</code>.

### .createInputs()

    soundstage.createInputs();

Creates as many input audio objects as your input device will allow* (adding
them to <code>soundstage.objects</code> along the way).

If information about your input device is not available yet (when the promise
<code>Soundstage.requestMedia(audio)</code> is resolved), then three input
audio objects are created by default, from the input channels Stereo L-R,
Mono L and Mono R. More are created if the device allows it when it becomes
available.

    console.log(soundstage.inputs)

    [
        { type: "input", id: 1, channels: [0,1] },
        { type: "input", id: 2, channels: [0] },
        { type: "input", id: 3, channels: [1] }
    ]

*Currently, multi-channel input devices are not supported by browsers.

### .createOutputs()

    soundstage.createOutputs();

Creates as many output audio objects as your output device will allow (adding
them to <code>soundstage.objects</code> along the way).

One output audio object is created by default, for destination Stereo 1-2.

    console.log(soundstage.outputs)

    [
        { type: "output", id: 4, channels: [0,1] }
    ]

### .connect()

    soundstage.connect(source, destination);

Connects the default output of <code>source</code> to the default input of
<code>destination</code>, where <code>source</code> and
<code>destination</code> are audio objects or ids of audio objects.

    soundstage.connect(source, destination, outName, inName);

Connects the named output of <code>source</code> to named input of
<code>destination</code>.

### .disconnect()

    soundstage.disconnect(source, destination);

Disconnects the default output of <code>source</code> from
the default input of <code>destination</code>.

    soundstage.connect(source, destination, outName, inName);

Disconnects the named output of <code>source</code> from the named
<code>input</code> of <code>destination</code>.

### .clear()

Remove and destroy all objects, connections, midi maps and sequences.

### .destroy()

Removes and destroys all objects and connections, disconnects any media
inputs from soundstage's input, and disconnects soundstage's output from audio
destination.

### .find()

    soundstage.find(id)

Returns the audio objects with id.

### .query()

    soundstage.query(selector)

Takes either a selector string or a query object and
returns an array of matching audio objects.

    soundstage.query('[type="tone-synth"]');
    soundstage.query({ type: 'tone-synth' });

### .stringify()

    soundstage.stringify()

Returns the JSON string <code>JSON.stringify(soundstage)</code>.

### .update()

    soundstage.update(data);

Creates new objects, or updates existing objects, from data.

    soundstage.update({
        objects: [
            { type: "flanger", id: 5 },
            { type: "looper", id: 6 }
        },
        connections: [
            { source: 5, destination: 6 }
        ]
    });

<code>Soundstage(data)</code> uses <code>soundstage.update(data)</code>
internally when initially creating a <code>soundstage</code>.

## soundstage properties

### .tempo

    var tempo = soundstage.tempo;

Gets and sets the tempo. A shortcut for controlling
<code>soundstage.clock.rate</code>, where

    soundstage.tempo = 60;

sets the clock rate to <code>1</code> beat per second.

### .objects

A collection of <a href="http://github.com/soundio/audio-object">audio objects</a>.
An audio object controls one or more audio nodes. In soundstage, audio objects have
an <code>id</code> and a <code>type</code>. <code>name</code> is optional. Other
properties depend on the type.

	var flanger = soundstage.objects.find(1);

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

    soundstage.objects.create(type, settings)

Create an audio object. <code>type</code> is a string, properties of
<code>settings</code> depend on the type.

Returns the created audio object. Created objects can also be found in
<code>soundstage.objects</code>, as well as in <code>soundstage.inputs</code> and
<code>soundstage.outputs</code> if they are of type <code>"input"</code> or
<code>"output"</code> respectively.

    soundstage.objects.delete(object || id)

Destroy an audio object in the graph. Both the object and any connections to or
from the object are destroyed.

    soundstage.objects.find(id || query)
    soundstage.objects.query(query)

<code>soundstage.objects</code> is published in <code>JSON.stringify(soundstage)</code>.

### soundstage.inputs

A subset collection of <code>soundstage.objects</code>, containing only type
<code>'input'</code> audio objects.

<code>soundstage.inputs</code> is NOT published in <code>JSON.stringify(soundstage)</code>.

### soundstage.outputs

A subset collection of <code>soundstage.objects</code>, containing only type
<code>'output'</code> audio objects.

<code>soundstage.outputs</code> is NOT published in <code>JSON.stringify(soundstage)</code>.

### soundstage.connections

A collection of connections between the audio objects in the graph. A connection
has a <code>source</code> and a <code>destination</code> that point to
<code>id</code>s of objects in <code>soundstage.objects</code>:

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


    soundstage.connections.create(data)

Connect two objects. <code>data</code> must have <code>source</code> and
<code>destination</code> defined. Naming an <code>output</code> or
<code>input</code> is optional. They will default to <code>"default"</code>.

    soundstage.connections.create({
        source: 7,
        output: "send",
        destination: 12
    });


    soundstage.connections.delete(query)

Removes all connections whose properties are equal to the properties defined in
the <code>query</code> object. For example, disconnect all connections to
object with id <code>3</code>:

    soundstage.connections.query({ destination: 3 });


    soundstage.connections.query(query)

Returns an array of all objects in <code>connections</code> whose properties
are equal to the properties defined in the <code>query</code> object. For
example, get all connections from object with id <code>6</code>:

    soundstage.connections.query({ source: 6 });

### soundstage.clock

An instance of <code><a href="http://github.com/soundio/clock">Clock</a></code>,
which requires the repo <a href="http://github.com/soundio/clock">github.com/soundio/clock</a>.
If <code>Clock</code> is not found, <code>soundstage.clock</code> is <code>undefined</code>.

<code>soundstage.clock</code> maps a <code>beat</code> clock against the audio
context's <code>time</code> clock, and publishes properties and methods for
scheduling function calls. It is also an
<a href="http://github.com/soundio/audio-object">AudioObject</a> with two
output nodes, <code>"rate"</code> and <code>"duration"</code>, for syncing Web
Audio parameters to tempo.

<code>soundstage.clock</code> is not published by <code>JSON.stringify(soundstage)</code>.

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















### soundstage.midi

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


    soundstage.midi.create(data)

Create a MIDI route from data:

    soundstage.midi.create({
        message:   [191, 0],
        object:    1,
        property:  "gain",
        transform: "cubic",
        min:       0,
        max:       2
    });

The properties <code>transform</code>, <code>min</code> and <code>max</code> are
optional. They default to different values depending on the type of the object.


    soundstage.midi.delete(query)

Removes all MIDI routes whose properties are equal to the properties defined in
the <code>query</code> object. For example, disconnect all routes to gain
properties:

    soundstage.midi.query({ property: "gain" });


    soundstage.midi.query(query)

Returns an array of all objects in <code>soundstage.midi</code> whose properties
are equal to the properties defined in the <code>query</code> object. For
example, get all connections from object with id <code>6</code>:

    soundstage.connections.query({ object: 6 });


## Soundstage

### Soundstage.register(type, function)

Register an audio object constructor function for creating audio objects of
<code>type</code>.

	Soundstage.register('my-audio-object', MyAudioObjectConstructor);

MyAudioObjectConstructor receives the parameters:

	function MyAudioObjectConstructor(audio, settings, clock, presets) {
		var options = assign({}, defaults, settings);
		// Set up audio object
	};

<code>settings</code> is an object that comes directly from set-up data passed to
<code>soundstage.objects.create(type, settings)</code> or <code>Soundstage(data)</code>.
You should make sure the registered audio object correctly initialises itself
from <code>settings</code>, and <code>JSON.stringify</code>s back to
<code>settings</code>.

Soundstage comes with several audio object constructors already registered:

    // Single node audio objects
    'biquad-filter'
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

Overwrite them at your peril.


### .getEventDuration()

    Soundstage.getEventDuration(event);

Returns the duration of a sequence event.

### .getEventsDuration()

    Soundstage.getEventsDuration(events);

Returns the duration of a collection of events, a sequence.

### .getInput()

    Soundstage.getInput(object);

Returns the default input AudioNode of an AudioObject.

    Soundstage.getInput(object, 'rate');

Returns the named input AudioNode of the AudioObject <code>object</code>.

If <code>object</code> is not an AudioObject, returns <code>undefined</code>.

### .getOutput()

    Soundstage.getOutput(object);

Returns the default output AudioNode of an AudioObject.

    Soundstage.getInput(object, 'rate');

Returns the named output AudioNode of the AudioObject <code>object</code>.

If <code>object</code> is not an AudioObject, returns <code>undefined</code>.

### .isAudioContext()

    Soundstage.isAudioContext(object);

Returns <code>true</code> where <code>object</code> is an AudioContext.

### .isAudioNode()

    Soundstage.isAudioNode(object);

Returns <code>true</code> where <code>object</code> is an AudioNode.

### .isAudioParam()

    Soundstage.isAudioParam(object);

Returns <code>true</code> where <code>object</code> is an AudioParam.

### .isAudioObject()

    Soundstage.isAudioObject(object);

Returns <code>true</code> where <code>object</code> is an AudioObject.

### .isDefined()

    Soundstage.isDefined(object)

Returns <code>true</code> where <code>object</code> is not <code>undefined</code>
or <code>null</code>.

### .isEvent()

    Soundstage.isEvent(object)

Returns <code>true</code> where <code>object</code> is a sequence event. Uses
duck typing - events have no prototype to check for type.

### .requestMedia()

    Soundstage.requestMedia(audio).then(function(mediaNode) {
        mediaNode.connect(...);
    });

Given the audio context <code>audio</code>, requestMedia returns a promise that
resolves to a MediaStreamSourceNode. That node carries the stream from the
device's physical audio inputs.

Only one MediaStreamSourceNode is created per audio context.

### .features

    Soundstage.features

An object of results from feature tests.

    Soundstage.features.disconectParameters

<code>true</code> if the Web Audio API supports disconnecting specified nodes
via the <code>node1.disconnect(node2)</code>, otherwise <code>false</code>.


## Dependencies and tests

Soundstage is in development. It is currently dependent on three repos that can be
installed as git submodules:

- <a href="https://github.com/stephband/fn">github.com/stephband/fn</a>
- <a href="https://github.com/cruncher/collection">github.com/cruncher/collection</a>
- <a href="https://github.com/soundio/audio-object">github.com/soundio/audio-object</a>
- <a href="https://github.com/soundio/midi">github.com/soundio/midi</a> (optional)
- <a href="https://github.com/stephband/">github.com/soundio/music</a>

Install with submodules:

	git clone https://github.com/soundio/soundstage.git
	cd soundstage
	git submodule update --init

Tests use Karma. To run tests:

	npm install
	karma start


## Author

Stephen Band <a href="http://twitter.com/stephband">@stephband</a>
