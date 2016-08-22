# Clock
Clock maps a beat clock against a Web Audio time clock and provides
functions for scheduling function calls.

## Dependencies and tests

Clock depends on two repos that can be installed as git submodules:

- <a href="https://github.com/cruncher/collection">github.com/cruncher/collection</a>
- <a href="https://github.com/soundio/audio-object">github.com/soundio/audio-object</a>

Install with submodules:

	git clone https://github.com/soundio/clock.git
	cd clock
	git submodule update --init

Tests use Karma. To run tests:

	npm install
	karma start

## Clock(audio, array)

Constructs a tempo clock, where <code>audio</code> is a Web Audio context and
<code>data</code> is an optional array of tempo changes.

    var audio = new window.AudioContext();
    var data  = [
        { beat: 0, tempo: 120 },
        { beat: 16, tempo: 180 }
    ];
    var clock = new Clock(audio, data);

The <code>clock</code> object is now a Collection of tempo data that maps a
<code>beat</code> clock against the audio context's <code>time</code> clock. It
is a library of properties and methods for scheduling function calls. It is also
an <a href="http://github.com/soundio/audio-object">AudioObject</a> with two
outputs, <code>"rate"</code> and <code>"duration"</code>, for syncing Web Audio
parameters to the tempo.

## clock

### .time

The current time. Gets <code>audio.currentTime</code>. Read-only.

### .beat

The current beat. Gets <code>clock.beatAtTime(audio.currentTime)</code>. Read-only.

### .rate

The current rate, in beats per second.

### .timeAtBeat(beat)

Returns the audio context time at <code>beat</code>.

### .beatAtTime(time)

Returns the beat at <code>time</code>.

### .automate(name, value, time)

    // Move to 120bpm in 2.5 seconds
    clock.automate('rate', 2, clock.time + 2.5);

Inherited from <a href="http://github.com/soundio/audio-object">AudioObject</a>.

### .tempo(beat, tempo)

Creates a tempo change at a time given by <code>beat</code>. If beat is not
defined, the clock creates a tempo change at the current <code>beat</code>.

### .find(beat)

Returns tempo change found at <code>beat</code> or <code>undefined</code>.

### .remove(beat)

Removes tempo change found at <code>beat</code>.

### .on(beat, fn)

<!--Shorthand for <code>clock.cue(beat, fn, 0)</code-->
Calls <code>fn</code> at the beat specified (no lookahead).

### .cue(beat, fn)

Cue a function to be called just before <code>beat</code>. <code>fn</code> is
called with the argument <code>time</code>, which can used to
accurately schedule Web Audio changes.

    clock.cue(42, function(time) {
        gainParam.setValueAtTime(time, 0.25);
        bufferSourceNode.start(time);
    });

Additional parameters are also passed to the callback <code>fn</code> as extra
arguments.

    function fire(time, delayNode, value) {
        delayNode.delayTime.setValueAtTime(time, value);
    }
    
    clock.cue(42, fire, delayNode, value);

<!--Pass in a third parameter <code>lookahead</code> to override the default
(<code>0.05</code>s) lookahead:

    clock.cue(44, function(time) {
        gainParam.setValueAtTime(time, 1);
        bufferSourceNode.stop(time);
    }, 0.08); -->

### .uncue(beat, fn)

Removes <code>fn</code> at <code>beat</code> from the timer queue.
Either, neither or both <code>beat</code> and <code>fn</code> can be given.

Remove all cues from the timer queue:

    clock.uncue();

Remove all cues at <code>beat</code> from the timer queue:

    clock.uncue(beat);

Remove all cues to <code>fn</code> from the timer queue:

    clock.uncue(fn);

Remove all cues at <code>beat</code> for <code>fn</code> from the timer queue:

    clock.uncue(beat, fn)

### .uncueAfter(beat, fn)

Removes <code>fn</code> after <code>beat</code> from the timer queue.
<code>fn</code> is optional.

Remove all cues after <code>beat</code> from the timer queue:

    clock.uncueAfter(beat);

Remove all cues after <code>beat</code> for <code>fn</code> from the timer queue:

    clock.uncueAfter(beat, fn)

### .onTime(time, fn)

Shorthand for <code>clock.cue(time, fn, 0)</code>, calls <code>fn</code>
at the time specified (<code>0</code> ms lookahead).

### .cueTime(time, fn)

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

### .uncueTime(time, fn)

Removes <code>fn</code> at <code>time</code> from the timer cues.
Either, neither or both <code>time</code> and <code>fn</code> can be given.

Remove all cues from the timer queue:

    clock.uncueTime();

Remove all cues at <code>time</code> from the timer queue:

    clock.uncueTime(time);

Remove all cues to <code>fn</code> from the timer queue:

    clock.uncueTime(fn);

Remove all cues at <code>time</code> for <code>fn</code> from the timer queue:

    clock.uncueTime(time, fn)

### .uncueAfterBeat(time, fn)

Removes <code>fn</code> after <code>time</code> from the timer queue.
<code>fn</code> is optional.

Remove all cues after <code>time</code> from the timer queue:

    clock.uncueAfterTime(time);

Remove all cues after <code>time</code> for <code>fn</code> from the timer queue:

    clock.uncueAfterTime(time, fn)


