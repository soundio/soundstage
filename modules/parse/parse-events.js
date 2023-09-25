
import get            from '../../../fn/modules/get.js';
import id             from '../../../fn/modules/id.js';
import capture        from '../../../fn/modules/capture.js';
import overload       from '../../../fn/modules/overload.js';
import Event          from '../event.js';
import parseEvent     from './parse-event.js';
import parseFrequency from './parse-frequency.js';
import parseGain      from './parse-gain.js';

const types = {
    1: 'note',
    4: 'param',
    5: 'sequence'
};

function parseType(value) {
    // Crude but sort of effective
    return types[value] || value;
}


/**
parseEvents(string)
Takes a sequence string and outputs an array of events.
**/

const event = [];
const parseEvents = capture(/^\s*([-\d\.e]+)\s+(\w+)\s+/, {
    2: (data, captures) => {
        // time
        event[0] = parseFloat(captures[1]);
        // type
        event[1] = captures[2];
        // parameters
        parseEvent(event, captures);
        // Convert to event object
        data.push(Event.from(event));
        return data;
    },

    close: (data, captures) => {
        const consumed = (captures.consumed || 0)
            + captures.index
            + captures[0].length ;

        return consumed < captures.input.length ?
            parseEvents(data, captures) :
            data ;
    }
});

export default function(string) {
    const data = [];
    return parseEvents(data, string);
};
