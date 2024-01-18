
import id         from '../../../fn/modules/id.js';
import Privates   from '../../../fn/modules/privates.js';
import Playable   from '../playable.js';
import Frames     from './frames.js';
import Head       from './head.js';
import distribute from './distribute.js';
import { log }    from '../print.js';

const assign = Object.assign;


/* Sequencer */

export default function Sequencer(context, events, sequences) {
    this.context    = context;
    this.events     = events;
    this.sequences  = sequences;
}

assign(Sequencer, {
    of: function() {
        return new Sequencer(arguments);
    },

    from: function(data) {
        return new Sequencer(data.events, data.sequences, distribute);
    }
});

assign(Sequencer.prototype, {
    start: function(time) {
        //const transport = this.transport;

        // If the sequencer is running stop it first
        //if (this.status !== IDLE) { this.stop(time); }

        // Delegate timing to playable
        Playable.prototype.start.call(this, time);

        if (window.DEBUG) {
            log('Sequencer start()', 'startTime', this.startTime, 'transport'/*, transport.status*/);
        }

        //if (transport.status !== PLAYING) {
        //    transport.start(time, beat);
        //}

        const privates = Privates(this);
        const frames   = new Frames(this.context);
        const head     = new Head(this.events, this.sequences, id, this, distribute);
console.log('START', this.startTime);
        // Pipe frames to playback head and send resulting events
        // to distributor
        return privates.playbackStream = frames
        .pipe(head)
        .start(this.startTime);
    },

    /**
    .stop(time)
    Stops the sequencer at `time`, stopping all child sequence streams.
    **/
    stop: function(time) {
        const privates = Privates(this);

        // Ought to be this.time TODO
        time = time || this.context.currentTime;

        // Set this.stopTime
        Playable.prototype.stop.call(this, time);

        if (window.DEBUG) {
            log('Sequencer stop() ', 'stopTime ', this.stopTime, 'status', this.status);
        }

        // Hold automation for the rate node
        // param, time, curve, value, duration, notify, context
        //automate(this.rate, this.stopTime, 'hold', null, null, privates.notify, this.context);

        // Store beat
        //privates.beat = this.beatAtTime(this.stopTime);

        // Stop sequence
        privates.playbackStream.stop(this.stopTime);

        // Stop transport ??? Naaaaa... not if we are going to .stop() inside .start()
        //this.transport.stop(this.stopTime);

        return this;
    }
});
