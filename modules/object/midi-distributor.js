
import noop              from 'fn/noop.js';
import overload          from 'fn/overload.js';
import Stream            from 'fn/stream/stream.js';
import { createMessage } from 'midi/message.js';
import Events            from '../events.js';


const assign = Object.assign;


function distribute(port, channel, event) {
    const time = event[0] || performance.now();
    const name = event[2];

    if (name === Events.NAMENUMBERS.start) {
        const message = createMessage(channel, 'noteon',  event[3], event[4]);
        port.send(message, time);
        return;
    }

    if (name === Events.NAMENUMBERS.stop) {
        const message = createMessage(channel, 'noteoff',  event[3], event[4]);
        port.send(message, time);
        return;
    }

    if (name === Events.NAMENUMBERS.pitch) {
        if (event[3] !== Events.TYPENUMBERS.set) console.log('TODO! support MIDI ramps');
        const message = createMessage(channel, 'pitch', event[4]);
        port.send(message, time);
        return;
    }

    if (name === Events.NAMENUMBERS.force) {
        if (event[3] !== Events.TYPENUMBERS.set) console.log('TODO! support MIDI ramps');
        const message = createMessage(channel, 'channeltouch', event[4]);
        port.send(message, time);
        return;
    }

    if (name < 128) {
        console.log('MIDIOutput event not sent ' + event.toString());
        return;
    }

    if (event[3] !== Events.NAMENUMBERS.set) console.log('TODO! support MIDI ramps');
    const message = createMessage(channel, 'control', event[2], event[4]);
    port.send(message, time);
}


export default class MIDIDistributor {
    constructor(port, channel = 1, fn = noop) {
        this.port    = port;
        this.channel = channel;
        this.fn      = fn;
    }

    push(events) {
        const port = this.port;
        if (!port) return;

        let address, event;
        let i = -1 * Events.SIZE;
        while ((i += Events.SIZE) < events.length) {
            // Here event is a subarray of buffer - be warned it is valid only so
            // long as buffer is valid for this frame, so practically speaking,
            // synchronous only (although in reality the buffer is not overwritten
            // until the next frame)
            event = events.eventAt ?
                // Events might be an events object...
                events.eventAt(i / Events.SIZE) :
                // but we can't assume that events is an Events object
                Events.prototype.eventAt.call(events, i / Events.SIZE) ;

            address = event[1];

            // Event is addressed to object
            if (!address) {
                distribute(port, this.channel, event);
                continue;
            }

            // What do we do if we get events addressed beyond the output? What
            // does that even mean?
            continue;
        }
    }

    stop() {
        this.midi && this.midi.removeEventListener('statechange', this);
        return Stream.prototype.stop(this);
    }
}
