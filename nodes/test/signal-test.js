import run     from '../../../fn/modules/test.js';
import context from '../../modules/context.js';

import SignalDetector from '../signal.js';

run('Signal(context, settings)',
    [null, null, null, null, null, true, true, 2, null, null, null, false, false, 0],
    function(test, done) {
        context.audioWorklet
        .addModule('/soundstage/nodes/signal.worklet.js?3')
        .then(function() {
            // Set up an oscillator into a signal detector and check it responds
            // to incoming signal. Then disconnect it and check again.

            var osc  = new OscillatorNode(context);
            var gain = new GainNode(context, { channelCountMode: 'explicit', channelCount: 2, channelInterpretation: 'speakers' })
            // context, settings, stage = nothing, notify = noop
            var node = new SignalDetector(context, {}, {}, function notify(node, name) {
                // Increment the number of tests
                test(null);
            });

            osc.start();

            osc
            .connect(gain)
            .connect(node);

            setTimeout(function() {
                test(!!node[0])
                test(!!node[1])
                test(node.connectedChannelCount)

                gain.disconnect(node);

                setTimeout(function() {
                    test(!!node[0])
                    test(!!node[1])

                    // There is always at least 1 channel, apparently
                    test(node.connectedChannelCount)

                    done();
                }, 200);
            }, 200);
        });
    });
