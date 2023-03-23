
// Import test runner
import test from '../../fn/modules/test.js';

// test(name, expected, fn)
test("Example synchronous test", ['First expected result', 'Second expected result'], (expect, done) => {
    // Test thing
    expect('First expected result');
    expect('Second expected result');

    // End of test
    done();
});

// test(name, expected, fn)
test("Example asynchronous test", [0, undefined], (expect, done) => {
    // Wait for thing to happen
    const promise = new Promise((resolve, reject) => setTimeout(resolve, 2000));

    promise.then(() => {
        // Test thing
        expect(0);
        expect(undefined);

        // End of test
        done();
    });
});


// test(name, expected, fn)
/*
test("Example failing test", [true], (expect, done) => {
    // Wait for thing to happen
    const promise = new Promise((resolve, reject) => setTimeout(resolve, 2000));

    promise.then(() => {
        // Test thing (should fail)
        expect(false);

        // End of test
        done();
    });
});
*/
