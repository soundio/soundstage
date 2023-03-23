
import { test } from '../../fn/module.js';
import context from '../modules/context.js';
import Tick from './tick.js';

test('Tick', function(run, print, fixture) {
    run('Tick(context, settings, stage)', function(equals, done) {
        var tick = new Tick(context);
        tick.connect(context.destination);

        var note = tick.start(context.currentTime + 0.2, 36, 1);
        var note = tick.start(context.currentTime + 0.4, 72, 1);

        //note.stop(context.currentTime + 1);
    }, 1);
});
