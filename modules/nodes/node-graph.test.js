import { test } from '../../../fn/fn.js';
import NodeGraph from './node-graph.js';
import context from '../audio-context.js';

test('NodeGraph', function(run, print, fixture) {
    run('NodeGraph(context, settings)', function(equals, done) {
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

        done();
	}, 0);
});
