
// Import test runner
import test from '../../fn/modules/test.js';

// test(name, expected, fn)
test("Example synchronous test", ['First expected result', 'Second expected result'], (expects, done) => {
    // Test thing
    expects('First expected result');
    expects('Second expected result');

    // End of test
    done();
});

// test(name, expected, fn)
test("Example asynchronous test", [0, undefined], (expects, done) => {
    // Wait for thing to happen
    const promise = new Promise((resolve, reject) => setTimeout(resolve, 2000));

    // Test thing
    promise.then(() => {
        expects(0);
        expects(undefined);

        // End of test
        done();
    });
});
