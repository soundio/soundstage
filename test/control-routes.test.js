import { test } from '../../fn/fn.js';
import * as MIDI from '../../midi/midi.js';
import ControlRoutes from '../modules/control-routes.js';

test('ControlRoutes()', function(run, print, fixture) {
    run('.learnMIDI(target)', function(equals, done) {
        const output = [0, 0.49606299212598426, 0];

        const routes = new ControlRoutes();
        equals(0, routes.length);

        routes.learnMIDI({
            push: function(time, value) {
                equals(output.shift(), value);
            }
        });

        MIDI.trigger(null, 1, 'noteon',  69, 1);

        // Should trigger route
        MIDI.trigger(null, 1, 'noteoff', 69, 1);
        MIDI.trigger(null, 1, 'noteon',  69, 0.5);
        MIDI.trigger(null, 1, 'noteoff', 69, 0.5);

        // Should not trigger route
        MIDI.trigger(null, 1, 'noteon',  70, 64);
        MIDI.trigger(null, 1, 'noteoff', 70, 64);

        equals('[{"source":{"port":"INTERNAL","channel":1,"type":"note","param":69},"transform":"linear","min":0,"max":1,"target":{}}]', JSON.stringify(routes));

        routes[0].destroy();
        equals('[]', JSON.stringify(routes));

        done();
	}, 6);

    run('.learnKey(target)', function(equals, done) {
        const output = [0, 1, 0, 3, 1];
        const routes = new ControlRoutes();

        routes.learnKey({
            push: function(time, value) {
                equals(output.shift(), value);
            }
        });

        print('Press SPACE...');
        document.addEventListener('keyup', function pause(e) {
            document.removeEventListener('keyup', pause);

            print('Press SPACE again...');
            document.addEventListener('keyup', function pause(e) {
                document.removeEventListener('keyup', pause);

                routes[0].min = 1;
                routes[0].max = 3;

                print('Press SPACE again...');
                document.addEventListener('keyup', function pause(e) {
                    document.removeEventListener('keyup', pause);

                    equals('[{"source":{"key":"space"},"transform":"linear","min":1,"max":3,"target":{}}]', JSON.stringify(routes));

                    routes[0].destroy();
                    equals('[]', JSON.stringify(routes));

                    print('Press SPACE one last time...');
                    document.addEventListener('keyup', function pause(e) {
                        document.removeEventListener('keyup', pause);
                        done();
                    });
                });
            });
        });
	}, 7);
});
