import { test } from '../../fn/module.js';
import SignalDetector from './signal.js';
import context from '../modules/context.js';

test('Signal', function(run, print, fixture) {
    run('Signal(context, settings)', function(equals, done) {
        context.audioWorklet
        .addModule('/soundstage/nodes/signal.worklet.js?3')
        .then(function() {

            // Set up an oscillator into a signal detector and check it responds
            // to  incoming signal. Then dosconnect it and check again.

            var osc  = new OscillatorNode(context);
            var gain = new GainNode(context, { channelCountMode: 'explicit', channelCount: 2, channelInterpretation: 'speakers' })
            var node = new SignalDetector(context, {}, {}, function(node, name) {
                // Increment the number of tests
                equals(null, null);
            });

            osc.start();

            osc
            .connect(gain)
            .connect(node);

            setTimeout(function() {
                equals(true, !!node[0])
                equals(true, !!node[1])
                equals(2, node.connectedChannelCount)

                gain.disconnect(node);

                setTimeout(function() {
                    equals(false, !!node[0])
                    equals(false, !!node[1])

                    // There is always at least 1 channel, apparently
                    equals(1, node.connectedChannelCount)

                    done();
                }, 200);
            }, 200);
        });
    }, 14);
});
