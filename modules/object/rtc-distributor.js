import noop      from 'fn/noop.js';
import Events    from '../events.js';

/**
 * RTCDistributor 
 * Handles event distribution through WebRTC data channels
 */
export default class RTCDistributor {
    constructor(connection, fn = noop) {
        this.connection = connection;
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
            event = events.eventAt ?
                events.eventAt(i / Events.SIZE) :
                Events.prototype.eventAt.call(events, i / Events.SIZE);

            try {
                // Prepare event as a simple array for transmission
                const eventArray = [event[0], event[1], event[2], event[3]];
                this.dataChannel.send(JSON.stringify(eventArray));
            } catch (error) {
                console.error('Error sending event:', error);
            }
        }
    }

    stop() {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.close();
        }
        return this;
    }
}