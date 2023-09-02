
import test      from '../../../fn/modules/test.js';
import context   from '../../modules/context.js';
import NodeGraph from '../graph.js';

test("NodeGraph(context, settings)", [], (expect, done) => {
    // Test thing
    const graph = new NodeGraph(context, {
        nodes: [{
            id:    'osc',
            type:  'oscillator'
        }]
    });

    const osc = graph.get('osc');
    osc.connect(context.destination);

    var note = osc.start(context.currentTime + 0.2, 49, 0.75);
    osc.stop(context.currentTime + 0.3);

    // End of test
    done();
});
