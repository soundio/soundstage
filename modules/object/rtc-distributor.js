import noop      from 'fn/noop.js';
import Events    from '../events.js';

export default class RTCDistributor {
    constructor(connection, channel = 1, fn = noop) {
        this.connection = connection;
        this.channel = channel;
        this.fn = fn;
        this.dataChannel = null;
        this.object = null;
    }

    push(events) {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            return;
        }

        let event;
        let i = -1 * Events.SIZE;
        while ((i += Events.SIZE) < events.length) {
            // Here event is a subarray of buffer - valid only so long as 
            // buffer is valid for this frame
            event = events.eventAt ?
                // Events might be an events object...
                events.eventAt(i / Events.SIZE) :
                // but we can't assume that events is an Events object
                Events.prototype.eventAt.call(events, i / Events.SIZE);

            // Send event as a simple array via the data channel
            try {
                const eventArray = [event[0], event[1], event[2], event[3]];
                this.dataChannel.send(JSON.stringify(eventArray));
            } catch (error) {
                console.error('RTCDistributor: Error sending event', error);
            }
        }
    }

    stop() {
        // Close data channel if it's open
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.close();
        }
        return this;
    }
}