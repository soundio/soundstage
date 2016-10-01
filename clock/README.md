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


## `CueTimer(duration, lookahead, now)`

Where `duration` and `lookahead` are floats in seconds and `now` is a function
returning the current time.

### `.requestCue(fn)`

Call `fn` on the next cue, with a single parameter, `time`.

### `.cancelCue(fn)`

Remove `fn` from the functions called on the next cue.


## `Clock(audio, array)`

### `.create(events)`

Creates a sub-clock that reads an `events` array.

### `.start(time)`

Starts streaming events at `time` (or immediately where `time` is not defined).

### `.stop(time)`

Stops streaming events at `time` (or immediately where `time` is not defined).

### `.timeAtBeat(beat)`

Returns the audio context time at `beat`.

### `.beatAtTime(time)`

Returns the beat at audio context time `time`.



### .automate(name, value, time)

    // Move to 120bpm in 2.5 seconds
    clock.automate('rate', 2, clock.time + 2.5);

Inherited from <a href="http://github.com/soundio/audio-object">AudioObject</a>.

### .tempo(beat, tempo)

Creates a tempo change at a time given by <code>beat</code>. If beat is not
defined, the clock creates a tempo change at the current <code>beat</code>.
