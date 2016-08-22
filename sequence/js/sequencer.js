var parse = function (item) {
    if (item[1] === 'note') {
        return {
            type: 'note',
            time: item[0],
            number: item[2],
            velocity: item[3],
            duration: item[4]
        };
    } else if(item[1] === 'chord') {
        return {
            type: 'chord',
            time: item[0],
            keycentre: item[2],
            mode: item[3],
            duration: item[4]
        };
    }
};

var chordModeIncrs = {
    '-': [0, 3, 7],
    '∆': [0, 4, 7],
    '∆7': [0, 4, 7, 11],
    '7': [0, 4, 7, 10],
    '-7': [0, 3, 7, 10],
    'ø': [0, 3, 6],
    'sus': [0, 5, 10, 13]
};

var chordNotes = function (chord) {
    chord.keycentre = chord.keycentre + '4';
    var note = function (number) {
        return {
            type: 'note',
            number: number,
            duration: chord.duration,
            time: chord.time
        };
    };
    var notes = [];
    var baseNoteNumber = MIDI.noteToNumber(chord.keycentre);
    chordModeIncrs[chord.mode].forEach(function (incr) {
        notes.push(note(baseNoteNumber + incr));
    });
    return notes;
};

function Sequencer(oscillator, clock) {
    this.oscillator = oscillator;
    this.clock = clock;
}

// Play a musicJSON object
Sequencer.prototype.play = function (music) {
    var self = this;
    music.events.forEach(function (item) {
        var parsed;
        if (item.type) {
            parsed = item;
        } else {
            parsed = parse(item);
        }
        if (parsed.type === 'note') {
            self.playNote(parsed);
        } else if (parsed.type === 'chord') {
            self.playChord(parsed);
        }
    });
};


// Play a sequence of [time, noteon/noteoff, duration, velocity]
Sequencer.prototype.playSequence = function (sequence) {
    var self = this;
    sequence.forEach(function (item) {
        self.clock.cue(item[0], function (time) {
            self.oscillator.trigger(time, item[1], item[2], 1);
        });
    });
};

Sequencer.prototype.playNote = function (note) {
    var self = this;
    this.clock.cue(note.time, function (time) {
        self.oscillator.trigger(time, 'noteon', note.number, 1);
    });
    this.clock.cue(note.time + note.duration, function (time) {
        self.oscillator.trigger(time, 'noteoff', note.number);
    });
};

Sequencer.prototype.playChord = function (chord) {
    this.play({sequence: chordNotes(chord)});
};
