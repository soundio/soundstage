
import id           from '../../../fn/modules/id.js';
import mix          from '../../../fn/modules/mix.js';
import Privates     from '../../../fn/modules/privates.js';
import Playable     from '../mixins/playable.js';
import Frames       from './frames.js';
import PlayHead     from './play-head.js';

import { log }      from '../print.js';


const assign = Object.assign;


/** Sequencer() **/

export default function Sequencer(context, events, sequences) {
    Playable.call(this, context);
    this.events    = events;
    this.sequences = sequences;
}

assign(Sequencer, {
    from: (data) => new Sequencer(data.context, data.events, data.sequences)
});

mix(Sequencer.prototype, Playable.prototype);

assign(Sequencer.prototype, {
    start: function(time) {
        const privates = Privates(this);
        //const transport = this.transport;

        // Delegate timing to playable
        Playable.prototype.start.call(this, time);

        if (window.DEBUG) {
            log('Sequencer start()', 'startTime', this.startTime, 'transport'/*, transport.status*/);
        }

        //if (transport.status !== PLAYING) {
        //    transport.start(time, beat);
        //}

        const frames = new Frames(this.context);
        const head   = new PlayHead(this.events, this.sequences, id, {
            start: function(a, b, c, d, e) {
                //console.log('START', a, b, c, d, e);
                return this;
            },

            stop: function(a, b) {
                //console.log('STOP', a, b);
                return this;
            }
        });

        // Pipe frames to playback head (sneaky use of privates.playhead, be warned)
        return privates.playhead = frames
        .pipe(head)
        .start(this.startTime);
    },

    /**
    .stop(time)
    Stops the sequencer at `time`, stopping all child sequence streams.
    **/
    stop: function(time) {
        const privates = Privates(this);

        if (!privates.playhead || privates.playhead.status === 'done') {
            console.trace('Attempt to stop stopped sequencer');
            return this;
        }

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
        privates.playhead.stop(this.stopTime);

        // Stop transport ??? Naaaaa... not if we are going to .stop() inside .start()
        //this.transport.stop(this.stopTime);

        return this;
    }
});
