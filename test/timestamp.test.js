import { test, Stream } from '../../fn/module.js';
import context from '../modules/context.js';

window.context = context;

context
.resume()
.then(function() {
    test('timestamps', function(run, print, fixture) {
        run('', function(equals, done) {
            let i = 0;
            const results = [];

            setTimeout(function testTime() {
                const currentTime = context.currentTime;
                const timestamp   = context.getOutputTimestamp();

                timestamp.currentTime = currentTime;
                results.push(timestamp);

                if (++i > 20) {
                    console.table(results)

                    console.log('block latency (128 frames)', 128 / context.sampleRate);
                    console.log('base latency              ', context.baseLatency, 'blocks', context.baseLatency * context.sampleRate / 128);

                    console.group('performanceTime - contextTime');

                    console.log('average ', results.reduce(function(n, stamp) {
                        return n + (stamp.performanceTime / 1000) - stamp.contextTime;
                    }, 0) / results.length);

                    const stats = results.reduce(function(r, stamp) {
                        const diff = (stamp.performanceTime / 1000) - stamp.contextTime;

                        if (diff < r.min) {
                            r.min = diff;
                        }
                        else if (diff > r.max) {
                            r.max = diff;
                        }
                        return r;
                    }, { min: Infinity, max: -Infinity });

                    console.log('min     ', stats.min);
                    console.log('max     ', stats.max);
                    console.log('variance', stats.max - stats.min);

                    console.groupEnd();
                    console.group('currentTime - contextTime');

                    console.log('average ', results.reduce(function(n, stamp) {
                        return n + stamp.currentTime - stamp.contextTime;
                    }, 0) / results.length);

                    const output = results.reduce(function(r, stamp) {
                        const diff = stamp.currentTime - stamp.contextTime;
                        if (diff < r.min) {
                            r.min = diff;
                        }
                        else if (diff > r.max) {
                            r.max = diff;
                        }
                        return r;
                    }, { min: Infinity, max: -Infinity });

                    console.log('min     ', output.min, (output.min * context.sampleRate / 128).toFixed(3) + ' blocks');
                    console.log('max     ', output.max, (output.max * context.sampleRate / 128).toFixed(3) + ' blocks');
                    console.log('variance', output.max - output.min, ((output.max - output.min) * context.sampleRate / 128).toFixed(3) + ' blocks');

                    console.groupEnd();

                    console.log(Math.ceil(output.max / (32 / context.sampleRate)) * (32 / context.sampleRate), Math.ceil(output.max / (32 / context.sampleRate)) + ' quarter blocks');

                    return done();
                }

                setTimeout(testTime, 317);
            }, 3000);
        }, 0);
    });
});
