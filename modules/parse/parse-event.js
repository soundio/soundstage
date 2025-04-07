
import get            from '../../../fn/modules/get.js';
import id             from '../../../fn/modules/id.js';
import capture        from '../../../fn/modules/capture.js';
import overload       from '../../../fn/modules/overload.js';
import parseFrequency from '../parse/parse-frequency.js';
import parseGain      from '../parse/parse-gain.js';

const tuning = 440;

/**
parseEvent(array, string)
Takes a sequence string and outputs an array of events.
**/

export default overload(get(1), {
    // name gain duration
    'note': capture(/^(\w+)\s+([^\s]+)\s+(\w+)\s*/, {
        1: (event, captures) => {
            event[1] = 'start';
            event[2] = parseFrequency(tuning, captures[1]);
            event[3] = parseGain(captures[2]);
            return event;
        }
    }),

    // name target duration
    'sequence': capture(/^(\w+)\s+(\w+)\s+(\w+)\s*/, {
        1: (event, captures) => {
            event[1] = 'sequence.' + captures[1];
            event[2] = captures[2];
            event[3] = parseFloat(captures[3]);
            return event;
        }
    }),

    // name value [curve]
    'param': capture(/^(\w+)\s+([-\d\.]+)(?:\s+(step|linear|exponential|target|curve))?\s*/, {
        1: (event, captures) => {
            event[1] = captures[1] + '.set';
            event[2] = parseFloat(captures[2]);
            event[3] = 0;
            return event;
        },

        // curve
        3: overload((event, captures) => captures[3], {
            // duration
            'target': capture(/^(\w+)\s*/, {
                1: (event, captures) => {
                    event[1] = event[1].replace('.set', '.target');
                    event[3] = parseFloat(captures[1]);
                    return event;
                }
            }),

            // Set curve
            default: (event, captures) => {
                event[1] = event[1].replace('.set', '.' + captures[3]);
                return event;
            }
        })
    })
});
