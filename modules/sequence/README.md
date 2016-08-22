# Sequence

Sequence object for [sound.io](http://github.com/soundio).

    git clone https://github.com/soundio/sequence
    cd sequence

See [index.html](https://github.com/grimborg/soundio-sequencer/blob/master/index.html) for an example.


## Sequence(clock, data, settings)

To create a sequence call the <code>Sequence</code> constructor, passing in a
clock.

    var audio = new window.AudioContext();
    var clock = new Clock(audio);
    var sequence1 = new Sequence(clock, [
        [0, "noteon", 49, 0.2],
        [1, "noteoff", 49]
    ]);
    
    sequence1.start();

A sequence itself is a form of clock, so dependent sequences can be created by
passing in an existing sequence as the <code>clock</code> parameter.

    var sequence2 = new Sequence(sequence, [
        [0, "noteon", 49, 0.2],
        [1, "noteoff", 49]
    ]);

<code>sequence2</code> is now slaved to <code>sequence1</code>. When
<code>sequence1</code> stops, <code>sequence2</code> stops.

### .start(beat)

### .stop(beat)

### .cue(beat, fn)

### .uncue(beat, fn)

### .subscribe(fn)

Register a function to be called when a Music JSON event cue fires (normally
50ms before the actual event time). The function is called with the parameters
of the event as arguments with <code>time</code> and <code>duration</code> is
converted to absolute time. Use them to schedule changes directly on Web Audio
nodes and parameters.

    sequence.subscribe(function(time, type, data...) {
        if (type === "note")
    });

### .unsubscribe(fn)

Unregister a subscribed function.

    sequence.unsubscribe(fn);

### .on(type, fn)

Registers a function that is fired when the sequence changes. A sequence fires
the types:

"start"
"stop"
"add"
"remove"
"spawn"

### .off(type, fn)

Unregisters a function that listens for changes to the sequence.
