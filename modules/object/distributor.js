
import Stream           from 'fn/stream/stream.js';
import Events, { toName, toNameNumber, toTypeNumber, toRoute } from '../events.js';
import { ADDRESSBITS, ADDRESSMASK, NAMEBITS, TYPEBITS, NAMETYPEMASK } from '../events/address.js';
import { isAudioParam } from '../param.js';


const assign = Object.assign;


function distribute(object, event) {
    // Route to actual implementation object TODO: Nail your flag to the mast!
    object = object.node || object;

    // Get route, which contains name and type info
    const name = toName(event[1]);
    if (!(name in object)) {
        console.warn('Object', `event dropped, no property "${name}" in object`, event);
        return;
    }

    const type = toTypeNumber(event[1]);
    if (isAudioParam(object[name])) {
        // We need to import schedule from param.js
        return object[name].setValueAtTime(event[2], event[0]);
    }
    if (type !== Events.TYPENUMBERS.set) {
        console.warn('Object', `event dropped, property "${ name }" not an AudioParam, does not support event type "${ type }"`, event);
        return;
    }

    if (name === 'record') return object.record(event[0], event[2], event[3]);
    if (name === 'start')  return object.start(event[0], event[2], event[3]);
    if (name === 'stop')   return object.stop(event[0], event[2], event[3]);
    if (type === Events.TYPENUMBERS.set)    object[name] = event[2];

    console.warn('Object', `event dropped and I don't know why`, event);
}

export default class DistributorInput extends Stream {
    constructor(object) {
        super()
        this.object = object;
    }

    // Updated push method
    push(events) {
        const object = this.object;
        const size   = events.length / Events.SIZE;
        let route, event, nametype, index, rest;
        let n = -1;
        while (++n < size) {
            // Here event is a subarray of buffer - be warned it is valid only
            // so long as buffer is valid for this frame, so, practically speaking,
            // synchronous only – although in reality the buffer is not overwritten
            // until the next frame
            event = events.eventAt ?
                // Events might be an events object...
                events.eventAt(n) :
                // but we can't assume that events is an Events object
                Events.prototype.eventAt.call(events, n);

            route = toRoute(event[1]);

            // Event is addressed to object, distribute it
            if (route === 0) {
                distribute(object, event);
                continue;
            }

            // We need to preserve the name and type bits from the original event[1]
            nametype = event[1] & NAMETYPEMASK;
            // Get first level index
            index    = route >> ADDRESSBITS;
            // If index is 0 that means the route is the second level index so rest must be 0
            rest     = index ? route & ADDRESSMASK : 0 ;
            // If index is 0 the route is the index
            index    = index || route;

            // Reconstruct the full value with new route and original name/type bits
            event[1] = (rest << (NAMEBITS + TYPEBITS)) | nametype;

            const output = this[index];

            if (!output) {
                console.log('No output found for route', event.toString());
                continue;
            }
            console.log('Distributor', event.toString());
            output.push(event);
        }
    }
}

assign(DistributorInput.prototype, {
    stop: Stream.prototype.stop,
    done: Stream.prototype.done
});
