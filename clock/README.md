# Clock
Clock maps a beat clock against a Web Audio time clock and provides
functions for scheduling events.

## Dependencies and tests

Clock depends on two repos that can be installed as git submodules:

- <a href="https://github.com/cruncher/collection">github.com/cruncher/Fn</a>
- <a href="https://github.com/soundio/audio-object">github.com/soundio/audio-object</a>

Install with submodules:

	git clone https://github.com/soundio/clock.git
	cd clock
	git submodule update --init

Tests use Karma. To run tests:

	npm install
	karma start


### `CueTimer(duration, lookahead, now)`

Where `duration` and `lookahead` are floats in seconds and `now` is a function
returning the current time.

##### `.requestCue(fn)`

Call `fn` on the next cue, with a single parameter, `time`.

##### `.cancelCue(fn)`

Remove `fn` from the functions called on the next cue.


### `Head(timer, clock, events, transform, fn)`

Reads an array or stream of events in MusicJSON format and sends them to `fn`
on the cue frames before they are due to be played.

##### `rate`

Current rate of the clock.

##### `start(time)`

Starts streaming events at `time` (or immediately, where `time` is not defined).

##### `stop(time)`

Stops streaming events at `time` (or immediately, where `time` is not defined).

##### `play(beat, events, fn)`

Creates a new head as a child of the current head, and starts it playing
`events` at `beat`, where `beat` is the position of the current head. Events
are sent to `fn` on the cue frames.

##### `timeAtBeat(beat)`

Returns the audio context time at `beat`.

##### `beatAtTime(time)`

Returns the beat position of the head at audio context time `time`.


### `Clock(audio, array)`

Clock is an instance of `Head` that is a direct child of the audio context's
time.

##### `rate`

Current rate of the clock.

##### `.create(events)`

Creates a sub-clock that reads an `events` array.

##### `.start(time)`

Starts streaming events at `time` (or immediately, where `time` is not defined).

##### `.stop(time)`

Stops streaming events at `time` (or immediately, where `time` is not defined).

##### `.timeAtBeat(beat)`

Returns the audio context time at `beat`.

##### `.beatAtTime(time)`

Returns the beat at audio context time `time`.

##### .automate(name, value, time)

    // Move to 120bpm in 2.5 seconds
    clock.automate('rate', 2, clock.time + 2.5);

Inherited from <a href="http://github.com/soundio/audio-object">AudioObject</a>.


### `Schedule(findEvents, findAudioObject [, object])`

Returns a function responsible for distributing events from a cue head.
