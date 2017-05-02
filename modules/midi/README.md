# MIDI

MIDI is a library for receiving, sending and manipulating browser MIDI messages.


## MIDI()

Create a stream of MIDI event objects:

    var midi = MIDI();

The first parameter to the constructor can be a query that filters the events
entering the stream. A query is either an array in the form of a MIDI message,
(`[status, data1, data2]`), or an array where the first two members describe
the status (`[channel, type, data1, data2]`). A shorter query of the same form
provides a broader filter. Here are some examples.

    MIDI([176, 7, 0])          // CH1, CC7, value 0
    MIDI([1, 'control', 7, 0]) // CH1, CC7, value 0

    MIDI([144, 60])            // CH1, NOTEON, C3
    MIDI([1, 'noteon', 60])    // CH1, NOTEON, C3
    MIDI([1, 'noteon', 'C3'])  // CH1, NOTEON, C3

    MIDI([144])                // CH1, NOTEON, all notes
    MIDI([1, 'noteon'])        // CH1, NOTEON, all notes

The shorthand type `'note'` creates a stream of 'noteon' and 'noteoff' messages.

    MIDI([1, 'note'])          // Channel 1, NOTEON and NOTEOFF, all notes

A MIDI stream inherits map, filter and consumer methods from
<a href="//github.com/stephband/fn#stream">`Stream`</a>.

    MIDI([1, 'noteon'])
    .map(get('data'))
    .each(function(message) {
    	// Do something with MIDI message
    });

A stream can be stopped with the `stop()` method.

	var midi = MIDI([1, 'noteon']).map(mapFn).each(outFn);

	// Sometime later...
	midi.stop();


## MIDI functions

### .on(query, fn)

Registers a handler `fn` for incoming MIDI events that match `query`. See the
`MIDI()` constructor above for a description of queries.

### .off(query, fn)

Removes an event handler `fn` from MIDI events matching the query. Where
`fn` is not given, removes all handlers from events matching the query.

<!--
### .normalise(e)

Takes a MIDI message array and returns a
<a href="https://github.com/sound-io/music-json-spec">Music JSON</a> event
array. Music JSON events have the form:

    [timestamp, type, data ... ]

Note velocity, controller data and aftertouch data are normalised as floats in
the range 0-1, while pitch bend data is normalised to floats representing
semitones. For example:

    MIDI.normalise([145,80,20], 1);    // [1, 'noteon', 80, 0.15748032]
    MIDI.normalise([180,1,127], 2);    // [2, 'control', 1, 1]
    MIDI.normalise([231,62,119], 3);   // [3, "pitch", 1.73409840]
    MIDI.normalise([168,62,119], 4);   // [4, "aftertouch", 62, 0.93700787]
-->

### .isNote(message)

    MIDI.isNote([145,80,20]);          // true

### .isPitch(message)

    MIDI.isPitch([145,80,20]);         // false

### .isControl(message)

    MIDI.isControl([145,80,20]);       // false

### .frequencyToNumber(ref, f)

Given a frequency `f` in Hz, returns the note number whose fundamental
harmonic corresponds to that frequency relative to the reference frequency `ref`.

    MIDI.frequencyToNumber(440, 440);   // 69
    MIDI.frequencyToNumber(440, 200);   // 55.349958

    MIDI.frequencyToNumber(440, 442);   // 68.921486

Results of <code>.frequencyToNumber</code> are rounded to six decimal places
to help avoid floating point errors and return whole semitones where intended.

### .normalise(e)

Takes a DOM MIDI event object and returns a
<a href="https://github.com/sound-io/music-json-spec">Music JSON</a> normalised
event array of the form `[time, type, number, velocity]`.

    MIDI.normalise(e);                 // [1, 'noteon', 80, 0.15748032]

### .numberToNote(n)

Given a note number between 0 and 127, returns a note name as a string.

    MIDI.numberToNote(66);             // 'F♯4'

MIDI uses unicode symbols for accidentals `♭` and `♯`. Note names can be
overridden by altering the array `MIDI.noteNames`.

### .numberToOctave(n)

Given a note number between 0 and 127, returns the octave the note is in as a number. 

    MIDI.numberToOctave(66);           // 4

### .numberToFrequency(ref, n)

Given a note number <code>n</code>, returns the frequency of the fundamental
tone of that note relative to the reference frequency for middle A, `ref`.

    MIDI.numberToFrequency(440, 69);   // 440
    MIDI.numberToFrequency(440, 60);   // 261.625565

    MIDI.numberToFrequency(442, 69);   // 442
    MIDI.numberToFrequency(442, 60);   // 262.814772

### .normaliseNote(message)

Many keyboards transmit <code>noteon</code> with velocity 0 rather than
`noteoff`s. `normaliseNote` converts `noteon` messages with velocity 0 to
`noteoff` messages. A new array is not created, the existing message is
modified and returned.

    MIDI.normaliseNote([145,80,0]);    // [129,80,0]

### .pitchToFloat(range, message)

Returns the pitch bend value in semitones. Range is the bend range up or down,
in semitones. Where range is not given it defaults to <code>2</code>.

    MIDI.pitchToFloat([xxx,xx,xxx], 2);  // -1.625

### .request()

A helper for `navigator.requestMIDIAcess()`. Where MIDI is supported, requests
access to the browser's midi API, returning a promise, or where MIDI is not
supported, returns a rejected promise.

    MIDI.request()
    .then(function(midi) {
        // Do something with midi object
    })
    .catch(function(error) {
        // Alert the user they don't have MIDI
    });

Note that using the `MIDI` library you don't really need to touch the browser's
lower-level `midi` object. `MIDI` library functions are available before the
promise is resolved. For example, calling `MIDI(query)` or `MIDI.on(query, fn)`
will bind to incoming MIDI events when `MIDI.request()` is resolved.

### .toChannel(message)

Returns the MIDI channel of the message as a number 1-16.

    MIDI.toChannel([145,80,20]);       // 2

### .toType(message)

Returns type of message.

    MIDI.toType([145,80,20]);          // 'noteon'

### .toStatus(channel, type)

Given a <code>channel</code> and <code>type</code>, returns the MIDI message number.

    MIDI.typeToNumber(1, 'noteon');     // 144

## MIDI properties

### .noteNames

An array of note names. Must have length `12` and contain one name for each
degree of the chromatic scale starting with C.

### .types

An array of message types.
