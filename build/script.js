'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const noop = function() {};


function truncate(n, string) {
    return string.length < n ?
        string :
        (string.slice(0, n - 3) + '...') ;
}


const print = window.console ?
    console.log.bind(console, '%cSoundstage %c%s', 'color: #e02053; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;') :
    noop ;

const printGroup = window.console ?
    console.groupCollapsed.bind(console, '%cSoundstage %c%s', 'color: #e02053; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;') :
    noop ;

const printGroupEnd = window.console ?
    console.groupEnd.bind(console) :
    noop ;

// Log

const log = window.console ?
    function(name, message, text = '', ...args) {
        if (typeof text === 'string') {
            text = truncate(48, text);
        }
        console.log('%c' + name + ' %c' + (message || ''), 'color: #b5002f; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;', text, ...args);
    } :
    noop ;

const logGroup = window.console ?
    function(name, message, text = '', ...args) {
        if (typeof text === 'string') {
            text = truncate(48, text);
        }
        console.groupCollapsed('%c' + name + ' %c' + (message || ''), 'color: #b5002f; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;', text, ...args);
    } :
    noop ;

const logGroupEnd = window.console ?
    console.groupEnd.bind(console) :
    noop ;

/*
cache(fn)
Returns a function that caches the output values of `fn(input)`
against input values in a map, such that for each input value
`fn` is only ever called once.
*/

function cache(fn) {
    var map = new Map();

    return function cache(object) {

        if (map.has(object)) {
            return map.get(object);
        }

        var value = fn(object);
        map.set(object, value);
        return value;
    };
}

/*
curry(fn [, muteable, arity])
*/
const A     = Array.prototype;

function applyFn(fn, args) {
    return typeof fn === 'function' ? fn.apply(null, args) : fn ;
}

function curry(fn, muteable, arity) {
    arity = arity || fn.length;

    var memo = arity === 1 ?
        // Don't cache if `muteable` flag is true
        muteable ? fn : cache(fn) :

        // It's ok to always cache intermediate memos, though
        cache(function(object) {
            return curry(function() {
                var args = [object];
                args.push.apply(args, arguments);
                return fn.apply(null, args);
            }, muteable, arity - 1) ;
        }) ;

    return function partial(object) {
        return arguments.length === 0 ?
            partial :
        arguments.length === 1 ?
            memo(object) :
        arguments.length === arity ?
            fn.apply(null, arguments) :
        arguments.length > arity ?
            applyFn(fn.apply(null, A.splice.call(arguments, 0, arity)), arguments) :
        applyFn(memo(object), A.slice.call(arguments, 1)) ;
    };
}

//function curry(fn, muteable, arity) {
//    arity = arity || fn.length;
//    return function curried() {
//        return arguments.length >= arity ?
//            fn.apply(null, arguments) :
//            curried.bind(null, ...arguments) ;
//    };
//}

{
    const _curry = curry;

    // Feature test
	const isFunctionLengthDefineable = (function() {
		var fn = function() {};

		try {
			// Can't do this on Safari - length non configurable :(
			Object.defineProperty(fn, 'length', { value: 2 });
		}
		catch(e) {
			return false;
		}

		return fn.length === 2;
	})();

    const setFunctionProperties = function setFunctionProperties(text, parity, fn1, fn2) {
        // Make the string representation of fn2 display parameters of fn1
        fn2.toString = function() {
            return /function\s*[\w\d]*\s*\([,\w\d\s]*\)/.exec(fn1.toString()) + ' { [' + text + '] }';
        };

        // Where possible, define length so that curried functions show how
        // many arguments they are yet expecting
        if (isFunctionLengthDefineable) {
            Object.defineProperty(fn2, 'length', { value: parity });
        }

        return fn2;
    };

    // Make curried functions log a pretty version of their partials
    curry = function curry(fn, muteable, arity) {
        arity  = arity || fn.length;
        return setFunctionProperties('curried', arity, fn, _curry(fn, muteable, arity));
    };
}


var curry$1 = curry;

/*
rest(n, array)
*/

function rest(i, object) {
    if (object.slice) { return object.slice(i); }
    if (object.rest)  { return object.rest(i); }

    var a = [];
    var n = object.length - i;
    while (n--) { a[n] = object[n + i]; }
    return a;
}

/*
choose(fn, map)
Returns a function that takes its first argument as a key and uses it
to select a function in `map` which is invoked with the remaining arguments.

Where `map` has a function `default`, that function is run when a key
is not found, otherwise unfound keys will error.

```
var fn = choose({
    'fish':  function fn1(a, b) {...},
    'chips': function fn2(a, b) {...}
});

fn('fish', a, b);   // Calls fn1(a, b)
```
*/

function choose(map) {
    return function choose(key) {
        var fn = map[key] || map.default;
        return fn && fn.apply(this, rest(1, arguments)) ;
    };
}

/*
noop()
Returns undefined.
*/

function noop$1() {}

/*
requestTick(fn)
Call `fn` on the next tick.
*/

const resolved = Promise.resolve();

function requestTick(fn) {
    resolved.then(fn);
    return fn;
}

// Throttle

/*
toArray(object)
*/

function toArray(object) {
    if (object.toArray) { return object.toArray(); }

    // Speed test for array conversion:
    // https://jsperf.com/nodelist-to-array/27

    var array = [];
    var l = object.length;
    var i;

    if (typeof object.length !== 'number') { return array; }

    array.length = l;

    for (i = 0; i < l; i++) {
        array[i] = object[i];
    }

    return array;
}

const A$1 = Array.prototype;
const S = String.prototype;

/*
by(fn, a, b)
Compares `fn(a)` against `fn(b)` and returns `-1`, `0` or `1`. Useful for sorting
objects by property:

```
[{id: '2'}, {id: '1'}].sort(by(get('id')));  // [{id: '1'}, {id: '2'}]
```
*/

function by(fn, a, b) {
    const fna = fn(a);
    const fnb = fn(b);
    return fnb === fna ? 0 : fna > fnb ? 1 : -1 ;
}

function byAlphabet(a, b) {
    return S.localeCompare.call(a, b);
}

function each(fn, object) {
    // A stricter version of .forEach, where the callback fn
    // gets a single argument and no context.
    var l, n;

    if (typeof object.each === 'function') {
        object.each(fn);
    }
    else {
        l = object.length;
        n = -1;
        while (++n < l) { fn(object[n]); }
    }

    return object;
}

function map(fn, object) {
    return object && object.map ? object.map(fn) : A$1.map.call(object, fn) ;
}

function filter(fn, object) {
    return object.filter ?
        object.filter(fn) :
        A$1.filter.call(object, fn) ;
}

function reduce(fn, seed, object) {
    return object.reduce ?
        object.reduce(fn, seed) :
        A$1.reduce.call(object, fn, seed);
}

function sort(fn, object) {
    return object.sort ? object.sort(fn) : A$1.sort.call(object, fn);
}

function concat(array2, array1) {
    // A.concat only works with arrays - it does not flatten array-like
    // objects. We need a robust concat that will glue any old thing
    // together.
    return Array.isArray(array1) ?
        // 1 is an array. Convert 2 to an array if necessary
        array1.concat(Array.isArray(array2) ? array2 : toArray(array2)) :

    array1.concat ?
        // It has it's own concat method. Lets assume it's robust
        array1.concat(array2) :
    // 1 is not an array, but 2 is
    toArray(array1).concat(Array.isArray(array2) ? array2 : toArray(array2)) ;
}

function contains(value, object) {
    return object.includes ?
        object.includes(value) :
    object.contains ?
        object.contains(value) :
    A$1.includes ?
        A$1.includes.call(object, value) :
        A$1.indexOf.call(object, value) !== -1 ;
}

function find(fn, object) {
    return A$1.find.call(object, fn);
}


function slice(n, m, object) {
    return object.slice ?
        object.slice(n, m) :
        A$1.slice.call(object, n, m) ;
}

/*
args()

Returns `arguments` object.

```
code(block)
```

*/

/*
argument(n)

Returns a function that returns its nth argument when called.
*/

/*
call(fn)
Returns a function that calls `fn()` with no arguments.
*/

/*
exec(regex, fn, string)

Calls `fn` with the result of `regex.exec(string)` if that result is not null,
and returns the resulting value.
*/

function exec(regex, fn, string) {
    let data;

    // If string looks like a regex result, get rest of string
    // from latest index
    if (string.input !== undefined && string.index !== undefined) {
        data   = string;
        string = data.input.slice(
            string.index
            + string[0].length
            + (string.consumed || 0)
        );
    }

    // Look for tokens
    const tokens = regex.exec(string);
    if (!tokens) { return; }

    const output = fn(tokens);

    // If we have a parent tokens object update its consumed count
    if (data) {
        data.consumed = (data.consumed || 0)
            + tokens.index
            + tokens[0].length
            + (tokens.consumed || 0) ;
    }

    return output;
}

curry$1(exec, true);

function error(regex, reducers, string) {
    if (string.input !== undefined && string.index !== undefined) {
        string = string.input;
    }

    throw new Error('Cannot parse invalid string "' + string + '"');
}

function reduce$1(reducers, acc, tokens) {
    let n = -1;

    while (++n < tokens.length) {
        acc = (tokens[n] !== undefined && reducers[n]) ? reducers[n](acc, tokens) : acc ;
    }

    // Call the optional close fn
    return reducers.close ?
        reducers.close(acc, tokens) :
        acc ;
}

/*
capture(regex, reducers, accumulator, string)
Parse `string` with `regex`, calling functions in `reducers` to modify
and return `accumulator`.

Reducers is an object of functions keyed by the index of their capturing
group in the regexp result (`0` corresponding to the entire regex match,
the first capturing group being at index `1`). Reducer functions are
called in capture order for all capturing groups that captured something.
Reducers may also define the function 'close', which is called at the end
of every capture. All reducer functions are passed the paremeters
`(accumulator, tokens)`, where `tokens` is the regexp result, and are expected
to return a value that is passed as an accumulator to the next reducer function.

Reducers may also define a function `'catch'`, which is called when a match
has not been made (where `'catch'` is not defined an error is thrown).

```js
const parseValue = capture(/^\s*(-?\d*\.?\d+)(\w+)?\s*$/, {
    // Create a new accumulator object each call
    0: () => ({}),

    1: (acc, tokens) => {
        acc.number = parseFloat(tokens[1]);
        return acc;
    },

    2: (acc, tokens) => {
        acc.unit = tokens[2];
        return acc;
    }
}, null);

const value = parseValue('36rem');    // { number: 36, unit: 'rem' }
```
*/

function capture(regex, reducers, acc, string) {
    const output = exec(regex, (tokens) => reduce$1(reducers, acc, tokens), string);

    // If tokens is undefined exec has failed apply regex to string
    return output === undefined ?
        // If there is a catch function, call it, otherwise error out
        reducers.catch ?
            reducers.catch(acc, string) :
            error(regex, reducers, string) :

        // Return the accumulator
        output ;
}

var capture$1 = curry$1(capture, true);

/*
choke(fn, time)

Returns a function that waits for `time` seconds without being invoked
before calling `fn` using the context and arguments from the latest
invocation.
*/

function choke(fn, time) {
    var timer, context, args;
    var cue = function cue() {
        if (timer) { clearTimeout(timer); }
        timer = setTimeout(update, (time || 0) * 1000);
    };

    function update() {
        timer = false;
        fn.apply(context, args);
    }

    function cancel() {
        // Don't permit further changes to be queued
        cue = noop$1;

        // If there is an update queued apply it now
        if (timer) { clearTimeout(timer); }
    }

    function wait() {
        // Store the latest context and arguments
        context = this;
        args = arguments;

        // Cue the update
        cue();
    }

    wait.cancel = cancel;
    return wait;
}

// Choke or wait? A simpler implementation without cancel(), I leave this here for reference...
//	function choke(seconds, fn) {
//		var timeout;
//
//		function update(context, args) {
//			fn.apply(context, args);
//		}
//
//		return function choke() {
//			clearTimeout(timeout);
//			timeout = setTimeout(update, seconds * 1000, this, arguments);
//		};
//	}

/*
compose(fn2, fn1)
Calls `fn1`, passes the result to `fn2`, and returns that result.
*/

function compose(fn2, fn1) {
    return function compose() {
        return fn2(fn1.apply(null, arguments));
    };
}

function equals(a, b) {
    // Fast out if references are for the same object
    if (a === b) { return true; }

    // If either of the values is null, or not an object, we already know
    // they're not equal so get out of here
    if (a === null ||
        b === null ||
        typeof a !== 'object' ||
        typeof b !== 'object') {
        return false;
    }

    // Compare their enumerable keys
    const akeys = Object.keys(a);
    let n = akeys.length;

    while (n--) {
        // Has the property been set to undefined on a?
        if (a[akeys[n]] === undefined) {
            // We don't want to test if it is an own property of b, as
            // undefined represents an absence of value
            if (b[akeys[n]] === undefined) {
                return true;
            }
        }
        else {
            //
            if (b.hasOwnProperty(akeys[n]) && !equals(a[akeys[n]], b[akeys[n]])) {
                return false;
            }
        }
    }

    return true;
}

curry$1(equals, true);

function get(key, object) {
    // Todo? Support WeakMaps and Maps and other map-like objects with a
    // get method - but not by detecting the get method
    return object[key];
}

var get$1 = curry$1(get, true);

var rpath  = /\[?([-\w]+)(?:=(['"])([^\2]+)\2|(true|false)|((?:\d*\.)?\d+))?\]?\.?/g;

function findByProperty(key, value, array) {
    var l = array.length;
    var n = -1;

    while (++n < l) {
        if (array[n][key] === value) {
            return array[n];
        }
    }
}


/* Get path */

function getRegexPathThing(regex, path, object, fn) {
    var tokens = regex.exec(path);

    if (!tokens) {
        throw new Error('Fn.getPath(path, object): invalid path "' + path + '"');
    }

    var key      = tokens[1];
    var property = tokens[3] ?
        findByProperty(key,
            tokens[2] ? tokens[3] :
            tokens[4] ? Boolean(tokens[4]) :
            parseFloat(tokens[5]),
        object) :
        object[key] ;

    return fn(regex, path, property);
}

function getRegexPath(regex, path, object) {
    return regex.lastIndex === path.length ?
        object :
    !(object && typeof object === 'object') ?
        undefined :
    getRegexPathThing(regex, path, object, getRegexPath) ;
}

function getPath(path, object) {
    rpath.lastIndex = 0;
    return getRegexPath(rpath, path, object) ;
}

curry$1(getPath, true);

/*
has(key, value, object)
Returns `true` if `object[key]` is strictly equal to `value`.
*/

function has(key, value, object) {
    return object[key] === value;
}

var has$1 = curry$1(has, true);

/*
id(value)
Returns `value`.
*/

function id(value) { return value; }

/*
invoke(name, parameters, object)
Invokes `object.name()` with `parameters` as arguments. For example:

```
models.forEach(invoke('save', [version]));
```
*/

function invoke(name, values, object) {
    return object[name].apply(object, values);
}

curry$1(invoke, true);

const is = Object.is || function is(a, b) { return a === b; };

curry$1(is, true);

/*
isDefined(value)
Check for value – where `value` is `undefined`, `NaN` or `null`, returns
`false`, otherwise `true`.
*/


function isDefined(value) {
    // !!value is a fast out for non-zero numbers, non-empty strings
    // and other objects, the rest checks for 0, '', etc.
    return !!value || (value !== undefined && value !== null && !Number.isNaN(value));
}

function latest(source) {
    var value = source.shift();
    return value === undefined ? arguments[1] : latest(source, value) ;
}

/*
matches(selector, object)
Where `selector` is an object containing properties to be compared against
properties of `object`. If they are all strictly equal, returns `true`,
otherwise `false`.

```
const vegeFoods = menu.filter(matches({ vegetarian: true }));
```
*/

function matches(object, item) {
	let property;
	for (property in object) {
		if (object[property] !== item[property]) { return false; }
	}
	return true;
}

var matches$1 = curry$1(matches, true);

/*
not(value)
Returns `!value`.
*/

const done     = { done: true };
const iterator = { next: () => done };

var nothing = Object.freeze({
    // Standard array methods
    shift: noop$1,
    push:  noop$1,

    // Stream methods
    start: noop$1,
    stop:  noop$1,

    // Make it look like an empty array
    length: 0,

    // Make it an iterable with nothing in it
    [Symbol.iterator]: () => iterator
});

function now() {
    // Return time in seconds
    return +new Date() / 1000;
}

/*
once(fn)
Returns a function that calls `fn` the first time it is invoked,
and then becomes a noop.
*/

/*
overload(fn, map)

Returns a function that calls a function at the property of `object` that
matches the result of calling `fn` with all arguments.</p>

```
var fn = overload(toType, {
    string: function a(name, n) {...},
    number: function b(n, m) {...}
});

fn('pie', 4); // Returns a('pie', 4)
fn(1, 2);     // Returns b(1, 2)
```
*/


function overload(fn, map) {
    return typeof map.get === 'function' ?
        function overload() {
            var key = fn.apply(null, arguments);
            return map.get(key).apply(this, arguments);
        } :
        function overload() {
            const key     = fn.apply(null, arguments);
            const handler = (map[key] || map.default);
            if (!handler) { throw new Error('overload() no handler for "' + key + '"'); }
            return handler.apply(this, arguments);
        } ;
}

/*
parseInt(string)
Parse to integer without having to worry about the radix parameter,
making it suitable, for example, to use in `array.map(parseInt)`.
*/

function apply(value, fn) {
    return fn(value);
}

/*
pipe(fn1, fn2, ...)
Returns a function that calls `fn1`, `fn2`, etc., passing the result of
calling one function to the next and returning the the last result.
*/

const A$2 = Array.prototype;

function pipe() {
    const fns = arguments;
    return fns.length ?
        (value) => A$2.reduce.call(fns, apply, value) :
        id ;
}

const $private = Symbol('private');

function privates(object) {
    return object[$private] ?
        object[$private] :
        Object.defineProperty(object, $private, {
            value: {}
        })[$private] ;
}

/*
self()
Returns `this`.
*/

/*
set(key, object, value)

```
// Set `input.value` whenever a value is pushed into a stream:
stream.scan(set('value'), input);
```
*/

function set(key, object, value) {
    return typeof object.set === "function" ?
        object.set(key, value) :
        (object[key] = value) ;
}

var set$1 = curry$1(set, true);

var rpath$1  = /\[?([-\w]+)(?:=(['"])([^\2]+)\2|(true|false)|((?:\d*\.)?\d+))?\]?\.?/g;

function findByProperty$1(key, value, array) {
    var l = array.length;
    var n = -1;

    while (++n < l) {
        if (array[n][key] === value) {
            return array[n];
        }
    }
}

/* Set path */

function setRegexPath(regex, path, object, thing) {
    var tokens = regex.exec(path);

    if (!tokens) {
        throw new Error('Fn.getPath(path, object): invalid path "' + path + '"');
    }

    var key = tokens[1];

    if (regex.lastIndex === path.length) {
        // Cannot set to [prop=value] selector
        if (tokens[3]) {
            throw new Error('Fn.setPath(path, object): invalid path "' + path + '"');
        }

        return object[key] = thing;
    }

    var value = tokens[3] ?
        findByProperty$1(key,
            tokens[2] ? tokens[3] :
            tokens[4] ? Boolean(tokens[4]) :
            parseFloat(tokens[5])
        ) :
        object[key] ;

    if (!(value && typeof value === 'object')) {
        value = {};

        if (tokens[3]) {
            if (object.push) {
                value[key] = tokens[2] ?
                    tokens[3] :
                    parseFloat(tokens[3]) ;

                object.push(value);
            }
            else {
                throw new Error('Not supported');
            }
        }

        set(key, object, value);
    }

    return setRegexPath(regex, path, value, thing);
}

function setPath(path, object, value) {
    rpath$1.lastIndex = 0;
    return setRegexPath(rpath$1, path, object, value);
}

curry$1(setPath, true);

/*
toClass(object)
*/

const O = Object.prototype;

function toClass(object) {
    return O.toString.apply(object).slice(8, -1);
}

/*
toFixed(number)
*/

const N     = Number.prototype;
const isNaN = Number.isNaN;

function toFixed(n, value) {
    if (isNaN(value)) {
        return '';
        // throw new Error('Fn.toFixed does not accept NaN.');
    }

    return N.toFixed.call(value, n);
}

curry$1(toFixed, true);

/*
toString(object)
Returns `object.toString()`.
*/

/*
toType(object)
Returns `typeof object`.
*/

function toType(object) {
    return typeof object;
}

/*
weakCache(fn)
Returns a function that caches the return values of `fn()`
against input values in a WeakMap, such that for each input value
`fn` is only ever called once.
*/

function prepend(string1, string2) {
    return '' + string1 + string2;
}

var prepend$1 = curry$1(prepend);

const assign = Object.assign;

function isDone(source) {
    return source.length === 0 || source.status === 'done' ;
}

function create(object, fn) {
    var functor = Object.create(object);
    functor.shift = fn;
    return functor;
}

function arrayReducer(array, value) {
    array.push(value);
    return array;
}

function shiftTap(shift, fn) {
    return function tap() {
        var value = shift();
        value !== undefined && fn(value);
        return value;
    };
}

function sortedSplice(array, fn, value) {
    // Splices value into array at position determined by result of fn,
    // where result is either in the range [-1, 0, 1] or [true, false]
    var n = sortIndex(array, function(n) {
        return fn(value, n);
    });
    array.splice(n, 0, value);
}

function sortIndex(array, fn) {
    var l = array.length;
    var n = l + l % 2;
    var i = 0;

    while ((n = Math.floor(n / 2)) && (i + n <= l)) {
        if (fn(array[i + n - 1]) >= 0) {
            i += n;
            n += n % 2;
        }
    }

    return i;
}

/* Properties */

/*
.status
Reflects the running status of the stream. When all values have been consumed
status is `'done'`.
*/

function Fn(fn) {
    // Accept constructor without `new`
    if (!this || !Fn.prototype.isPrototypeOf(this)) {
        return new Fn(fn);
    }

    var source = this;

    if (!fn) {
        source.status = 'done';
        return;
    }

    var value = fn();

    if (value === undefined) {
        source.status = 'done';
        return;
    }

    this.shift = function shift() {
        if (source.status === 'done') { return; }

        var v = value;

        // Where the next value is undefined mark the functor as done
        value = fn();
        if (value === undefined) {
            source.status = 'done';
        }

        return v;
    };
}


assign(Fn, {

    // Constructors

    of: function() { return Fn.from(arguments); },

    from: function(object) {
        var i;

        // object is an array or array-like object. Iterate over it without
        // mutating it.
        if (typeof object.length === 'number') {
            i = -1;

            return new Fn(function shiftArray() {
                // Ignore undefined holes in arrays
                return ++i >= object.length ?
                    undefined :
                object[i] === undefined ?
                    shiftArray() :
                    object[i] ;
            });
        }

        // object is an object with a shift function
        if (typeof object.shift === "function" && object.length === undefined) {
            return new Fn(function shiftObject() {
                return object.shift();
            });
        }

        // object is an iterator
        if (typeof object.next === "function") {
            return new Fn(function shiftIterator() {
                var result = object.next();

                // Ignore undefined holes in iterator results
                return result.done ?
                    result.value :
                result.value === undefined ?
                    shiftIterator() :
                    result.value ;
            });
        }

        throw new Error('Fn: from(object) object is not a list of a known kind (array, functor, stream, iterator).')
    }
});


function scanChunks(data, value) {
    data.accumulator.push(value);
    ++data.count;

    if (data.count % data.n === 0) {
        data.value = data.accumulator;
        data.accumulator = [];
    }
    else {
        data.value = undefined;
    }

    return data;
}

assign(Fn.prototype, {
    shift: noop$1,

    // Input

    of: function() {
        // Delegate to the constructor's .of()
        return this.constructor.of.apply(this.constructor, arguments);
    },

    // Transform

    ap: function(object) {
        var stream = this;

        return create(this, function ap() {
            var fn = stream.shift();
            return fn && object.map(fn) ;
        });
    },

    /*
    .unshift(...values)
    Creates a buffer of values at the end of the stream that are read first.
    */

    unshift: function() {
        var source = this;
        var buffer = toArray(arguments);

        return create(this, function() {
            return (buffer.length ? buffer : source).shift() ;
        });
    },

    catch: function(fn) {
        var source = this;

        return create(this, function() {
            try {
                return source.shift();
            }
            catch(e) {
                return fn(e);
            }
        });
    },

    syphon: function(fn) {
        var shift   = this.shift;
        var buffer1 = [];
        var buffer2 = [];

        this.shift = function() {
            if (buffer1.length) { return buffer1.shift(); }

            var value;

            while ((value = shift()) !== undefined && fn(value)) {
                buffer2.push(value);
            }

            return value;
        };

        return create(this, function filter() {
            if (buffer2.length) { return buffer2.shift(); }

            var value;

            while ((value = shift()) !== undefined && !fn(value)) {
                buffer1.push(value);
            }

            return value;
        });
    },

    clone: function() {
        var source  = this;
        var shift   = this.shift;
        var buffer1 = [];
        var buffer2 = [];
        var doneFlag = false;

        // Messy. But it works. Just.

        this.shift = function() {
            var value;

            if (buffer1.length) {
                value = buffer1.shift();

                if (!buffer1.length && doneFlag) {
                    source.status = 'done';
                }

                return value;
            }

            if (!doneFlag) {
                value = shift();

                if (source.status === 'done') {
                    doneFlag = true;
                }

                if (value !== undefined) {
                    buffer2.push(value);
                }

                return value;
            }
        };

        var clone = new Fn(function shiftClone() {
            var value;

            if (buffer2.length) {
                return buffer2.shift();
                //if (!buffer2.length && doneFlag) {
                //	clone.status = 'done';
                //}
            }

            if (!doneFlag) {
                value = shift();

                if (source.status === 'done') {
                    doneFlag = true;
                    source.status = undefined;
                }

                if (value !== undefined) {
                    buffer1.push(value);
                }

                return value;
            }
        });

        return clone;
    },

    concat: function() {
        var sources = toArray(arguments);
        var source  = this;

        var stream  = create(this, function concat() {
            if (source === undefined) {
                stream.status = 'done';
                return;
            }

            if (isDone(source)) {
                source = sources.shift();
                return concat();
            }

            var value = source.shift();

            stream.status = sources.length === 0 && isDone(source) ?
                'done' : undefined ;

            return value;
        });

        return stream;
    },

    /*
    .dedup()

    Filters out consecutive equal values.
    */

    dedup: function() {
        var v;
        return this.filter(function(value) {
            var old = v;
            v = value;
            return old !== value;
        });
    },

    /*
    .filter(fn)

    Filter values according to the truthiness of `fn(value)`.
    */

    filter: function(fn) {
        var source = this;

        return create(this, function filter() {
            var value;
            while ((value = source.shift()) !== undefined && !fn(value));
            return value;
        });
    },

    /*
    .flat()
    Flattens a list of lists into a single list.
    */

    join: function() {
        console.trace('Fn.join() is now Fn.flat() to mirror name of new Array method');
        return this.flat();
    },

    flat: function() {
        var source = this;
        var buffer = nothing;

        return create(this, function flat() {
            var value = buffer.shift();
            if (value !== undefined) { return value; }
            // Support array buffers and stream buffers
            //if (buffer.length === 0 || buffer.status === 'done') {
                buffer = source.shift();
                if (buffer !== undefined) { return flat(); }
                buffer = nothing;
            //}
        });
    },

    /*
    .flatMap()
    Maps values to lists – `fn(value)` must return an array, stream
    or other type with a `.shift()` method – and flattens those lists into a
    single stream.
    */

    flatMap: function(fn) {
        return this.map(fn).flat();
    },

    chain: function(fn) {
        console.trace('Stream.chain() is now Stream.flatMap()');
        return this.map(fn).flat();
    },

    /*
    .latest()

    When the stream has a values buffered, passes the last value
    in the buffer.
    */

    latest: function() {
        var source = this;
        return create(this, function shiftLast() {
            return latest(source);
        });
    },

    /*
    .map(fn)
    Maps values to the result of `fn(value)`.
    */

    map: function(fn) {
        return create(this, compose(function map(object) {
            return object === undefined ? undefined : fn(object) ;
        }, this.shift));
    },

    ///*
    //.chunk(n)
    //Batches values into arrays of length `n`.
    //*/

    chunk: function(n) {
        return this
        .scan(scanChunks, {
            n: n,
            count: 0,
            accumulator: []
        })
        .map(function(accumulator) {
            return accumulator.value;
        });
    },

    partition: function(fn) {
        var source = this;
        var buffer = [];
        var streams = new Map();

        fn = fn || Fn.id;

        function createPart(key, value) {
            // Todo: Nope, no pull
            var stream = Stream.of().on('pull', shiftPull);
            stream.key = key;
            streams.set(key, stream);
            return stream;
        }

        function shiftPull(type, pullStream) {
            var value  = source.shift();
            if (value === undefined) { return; }

            var key    = fn(value);
            var stream = streams.get(key);

            if (stream === pullStream) { return value; }

            if (stream === undefined) {
                stream = createPart(key, value);
                buffer.push(stream);
            }

            stream.push(value);
            return shiftPull(type, pullStream);
        }

        return create(this, function shiftStream() {
            if (buffer.length) { return buffer.shift(); }

            var value = source.shift();
            if (value === undefined) { return; }

            var key    = fn(value);
            var stream = streams.get(key);

            if (stream === undefined) {
                stream = createPart(key, value);
                stream.push(value);
                return stream;
            }

            stream.push(value);
            return shiftStream();
        });
    },

    fold: function reduce(fn, seed) {
        return this.scan(fn, seed).latest().shift();
    },

    /*
    .scan(fn, seed)

    Calls `fn(accumulator, value)` and emits `accumulator` for each value
    in the stream.
    */

    scan: function scan(fn, accumulator) {
        return this.map(function scan(value) {
            var acc = fn(accumulator, value);
            accumulator = acc;
            return accumulator;
        });
    },

    /*
    .take(n)

    Filters the stream to the first `n` values.
    */

    take: function(n) {
        var source = this;
        var i = 0;

        return create(this, function take() {
            var value;

            if (i < n) {
                value = source.shift();
                // Only increment i where an actual value has been shifted
                if (value === undefined) { return; }
                if (++i === n) {
                    this.push = noop$1;
                    this.stop = noop$1;
                    this.status = 'done';
                }
                return value;
            }
        });
    },

    sort: function(fn) {
        fn = fn || Fn.byGreater ;

        var source = this;
        var buffer = [];

        return create(this, function sort() {
            var value;

            while((value = source.shift()) !== undefined) {
                sortedSplice(buffer, fn, value);
            }

            return buffer.shift();
        });
    },

    split: function(fn) {
        var source = this;
        var buffer = [];

        return create(this, function split() {
            var value = source.shift();
            var temp;

            if (value === undefined) {
                if (buffer.length) {
                    temp = buffer;
                    buffer = [];
                    return temp;
                }

                return;
            }

            if (fn(value)) {
                temp = buffer;
                buffer = [value];
                return temp.length ? temp : split() ;
            }

            buffer.push(value);
            return split();
        });
    },

    /*
    .rest(n)

    Filters the stream to all values after the `n`th value.
    */

    rest: function(i) {
        var source = this;

        return create(this, function rest() {
            while (i-- > 0) { source.shift(); }
            return source.shift();
        });
    },

    /*
    .unique()

    Filters the stream to remove any value already emitted.
    */

    unique: function() {
        var source = this;
        var values = [];

        return create(this, function unique() {
            var value = source.shift();

            return value === undefined ? undefined :
                values.indexOf(value) === -1 ? (values.push(value), value) :
                unique() ;
        });
    },

    // Consumers

    each: function(fn) {
        var value;

        while ((value = this.shift()) !== undefined) {
            fn.call(this, value);
        }

        return this;
    },

    find: function(fn) {
        return this
        .filter(fn)
        .first()
        .shift();
    },

    next: function() {
        return {
            value: this.shift(),
            done:  this.status
        };
    },

    /*
    .pipe(stream)

    Pipes the current stream into `stream`.
    */

    pipe: function(stream) {
        this.each(stream.push);
        return stream;
    },

    /*
    .tap(fn)

    Calls `fn(value)` for each value in the stream without modifying
    the stream. Note that values are only tapped when there is a
    consumer attached to the end of the stream to suck them through.
    */

    tap: function(fn) {
        // Overwrite shift to copy values to tap fn
        this.shift = shiftTap(this.shift, fn);
        return this;
    },

    toJSON: function() {
        const array = [];
        this.scan(arrayReducer, array).each(noop$1);
        return array;
    },

    toString: function() {
        return this.reduce(prepend$1, '');
    }
});

Fn.prototype.toArray = Fn.prototype.toJSON;

// Todo: As of Nov 2016 fantasy land spec requires namespaced methods:
//
// equals: 'fantasy-land/equals',
// lte: 'fantasy-land/lte',
// concat: 'fantasy-land/concat',
// empty: 'fantasy-land/empty',
// map: 'fantasy-land/map',
// contramap: 'fantasy-land/contramap',
// ap: 'fantasy-land/ap',
// of: 'fantasy-land/of',
// alt: 'fantasy-land/alt',
// zero: 'fantasy-land/zero',
// reduce: 'fantasy-land/reduce',
// traverse: 'fantasy-land/traverse',
// chain: 'fantasy-land/chain',
// chainRec: 'fantasy-land/chainRec',
// extend: 'fantasy-land/extend',
// extract: 'fantasy-land/extract',
// bimap: 'fantasy-land/bimap',
// promap: 'fantasy-land/promap'


if (window.Symbol) {
    // A functor is it's own iterator
    Fn.prototype[Symbol.iterator] = function() {
        return this;
    };
}

/*
remove(array, value)
Remove `value` from `array`. Where `value` is not in `array`, does nothing.
*/

function remove(array, value) {
    if (array.remove) { array.remove(value); }
    var i = array.indexOf(value);
    if (i !== -1) { array.splice(i, 1); }
    return value;
}

/*
Timer(duration, getTime)

Create an object with a request/cancel pair of functions that
fires request(fn) callbacks at a given duration.
*/

function Timer(duration, getTime) {
    if (typeof duration !== 'number') { throw new Error('Timer(duration) requires a duration in seconds (' + duration + ')'); }

    // Optional second argument is a function that returns
    // current time (in seconds)
    getTime = getTime || now;

    var fns = [];
    var id;
    var t0  = -Infinity;

    function frame() {
        var n = fns.length;

        id = undefined;
        t0 = getTime();

        while (n--) {
            fns.shift()(t0);
        }
    }

    return {
        now: getTime,

        request: function(fn) {
            if (typeof fn !== 'function') { throw new Error('fn is not a function.'); }

            // Add fn to queue
            fns.push(fn);

            // If the timer is cued do nothing
            if (id) { return; }

            var t1 = getTime();

            // Set the timer and return something truthy
            if (t0 + duration > t1) {
                id = setTimeout(frame, (t0 + duration - t1) * 1000);
            }
            else {
                requestTick(frame) ;
            }

            // Use the fn reference as the request id, because why not
            return fn;
        },

        cancel: function(fn) {
            var i = fns.indexOf(fn);
            if (i === -1) { return; }

            fns.splice(i, 1);

            if (!fns.length) {
                clearTimeout(id);
                id = undefined;
            }
        }
    };
}

var DEBUG     = window.DEBUG !== false;
var assign$1    = Object.assign;


function isDone$1(stream) {
    return stream.status === 'done';
    // Accept arrays or streams
    //return stream.length === 0 || stream.status === 'done';
}

function notify(object) {
    var events = privates(object).events;
    if (!events) { return; }

    var n = -1;
    var l = events.length;
    var value;

    while (++n < l) {
        value = events[n](object);
        if (value !== undefined) { return value; }
    }
}

function done$1(stream, privates) {
    stream.status = 'done';
    privates.source = nothing;
    privates.resolve();
}

function createSource(stream, privates, Source, buffer) {
    buffer = buffer === undefined ? [] :
        buffer.shift ? buffer :
        Array.from(buffer) ;

    // Flag to tell us whether we are using an internal buffer - which
    // depends on the existence of source.shift
    var buffered = true;
    var initialised = false;

    function push() {
        // Detect that buffer exists and is not an arguments object, if so
        // we push to it
        buffered && buffer.push.apply(buffer, arguments);
        initialised && notify(stream);
    }

    function stop(n) {
        // If stop count is not given, use buffer length (if buffer exists and
        // is not arguments object) by default
        n = n !== undefined ? n :
            buffered ? buffer.length :
            0 ;

        // Neuter events
        delete privates.events;

        // If no n, shut the stream down
        if (!n) {
            privates.stops && privates.stops.forEach((fn) => fn());
            privates.stops = undefined;
            done$1(stream, privates);
        }

        // Schedule shutdown of stream after n values
        else {
            privates.source = new StopSource(stream, privates.source, privates, n, done$1);
            privates.stops && privates.stops.forEach((fn) => fn());
            privates.stops = undefined;
        }
    }

    const source = Source.prototype ?
        // Source is constructable
        new Source(push, stop) :
        // Source is an arrow function
        Source(push, stop) ;

    initialised = true;

    // Where source has .shift() override the internal buffer
    if (source.shift) {
        buffered = false;
        buffer = undefined;
    }

    // Otherwise give it a .shift() for the internal buffer
    else {
        source.shift = function () {
            return buffer.shift();
        };
    }

    // Gaurantee that source has a .stop() method
    if (!source.stop) {
        source.stop = noop$1;
    }

    return (privates.source = source);
}

function shiftBuffer(shift, state, one, two, buffer) {
    if (buffer.length && state.buffered === one) {
        return buffer.shift();
    }

    const value = shift();
    if (value === undefined) { return; }

    buffer.push(value);
    state.buffered = two;
    return value;
}

function flat(output, input) {
    input.pipe ?
        // Input is a stream
        input.pipe(output) :
        // Input is an array-like
        output.push.apply(output, input) ;

    return output;
}

// StartSource

function StartSource(stream, privates, Source, buffer) {
    this.stream   = stream;
    this.privates = privates;
    this.Source   = Source;
    this.buffer   = buffer;
}

assign$1(StartSource.prototype, {
    create: function() {
        return createSource(this.stream, this.privates, this.Source, this.buffer);
    },

    shift: function shift() {
        return this.create().shift();
    },

    push: function push() {
        const source = this.create();
        if (!source.push) { throw new Error('Attempt to .push() to unpushable stream'); }
        source.push.apply(source, arguments);
    },

    start: function start() {
        const source = this.create();
        if (!source.start) { throw new Error('Attempt to .start() unstartable stream'); }
        source.start.apply(source, arguments);
    },

    stop: function done() {
        const source = this.create();

        if (!source.stop) {
            done(this.stream, this.privates);
        }

        source.stop.apply(source, arguments);
    }
});


// StopSource

function StopSource(stream, source, privates, n, done) {
    this.stream   = stream;
    this.source   = source;
    this.privates = privates;
    this.n        = n;
    this.done     = done;
}

assign$1(StopSource.prototype, nothing, {
    shift: function() {
        const value = this.source.shift();
        if (--this.n < 1) { this.done(this.stream, this.privates); }
        return value;
    },

    start: function() {
        throw new Error('Cannot .start() stopped stream');
    },

    push: function() {
        throw new Error('Cannot .push() to stopped stream');
    }
});


/* Construct */

/*
Stream(fn)

Construct a new stream. `fn(push, stop)` is invoked when the stream is started,
and it must return a 'producer' – an object with methods to control the flow of
data:

```js
const stream = Stream(function(push, stop) {
    return {
        push:  fn,  // Optional. Makes the stream pushable.
        start: fn,  // Optional. Makes the stream extarnally startable.
        stop:  fn   // Optional. Makes the stream externally stoppable.
        shift: fn,  // Optional. Overrides the stream's internal buffer.
    };
});
```
*/

function Stream$1(Source, buffer) {
    if (DEBUG) {
        if (arguments.length > 2) {
            throw new Error('Stream(setup, buffer) takes 2 arguments. Recieved ' + arguments.length + '.');
        }
    }

    // Enable construction without the `new` keyword
    if (!Stream$1.prototype.isPrototypeOf(this)) {
        return new Stream$1(Source, buffer);
    }

    // Privates

    const privates$1 = privates(this);
    privates$1.stream  = this;
    privates$1.events  = [];
    privates$1.resolve = noop$1;
    privates$1.source  = new StartSource(this, privates$1, Source, buffer);

    // Methods

    this.shift = function shift() {
        return privates$1.source.shift();
    };

    // Keep it as an instance method for just now
    this.push = function push() {
        const source = privates$1.source;
        source.push.apply(source, arguments);
        return this;
    };
}

Stream$1.prototype = assign$1(Object.create(Fn.prototype), {
    constructor: Stream$1,

    /* Write */

    /*
    .push(value)
    Pushes a `value` (or multiple values) into the head of a writeable stream.
    If the stream is not writeable, it does not have a `.push()` method.
    */

    /* Map */

    ///*
    //.chunk(n)
    //Batches values into arrays of length `n`.
    //*/

    /*
    .flat()
    Flattens a stream of streams or arrays into a single stream.
    */

    flat: function() {
        const output = this.constructor.of();

        this
        .scan(flat, output)
        .each(noop$1);

        return output;
    },

    /*
    .flatMap(fn)
    Maps values to lists – `fn(value)` must return an array, functor, stream
    (or any other duck with a `.shift()` method) and flattens those lists into a
    single stream.
    */

    /*
    .map(fn)
    Maps values to the result of `fn(value)`.
    */

    /*
    .merge(stream)
    Merges this stream with `stream`, which may be an array, array-like
    or functor.
    */

    merge: function merge() {
        var sources = toArray(arguments);
        sources.unshift(this);
        return Stream$1.Merge.apply(null, sources);
    },

    /*
    .scan(fn, seed)
    Calls `fn(accumulator, value)` and emits `accumulator` for each value
    in the stream.
    */


    /* Filter */

    /*
    .dedup()
    Filters out consecutive equal values.
    */

    /*
    .filter(fn)
    Filter values according to the truthiness of `fn(value)`.
    */

    /*
    .latest()
    When the stream has a values buffered, passes the last value
    in the buffer.
    */

    /*
    .rest(n)
    Filters the stream to the `n`th value and above.
    */

    /*
    .take(n)
    Filters the stream to the first `n` values.
    */

    ///*
    //.clock(timer)
    //Emits values at the framerate of `timer`, one-per-frame. No values
    //are discarded.
    //*/
    //
    //clock: function clock(timer) {
    //    return this.pipe(Stream.clock(timer));
    //},

    /*
    .throttle(time)
    Throttles values such that the latest value is emitted every `time` seconds.
    Other values are discarded. The parameter `time` may also be a timer options
    object, an object with `{ request, cancel, now }` functions,
    allowing the creation of, say, and animation frame throttle.
    */

    throttle: function throttle(timer) {
        return this.pipe(Stream$1.throttle(timer));
    },

    /*
    .wait(time)
    Emits the latest value only after `time` seconds of inactivity.
    Other values are discarded.
    */

    wait: function wait(time) {
        return this.pipe(Stream$1.Choke(time));
    },

    /*
    .combine(fn, stream)
    Combines the latest values from this stream and `stream` via the combinator
    `fn` any time a new value is emitted by either stream.
    */

    combine: function(fn, stream) {
        const streams = Array.from(arguments);
        streams[0] = this;
        return CombineStream(fn, streams);
    },


    /* Read */

    /*
    .clone()
    Creates a read-only copy of the stream.
    */

    clone: function clone() {
        const source = this;
        const shift  = this.shift.bind(this);
        const buffer = [];

        const state = {
            // Flag telling us which stream has been buffered,
            // source (1) or copy (2)
            buffered: 1
        };

        this.shift = function() {
            return shiftBuffer(shift, state, 1, 2, buffer);
        };

        return new Stream$1(function(notify, stop) {
            source.on(notify);
            source.done(stop);

            return {
                shift: function() {
                    return shiftBuffer(shift, state, 2, 1, buffer);
                },

                stop: function() {
                    stop(0);
                }
            }
        });
    },

    /*
    .each(fn)
    Thirstilly consumes the stream, calling `fn(value)` whenever
    a value is available.
    */

    each: function each(fn) {
        var args   = arguments;
        var source = this;

        // Flush and observe
        Fn.prototype.each.apply(source, args);

        // Delegate to Fn#each().
        return this.on(() => Fn.prototype.each.apply(source, args));
    },

    /*
    .last(fn)
    Consumes the stream when stopped, calling `fn(value)` with the
    last value read from the stream.
    */

    last: function last(fn) {
        const privates$1 = privates(this);
        privates$1.stops = privates$1.stops || [];
        const value = this.latest().shift();
        value !== undefined && privates$1.stops.push(() => fn(value));
        return this;
    },

    /*
    .fold(fn, accumulator)
    Consumes the stream when stopped, calling `fn(accumulator, value)`
    for each value in the stream. Returns a promise.
    */

    fold: function fold(fn, accumulator) {
        // Fold to promise
        return new Promise((resolve, reject) => {
            this
            .scan(fn, accumulator)
            .last(resolve);
        });
    },

    ///*
    //.reduce(fn, accumulator)
    //Consumes the stream when stopped, calling `fn(accumulator, value)`
    //for each value in the stream. Returns a promise that resolves to
    //the last value returned by `fn(accumulator, value)`.
    //*/

    reduce: function reduce(fn, accumulator) {
        // Support array.reduce semantics with optional seed
        return accumulator ?
            this.fold(fn, accumulator) :
            this.fold((acc, value) => (acc === undefined ? value : fn(acc, value)), this.shift()) ;
    },

    /*
    .shift()
    Reads a value from the stream. If no values are in the stream, returns
    `undefined`. If this is the last value in the stream, `stream.status`
    is `'done'`.
    */

    /* Lifecycle */

    /*
    .done(fn)
    Calls `fn()` after the stream is stopped and all values have been drained.
    */

    done: function done(fn) {
        const privates$1 = privates(this);
        const promise = privates$1.promise || (
            privates$1.promise = this.status === 'done' ?
                Promise.resolve() :
                new Promise((resolve, reject) => assign$1(privates$1, { resolve, reject }))
        );

        promise.then(fn);
        return this;
    },

    /*
    .start()
    If the stream's producer is startable, starts the stream.
    */

    start: function start() {
        const source = privates(this).source;
        source.start.apply(source, arguments);
        return this;
    },

    /*
    .stop()
    Stops the stream. No more values can be pushed to the stream and any
    consumers added will do nothing. However, depending on the stream's source
    the stream may yet drain any buffered values into an existing consumer
    before entering `'done'` state. Once in `'done'` state a stream is
    entirely inert.
    */

    stop: function stop() {
        const source = privates(this).source;
        source.stop.apply(source, arguments);
        return this;
    },

    on: function on(fn) {
        if (DEBUG && typeof fn === 'string') {
            throw new Error('stream.on(fn) no longer takes type');
        }

        var events = privates(this).events;
        if (!events) { return this; }

        events.push(fn);
        return this;
    },

    off: function off(fn) {
        if (DEBUG && typeof fn === 'string') {
            throw new Error('stream.off(fn) no longer takes type');
        }

        var events = privates(this).events;
        if (!events) { return this; }

        // Remove all handlers
        if (!fn) {
            events.length = 0;
            return this;
        }

        // Remove handler fn for type
        var n = events.length;
        while (n--) {
            if (events[n] === fn) { events.splice(n, 1); }
        }

        return this;
    },

    toPush: function() {
        const stream = this;
        const privates$1 = privates(this);
        return privates$1.input || (privates$1.input = function() {
            stream.push.apply(stream, arguments);
        });
    }
});


/*
Stream.from(values)
Returns a writeable stream that consumes the array or array-like `values` as
its buffer.
*/

function Pushable(push, stop) {
    this.push = push;
    this.stop = stop;
}

Stream$1.from = function(values) {
    return new Stream$1(Pushable, values);
};


/*
Stream.fromPromise(promise)
Returns a stream that uses the given promise as its source. When the promise
resolves the stream is given its value and stopped. If the promise errors
the stream is stopped without value. This stream is not pushable, but may
be stopped before the promise resolves.
*/

Stream$1.fromPromise = function(promise) {
    return new Stream$1(function(push, stop) {
        promise.then(push);
        promise.finally(stop);
        return { stop };
    });
};






// Clock Stream

const clockEventPool = [];

function TimeSource(notify, end, timer) {
    this.notify = notify;
    this.end    = end;
    this.timer  = timer;

    const event = this.event = clockEventPool.shift() || {};
    event.stopTime = Infinity;

    this.frame = (time) => {
        // Catch the case where stopTime has been set before or equal the
        // end time of the previous frame, which can happen if start
        // was scheduled via a promise, and therefore should only ever
        // happen on the first frame: stop() catches this case thereafter
        if (event.stopTime <= event.t2) { return; }

        // Wait until startTime
        if (time < event.startTime) {
            this.requestId = this.timer.request(this.frame);
            return;
        }

        // Reset frame fn without checks
        this.frame = (time) => this.update(time);
        this.frame(time);
    };
}

assign$1(TimeSource.prototype, {
    shift: function shift() {
        var value = this.value;
        this.value = undefined;
        return value;
    },

    start: function(time) {
        const now = this.timer.now();

        this.event.startTime = time !== undefined ? time : now ;
        this.event.t2 = time > now ? time : now ;

        // If the currentTime (the last frame time) is greater than now
        // call the frame for up to this point, otherwise add an arbitrary
        // frame duration to now.
        const frameTime = this.timer.currentTime > now ?
            this.timer.currentTime :
            now + 0.08 ;

        if (this.event.startTime > frameTime) {
            // Schedule update on the next frame
            this.requestId = this.timer.request(this.frame);
        }
        else {
            // Run the update on the next tick, in case we schedule stop
            // before it gets chance to fire. This also gaurantees all stream
            // pushes are async.
            Promise.resolve(frameTime).then(this.frame);
        }
    },

    stop: function stop(time) {
        if (this.event.startTime === undefined) {
            // This is a bit of an arbitrary restriction. It wouldnt
            // take much to support this.
            throw new Error('TimeStream: Cannot call .stop() before .start()');
        }

        this.event.stopTime = time || this.timer.now();

        // If stopping during the current frame cancel future requests.
        if (this.event.stopTime <= this.event.t2) {
            this.requestId && this.timer.cancel(this.requestId);
            this.end();
        }
    },

    update: function(time) {
        const event = this.event;
        event.t1 = event.t2;

        this.requestId = undefined;
        this.value     = event;

        if (time >= event.stopTime) {
            event.t2 = event.stopTime;
            this.notify();
            this.end();

            // Release event
            clockEventPool.push(event);
            return;
        }

        event.t2 = time;
        this.notify();
        // Todo: We need this? Test.
        this.value     = undefined;
        this.requestId = this.timer.request(this.frame);
    }
});


/*
Stream.fromTimer(timer)
Create a stream from a `timer` object. A `timer` is an object
with the properties:

```
{
    request:     fn(fn), calls fn on the next frame, returns an id
    cancel:      fn(id), cancels request with id
    now:         fn(), returns the time
    currentTime: time at the start of the latest frame
}
```

Here is how a stream of animation frames may be created:

```
const frames = Stream.fromTimer({
    request: window.requestAnimationFrame,
    cancel: window.cancelAnimationFrame,
    now: () => window.performance.now()
});
```

This stream is not pushable.
*/

Stream$1.fromTimer = function TimeStream(timer) {
    return new Stream$1(function(push, stop) {
        return new TimeSource(push, stop, timer);
    });
};


/*
Stream.of(...values)
Returns a stream that consumes arguments as a buffer. The stream is pushable.
*/

Stream$1.of = function() {
    return Stream$1.from(arguments);
};


// CombineStream

function CombineProducer(push, stop, fn, streams) {
    const values = {
        length: streams.length,
        count: 0,
        doneCount: 0
    };

    function done() {
        ++values.doneCount;

        // Are all the source streams finished?
        if (values.doneCount === values.length) {
            // Stop the stream
            stop();
        }
    }

    streams.forEach(function(stream, i) {
        stream
        .map(function(value) {
            // Is this the first value to come through the source stream?
            if (values[i] === undefined) {
                ++values.count;
            }

            values[i] = value;

            // Are all the source streams active?
            if (values.count === values.length) {
                // Push the combined output into the stream's buffer
                return fn.apply(null, values);
            }
        })
        .each(push)
        .done(done);
    });

    return { stop };
}

function CombineStream(fn, streams) {
    if (DEBUG && streams.length < 2) {
        throw new Error('CombineStream(fn, streams) requires more than 1 stream')
    }

    return new Stream$1((push, stop) => CombineProducer(push, stop, fn, streams));
}


// Stream.Merge

function MergeSource(notify, stop, sources) {
    var values = [];

    function update(source) {
        values.push.apply(values, toArray(source));
    }

    this.values  = values;
    this.notify  = notify;
    this.sources = sources;
    this.update  = update;
    this.cueStop = stop;

    each(function(source) {
        // Flush the source
        update(source);

        // Listen for incoming values
        source.on(update);
        source.on(notify);
    }, sources);
}

assign$1(MergeSource.prototype, {
    shift: function() {
        if (this.sources.every(isDone$1)) {
            this.stop();
        }

        return this.values.shift();
    },

    stop: function() {
        this.cueStop(this.values.length);
    }
});

Stream$1.Merge = function(source1, source2) {
    const sources = Array.from(arguments);
    return new Stream$1(function(push, stop) {
        return new MergeSource(push, stop, sources);
    });
};


// Stream Timers

Stream$1.Choke = function(time) {
    return new Stream$1(function setup(notify, done) {
        var value;
        var update = choke(function() {
            // Get last value and stick it in buffer
            value = arguments[arguments.length - 1];
            notify();
        }, time);

        return {
            shift: function() {
                var v = value;
                value = undefined;
                return v;
            },

            push: update,

            stop: function stop() {
                update.cancel(false);
                done();
            }
        };
    });
};


// Frame timer

var frameTimer = {
    now:     now,
    request: requestAnimationFrame.bind(window),
    cancel:  cancelAnimationFrame.bind(window)
};


// Stream.throttle

function schedule() {
    this.queue = noop$1;
    this.ref   = this.timer.request(this.update);
}

function ThrottleSource(notify, stop, timer) {
    this._stop   = stop;
    this.timer   = timer;
    this.queue   = schedule;
    this.update  = function update() {
        this.queue = schedule;
        notify();
    };
}

assign$1(ThrottleSource.prototype, {
    shift: function shift() {
        var value = this.value;
        this.value = undefined;
        return value;
    },

    stop: function stop(callLast) {
        var timer = this.timer;

        // An update is queued
        if (this.queue === noop$1) {
            timer.cancel && timer.cancel(this.ref);
            this.ref = undefined;
        }

        // Don't permit further changes to be queued
        this.queue = noop$1;

        // If there is an update queued apply it now
        // Hmmm. This is weird semantics. TODO: callLast should
        // really be an 'immediate' flag, no?
        this._stop(this.value !== undefined && callLast ? 1 : 0);
    },

    push: function throttle() {
        // Store the latest value
        this.value = arguments[arguments.length - 1];

        // Queue the update
        this.queue();
    }
});

Stream$1.throttle = function(timer) {
    return new Stream$1(function(notify, stop) {
        timer = typeof timer === 'number' ? new Timer(timer) :
            timer ? timer :
            frameTimer;

        return new ThrottleSource(notify, stop, timer);
    });
};

const nothing$1      = Object.freeze([]);

/*
parseSelector(string)

Takes a string of the form '[key=value, ... ]' and returns a function isMatch
that returns true when passed an object that matches the selector.
*/

{ window.observeCount = 0; }
const nothing$2 = Object.freeze([]);

/*
.append(str2, str1)

Returns `str1 + str2` as string.
*/

function append(string1, string2) {
    return '' + string2 + string1;
}

curry$1(append);

function prepad(chars, n, value) {
    var string = value + '';
    var i = -1;
    var pre = '';

    while (pre.length < n - string.length) {
        pre += chars[++i % chars.length];
    }

    string = pre + string;
    return string.slice(string.length - n);
}

curry$1(prepad);

function postpad(chars, n, value) {
    var string = value + '';

    while (string.length < n) {
        string = string + chars;
    }

    return string.slice(0, n);
}

curry$1(postpad);

/*
slugify(string)

Replaces any series of non-word characters with a `'-'` and lowercases the rest.

    slugify('Party on #mydudes!') // 'party-on-mydudes'
*/

function requestTime(s, fn) {
    return setTimeout(fn, s * 1000);
}

function ap(data, fns) {
	let n = -1;
	let fn;
	while (fn = fns[++n]) {
		fn(data);
	}
}

/*
insert(fn, array, object)
Inserts `object` into `array` at the first index where the result of
`fn(object)` is greater than `fn(array[index])`.
*/

const A$3 = Array.prototype;

function insert(fn, array, object) {
    var n = -1;
    var l = array.length;
    var value = fn(object);
    while(++n < l && fn(array[n]) <= value);
    A$3.splice.call(array, n, 0, object);
    return object;
}

/*
take(n, array)
*/

function take(i, object) {
    if (object.slice) { return object.slice(0, i); }
    if (object.take)  { return object.take(i); }

    var a = [];
    var n = i;
    while (n--) { a[n] = object[n]; }
    return a;
}

/*
unique(array)
Takes an array or stream as `array`, returns an object of the same
type without duplicate values.
*/

/*
update(create, destroy, fn, target, source)

Returns a new array containing items that are either matched objects from
`target` assigned new data from `source` objects or, where no match is found,
new objects created by calling `create` on a `source` object. Any objects
in `target` that are not matched to `source` objects are destroyed by calling
`destroy` on them.
*/

const assign$2 = Object.assign;

function update(create, destroy, fn, target, source) {
    const ids     = target.map(fn);
    const indexes = {};
    const output  = source.map(function(data) {
        const id = fn(data);
        const i  = ids.indexOf(id);

        if (i < 0) {
            return create.prototype ?
                new create(data) :
                create(data);
        }

        // Has it already been processed? Oops.
        if (indexes[i]) {
            throw new Error('Failed to update target array, source data contains duplicates');
        }

        indexes[i] = true;
        return assign$2(target[i], data);
    });

    target.forEach(function(object) {
        if (!output.includes(object)) {
            destroy(object);
        }
    });

    return output;
}

function diff(array, object) {
    var values = toArray(array);

    return filter(function(value) {
        var i = values.indexOf(value);
        if (i === -1) { return true; }
        values.splice(i, 1);
        return false;
    }, object)
    .concat(values);
}

function intersect(array, object) {
    var values = toArray(array);

    return filter(function(value) {
        var i = values.indexOf(value);
        if (i === -1) { return false; }
        values.splice(i, 1);
        return true;
    }, object);
}

function unite(array, object) {
    var values = toArray(array);

    return map(function(value) {
        var i = values.indexOf(value);
        if (i > -1) { values.splice(i, 1); }
        return value;
    }, object)
    .concat(values);
}

/*
last(array)
Gets the last value from an array.
*/

const DEBUG$1 = window.DEBUG === undefined || window.DEBUG;

const defs = {
    // Primitive types

    'boolean': (value) =>
        typeof value === 'boolean',

    'function': (value) =>
        typeof value === 'function',

    'number': (value) =>
        typeof value === 'number',

    'object': (value) =>
        typeof value === 'object',

    'symbol': (value) =>
        typeof value === 'symbol',

    // Functional types
    // Some of these are 'borrowed' from SancturyJS
    // https://github.com/sanctuary-js/sanctuary-def/tree/v0.19.0

    'Any': noop$1,

    'Array': (value) =>
        Array.isArray(value),

    'ArrayLike': (value) =>
        typeof value.length === 'number',

    'Boolean': (value) =>
        typeof value === 'boolean',

    'Date': (value) =>
        value instanceof Date
        && !Number.isNaN(value.getTime()),

    'Error': (value) =>
        value instanceof Error,

    'Integer': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value,

    'NegativeInteger': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value
        && value < 0,

    'NonPositiveInteger': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value
        && value <= 0,

    'PositiveInteger': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value
        && value > 0,

    'NonNegativeInteger': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value
        && value >= 0,

    'Number': (value) =>
        typeof value === 'number'
        && !Number.isNaN(value),

    'NegativeNumber': (value) =>
        typeof value === 'number'
        && value < 0,

    'NonPositiveNumber': (value) =>
        typeof value === 'number'
        && value <= 0,

    'PositiveNumber': (value) =>
        typeof value === 'number'
        && value > 0,

    'NonNegativeNumber': (value) =>
        typeof value === 'number'
        && value >= 0,

    'Null': (value) =>
        value === null,

    'Object': (value) =>
        !!value
        && typeof value === 'object',

    'RegExp': (value) =>
        value instanceof RegExp
};

const checkType = DEBUG$1 ? function checkType(type, value, file, line, message) {
    if (!defs[type]) {
        throw new RangeError('Type "' + type + '" not recognised');
    }

    if (!defs[type](value)) {
        throw new Error(message || 'value not of type "' + type + '": ' + value, file, line);
    }
} : noop$1 ;

const checkTypes = DEBUG$1 ? function checkTypes(types, args, file, line) {
    var n = types.length;

    while (n--) {
        checkType(types[n], args[n], file, line, 'argument ' + n + ' not of type "' + types[n] + '": ' + args[n]);
    }
} : noop$1 ;

function def(notation, fn, file, line) {
    // notation is of the form:
    // 'Type, Type -> Type'
    // Be generous with what we accept as output marker '->' or '=>'
    var parts = notation.split(/\s*[=-]>\s*/);
    var types = parts[0].split(/\s*,\s*/);
    var returnType = parts[1];

    return DEBUG$1 ? function() {
        checkTypes(types, arguments, file, line);
        const output = fn.apply(this, arguments);
        checkType(returnType, output, file, line, 'return value not of type "' + returnType + '": ' + output);
        return output;
    } : fn ;
}

// Cubic bezier function (originally translated from
// webkit source by Christian Effenberger):
// http://www.netzgesta.de/dev/cubic-bezier-timing-function.html

/*
cubicBezier(point1, point2, duration, x)
Where `point1` and `point2` are `[x, y]` arrays describing control points.
*/

function sampleCubicBezier(a, b, c, t) {
    // `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
    return ((a * t + b) * t + c) * t;
}

function sampleCubicBezierDerivative(a, b, c, t) {
    return (3 * a * t + 2 * b) * t + c;
}

function solveCubicBezierX(a, b, c, x, epsilon) {
    // Solve x for a cubic bezier
    var x2, d2, i;
    var t2 = x;

    // First try a few iterations of Newton's method -- normally very fast.
    for(i = 0; i < 8; i++) {
        x2 = sampleCubicBezier(a, b, c, t2) - x;
        if (Math.abs(x2) < epsilon) {
            return t2;
        }
        d2 = sampleCubicBezierDerivative(a, b, c, t2);
        if (Math.abs(d2) < 1e-6) {
            break;
        }
        t2 = t2 - x2 / d2;
    }

    // Fall back to the bisection method for reliability.
    var t0 = 0;
    var t1 = 1;

    t2 = x;

    if(t2 < t0) { return t0; }
    if(t2 > t1) { return t1; }

    while(t0 < t1) {
        x2 = sampleCubicBezier(a, b, c, t2);
        if(Math.abs(x2 - x) < epsilon) {
            return t2;
        }
        if (x > x2) { t0 = t2; }
        else { t1 = t2; }
        t2 = (t1 - t0) * 0.5 + t0;
    }

    // Failure.
    return t2;
}

function cubicBezier(p1, p2, duration, x) {
    // The epsilon value to pass given that the animation is going
    // to run over duruation seconds. The longer the animation, the
    // more precision is needed in the timing function result to
    // avoid ugly discontinuities.
    var epsilon = 1 / (200 * duration);

    // Calculate the polynomial coefficients. Implicit first and last
    // control points are (0,0) and (1,1).
    var cx = 3 * p1[0];
    var bx = 3 * (p2[0] - p1[0]) - cx;
    var ax = 1 - cx - bx;
    var cy = 3 * p1[1];
    var by = 3 * (p2[1] - p1[1]) - cy;
    var ay = 1 - cy - by;

    var y = solveCubicBezierX(ax, bx, cx, x, epsilon);
    return sampleCubicBezier(ay, by, cy, y);
}

// Normalisers take a min and max and transform a value in that range
// to a value on the normal curve of a given type

const linear = def(
    'Number, Number, Number => Number',
    (min, max, value) => (value - min) / (max - min)
);

const quadratic = def(
    'Number, Number, Number => Number',
    (min, max, value) => Math.pow((value - min) / (max - min), 1/2)
);

const cubic = def(
    'Number, Number, Number => Number',
    (min, max, value) => Math.pow((value - min) / (max - min), 1/3)
);

const logarithmic = def(
    'PositiveNumber, PositiveNumber, NonNegativeNumber => Number',
    (min, max, value) => Math.log(value / min) / Math.log(max / min)
);

const linearLogarithmic = def(
    'PositiveNumber, PositiveNumber, NonNegativeNumber => Number',
    (min, max, value) => {
        // The bottom 1/9th of the range is linear from 0 to min, while
        // the top 8/9ths is dB linear from min to max.
        return value <= min ?
            (value / min) / 9 :
            (0.1111111111111111 + (Math.log(value / min) / Math.log(max / min)) / 1.125) ;
    }
);

// cubicBezier
// `begin` and `end` are objects of the form
// { point:  [x, y], handle: [x, y] }

const cubicBezier$1 = def(
    'Object, Object, Number => Number',
    (begin, end, value) => cubicBezier({
        0: linear(begin.point[0], end.point[0], begin.handle[0]),
        1: linear(begin.point[0], end.point[0], begin.handle[0])
    }, {
        0: linear(begin.point[0], end.point[0], end.handle[0]),
        1: linear(begin.point[0], end.point[0], end.handle[0])
    }, 1, linear(begin.point[0], end.point[0], value))
);

var normalisers = /*#__PURE__*/Object.freeze({
    linear: linear,
    quadratic: quadratic,
    cubic: cubic,
    logarithmic: logarithmic,
    linearLogarithmic: linearLogarithmic,
    cubicBezier: cubicBezier$1
});

// Denormalisers take a min and max and transform a value into that range
// from the range of a curve of a given type

const linear$1 = def(
    'Number, Number, Number => Number',
    (min, max, value) => value * (max - min) + min
);

const quadratic$1 = def(
    'Number, Number, Number => Number',
    (min, max, value) => Math.pow(value, 2) * (max - min) + min
);

const cubic$1 = def(
    'Number, Number, Number => Number',
    (min, max, value) => Math.pow(value, 3) * (max - min) + min
);

const logarithmic$1 = def(
    'PositiveNumber, PositiveNumber, Number => Number',
    (min, max, value) => min * Math.pow(max / min, value)
);

const linearLogarithmic$1 = def(
    'PositiveNumber, PositiveNumber, Number => Number',
    (min, max, value) => {
        // The bottom 1/9th of the range is linear from 0 to min, while
        // the top 8/9ths is dB linear from min to max.
        return value <= 0.1111111111111111 ?
            value * 9 * min :
            min * Math.pow(max / min, (value - 0.1111111111111111) * 1.125);
    }
);

// cubicBezier
// `begin` and `end` are objects of the form
// { point:  [x, y], handle: [x, y] }

const cubicBezier$2 = def(
    'Object, Object, Number => Number',
    (begin, end, value) => linear$1(begin.point[1], end.point[1], cubicBezier({
        0: linear(begin.point[0], end.point[0], begin.handle[0]),
        1: linear(begin.point[1], end.point[1], begin.handle[1])
    }, {
        0: linear(begin.point[0], end.point[0], end.handle[0]),
        1: linear(begin.point[1], end.point[1], end.handle[1])
    }, 1, value))
);

var denormalisers = /*#__PURE__*/Object.freeze({
    linear: linear$1,
    quadratic: quadratic$1,
    cubic: cubic$1,
    logarithmic: logarithmic$1,
    linearLogarithmic: linearLogarithmic$1,
    cubicBezier: cubicBezier$2
});

// Constant for converting radians to degrees
const angleFactor = 180 / Math.PI;

function sum(a, b)  { return b + a; }
function multiply(a, b) { return b * a; }
function min(a, b)  { return a > b ? b : a ; }
function max(a, b)  { return a < b ? b : a ; }
function pow(n, x)  { return Math.pow(x, n); }
function exp(n, x)  { return Math.pow(n, x); }
function log$1(n, x)  { return Math.log(x) / Math.log(n); }
function root(n, x) { return Math.pow(x, 1/n); }

/*
mod(divisor, n)
JavaScript's modulu operator (`%`) uses Euclidean division, but for
stuff that cycles through 0 the symmetrics of floored division are often
are more useful.
*/

function mod(d, n) {
    var value = n % d;
    return value < 0 ? value + d : value ;
}

/*
limit(min, max, n)
*/

function limit(min, max, n) {
    return n > max ? max : n < min ? min : n ;
}

function wrap(min, max, n) {
    return (n < min ? max : min) + (n - min) % (max - min);
}

/*
gcd(a, b)
*/

function gcd(a, b) {
    // Greatest common divider
    return b ? gcd(b, a % b) : a ;
}

/*
lcm(a, b)
*/

function lcm(a, b) {
    // Lowest common multiple.
    return a * b / gcd(a, b);
}

function factorise(n, d) {
    // Reduce a fraction by finding the Greatest Common Divisor and
    // dividing by it.
    var f = gcd(n, d);
    return [n/f, d/f];
}

/*
toLevel(dB)
*/

function toLevel(n) { return Math.pow(2, n / 6); }

// Exponential functions
//
// e - exponent
// x - range 0-1
//
// eg.
// var easeInQuad   = exponential(2);
// var easeOutCubic = exponentialOut(3);
// var easeOutQuart = exponentialOut(4);

function exponentialOut(e, x) {
    return 1 - Math.pow(1 - x, e);
}

/*
toPolar(cartesian)
*/

function createOrdinals(ordinals) {
	var array = [], n = 0;

	while (n++ < 31) {
		array[n] = ordinals[n] || ordinals.n;
	}

	return array;
}

var langs = {
	'en': {
		days:     ('Sunday Monday Tuesday Wednesday Thursday Friday Saturday').split(' '),
		months:   ('January February March April May June July August September October November December').split(' '),
		ordinals: createOrdinals({ n: 'th', 1: 'st', 2: 'nd', 3: 'rd', 21: 'st', 22: 'nd', 23: 'rd', 31: 'st' })
	},

	'fr': {
		days:     ('dimanche lundi mardi mercredi jeudi vendredi samedi').split(' '),
		months:   ('janvier février mars avril mai juin juillet août septembre octobre novembre décembre').split(' '),
		ordinals: createOrdinals({ n: "ième", 1: "er" })
	},

	'de': {
		days:     ('Sonntag Montag Dienstag Mittwoch Donnerstag Freitag Samstag').split(' '),
		months:   ('Januar Februar März April Mai Juni Juli Oktober September Oktober November Dezember').split(' '),
		ordinals: createOrdinals({ n: "er" })
	},

	'it': {
		days:     ('domenica lunedì martedì mercoledì giovedì venerdì sabato').split(' '),
		months:   ('gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre').split(' '),
		ordinals: createOrdinals({ n: "o" })
	}
};


// Date string parsing
//
// Don't parse date strings with the JS Date object. It has variable
// time zone behaviour. Set up our own parsing.
//
// Accept BC dates by including leading '-'.
// (Year 0000 is 1BC, -0001 is 2BC.)
// Limit months to 01-12
// Limit dates to 01-31

var rdate     = /^(-?\d{4})(?:-(0[1-9]|1[012])(?:-(0[1-9]|[12]\d|3[01])(?:T([01]\d|2[0-3])(?::([0-5]\d)(?::([0-5]\d)(?:.(\d+))?)?)?)?)?)?([+-]([01]\d|2[0-3]):?([0-5]\d)?|Z)?$/;
//                sign   year        month       day               T or -
var rdatediff = /^([+-])?(\d{2,})(?:-(\d{2,})(?:-(\d{2,}))?)?(?:([T-])|$)/;

/*
parseDate(date)
Parse a date, where, `date` may be:

- a string in ISO date format
- a number in seconds UNIX time
- a date object

Returns a date object, or *the* date object, if it validates.
*/

const parseDate = overload(toType, {
	number:  secondsToDate,
	string:  exec$1(rdate, createDate),
	object:  function(date) {
		return isValidDate(date) ? date : undefined ;
	},
	default: function(date) {
        throw new TypeError('parseDate(date) date is not of a supported type (' + (typeof date) + ')');
    }
});

/*
parseDateLocal(date)
As `parseDate(date)`, but returns a date object with local time set to the
result of the parse (or the original date object, if it validates).
*/

const parseDateLocal = overload(toType, {
	number:  secondsToDate,
	string:  exec$1(rdate, createDateLocal),
	object:  function(date) {
		return isValidDate(date) ? date : undefined ;
	},
	default: function(date) {
        throw new TypeError('parseDateLocal: date is not of a supported type (number, string, Date)');
    }
});

function isValidDate(date) {
	return toClass(date) === "Date" && !Number.isNaN(date.getTime()) ;
}

function createDate(match, year, month, day, hour, minute, second, ms, zone, zoneHour, zoneMinute) {
	// Month must be 0-indexed for the Date constructor
	month = parseInt(month, 10) - 1;

	var date = new Date(
		ms ?     Date.UTC(year, month, day, hour, minute, second, ms) :
		second ? Date.UTC(year, month, day, hour, minute, second) :
		minute ? Date.UTC(year, month, day, hour, minute) :
		hour ?   Date.UTC(year, month, day, hour) :
		day ?    Date.UTC(year, month, day) :
		month ?  Date.UTC(year, month) :
		Date.UTC(year)
	);

	if (zone && (zoneHour !== '00' || (zoneMinute !== '00' && zoneMinute !== undefined))) {
		setTimeZoneOffset(zone[0], zoneHour, zoneMinute, date);
	}

	return date;
}

function createDateLocal(year, month, day, hour, minute, second, ms, zone) {
	if (zone) {
		throw new Error('createDateLocal() will not parse a string with a time zone "' + zone + '".');
	}

	// Month must be 0-indexed for the Date constructor
	month = parseInt(month, 10) - 1;

	return ms ?  new Date(year, month, day, hour, minute, second, ms) :
		second ? new Date(year, month, day, hour, minute, second) :
		minute ? new Date(year, month, day, hour, minute) :
		hour ?   new Date(year, month, day, hour) :
		day ?    new Date(year, month, day) :
		month ?  new Date(year, month) :
		new Date(year) ;
}

function exec$1(regex, fn, error) {
	return function exec(string) {
		var parts = regex.exec(string);
		if (!parts && error) { throw error; }
		return parts ?
			fn.apply(null, parts) :
			undefined ;
	};
}

function secondsToDate(n) {
	return new Date(secondsToMilliseconds(n));
}

function setTimeZoneOffset(sign, hour, minute, date) {
	if (sign === '+') {
		date.setUTCHours(date.getUTCHours() - parseInt(hour, 10));
		if (minute) {
			date.setUTCMinutes(date.getUTCMinutes() - parseInt(minute, 10));
		}
	}
	else if (sign === '-') {
		date.setUTCHours(date.getUTCHours() + parseInt(hour, 10));
		if (minute) {
			date.setUTCMinutes(date.getUTCMinutes() + parseInt(minute, 10));
		}
	}

	return date;
}



// Date object formatting
//
// Use the internationalisation methods for turning a date into a UTC or
// locale string, the date object for turning them into a local string.

var dateFormatters = {
	YYYY: function(date)       { return ('000' + date.getFullYear()).slice(-4); },
	YY:   function(date)       { return ('0' + date.getFullYear() % 100).slice(-2); },
	MM:   function(date)       { return ('0' + (date.getMonth() + 1)).slice(-2); },
	MMM:  function(date, lang) { return this.MMMM(date, lang).slice(0,3); },
	MMMM: function(date, lang) { return langs[lang || Time.lang].months[date.getMonth()]; },
	D:    function(date)       { return '' + date.getDate(); },
	DD:   function(date)       { return ('0' + date.getDate()).slice(-2); },
	ddd:  function(date, lang) { return this.dddd(date, lang).slice(0,3); },
	dddd: function(date, lang) { return langs[lang || Time.lang].days[date.getDay()]; },
	hh:   function(date)       { return ('0' + date.getHours()).slice(-2); },
	//hh:   function(date)       { return ('0' + date.getHours() % 12).slice(-2); },
	mm:   function(date)       { return ('0' + date.getMinutes()).slice(-2); },
	ss:   function(date)       { return ('0' + date.getSeconds()).slice(-2); },
	sss:  function(date)       { return (date.getSeconds() + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
	ms:   function(date)       { return '' + date.getMilliseconds(); },

	// Experimental
	am:   function(date) { return date.getHours() < 12 ? 'am' : 'pm'; },
	zz:   function(date) {
		return (date.getTimezoneOffset() < 0 ? '+' : '-') +
			 ('0' + Math.round(100 * Math.abs(date.getTimezoneOffset()) / 60)).slice(-4) ;
	},
	th:   function(date, lang) { return langs[lang || Time.lang].ordinals[date.getDate()]; },
	n:    function(date) { return +date; },
	ZZ:   function(date) { return -date.getTimezoneOffset() * 60; }
};

var componentFormatters = {
	YYYY: function(data)       { return data.year; },
	YY:   function(data)       { return ('0' + data.year).slice(-2); },
	MM:   function(data)       { return data.month; },
	MMM:  function(data, lang) { return this.MMMM(data, lang).slice(0,3); },
	MMMM: function(data, lang) { return langs[lang].months[data.month - 1]; },
	D:    function(data)       { return parseInt(data.day, 10) + ''; },
	DD:   function(data)       { return data.day; },
	DDD:  function(data)       { return data.weekday.slice(0,3); },
	DDDD: function(data, lang) { return data.weekday; },
	hh:   function(data)       { return data.hour; },
	//hh:   function(data)       { return ('0' + data.hour % 12).slice(-2); },
	mm:   function(data)       { return data.minute; },
	ss:   function(data)       { return data.second; },
	//sss:  function(data)       { return (date.second + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
	//ms:   function(data)       { return '' + date.getMilliseconds(); },
};

var componentKeys = {
	// Components, in order of appearance in the locale string
	'en-US': ['weekday', 'month', 'day', 'year', 'hour', 'minute', 'second'],
	// fr: "lundi 12/02/2018 à 18:54:09" (different in IE/Edge, of course)
	// de: "Montag, 12.02.2018, 19:28:39" (different in IE/Edge, of course)
	default: ['weekday', 'day', 'month', 'year', 'hour', 'minute', 'second']
};

var options = {
	// Time zone
	timeZone:      'UTC',
	// Use specified locale matcher
	formatMatcher: 'basic',
	// Use 24 hour clock
	hour12:        false,
	// Format string components
	weekday:       'long',
	year:          'numeric',
	month:         '2-digit',
	day:           '2-digit',
	hour:          '2-digit',
	minute:        '2-digit',
	second:        '2-digit',
	//timeZoneName:  'short'
};

var rtoken    = /([YZMDdhmswz]{2,4}|D|\+-)/g;
var rusdate   = /\w{3,}|\d+/g;
var rdatejson = /^"(-?\d{4,}-\d\d-\d\d)/;

function matchEach(regex, fn, text) {
	var match = regex.exec(text);
	if (!match) { return; }
	fn.apply(null, match);
	matchEach(regex, fn, text);
}

function toLocaleString(timezone, locale, date) {
	options.timeZone = timezone || 'UTC';
	var string = date.toLocaleString(locale, options);
	return string;
}

function toLocaleComponents(timezone, locale, date) {
	var localedate = toLocaleString(timezone, locale, date);
	var components = {};
	var keys       = componentKeys[locale] || componentKeys.default;
	var i          = 0;

	matchEach(rusdate, function(value) {
		components[keys[i++]] = value;
	}, localedate);

	components.milliseconds = +date % 1000;
	return components;
}

function _formatDate(string, timezone, locale, date) {
	// Derive lang from locale
	var lang = locale ? locale.slice(0,2) : document.documentElement.lang ;

	// Todo: only en-US and fr supported for the time being
	locale = locale === 'en' ? 'en-US' :
		locale ? locale :
		'en-US';

	var data    = toLocaleComponents(timezone, locale, date);
	var formats = componentFormatters;

	return string.replace(rtoken, function($0) {
		return formats[$0] ?
			formats[$0](data, lang) :
			$0 ;
	});
}

/*
formatDateLocal(format, locale, date)
*/

function formatDateLocal(string, locale, date) {
	var formatters = dateFormatters;
	var lang = locale.slice(0, 2);

	// Use date formatters to get time as current local time
	return string.replace(rtoken, function($0) {
		return formatters[$0] ? formatters[$0](date, lang) : $0 ;
	});
}

/*
formatDateISO(date)
Formats `date` (a string or a number or date accepted by `parseDate(date)`) as
a string in the ISO date format.
*/

function formatDateISO(date) {
	return rdatejson.exec(JSON.stringify(parseDate(date)))[1];
}


// Time operations

var days   = {
	mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0
};

var dayMap = [6,0,1,2,3,4,5];

/*
toDay(date)
Returns day of week as a number, where monday is `0`.
*/

function toDay(date) {
	return dayMap[date.getDay()];
}

/*
cloneDate(date)
Returns new date object set to same time.
*/

function cloneDate(date) {
	return new Date(+date);
}

function addDateComponents(sign, yy, mm, dd, date) {
	date.setUTCFullYear(date.getUTCFullYear() + sign * parseInt(yy, 10));

	if (!mm) { return; }

	// Adding and subtracting months can give weird results with the JS
	// date object. For example, taking a montha way from 2018-03-31 results
	// in 2018-03-03 (or the 31st of February), whereas adding a month on to
	// 2018-05-31 results in the 2018-07-01 (31st of June).
	//
	// To mitigate this weirdness track the target month and roll days back
	// until the month is correct, like Python's relativedelta utility:
	// https://dateutil.readthedocs.io/en/stable/relativedelta.html#examples
	var month       = date.getUTCMonth();
	var monthDiff   = sign * parseInt(mm, 10);
	var monthTarget = mod(12, month + monthDiff);

	date.setUTCMonth(month + monthDiff);

	// If the month is too far in the future scan backwards through
	// months until it fits. Setting date to 0 means setting to last
	// day of previous month.
	while (date.getUTCMonth() > monthTarget) { date.setUTCDate(0); }

	if (!dd) { return; }

	date.setUTCDate(date.getUTCDate() + sign * parseInt(dd, 10));
}

function _addDate(duration, date) {
	// Don't mutate the original date
	date = cloneDate(date);

	// First parse the date portion duration and add that to date
	var tokens = rdatediff.exec(duration) ;
	var sign = 1;

	if (tokens) {
		sign = tokens[1] === '-' ? -1 : 1 ;
		addDateComponents(sign, tokens[2], tokens[3], tokens[4], date);

		// If there is no 'T' separator go no further
		if (!tokens[5]) { return date; }

		// Prepare duration for time parsing
		duration = duration.slice(tokens[0].length);

		// Protect against parsing a stray sign before time
		if (duration[0] === '-') { return date; }
	}

	// Then parse the time portion and add that to date
	var time = parseTimeDiff(duration);
	if (time === undefined) { return; }

	date.setTime(date.getTime() + sign * time * 1000);
	return date;
}

function diff$1(t, d1, d2) {
	var y1 = d1.getUTCFullYear();
	var m1 = d1.getUTCMonth();
	var y2 = d2.getUTCFullYear();
	var m2 = d2.getUTCMonth();

	if (y1 === y2 && m1 === m2) {
		return t + d2.getUTCDate() - d1.getUTCDate() ;
	}

	t += d2.getUTCDate() ;

	// Set to last date of previous month
	d2.setUTCDate(0);
	return diff$1(t, d1, d2);
}

function _diffDateDays(date1, date2) {
	var d1 = parseDate(date1);
	var d2 = parseDate(date2);

	return d2 > d1 ?
		// 3rd argument mutates, so make sure we get a clean date if we
		// have not just made one.
		diff$1(0, d1, d2 === date2 || d1 === d2 ? cloneDate(d2) : d2) :
		diff$1(0, d2, d1 === date1 || d2 === d1 ? cloneDate(d1) : d1) * -1 ;
}

function floorDateByGrain(token, date) {
	var diff, week;

	if (token === 'ms') { return date; }

	date.setUTCMilliseconds(0);
	if (token === 's') { return date; }

	date.setUTCSeconds(0);
	if (token === 'm') { return date; }

	date.setUTCMinutes(0);
	if (token === 'h') { return date; }

	date.setUTCHours(0);
	if (token === 'd') { return date; }

	if (token === 'w') {
		date.setDate(date.getDate() - toDay(date));
		return date;
	}

	if (token === 'fortnight') {
		week = floorDateByDay(1, new Date());
		diff = mod(14, _diffDateDays(week, date));
		date.setUTCDate(date.getUTCDate() - diff);
		return date;
	}

	date.setUTCDate(1);
	if (token === 'M') { return date; }

	date.setUTCMonth(0);
	if (token === 'Y') { return date; }

	date.setUTCFullYear(0);
	return date;
}

function floorDateByDay(day, date) {
	var currentDay = date.getUTCDay();

	// If we are on the specified day, return this date
	if (day === currentDay) { return date; }

	var diff = currentDay - day;
	if (diff < 0) { diff = diff + 7; }
	return _addDate('-0000-00-0' + diff, date);
}

function _floorDate(token, date) {
	// Clone date before mutating it
	date = cloneDate(date);
	return typeof token === 'number' ? floorDateByDay(token, date) :
        days[token] ? floorDateByDay(days[token], date) :
	    floorDateByGrain(token, date) ;
}

/*
addDate(diff, date)
Sums `diff` and `date`, where `diff` is a string in ISO date format. Returns
a new date object.

```
const addWeek = addDate('0000-00-07');
const sameTimeNextWeek = addWeek(new Date());
```
*/

const addDate = curry$1(function(diff, date) {
	return _addDate(diff, parseDate(date));
});

const diffDateDays = curry$1(_diffDateDays);

/*
floorDate(token, date)
Floors date to the start of nearest calendar point in time indicated by `token`:

- `'Y'`   Year
- `'M'`   Month
- `'w'`   Week
- `'d'`   Day
- `'h'`   Hour
- `'m'`   Minute
- `'s'`   Second
- `'mon'` Monday
- `'tue'` Tuesday
- `'wed'` Wednesday
- `'thu'` Thursday
- `'fri'` Friday
- `'sat'` Saturday
- `'sun'` Sunday

```
const dayCounts = times.map(floorTime('days'));
```
*/

const floorDate = curry$1(function(token, date) {
	return _floorDate(token, parseDate(date));
});

/*
formatDate(locale, timezone, format, date)
Formats `date` (a string or number or date accepted by `parseDate(date)`)
to the format of the string `format`. The format string may contain the tokens:

- `'YYYY'` years
- `'YY'`   2-digit year
- `'MM'`   month, 2-digit
- `'MMM'`  month, 3-letter
- `'MMMM'` month, full name
- `'D'`    day of week
- `'DD'`   day of week, two-digit
- `'DDD'`  weekday, 3-letter
- `'DDDD'` weekday, full name
- `'hh'`   hours
- `'mm'`   minutes
- `'ss'`   seconds

```
const date = formatDate('en', '', 'YYYY', new Date());   // 2020
```
*/

const formatDate = curry$1(function (timezone, locale, format, date) {
	return format === 'ISO' ?
		formatDateISO(parseDate(date)) :
	timezone === 'local' ?
		formatDateLocal(format, locale, date) :
	_formatDate(format, timezone, locale, parseDate(date)) ;
});


// Time

// Decimal places to round to when comparing times
var precision = 9;
function minutesToSeconds(n) { return n * 60; }
function hoursToSeconds(n) { return n * 3600; }

function secondsToMilliseconds(n) { return n * 1000; }
function secondsToMinutes(n) { return n / 60; }
function secondsToHours(n) { return n / 3600; }
function secondsToDays(n) { return n / 86400; }
function secondsToWeeks(n) { return n / 604800; }

/* Months and years are not fixed durations – these are approximate */
function secondsToMonths(n) { return n / 2629800; }
function secondsToYears(n) { return n / 31557600; }


function prefix(n) {
	return n >= 10 ? '' : '0';
}

// Hours:   00-23 - 24 should be allowed according to spec
// Minutes: 00-59 -
// Seconds: 00-60 - 60 is allowed, denoting a leap second

//                sign   hh       mm           ss
var rtime     = /^([+-])?(\d{2,}):([0-5]\d)(?::((?:[0-5]\d|60)(?:.\d+)?))?$/;
var rtimediff = /^([+-])?(\d{2,}):(\d{2,})(?::(\d{2,}(?:.\d+)?))?$/;

/*
parseTime(time)

Where `time` is a string it is parsed as a time in ISO time format: as
hours `'13'`, with minutes `'13:25'`, with seconds `'13:25:14'` or with
decimal seconds `'13:25:14.001'`. Returns a number in seconds.

```
const time = parseTime('13:25:14.001');   // 48314.001
```

Where `time` is a number it is assumed to represent a time in seconds
and is returned directly.

```
const time = parseTime(60);               // 60
```
*/

const parseTime = overload(toType, {
	number:  id,
	string:  exec$1(rtime, createTime),
	default: function(object) {
		throw new Error('parseTime() does not accept objects of type ' + (typeof object));
	}
});

var parseTimeDiff = overload(toType, {
	number:  id,
	string:  exec$1(rtimediff, createTime),
	default: function(object) {
		throw new Error('parseTime() does not accept objects of type ' + (typeof object));
	}
});

var _floorTime = choose({
	week:   function(time) { return time - mod(604800, time); },
	day:    function(time) { return time - mod(86400, time); },
	hour:   function(time) { return time - mod(3600, time); },
	minute: function(time) { return time - mod(60, time); },
	second: function(time) { return time - mod(1, time); }
});


function createTime(match, sign, hh, mm, sss) {
	var time = hoursToSeconds(parseInt(hh, 10))
        + (mm ? minutesToSeconds(parseInt(mm, 10))
            + (sss ? parseFloat(sss, 10) : 0)
        : 0) ;

	return sign === '-' ? -time : time ;
}

function formatTimeString(string, time) {
	return string.replace(rtoken, function($0) {
		return timeFormatters[$0] ? timeFormatters[$0](time) : $0 ;
	}) ;
}

function _formatTimeISO(time) {
	var sign = time < 0 ? '-' : '' ;

	if (time < 0) { time = -time; }

	var hours = Math.floor(time / 3600);
	var hh = prefix(hours) + hours ;
	time = time % 3600;
	if (time === 0) { return sign + hh + ':00'; }

	var minutes = Math.floor(time / 60);
	var mm = prefix(minutes) + minutes ;
	time = time % 60;
	if (time === 0) { return sign + hh + ':' + mm; }

	var sss = prefix(time) + toMaxDecimals(precision, time);
	return sign + hh + ':' + mm + ':' + sss;
}

function toMaxDecimals(precision, n) {
	// Make some effort to keep rounding errors under control by fixing
	// decimals and lopping off trailing zeros
	return n.toFixed(precision).replace(/\.?0+$/, '');
}

/*
formatTime(format, time)
Formats `time` (an 'hh:mm:sss' time string or a number in seconds) to match
`format`, a string that may contain the tokens:

- `'±'`   Sign, renders '-' if time is negative, otherwise nothing
- `'Y'`   Years, approx.
- `'M'`   Months, approx.
- `'MM'`  Months, remainder from years (max 12), approx.
- `'w'`   Weeks
- `'ww'`  Weeks, remainder from months (max 4)
- `'d'`   Days
- `'dd'`  Days, remainder from weeks (max 7)
- `'h'`   Hours
- `'hh'`  Hours, remainder from days (max 24), 2-digit format
- `'m'`   Minutes
- `'mm'`  Minutes, remainder from hours (max 60), 2-digit format
- `'s'`   Seconds
- `'ss'`  Seconds, remainder from minutes (max 60), 2-digit format
- `'sss'` Seconds, remainder from minutes (max 60), fractional
- `'ms'`  Milliseconds, remainder from seconds (max 1000), 3-digit format

```
const time = formatTime('±hh:mm:ss', 3600);   // 01:00:00
```
*/

var timeFormatters = {
	'±': function sign(time) {
		return time < 0 ? '-' : '';
	},

	Y: function Y(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToYears(time));
	},

	M: function M(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToMonths(time));
	},

	MM: function MM(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToMonths(time % 31557600));
	},

	W: function W(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToWeeks(time));
	},

	WW: function WW(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToDays(time % 2629800));
	},

	d: function dd(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToDays(time));
	},

	dd: function dd(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToDays(time % 604800));
	},

	h: function hhh(time) {
		time = time < 0 ? -time : time;
		return Math.floor(secondsToHours(time));
	},

	hh: function hh(time) {
		time = time < 0 ? -time : time;
		var hours = Math.floor(secondsToHours(time % 86400));
		return prefix(hours) + hours;
	},

	m: function mm(time) {
		time = time < 0 ? -time : time;
		var minutes = Math.floor(secondsToMinutes(time));
		return prefix(minutes) + minutes;
	},

	mm: function mm(time) {
		time = time < 0 ? -time : time;
		var minutes = Math.floor(secondsToMinutes(time % 3600));
		return prefix(minutes) + minutes;
	},

	s: function s(time) {
		time = time < 0 ? -time : time;
		return Math.floor(time);
	},

	ss: function ss(time) {
		time = time < 0 ? -time : time;
		var seconds = Math.floor(time % 60);
		return prefix(seconds) + seconds;
	},

	sss: function sss(time) {
		time = time < 0 ? -time : time;
		var seconds = time % 60;
		return prefix(seconds) + toMaxDecimals(precision, seconds);
	},

	ms: function ms(time) {
		time = time < 0 ? -time : time;
		var ms = Math.floor(secondsToMilliseconds(time % 1));
		return ms >= 100 ? ms :
			ms >= 10 ? '0' + ms :
				'00' + ms;
	}
};

const formatTime = curry$1(function(string, time) {
	return string === 'ISO' ?
		_formatTimeISO(parseTime(time)) :
		formatTimeString(string, parseTime(time)) ;
});

/*
addTime(time1, time2)
Sums `time2` and `time1`, returning UNIX time as a number in seconds.
If `time1` is a string, it is parsed as a duration, where numbers
are accepted outside the bounds of 0-24 hours or 0-60 minutes or seconds.
For example, to add 72 minutes to a list of times:

```
const laters = times.map(addTime('00:72'));
```
*/

const addTime = curry$1(function(time1, time2) {
	return parseTime(time2) + parseTimeDiff(time1);
});

const subTime = curry$1(function(time1, time2) {
	return parseTime(time2) - parseTimeDiff(time1);
});

const diffTime = curry$1(function(time1, time2) {
	return parseTime(time1) - parseTime(time2);
});

/*
floorTime(token, time)
Floors `time` to the nearest `token`, where `token` is one of: `'week'`, `'day'`,
`'hour'`, `'minute'` or `'second'`. `time` may be an ISO time string or a time
in seconds. Returns a time in seconds.

```
const hourCounts = times.map(floorTime('hour'));
```
*/

const floorTime = curry$1(function(token, time) {
	return _floorTime(token, parseTime(time));
});

var rcomment = /\s*\/\*([\s\S]*)\*\/\s*/;

var domify = overload(toType$1, {
	'string': createArticle,

	'function': function(template, name, size) {
		return createArticle(multiline(template), name, size);
	},

	'default': function(template) {
		// WHAT WHY?
		//var nodes = typeof template.length === 'number' ? template : [template] ;
		//append(nodes);
		//return nodes;
	}
});

var browser = /firefox/i.test(navigator.userAgent) ? 'FF' :
	document.documentMode ? 'IE' :
	'standard' ;

const createSection = cache(function createSection() {
	const section = document.createElement('section');
	section.setAttribute('class', 'test-section');
	document.body.appendChild(section);
	return section;
});

function createArticle(html, name, size) {
	const section = createSection();

	const article = document.createElement('article');
	article.setAttribute('class', 'span-' + (size || 2) + '-test-article test-article');

	const title = document.createElement('h2');
	title.setAttribute('class', 'test-title');
	title.innerHTML = name;

	const div = document.createElement('div');
	div.setAttribute('class', 'test-fixture');

	div.innerHTML = html;
	article.appendChild(title);
	article.appendChild(div);
	section.appendChild(article);

	return {
		section: section,
		article: article,
		title:   title,
		fixture: div
	};
}

function multiline(fn) {
	if (typeof fn !== 'function') { throw new TypeError('multiline: expects a function.'); }
	var match = rcomment.exec(fn.toString());
	if (!match) { throw new TypeError('multiline: comment missing.'); }
	return match[1];
}

function toType$1(object) {
	return typeof object;
}

// #e2006f
// #332256

if (window.console && window.console.log) {
    window.console.log('%cFn%c          - https://github.com/stephband/fn', 'color: #de3b16; font-weight: 600;', 'color: inherit; font-weight: 400;');
}
const requestTime$1 = curry$1(requestTime, true, 2);
const and     = curry$1(function and(a, b) { return !!(a && b); });
const or      = curry$1(function or(a, b) { return a || b; });
const xor     = curry$1(function xor(a, b) { return (a || b) && (!!a !== !!b); });
const assign$3  = curry$1(Object.assign, true, 2);
const define  = curry$1(Object.defineProperties, true, 2);

const by$1          = curry$1(by, true);
const byAlphabet$1  = curry$1(byAlphabet);

const ap$1          = curry$1(ap, true);
const concat$1      = curry$1(concat, true);
const contains$1    = curry$1(contains, true);
const each$1        = curry$1(each, true);
const filter$1      = curry$1(filter, true);
const find$1        = curry$1(find, true);
const map$1         = curry$1(map, true);
const reduce$2      = curry$1(reduce, true);
const remove$1      = curry$1(remove, true);
const rest$1        = curry$1(rest, true);
const slice$1       = curry$1(slice, true, 3);
const sort$1        = curry$1(sort, true);
const insert$1      = curry$1(insert, true);
const take$1        = curry$1(take, true);
const update$1      = curry$1(update, true);

const diff$2        = curry$1(diff, true);
const intersect$1   = curry$1(intersect, true);
const unite$1       = curry$1(unite, true);

const sum$1         = curry$1(sum);

const add         = curry$1(function(a, b) {
    console.trace('Fn module add() is now sum()');
    return sum(a, b);
});

const multiply$1    = curry$1(multiply);
const min$1         = curry$1(min);
const max$1         = curry$1(max);
const mod$1         = curry$1(mod);
const pow$1         = curry$1(pow);
const exp$1         = curry$1(exp);
const log$2         = curry$1(log$1);
const gcd$1         = curry$1(gcd);
const lcm$1         = curry$1(lcm);
const root$1        = curry$1(root);
const limit$1       = curry$1(limit);
const wrap$1        = curry$1(wrap);
const factorise$1   = curry$1(factorise);
const cubicBezier$3 = curry$1(cubicBezier);
const normalise   = curry$1(choose(normalisers), false, 4);
const denormalise = curry$1(choose(denormalisers), false, 4);
const exponentialOut$1 = curry$1(exponentialOut);

// Handle user media streams

let mediaRequest;

function requestMedia() {
    if (!mediaRequest) {
        mediaRequest = new Promise(function(accept, reject) {
            return navigator.getUserMedia ?
                navigator.getUserMedia({
                    audio: { optional: [{ echoCancellation: false }] }
                }, accept, reject) :
                reject({
                    message: 'navigator.getUserMedia: ' + !!navigator.getUserMedia
                });
        });
    }

    return mediaRequest;
}

var inputRequests = new WeakMap();

function requestInputSplitter(context) {
    var request = inputRequests.get(context);

    if (!request) {
        request = requestMedia().then(function(stream) {
            var source       = context.createMediaStreamSource(stream);
            var splitter     = context.createChannelSplitter(source.channelCount);

            source.connect(splitter);
            return splitter;
        });

        inputRequests.set(context, request);
    }

    return request;
}

// Safari still requires a prefixed AudioContext
window.AudioContext = window.AudioContext || window.webkitAudioContext;

// Crude polyfill for systems without getOutputTimeStamp()
if (!AudioContext.prototype.getOutputTimestamp) {
    AudioContext.prototype.getOutputTimestamp = function() {
        return {
            contextTime:     this.currentTime + this.outputLatency,
            performanceTime: window.performance.now()
        };
    };
}

const context = new window.AudioContext();
context.destination.channelInterpretation = "discrete";
context.destination.channelCount = context.destination.maxChannelCount;

if (!context.baseLatency) {
    // Assume 128 * 2 buffer length, as it is in Chrome on MacOS
    context.baseLatency = 256 / context.sampleRate;
}

if (!context.outputLatency) {
    // Just a quick guess.
    // You'll never get this on Windows, more like 0.02 - no ASIO drivers, see.
    context.outputLatency = 128 / context.sampleRate;
}

/*
In Chrome (at least) contexts are suspended by default according to
Chrome's autoplay policy:

https://developers.google.com/web/updates/2018/11/web-audio-autoplay
*/

if (context.state === 'suspended') {
    print('Audio context suspended', 'User interaction required');

    // Listen for user events, resume the context when one is detected.
    const types = ['mousedown', 'keydown', 'touchstart', 'contextmenu'];

    const add = (fn, type) => {
        document.addEventListener(type, fn);
        return fn;
    };

    const remove = (fn, type) => {
        document.removeEventListener(type, fn);
        return fn;
    };

    types.reduce(add, function fn(e) {
        context
        .resume()
        .then(function() {
            print('Audio context resumed on "' + e.type + '"');
            types.reduce(remove, fn);
        });
    });
}

function stampTimeAtDomTime(stamp, domTime) {
    return stamp.contextTime + (domTime - stamp.performanceTime) / 1000;
}

function timeAtDomTime(context, domTime) {
    var stamp = context.getOutputTimestamp();
    return stampTimeAtDomTime(stamp, domTime);
}

function domTimeAtTime$1(context, time) {
    var stamp = context.getOutputTimestamp();
    return stamp.performanceTime + (time - stamp.contextTime) * 1000;
}

function _getOutputLatency(stamps, context) {
    // In order to play back live controls without jitter we must add
    // a latency to them to push them beyond currentTime.
    // AudioContext.outputLatency is not yet implemented so we need to
    // make a rough guess. Here we track the difference between contextTime
    // and currentTime, ceil to the nearest 32-sample block and use that –
    // until we detect a greater value.

    const contextTime = stamps.contextTime;
    const currentTime = context.currentTime;

    if (context._outputLatency === undefined || currentTime - contextTime > context._outputLatency) {
        const diffTime = currentTime - contextTime;
        const blockTime = 32 / context.sampleRate;

        // Cache outputLatency on the context as a stop-gap measure
        context._outputLatency = Math.ceil(diffTime / blockTime) * blockTime;

        // Let's keep tabs on how often this happens
        print('Output latency changed to', Math.round(context._outputLatency * context.sampleRate) + ' samples (' + context._outputLatency.toFixed(3) + 's @ ' + context.sampleRate + 'Hz)');
    }

    return context._outputLatency;
}

function getContextTime(context, domTime) {
    const stamp = context.getOutputTimestamp();
    const time = stampTimeAtDomTime(stamp, domTime);
    const outputLatency = _getOutputLatency(stamp, context);
    return time + outputLatency;
}

class Meter extends window.AudioWorkletNode {
    constructor(context, settings) {
        super(context, 'meter');

        /*
        .peaks
        Peak level readout per channel.
        */

        this.peaks = [];

        this.port.onmessage = (e) => {
//            let p = e.data.peaks.length;
//
//            while (p--) {
//                e.data.peaks[p] = this.peaks[p] * decay > e.data.peaks[p] ?
//                    this.peaks[p] * decay :
//                     e.data.peaks[p] ;
//            }

            this.peaks = e.data.peaks;
        };

        // It's ok, this doesn't emit anything
        this.connect(context.destination);
    }
}

Meter.preload = function(base, context) {
    return context
    .audioWorklet
    .addModule(base + '/nodes/meter.worklet.js');
};

var config = {
    // The maximum number of channels for the output node, a merger, of a
    // soundstage instance. If audioContext.destination's maxChannelCount
    // is lower, the output channelCount is set to that instead
    channelCountLimit: 12,

    // Path used by various modules to find and load their web workers, as
    // web workers require paths relative to the base document
    basePath: window.soundstageBasePath || '/soundstage/',

    // Expando names added to AudioParams in order to help observe
    // value changes
    automationEventsKey: 'automationEvents',
    animationFrameKey: 'animationFrame',

    // Value considered to be 0 for the purposes of scheduling
    // exponential curves.
    minExponentialValue: 1.40130e-45,

    // Multiplier for duration of target events indicating roughly when
    // they can be considered 'finished'
    targetDurationFactor: 9
};

// 60 frames/sec frame rate
const frameDuration = 1000 / 60;

function isAudioParam(object) {
    return window.AudioParam && window.AudioParam.prototype.isPrototypeOf(object);
}

function getAutomation(param) {

    // Todo: I would love to use a WeakMap to store data about AudioParams,
    // but FF refuses to allow AudioParams as WeakMap keys. So... lets use
    // an expando.
    return param[config.automationEventsKey] || (param[config.automationEventsKey] = []);
}


// Automate audio param

const validateParamEvent = overload(get$1(1), {
    "target": function(event) {
        if (event[3] === undefined) {
            throw new Error('Event "target" must have 2 parameters: [time, "target", value, duration]');
        }
    },

    "hold": function(event) {
        // ????
        if (event[2] !== undefined) {
            throw new Error('Event "hold" takes 0 parameters: [time, "hold"]');
        }
    },

    default: function(event) {
        if (event[2] === undefined) {
            throw new Error('Event "' + event[1] + '" must have 1 parameter: [time, "' + event[1] + '", value]');
        }
    }
});

function holdFn(param, event) {
    // Cancel values
    param.cancelScheduledValues(event.time);

    // Set a curve of the same type as the next to this time and value
    if (event.curve === 'linear') {
        param.linearRampToValueAtTime(event.value, event.time);
    }
    else if (event.curve === 'exponential') {
        param.exponentialRampToValueAtTime(event.value, event.time);
    }
    else if (event.curve === 'step') {
        param.setValueAtTime(event.value, event.time);
    }
}

const curves = {
    'step':        (param, event) => param.setValueAtTime(event.value, event.time),
    'linear':      (param, event) => param.linearRampToValueAtTime(event.value, event.time),
    'exponential': (param, event) => param.exponentialRampToValueAtTime(event.value, event.time),
    'target':      (param, event) => param.setTargetAtTime(event.value, event.time, event.duration),
    'curve':       (param, event) => param.setValueCurveAtTime(event.value, event.time, event.duration),
    'hold': AudioParam.prototype.cancelAndHoldAtTime ?
        function hold(param, event, event1) {
            // Work around a Chrome bug where target curves are not
            // cancelled by hold events inserted in front of them:
            // https://bugs.chromium.org/p/chromium/issues/detail?id=952642&q=cancelAndHoldAtTime&colspec=ID%20Pri%20M%20Stars%20ReleaseBlock%20Component%20Status%20Owner%20Summary%20OS%20Modified
            if (event1 && event1.curve === 'target') {
                return holdFn(param, event);
            }

            param.cancelAndHoldAtTime(event.time);
        } :

        holdFn
};

const createEvent = overload(id, {
    'exponential': (curve, param, event0, event1, time, value) => {
        // Make an event object to be stored in param$automationEvents
        const event = {
            time:  time,
            value: Math.fround(value)
        };

        // Deal with exponential curves starting or ending with value 0. Swap them
        // for step curves, which is what they tend towards for low values.
        // Todo: deal with -ve values.
        if (event.value <= config.minExponentialValue) {
            event.time  = event0 ? event0.time : 0 ;
            event.curve = "step";
        }
        else if (event0 && event0.value < config.minExponentialValue) {
            event.curve = "step";
        }
        else {
            event.curve = "exponential";
        }

        return event;
    },

    'hold': function(curve, param, event0, event1, time) {
        // Set a curve of the same type as the next to this time and value
        return event1 && event1.curve === 'linear' ? {
            time:  time,
            curve: 'linear',
            value: Math.fround(getValueBetweenEvents(event0, event1, time))
        } :

        event1 && event1.curve === 'exponential' ? {
            time:  time,
            curve: 'exponential',
            value: Math.fround(getValueBetweenEvents(event0, event1, time))
        } :

        event0 && event0.curve === 'target' ? {
            time:  time,
            curve: 'step',
            value: getValueAtTime(param, time)
        } : {
            time: time
        } ;
    },

    'target': (curve, param, event0, event1, time, value, duration) => {
        return {
            time:     time,
            curve:    'target',
            value:    Math.fround(value),
            duration: duration
        };
    },

    'default': (curve, param, event0, event1, time, value, duration) => {
        return {
            time:     time,
            curve:    curve,
            value:    Math.fround(value)
        };
    }
});

const mutateEvents = choose({
    'hold': function(event1, event, events, n) {
        // Throw away following events
        events.length = n + 1;

        // Push in the replacement curve where there is one
        if (event.curve) {
            events.push(event);
        }
    },

    'default': function(event1, event, events, n) {
        // If the new event is at the end of the events list
        if (!event1) {
            events.push(event);
            return;
        }

        // Where the new event is at the same time as an existing event...
        if (event1.time === event.time) {
            // scan forward through events at this time...
            while (events[++n] && events[n].time === event.time) {
                // and if an event with the same curve is found, replace it...
                if (events[n].curve === event.curve) {
                    events.splice(n, 1, event);
                    return;
                }
            }

            // or tack it on the end of those events.
            events.splice(n, 0, event);
            return;
        }

        // The new event is between event1 and event2
        events.splice(n + 1, 0, event);
    }
});

function automateParamEvents(param, events, time, curve, value, duration) {
    var n = events.length;
    while (events[--n] && events[n].time >= time);

    // Before and after events
    const event0 = events[n];
    const event1 = events[n + 1];

    // Create an event where needed
    const event = createEvent(curve, param, event0, event1, time, value, duration);

    // Automate the change based on the requested curve. Note that the
    // event has been mutated to reflect any curve we may bifurcate
    curves[curve](param, event, event1);

    // Update the events list
    mutateEvents(curve, event1, event, events, n);
}

/*
automate(param, time, value, curve, decay)

param - AudioParam object
time  -
value -
curve - one of 'step', 'hold', 'linear', 'exponential' or 'target'
decay - where curve is 'target', decay is a time constant for the decay curve
*/

function automate(param, time, curve, value, duration, notify, context) {
    if (curve === 'target' && duration === undefined) {
        throw new Error('Automation curve "target" must have a duration');
    }

    const events = getAutomation(param);
    automateParamEvents(param, events, time, curve, value, duration);

    if (!notify) {
        return;
    }

    if (!context) {
        return;
    }

    // If param is flagged as already notifying, do nothing
    if (param[config.animationFrameId]) {
        return;
    }

    var n = -1;

    function frame(time) {
        // Notify at 1/3 frame rate
        n = (n + 1) % 3;
        if (n === 0) {
            param[config.animationFrameId] = requestAnimationFrame(frame);
            return;
        }

        const renderTime  = time + frameDuration;
        const outputTime  = timeAtDomTime(context, renderTime);
        const outputValue = getValueAtTime(param, outputTime);
        const lastEvent   = events[events.length - 1];

        // If outputTime is not yet beyond the end of the events list
        param[config.animationFrameId] = lastEvent && outputTime <= lastEvent.time ?
            requestAnimationFrame(frame) :
            undefined ;

        notify(param, 'value', outputValue);
    }

    param[config.animationFrameId] = requestAnimationFrame(frame);
}


/*
automato__(node, name, time, curve, value, duration, notify)

param    - AudioParam object
time     -
value    -
curve    - one of 'step', 'hold', 'linear', 'exponential' or 'target'
duration - where curve is 'target', decay is a time constant for the decay
notify   - a callback function
*/

function automato__(node, name, time, curve, value, duration, notify) {
    if (curve === 'target' && duration === undefined) {
        throw new Error('Automation curve "target" must have a duration');
    }

    const param  = node[name];
    const events = getAutomation(param);
    automateParamEvents(param, events, time, curve, value, duration);

    if (!notify) {
        return;
    }

    // If param is flagged as already notifying, do nothing
    if (param[config.animationFrameId]) {
        return;
    }

    var n = -1;

    function frame(time) {
        // Notify at 1/3 frame rate
        n = (n + 1) % 3;
        if (n === 0) {
            param[config.animationFrameId] = requestAnimationFrame(frame);
            return;
        }

        const renderTime  = time + frameDuration;
        const outputTime  = timeAtDomTime(node.context, renderTime);
        const outputValue = getValueAtTime(param, outputTime);
        const lastEvent   = events[events.length - 1];

        // If outputTime is not yet beyond the end of the events list
        param[config.animationFrameId] = lastEvent && outputTime <= lastEvent.time ?
            requestAnimationFrame(frame) :
            undefined ;

        notify(node, name, outputValue);
    }

    param[config.animationFrameId] = requestAnimationFrame(frame);
}

// Get audio param value at time

const interpolate = {
    // Automation curves as described at:
    // http://webaudio.github.io/web-audio-api/#h4_methods-3

    'step': function stepValueAtTime(value1, value2, time1, time2, time) {
        return time < time2 ? value1 : value2 ;
    },

    'linear': function linearValueAtTime(value1, value2, time1, time2, time) {
        return value1 + (value2 - value1) * (time - time1) / (time2 - time1) ;
    },

    'exponential': function exponentialValueAtTime(value1, value2, time1, time2, time) {
        return value1 * Math.pow(value2 / value1, (time - time1) / (time2 - time1)) ;
    },

    'target': function targetEventsValueAtTime(value1, value2, time1, time2, time, duration) {
        return time < time2 ?
            value1 :
            value2 + (value1 - value2) * Math.pow(Math.E, (time2 - time) / duration);
    },

    'curve': function(value1, value2, time1, time2, time, duration) {
        // Todo
    }
};

function getValueBetweenEvents(event1, event2, time) {
    return interpolate[event2.curve](event1.value, event2.value, event1.time, event2.time, time, event1.duration);
}

function getEventsValueAtEvent(events, n, time) {
    var event = events[n];
    return event.curve === "target" ?
        interpolate.target(getEventsValueAtEvent(events, n - 1, event.time), event.value, 0, event.time, time, event.duration) :
        event.value ;
}

function getEventsValueAtTime(events, time) {
    var n = events.length;

    while (events[--n] && events[n].time >= time);

    var event0 = events[n];
    var event1 = events[n + 1];

    // Time is before the first event in events
    if (!event0) {
        return 0;
    }

    // Time is at or after the last event in events
    if (!event1) {
        return getEventsValueAtEvent(events, n, time);
    }

    if (event1.time === time) {
        // Scan through to find last event at this time
        while (events[++n] && events[n].time === time);
        return getEventsValueAtEvent(events, n - 1, time) ;
    }

    if (time < event1.time) {
        return event1.curve === "linear" || event1.curve === "exponential" ?
            getValueBetweenEvents(event0, event1, time) :
            getEventsValueAtEvent(events, n, time) ;
    }
}

function getValueAtTime(param, time) {
    var events = getAutomation(param);

    if (!events || events.length === 0) {
        return param.value;
    }

    // Round to 32-bit floating point
    return Math.fround(getEventsValueAtTime(events, time));
}

function sourceToString(node) {
    return node.constructor.name.replace(/Node$/, '')
    + (' ('
    + node.numberOfOutputs + ' output' + (node.numberOfOutputs === 1 ? '' : 's')
    //+ ', '
    //+ (
    //    node.channelCountMode === 'max' ? 'max' :
    //    node.channelCountMode === 'explicit' ? node.channelCount :
    //    (node.channelCount + ' ' + node.channelCountMode)
    //)
    //+ ' ch'
    + ')');
}

function targetToString(node) {
    return node.constructor.name.replace(/Node$/, '')
    + (node.setValueAtTime ? '' : ' ('
    + node.numberOfInputs + ' input' + (node.numberOfInputs === 1 ? ', ' : 's, ')
    + (
        node.channelCountMode === 'max' ? 'max' :
        node.channelCountMode === 'explicit' ? node.channelCount :
        (node.channelCount + ' ' + node.channelCountMode)
    )
    + ' ch, '
    + node.channelInterpretation
    + ')');
}

function connect(source, target, sourceChan, targetChan) {
    if (!source) {
        { throw new Error('Trying to connect to source ' + source); }
        return;
    }

    if (!target) {
        { throw new Error('Trying to connect to target ' + target); }
        return;
    }

    if (!isAudioParam(target) && !target.numberOfInputs) {
        { throw new Error('Trying to connect target with no inputs.'); }
        return;
    }

    if (isDefined(sourceChan)) {
        if (sourceChan >= source.numberOfOutputs) {
            {
                throw new Error('Cannot .connect() from a non-existent output (' +
                    sourceChan + ') on output node {numberOfOutputs: ' + source.numberOfOutputs);
            }
            return;
        }

        if (isDefined(targetChan)) {
            if (targetChan >= target.numberOfInputs) {
                print('Trying to .connect() to a non-existent input (' +
                    targetChan + ') on input node {numberOfInputs: ' + target.numberOfInputs + '}. Dropping connection.');
                return;
            }
        }

        source.connect(target, sourceChan, targetChan);
        { log('connect', '', sourceToString(source), sourceChan, '–', targetToString(target), targetChan); }
    }
    else if (isDefined(targetChan)) {
        sourceChan = 0;

        if (targetChan >= target.numberOfInputs) {
            print('Trying to .connect() to a non-existent input (' +
                targetChan + ') on input node {numberOfInputs: ' + target.numberOfInputs + '}. Dropping connection.');
            return;
        }

        source.connect(target, sourceChan, targetChan);
        { log('connect', '', sourceToString(source), sourceChan, '–', targetToString(target), targetChan); }
    }
    else {
        source.connect(target);
        { log('connect', '', sourceToString(source), '–', targetToString(target)); }
    }

    // Indicate successful connection (we hope)
    return true;
}

function disconnect(source, target, sourceChan, targetChan, connections) {
    if (!source) {
        print('Trying to .disconnect() from an object without output "' + outName + '".');
        return;
    }

    if (!target) {
        print('disconnected', source.id, source.object, target.id, target.object);
        return;
    }

    //if (features.disconnectParameters) {
        source.disconnect(target, sourceChan, targetChan);
    //}
    //else {
    //    if (connections) {
    //        disconnectDestination(source, outName, outputNode, inputNode, outputNumber, inputNumber, connections);
    //    }
    //    else {
    //        print('Cant disconnect when features.disconnectParameters is false and connections object is not passed to disconenct.')
    //        return;
    //    }
    //}

    // Indicate successful disconnection (we hope)
    return true;
}

const assign$4 = Object.assign;
const define$1 = Object.defineProperties;
const seal   = Object.seal;

function createNode(context, type, settings) {
    const node = new constructors$1[type](context, settings);
    return node;
}

function createConnection(nodes, data) {
    // Split paths such as env.gain.0 to ['env', 'gain', 0]
    const srcPath = data.source.split('.');
    const srcLast = srcPath[srcPath.length - 1];
    let srcChan;

    if (srcPath.length > 1 && /^\d+$/.test(srcLast)) {
        srcChan = parseInt(srcLast, 10);
        srcPath.length--;
    }

    const source  = nodes[srcPath[0]];

    const tgtPath = data.target.split('.');
    const tgtLast = tgtPath[tgtPath.length - 1];
    let tgtChan;

    if (/^\d+$/.test(tgtLast)) {
        tgtChan = parseInt(tgtLast, 10);
        tgtPath.length--;
    }

    const target  = tgtPath[1] ?
        nodes[tgtPath[0]][tgtPath[1]] :
        nodes[tgtPath[0]] ;

    if (tgtChan !== undefined && srcChan === undefined) {
        throw new Error('Cannot .connect() to target channel from undefined source channel.')
    }

    // There is a special case when source is 'this'. NodeGraph overwrites
    // the node's .connect() method, but we need the original .connect()
    // because we don't want the output of the graph, but the output of this.
    if (srcPath[0] === 'this') {
        AudioNode.prototype.connect.call(source, target, srcChan, tgtChan);
    }
    else {
        connect(source, target, srcChan, tgtChan);
    }

    return nodes;
}

function NodeGraph(context, data) {

    const privates$1 = privates(this);
    privates$1.outputId = data.output || 'output' ;

    // Create nodes
    const nodes = privates$1.nodes = data.nodes && data.nodes.reduce(function(nodes, data) {
        nodes[data.id] = createNode(context, data.type, data.data);
        return nodes;
    }, {});

    // Include this in the graph if it is an audio node
    if (AudioNode.prototype.isPrototypeOf(this)) {
        nodes['this'] = this;
    }

    // Otherwise make it quack like an audio node
    else {
        const output = nodes[privates$1.outputId];
        define$1(this, {

            /*
            .context
            The AudioContext object.
            */

            context: { value: context },

            /*
            .numberOfOutputs
            The number of outputs.
            */

            numberOfOutputs: { value: output ? output.numberOfOutputs : 0 }
        });
    }

    if (data.params) {
        console.warn('Graph "params" is now "properties"', data);
        data.properties = data.params;
    }

    if (data.properties) {
        Object.entries(data.properties).forEach((entry) => {
            const prop = entry[0];
            const path = entry[1].split('.');
            const node = nodes[path[0]];
            const name = path[1];
            const param = node[name];

            if (!(name in node)) {
                console.warn('Property "'+ name +'" not found in node.');
            }

            Object.defineProperty(this, prop, param.setValueAtTime ? {
                // Property is an AudioParam
                value: param,
                enumerable: true
            } : {
                // Property is a getter/setter proxy to the original property
                get: () => node[name],
                set: (value) => node[name] = value,
                enumerable: true
            });
        });
    }

    seal(nodes);
    data.connections && data.connections.reduce(createConnection, nodes);
}

assign$4(NodeGraph.prototype, {

    /*
    .connect(target)
    Connect node to target. In Soundstage calling this method directly is
    discouraged: the graph cannot track changes to your connections if you use
    it. Instead, call `stage.createConnection(node, target)`.
    */

    connect: function() {
        const privates$1 = privates(this);
        const output = this.get(privates$1.outputId);
        return output.connect.apply(output, arguments);
    },

    /*
    .disconnect(target)
    Disconnect node from target. In Soundstage calling this method directly is
    discouraged: the graph cannot track changes to your connections if you use
    it. Instead, call `stage.removeConnection(node, target)`.
    */

    disconnect: function() {
        const privates$1 = privates(this);
        const output = this.get(privates$1.outputId);
        return output.disconnect.apply(output, arguments);
    },

    /*
    .get(id)
    Returns a child node by its id.
    */

    get: function(id) {
        const privates$1 = privates(this);
        return privates$1.nodes && privates$1.nodes[id];
    }
});

const assign$5    = Object.assign;
const define$2    = Object.defineProperties;

function Entry(graph, type, node) {
    this.type = type;
    this.node = node;

    define$2(this, {
        graph: { value: graph }
    });
}

assign$5(Entry.prototype, {
    remove: function() {
        const nodes = this.graph.nodes;
        const i = nodes.indexOf(this);

        const prev = nodes[i - 1] ?
            nodes[i - 1].node :
            this.graph ;

        const next = nodes[i + 1] ?
            nodes[i + 1].node :
            this.graph.get('output') ;

        prev.disconnect();
        prev.connect(next);
        this.node.disconnect();
        nodes.splice(i, 1);

        return this;
    }
});

function Chain(context, data, transport, constructors) {
	const chain       = this;
	const privates$1    = privates(this);
    const nodes       = [];

	privates$1.requests = constructors;
	privates$1.transport = transport;

	define$2(this, {
        nodes: { enumerable: true, value: nodes }
    });

    // Load nodes
	if (data.nodes) {
        data.nodes.reduce(function(graph, data) {
            const node = new constructors[data.type](graph.context, data.node, transport);
            nodes.push(new Entry(graph, data.type, node));
            return graph;
        }, this);
    }

    // Chain the connection of sources, reducing to the last one
    // and connecting that to output
    this.nodes
    .map(get$1('node'))
    .reduce((current, next) => {
        AudioNode.prototype.connect.call(current, next);
        return next;
    }, this)
    .connect(this.get('output'));

    print('chain', chain.nodes.length + ' nodes');

	//this.done = promise.then.bind(promise);
}

assign$5(Chain.prototype, {
	createNode: function(type, data) {
		const chain     = this;
		const privates$1  = privates(this);
		const constructors  = privates$1.constructors;
		const transport = privates$1.transport;

        const node = new constructors[data.type](chain.context, data.node, transport);
        const last = chain.nodes.length ?
            chain.nodes[chain.nodes.length - 1] :
            chain ;

        AudioNode.prototype.connect.call(node, this.get('output'));
        AudioNode.prototype.disconnect.call(last);
        AudioNode.prototype.connect.call(last, node);

        const entry = new Entry(chain, type, node);
        this.nodes.push(entry);

        return node;
	}
});

function assignSetting(node, key, value, notify) {
    // Are we trying to get a value from an AudioParam? No no no.
    if (value && value.setValueAtTime) {
        return;
        //throw new Error('Cannot set ' + key + ' from param on node ' + JSON.stringify(node));
    }

    // Does it quack like an AudioParam?
    if (node[key] && node[key].setValueAtTime) {
        { log('param', key + ':', value); }

        // If we are assigning settings we can assume we are in a state to
        // purge old automation events. Keep an eye, might be a bit aggressive
        getAutomation(node[key]).length = 0;

        // node, name, time, curve, value, duration, notify, context
        automato__(node, key, node.context.currentTime, 'step', value, null, notify);
    }

    // Or an AudioNode?
    else if (node[key] && node[key].connect) {
        assignSettings(node[key], value);
    }

    // Then set it as a property
    else {
        { log('prop', key + ' =', value); }
        node[key] = value;
    }
}

function assignSettings(node, defaults, settings, ignored) {
    { logGroup('assign', node.constructor.name, (settings ? Object.keys(settings).join(', ') : '')); }

    const keys = {};

    if (settings) {
        for (let key in settings) {
            // Ignore ignored key
            if (ignored && ignored.indexOf(key) > -1) { continue; }

            // Ignore AudioParams coming from a parent node
            if (settings[key] && settings[key].setValueAtTime) { continue; }

    		// We want to assign only when a property has been declared, as we may
    		// pass composite options (options for more than one node) into this.
    		if (node.hasOwnProperty(key) && settings[key] !== undefined) {
                assignSetting(node, key, settings[key]);
                keys[key] = true;
            }
    	}
    }

    for (let key in defaults) {
        // Ignore ignored key
        if (ignored && ignored.indexOf(key) > -1) { continue; }

		// If we have already set this, or it's not settable, move on
		if (!keys[key]) {
            assignSetting(node, key, defaults[key]);
        }
	}

    { logGroupEnd(); }
}

function assignSettingz__(node, settings, ignored) {
    { logGroup('assign', node.constructor.name, (settings ? Object.keys(settings).join(', ') : '')); }

    var key;

    for (key in settings) {
        // Ignore ignored key
        if (ignored && ignored.indexOf(key) > -1) { continue; }

        // Ignore AudioParams coming from a parent node
        if (settings[key] && settings[key].setValueAtTime) { continue; }

		// We want to assign only when a property has been declared, as we may
		// pass composite options (options for more than one node) into this.
		if (node.hasOwnProperty(key) && settings[key] !== undefined) {
            assignSetting(node, key, settings[key]);
        }
	}

    { logGroupEnd(); }
}

const assign$6 = Object.assign;

const graph = {
    nodes: [
        { id: 'output', type: 'gain', data: {} }
    ],

    connections: [],

    output: 'output'
};

const defaults = {
    nodes: [{
        type: 'biquad-filter',
        node: {
            type: 'highpass',
            frequency: 80,
            Q: 0.78
        }
    }, {
        type: 'biquad-filter',
        node: {
            type: 'peaking',
            frequency: 240,
            gain: 0
        }
    }, {
        type: 'biquad-filter',
        node: {
            type: 'peaking',
            frequency: 2000,
            gain: 0
        }
    }, {
        type: 'biquad-filter',
        node: {
            type: 'highshelf',
            frequency: 6000,
            gain: 0
        }
    }],

    output: 1
};

const constructors = {
    'biquad-filter': BiquadFilterNode
};

class EQ extends GainNode {
    constructor(context, options, transport) {
        super(context, options);

        // Set up the graph
        NodeGraph.call(this, context, graph);

        this.output = this.get('output').gain;

        assignSettings(this, defaults, options);

        // Set up a nodes chain
        Chain.call(this, context, options || defaults, transport, constructors);
    }
}

assign$6(EQ.prototype, Chain.prototype, NodeGraph.prototype);

const graph$1 = {
    nodes: [
        { id: 'pan', type: 'pan', data: { pan: 0 }}
    ],

    connections: [
        { source: 'this', target: 'pan' }
    ],

    properties: {
        /*
        .gain
        AudioParam controlling gain.
        */

        /*
        .pan
        AudioParam controlling stereo pan position.
        */
        pan: 'pan.pan'
    },

	output: 'pan'
};

class Mix extends GainNode {
    constructor(context, options) {
        // Init gain node
        super(context, options);

        // Set up the node graph
        NodeGraph.call(this, context, graph$1);
    }

    // Inherit from NodeGraph. We don't seem able to do this with Object.assign
    // to prototype. Another stupid limitation of class syntax? Who the hell
    // thought forcing class syntax on AudioNodes was a good idea?
    get() {
        return NodeGraph.prototype.get.apply(this, arguments);
    }

    connect() {
        return NodeGraph.prototype.connect.apply(this, arguments);
    }

    disconnect() {
        return NodeGraph.prototype.disconnect.apply(this, arguments);
    }
}

/*
PlayNode()

A mixin that sets up an object to be playable.

```
// Call the mixin constructor inside your constructor
MyNode() {
    PlayNode.call(this);
}

// Assign its' prototype properties to your object's prototype
Object.assign(MyNode.prototype, PlayNode.prototype);

// Define its' defined properties on your object's prototype
Object.defineProperties(MyNode.prototype, {
    playing: Object.getOwnPropertyDescriptor(PlayNode.prototype, 'playing')
});
```
*/
const assign$7 = Object.assign;
const define$3 = Object.defineProperties;

const properties = {
    /*
    .startTime
    The time at which playback is scheduled to start.
    */

    startTime: { writable: true },

    /*
    .stopTime
    The time at which playback is scheduled to stop.
    */

    stopTime:  { writable: true }
};

function PlayNode() {
    define$3(this, properties);
}

PlayNode.reset = function(node) {
    node.startTime = undefined;
    node.stopTime  = undefined;
    return node;
};

assign$7(PlayNode.prototype, {
    /*
    .start(time)
    Sets `.startTime` to `time`, or where `time` is undefined, to
    `context.currentTime`.

    Returns `this`.
    */

    start: function(time) {

        this.startTime = time || this.context.currentTime;
        return this;
    },

    /*
    .stop(time)
    Sets `.stopTime` to `time` or where `time` is undefined, to
    `context.currentTime`, this time is before `.startTime`, in which case
    `.stopTime` is set equal to `.startTime`.

    Returns `this`.
    */

    stop: function(time) {

        time = time || this.context.currentTime;

        // Clamp stopTime to startTime
        this.stopTime = (this.startTime === undefined || time > this.startTime) ?
            time :
            this.startTime ;

        return this;
    }
});

define$3(PlayNode.prototype, {
    /*
    .playing
    A boolean indicating whether the node is started and playing (`true`) or
    stopped and idle (`false`).
    */

    playing: {
        get: function() {
            return this.startTime !== undefined
            && (this.startTime <= this.context.currentTime)
            && (this.stopTime === undefined
                || this.startTime > this.stopTime
                || this.context.currentTime < this.stopTime
            );
        }
    }
});

const assign$8 = Object.assign;
const define$4 = Object.defineProperties;
const getDefinition = Object.getOwnPropertyDescriptor;

// Time multiplier to wait before we accept target value has 'arrived'
const targetDurationFactor = config.targetDurationFactor;

const properties$1 = {
    /* .attack
    An array of param events describing an arbitrary attack curve for the
    envelope. Param events have the form [time, type, value] (or if type is
    `'target'`, [time, type, value, duration]), where `time` is the time since
    the time passed to `.start(time)`.

    The default envelope value at time `0` is `0`.
    */

    attack:  { writable: true, enumerable: true },

    /* .release
    An array of param events describing the release curve of the envelope. Param
    events have the form [time, type, value] (or if type is `'target'`
    [time, type, value, duration]), where `time` is the time since the time
    passed to `.stop(time)`.

    Values are scaled to the current value of the envelope – if the attack
    envelope decays to a value of `0.5`, say, by the scheduled stop time, all
    values in the release envelope are multiplied by `0.5`. The last event
    should have a value of `0`, otherwise the envelope will never stop.
    */

    release: { writable: true, enumerable: true },

    /* .gain
    A float, nominally in the rage `0–1`, that is read on `.start()` to
    determine the gain to apply to the curve.
    */

    gain:    { writable: true, enumerable: true },

    /* .rate
    A float that is read on `.start()` or `.stop()` to determine the rate of
    playback to apply to the curve.
    */

    rate:    { writable: true, enumerable: true }
};

const defaults$1 = {
    attack: [
        [0.008, 'linear', 1]
    ],

    release: [
        [0.008, 'linear', 0]
    ],

    offset: 0,
    gain: 1,
    rate: 1
};

function cueAutomation(param, events, time, gain, rate) {
    var event;
    automate(param, time, 'hold');

    for (event of events) {
        validateParamEvent(event);

        // param, time, curve, value, decay
        automate(param, time + event[0] / rate, event[1], event[2] * gain, event[3]);
    }
}

class Envelope extends ConstantSourceNode {
    constructor(context, settings) {
        super(context);
        super.start.call(this, context.currentTime);

        // Define .start(), .stop(), .startTime and .stopTime
        PlayNode.call(this, context);

        // Properties
        define$4(this, properties$1);

        // Set properties and params
        assignSettingz__(this, assign$8({}, defaults$1, settings));
    }

    /* .start(time)

    Start playback of envelope at `time`.

    Returns `this`.
    */

    start(time) {
        if (!this.attack) { return this; }
        PlayNode.prototype.start.apply(this, arguments);
        cueAutomation(this.offset, this.attack, this.startTime, this.gain, this.rate, 'ConstantSource.offset');
        return this;
    }

    /* .stop(time)

    Stop playback of envelope at `time`.

    Returns `this`.
    */

    stop(time) {
        if (!this.release) { return this; }
        PlayNode.prototype.stop.apply(this, arguments);

        // Use the current signal as the start gain of the release
        const gain = getValueAtTime(this.offset, this.stopTime);
        cueAutomation(this.offset, this.release, this.stopTime, gain, this.rate, 'ConstantSource.offset');

        // Update stopTime to include release tail
        const last = this.release[this.release.length - 1];
        if (last[2] !== 0) {
            console.warn('Envelope.release does not end with value 0. Envelope will never stop.', this);
            this.stopTime = Infinity;
        }
        else {
            this.stopTime += last[1] === 'target' ?
                last[0] + last[3] * targetDurationFactor :
                last[0] ;
        }

        return this;
    }
}

define$4(Envelope.prototype, {
    playing: getDefinition(PlayNode.prototype, 'playing')
});

const noop$2 = function() {};

const print$1 = window.console ?
    console.log.bind(console, '%cMIDI %c%s', 'color: #d8a012; font-weight: 600;', 'color: #c1a252; font-weight: 300;') :
    noop$2 ;

const printGroup$1 = window.console ?
    console.groupCollapsed.bind(console, '%cMIDI %c%s', 'color: #d8a012; font-weight: 600;', 'color: #c1a252; font-weight: 300;') :
    noop$2 ;

const printGroupEnd$1 = window.console ?
    console.groupEnd.bind(console) :
    noop$2 ;

/*
bytesToInt14(lsb, msb)

Given two 7-bit values for `lsb` (least significant byte) and `msb` (most
significant byte), returns a 14-bit integer in the range `0`-`16383`.

    bytesToInt14(0, 64);   // 8192
*/

function bytesToInt14(lsb, msb) {
	// Pitch bend messages order data as [STATUS, LSB, MSB]
	return msb << 7 | lsb;
}

/*
bytesToSignedFloat(lsb, msb)

Given two 7-bit values for `lsb` (least significant byte) and `msb` (most
significant byte), returns a float in the range `-1`-`1`, weighted so that
an input of (`0`, `64`) maps to `0`.

    bytesToSignedFloat(0, 0);     // -1
    bytesToSignedFloat(0, 64);    // 0
    bytesToSignedFloat(127, 127); // 1
*/

function bytesToSignedFloat(lsb, msb) {
	return int14ToSignedFloat(bytesToInt14(lsb, msb));
}

/*
bytesToWeightedFloat(lsb, msb)

Given two 7-bit values for `lsb` (least significant byte) and `msb` (most
significant byte), returns a float in the range `0`-`1`, weighted so that
an input of (`0`, `64`) maps to `0.5`.

    bytesToWeightedFloat(0, 0);     // 0
    bytesToWeightedFloat(0, 64);    // 0.5
    bytesToWeightedFloat(127, 127); // 1
*/

function bytesToWeightedFloat(lsb, msb) {
	return int14ToWeightedFloat(bytesToInt14(lsb, msb));
}

/*
int7ToFloat(n)

Returns a float in the range `0`-`1` for values of `n` in the range `0`-`127`.

    int7ToFloat(64);      // 0.503937
*/

function int7ToFloat(n) {
	return n / 127;
}

/*
int7ToWeightedFloat(n)

Returns a float in the range `0`-`1` for values of `n` in the range `0`-`127`.
The input integer is mapped so that the value `64` returns exactly `0.5`, the
centre of the range, as per the MIDI spec for controller values and their ilk.

    int7ToSignedFloat(0);    // 0
    int7ToSignedFloat(64);   // 0.5
    int7ToSignedFloat(127);  // 1
*/

function int7ToWeightedFloat(n) {
	return n < 64 ? n / 128 : 0.5 + (n - 64) / 126 ;
}

/*
int14ToWeightedFloat(n)

Returns a float in the range `0`-`1` for values of `n` in the range `0`-`16383`.
The input integer is mapped so that the value `8192` returns `0.5`, the centre of
the range, as per the MIDI spec for pitch bend values and their ilk.

    int14ToWeightedFloat(0);      // 0
    int14ToWeightedFloat(8192);   // 0.5
    int14ToWeightedFloat(16383);  // 1
*/

function int14ToWeightedFloat(n) {
	return n < 8192 ? n / 16384 : 0.5 + (n - 8192) / 16382 ;
}


/*
int14ToSignedFloat(n)

Returns a float in the range `-1`-`1` for values of `n` in the range `0`-`16383`.
The input integer is mapped so that the value `8192` returns `0`, the centre of
the range, as per the MIDI spec for pitch bend values and their ilk.

    int14ToSignedFloat(0);      // -1
    int14ToSignedFloat(8192);   // 0
    int14ToSignedFloat(16383);  // 1
*/

function int14ToSignedFloat(n) {
	return n < 8192 ? n / 8192 - 1 : (n - 8192) / 8191 ;
}

const entries = Object.entries;
const A4      = 69;


/*
floatToFrequency(ref, n)

Given a note number `n`, returns the frequency of the fundamental tone of that
note. `ref` is a reference frequency for middle A4/69 (usually `440`).

    floatToFrequency(440, 69);  // 440
    floatToFrequency(440, 60);  // 261.625565
    floatToFrequency(442, 69);  // 442
    floatToFrequency(442, 60);  // 262.814772
*/

function floatToFrequency(ref, n) {
	return ref * Math.pow(2, (n - A4) / 12);
}


/*
frequencyToFloat(ref, frequency)

Returns `frequency` as a float on the note number scale. `ref` is a reference
frequency for middle A4/69 (usually `440`).

    frequencyToFloat(440, 220);  // 57 (A3)
	frequencyToFloat(440, 110);  // 45 (A2)

Output is rounded to 32 bits to mitigate floating point rounding errors.
*/

function frequencyToFloat(ref, freq) {
	var number = A4 + 12 * Math.log(freq / ref) / Math.log(2);

	// Rounded it to nearest 32-bit value to avoid floating point errors
	// and return whole semitone numbers where possible.
	return Math.fround(number);
}


/*
normaliseNoteName(name)

Replaces the characters `'b'` and `'#'` with the unicode musical characters `'♭'`
and `'♯'` respectively.

    normaliseNoteName('Eb6');      // 'E♭6'
*/

const rTextSymbol = /b|#/g;

const unicodeSymbols = {
	'b': '♭',
	'#': '♯'
};

function replaceSymbol($0) {
	return unicodeSymbols[$0];
}

function normaliseNoteName(name) {
	return name.replace(rTextSymbol, replaceSymbol);
}


/*
toControlName(n)

Returns a shorthand controller name from a value in the range `0`-`127`. Not all
contollers have a standardised name, and this library implements only the
more common ones. Where a name is not found, returns the controller number as a
string.

    toControlName(7);       // 'volume'
	toControlName(64);      // 'sustain'
	toControlName(98);      // '98'

Standardised controller names are defined at
[midi.org/specifications-old/](https://www.midi.org/specifications-old/item/table-3-control-change-messages-data-bytes-2).
*/

const controlNames = {
	0:   'bank',
	1:   'modulation',
	2:   'breath',
	4:   'foot',
	5:   'portamento time',
	7:   'volume',
	8:   'balance',
	10:  'pan',
	11:  'expression',
	64:  'sustain',
	65:  'portamento',
	66:  'sostenuto',
	67:  'soft',
	68:  'legato',
	69:  'hold',
	84:  'portamento',
	91:  'reverb',
	92:  'tremolo',
	93:  'chorus',
	94:  'detune',
	95:  'phaser',
	120: 'sound-off',
	121: 'reset',
	122: 'local',
	123: 'notes-off',
	124: 'omni-off',
	125: 'omni-on',
	126: 'monophonic',
	127: 'polyphonic'
};


/*
toControlNumber(name)

Returns a value in the range `0`-`127` from a shorthand controller `name`.

    toControlNumber('volume')   // 7
	toControlNumber('sustain')  // 64
	toControlNumber('98')       // 98
*/

function toControlNumber(name) {
	const entry = entries(controlNames).find(function(entry) {
		return entry[1] === name;
	});

	return entry ? parseInt(entry[0], 10) : parseInt(name, 10);
}


/*
toNoteNumber(name)

Given a note name, returns a value in the range 0-127.

    toNoteNumber('D6');     // 86
*/

const noteNumbers = {
	'C':  0, 'C♯': 1, 'D♭': 1, 'D': 2, 'D♯': 3, 'E♭': 3, 'E': 4,
	'F':  5, 'F♯': 6, 'G♭': 6, 'G': 7, 'G♯': 8, 'A♭': 8, 'A': 9,
	'A♯': 10, 'B♭': 10, 'B': 11
};

const rnotename   = /^([A-G][♭♯]?)(-?\d)$/;

function toNoteNumber(str) {
	var r = rnotename.exec(normaliseNoteName(str));
	return (parseInt(r[2], 10) + 1) * 12 + noteNumbers[r[1]];
}


/*
toStatus(channel, type)

Given a `channel` in the range `1`-`16` and type, returns the MIDI message
status byte.

    toStatus(1, 'noteon');      // 144
	toStatus(7, 'control');     // 183
*/

// MIDI message status bytes
//
// noteoff         128 - 143
// noteon          144 - 159
// polytouch       160 - 175
// control         176 - 191
// pc              192 - 207
// channeltouch    208 - 223
// pitch           224 - 240

const statuses = {
	noteoff:      128,
	noteon:       144,
	polytouch:    160,
	control:      176,
	program:      192,
	channeltouch: 208,
	pitch:        224,
};

function toStatus(channel, type) {
	return channel > 0
		&& channel < 17
		&& statuses[type] + channel - 1 ;
}


/* toType(status)

Returns message type as one of the strings `'noteoff'`, `'noteon'`, `'polytouch'`,
`'control'`, `'program'`, `'channeltouch'` or `'pitch'`.

    toType(145);          // 'noteon'.
*/

const types = Object.keys(statuses);

function toType$2(status) {
	return types[Math.floor(status / 16) - 8];
}

/*
normalise(message)

Many keyboards transmit `'noteon'` with velocity `0` rather than `'noteoff'`
messages. This is because MIDI allows messages with the same type to be sent
together, omitting the status byte and saving bandwidth. The MIDI spec requires
that both forms are treated identically. `normalise()` <em>mutates</em>
`'noteon'` messages with velocity `0` to `'noteoff'` messages.

    normalise([145,80,0]);  // [129,80,0]

Note that the MIDI library automatically normalises incoming messages.
*/

function normalise$1(message) {
	// If it's a noteon with 0 velocity, normalise it to a noteoff
	if (message[2] === 0 && message[0] > 143 && message[0] < 160) {
		message[0] -= 16;
	}

	return message;
}

function overload$1(fn, map) {
    return function overload() {
        const key     = fn.apply(null, arguments);
        const handler = (map[key] || map.default);
        //if (!handler) { throw new Error('overload() no handler for "' + key + '"'); }
        return handler.apply(this, arguments);
    };
}

function remove$2(array, value) {
    var i = array.indexOf(value);
    if (i !== -1) { array.splice(i, 1); }
}

const performance = window.performance;


// Incoming message routing

const ports = {};

function fire(e) {
    // Normalise noteon 0 to noteoff
    normalise$1(e.data);

    // Fire port-specific listeners, if port is defined and there are any
    if (e.target && e.target.id) {
        const portRoot = ports[e.target.id];
        if (portRoot) { fireRoute(0, portRoot, e); }
    }

    // Fire port-generic listeners, if there are any
    const allRoot = ports['undefined'];
    if (allRoot) { fireRoute(0, allRoot, e); }
}

function fireRoute(i, tree, e) {
	var name   = e.data[i++];
	var branch = tree[name];

	if (name === undefined) {
		branch && branch.forEach((fn) => fn(e));
	}
	else {
		branch && fireRoute(i, branch, e);
		tree.undefined && tree.undefined.forEach((fn) => fn(e));
	}
}

function getRoute(i, query, object) {
	var name   = query[i++];
	var branch = object[name];

	return name === undefined ?
		branch :
		branch && getRoute(i, query, branch) ;
}

function setRoute(i, query, object, fn) {
	var name   = query[i++];
	var branch = object[name];

	return name === undefined ?
		branch ? branch.push(fn) : (object[name] = [fn]) :
		setRoute(i, query, branch || (object[name] = {}), fn) ;
}

function removeRoute(query, root, fn) {
	var fns = getRoute(0, query, root);
	if (!fns) { return; }
	remove$2(fns, fn);
}


// Queries

const query = {};

function toNoteQuery(selector) {
	query[0] = toStatus(selector.channel, selector.type);
	query[1] = typeof selector.name === 'string' ?
        toNoteNumber(selector.name) :
		selector.name ;
	query[2] = selector.value;
	return query;
}

function toControlQuery(selector) {
	query[0] = toStatus(selector.channel, selector.type);
	query[1] = typeof selector.name === 'string' ?
		toControlNumber(selector.name) :
		selector.name ;
	query[2] = selector.value;
	return query;
}

function toQuery(selector) {
	query[0] = toStatus(selector.channel, selector.type);
	query[1] = selector.name;
	query[2] = selector.value;
	return query;
}

function toSelectorType(object) {
    // Loose duck type checking for index 0, so that we may accept
    // objects as array selectors
    return typeof object[0] === 'number' ? 'array' :
        object.channel ? object.type :
        'array' ;
}

/*
on(selector, fn)

Registers a handler `fn` for incoming MIDI events that match object `selector`.
A selector is either an array (or array-like) in the form of a MIDI message
`[status, data1, data2]`:

    // Call fn on CH1 NOTEON events
	on([144], fn);

    // Call fn on CH1 NOTEON C4 events
	on([144, 60], fn);

    // Call fn on CH1 NOTEON C4 127 events
	on([144, 60, 127], fn);

or a bit more conveniently an object of interpretive data of the form
`{channel, type, name, value}`:

    // Call fn on CH2 NOTEON events
	on({ channel: 2, type: 'noteon' }, fn);

    // Call fn on CH2 NOTEOFF C4 events
	on({ channel: 2, type: 'noteoff', name: 'C4' }, fn)

    // Call fn on CH2 NOTEON and NOTEOFF C4 events
	on({ channel: 2, type: 'note', name: 'C4' }, fn)

    // Call fn on CH4 CONTROL 1 0 events
	on({ channel: 4, type: 'control', name: 'modulation', value: 0 }, fn)

Note that these selector properties are progressive. A selector may not have
a `type` if it has no `channel`, it may not have a `name` without a `type`,
and may not have a `value` without a `name` property. Selectors pre-create
paths in a distribution tree that is optimised for incoming events to flow
through.

Finally, a selector may optionally have a property `port`, the id of an
input port.

    // Call fn on CH4 CC 64 events from port '0123'
	on({ port: '0123', 0: 179, 1: 64 }}, fn);

    // Call fn on CH4 CC 64 events from port '0123'
	on({ port: '0123', channel: 4, type: 'control', name: 64 }}, fn);

*/

const setSelectorRoute = overload$1(toSelectorType, {
    'array': function(selector, root, fn) {
        // Use selector as query
        setRoute(0, selector, root, fn);
    },

    'note': function(selector, root, fn) {
        var query = toNoteQuery(selector);

        query[0] = toStatus(selector.channel, 'noteon');
        setRoute(0, query, root, fn);

        query[0] = toStatus(selector.channel, 'noteoff');
        setRoute(0, query, root, fn);
    },

    'noteon': function(selector, root, fn) {
        var query = toNoteQuery(selector);
        setRoute(0, query, root, fn);
    },

    'noteoff': function(selector, root, fn) {
        var query = toNoteQuery(selector);
        setRoute(0, query, root, fn);
    },

    'polytouch': function(selector, root, fn) {
        var query = toNoteQuery(selector);
        setRoute(0, query, root, fn);
    },

    'control': function(selector, root, fn) {
        const query = toControlQuery(selector);
        setRoute(0, query, root, fn);
    },

    'undefined': function(selector, root, fn) {
        // Listen to everything on the given channel

        selector.type = 'note';
        setSelectorRoute(selector, root, fn);

        selector.type = 'control';
        setSelectorRoute(selector, root, fn);

        selector.type = 'pitch';
        setSelectorRoute(selector, root, fn);

        selector.type = 'polytouch';
        setSelectorRoute(selector, root, fn);

        selector.type = 'channeltouch';
        setSelectorRoute(selector, root, fn);

        selector.type = 'program';
        setSelectorRoute(selector, root, fn);
    },

    default: function(selector, root, fn) {
        var query = toQuery(selector);
        setRoute(0, query, root, fn);
    }
});

function on(selector, fn) {
    const id = selector.port || 'undefined' ;
    const root = ports[id] || (ports[id] = {});
    setSelectorRoute(selector, root, fn);
}

/*
off(selector, fn)

Removes an event listener 'fn' from MIDI events matching object 'selector'. Where
'fn' is not given, removes all handlers from events matching the selector.

    off(['note'], fn);
*/

const removeSelectorRoute = overload$1(toSelectorType, {
    'array': function(selector, root, fn) {
        removeRoute(selector, root, fn);
    },

    'note': function(selector, root, fn) {
        var query = toNoteQuery(selector);

        query[0] = toStatus(selector.channel, 'noteon');
        removeRoute(query, root, fn);

        query[0] = toStatus(selector.channel, 'noteoff');
        removeRoute(query, root, fn);
    },

    'noteon': function(selector, root, fn) {
        var query = toNoteQuery(selector);
        removeRoute(query, root, fn);
    },

    'noteoff': function(selector, root, fn) {
        var query = toNoteQuery(selector);
        removeRoute(query, root, fn);
    },

    'polytouch': function(selector, root, fn) {
        var query = toNoteQuery(selector);
        removeRoute(query, root, fn);
    },

    'control': function(selector, root, fn) {
        var query = toControlQuery(selector);
        removeRoute(query, root, fn);
    },

    'undefined': function(selector, root, fn) {
        // Otherwise, there being no message type, remove fn from
        // all types for this channel
        selector.type = 'note';
        removeSelectorRoute(selector, root, fn);

        selector.type = 'control';
        removeSelectorRoute(selector, root, fn);

        selector.type = 'pitch';
        removeSelectorRoute(selector, root, fn);

        selector.type = 'polytouch';
        removeSelectorRoute(selector, root, fn);

        selector.type = 'channeltouch';
        removeSelectorRoute(selector, root, fn);

        selector.type = 'program';
        removeSelectorRoute(selector, root, fn);
    },

    default: function(selector, root, fn) {
        var query = toQuery(selector);
        removeRoute(query, root, fn);
    }
});

function off(selector, fn) {
    const id = selector.port || 'undefined' ;
    const root = ports[id] || (ports[id] = {});
    removeSelectorRoute(selector, root, fn);
}

const empty = new Map();

let midi = {
    inputs: empty,
    outputs: empty
};

/*
request()

Returns a promise that resolves to the midiAccess object where it is
available. Where the underlying `navigator.requestMIDIAccess()` method is
undefined, or where MIDI is unavailable for some reason, returns a rejected
promise.

    request().catch(function(error) {
        // Alert the user they don't have MIDI
    });
*/

function listen(port) {
	// It's suggested here that we need to keep a reference to midi inputs
	// hanging around to avoid garbage collection:
	// https://code.google.com/p/chromium/issues/detail?id=163795#c123
	//store.push(port);

	port.onmidimessage = fire;
}

function unlisten(port) {
    // Free port up for garbage collection.
	//const i = store.indexOf(port);
    //if (i > -1) { store.splice(i, 1); }

	port.onmidimessage = null;
}

function setup(midi) {
	var entry, port;

	for (entry of midi.inputs) {
		port = entry[1];

        { print$1(port.type + ' ' + port.state, port); }

        if (port.state === 'connected') {
            listen(port);
        }
	}

	for (entry of midi.outputs) {
		port = entry[1];
        { print$1(port.type + ' ' + port.state, port); }
	}
}

function statechange(e) {
	var port = e.port;

    { print$1(port.type + ' ' + port.state, port); }

    if (port.type === 'input') {
        if (port.state === 'connected') {
            listen(port);
        }
        else {
            unlisten(port);
        }
    }
}

let promise;

function request$1() {
	// Cache the request so there's only ever one
	return promise || (promise = navigator.requestMIDIAccess ?
		navigator
		.requestMIDIAccess()
		.then(function(midiAccess) {
            { printGroup$1('initialise MIDI access'); }

            midi = midiAccess;
            setup(midi);
            midi.onstatechange = statechange;

			{ printGroupEnd$1(); }
			return midi;
		}, function(e) {
            print$1('access denied');
		}) :
		Promise.reject("This browser does not support Web MIDI.")
	);
}

print$1('       - http://github.com/stephband/midi');

// Setup

request$1();

const dB48 = 1/2/2/2/2/2/2/2/2;

var assign$9      = Object.assign;


// Define

const defaults$2 = {
	gain:      0.25,
	decay:     0.06,
	resonance: 22
};


// Tick

function Tick(audio, options) {
	if (!Tick.prototype.isPrototypeOf(this)) {
		return new Tick(audio, options);
	}

	var settings   = assign$9({}, defaults$2, options);

	var oscillator = audio.createOscillator();
	var filter     = audio.createBiquadFilter();
	var gain       = audio.createGain();
	var output     = audio.createGain();
	//var merger     = audio.createChannelMerger(2);

	//NodeGraph.call(this, {
	//	nodes: [
	//		{ id: 'oscillator', type: 'oscillator',    settings: { channelCount: 1 } },
	//		{ id: 'filter',     type: 'biquad-filter', settings: { channelCount: 1 } },
	//		{ id: 'gain',       type: 'gain',          settings: { channelCount: 1 } },
	//		{ id: 'output',     type: 'gain',          settings: { channelCount: 1 } },
	//	],
	//
	//	connections: [
	//		{ source: 'oscillator', target: 'filter' },
	//		{ source: 'filter',     target: 'gain' },
	//		{ source: 'gain',       target: 'output' },
	//	]
	//})

	oscillator.channelCount = 1;
	filter.channelCount     = 1;
	gain.channelCount       = 1;
	output.channelCount     = 1;

	function schedule(time, frequency, level, decay, resonance) {
		var attackTime = time > 0.002 ? time - 0.002 : 0 ;

		// Todo: Feature test setTargetAtTime in the AudioObject namespace.
		// Firefox is REALLY flakey at setTargetAtTime. More often than not
		// it acts like setValueAtTime. Avoid using it where possible.

		oscillator.frequency.setValueAtTime(frequency, attackTime);
		oscillator.frequency.exponentialRampToValueAtTime(frequency / 1.06, time + decay);

		filter.frequency.cancelAndHoldAtTime(attackTime);
		filter.frequency.setValueAtTime(frequency * 1.1, attackTime);
		filter.frequency.exponentialRampToValueAtTime(frequency * 4.98, time);
		//filter.frequency.setTargetAtTime(frequency + 300, time + 0.003, 0.0625);
		filter.frequency.exponentialRampToValueAtTime(frequency * 1.5, time + decay);

		filter.Q.cancelAndHoldAtTime(attackTime);
		filter.Q.setValueAtTime(0, attackTime);
		filter.Q.linearRampToValueAtTime(resonance, time);
		//filter.Q.setTargetAtTime(0, time + 0.05, 0.0625);
		filter.Q.linearRampToValueAtTime(0, time + decay);

		gain.gain.cancelAndHoldAtTime(attackTime);
		gain.gain.setValueAtTime(0, attackTime);
		gain.gain.linearRampToValueAtTime(level, time);
		//gain.gain.setTargetAtTime(0, time, decay);
		gain.gain.exponentialRampToValueAtTime(dB48, time + decay);
		// Todo: work out the gradient of the exponential at time + decay,
		// us it to schedule the linear ramp of the same gradient.
		gain.gain.linearRampToValueAtTime(0, time + decay * 1.25);
	}

	oscillator.type = 'square';
	oscillator.frequency.setValueAtTime(300, audio.currentTime);
	oscillator.start();
	oscillator.connect(filter);

	filter.connect(gain);

	gain.gain.value = 0;
	gain.connect(output);
	//output.connect(merger, 0, 0);
	//output.connect(merger, 0, 1);

	this.gain = output.gain;

	this.resonance = settings.resonance;
	this.decay     = settings.decay;
	//this.gain      = settings.gain;

    /*
    .start(time, note, velocity)
    Todo: move parameters to be properties of tick object, echoing other signal generators
    */
	this.start = function(time, number, level) {
		var frequency = typeof number === 'string' ?
			floatToFrequency(440, toNoteNumber(number)) :
			floatToFrequency(440, number) ;

		schedule(time || audio.currentTime, frequency, level, this.decay, this.resonance);
		return this;
	};

	//this.stop = function(time) {
	//	// Don't. It's causing problems. I think we'll simply live with the
	//	// fact that the metronome doesn't stop immediately when you stop
	//	// the sequencer.
	//	//unschedule(time, this.decay);
	//	return this;
	//};

	this.destroy = function() {
		oscillator.disconnect();
		filter.disconnect();
		gain.disconnect();
		output.disconnect();
	};

	this.connect = function() {
		return output.connect.apply(output, arguments);
	};

	this.disconnect = function() {
		return output.disconnect.apply(output, arguments);
	};
}


/*
.stop()
A noop method, provided to echo the interface of other generators.
*/

Tick.prototype.stop = noop$1;

const define$5 = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

function resolve(privates, buffers) {
    privates.resolve(buffers);
    privates.promise = undefined;
    privates.resolve = undefined;
}

class Recorder extends AudioWorkletNode {
    constructor(context, settings, stage = nothing, notify = noop$1) {
        super(context, 'recorder');
        const privates$1 = privates(this);

        this.startTime = undefined;
        this.stopTime  = undefined;
        this.duration  = settings && settings.duration || 120;

        this.port.onmessage = (e) => {
            if (e.data.type === 'done') {
                this.buffers = e.data.buffers;
                notify(this, 'buffers');
                if (privates$1.promise) {
                    resolve(privates$1, e.data.buffers);
                }
            }
        };

        // It's ok, this doesn't emit anything
        this.connect(context.destination);
    }

    start(time) {
        PlayNode.prototype.start.apply(this, arguments);

        this.port.postMessage({
            type: 'start',
            time: this.startTime
        });

        return this;
    }

    stop(time) {
        time = time || this.context.currentTime;

        // Adjust stopTime such that the difference between startTime and
        // stopTime is equivalent to an integer number of sample frames
        time = this.startTime + Math.round((time - this.startTime) * this.context.sampleRate) / this.context.sampleRate;

        PlayNode.prototype.stop.call(this, time);

        // Tell the worklet to stop recording
        this.port.postMessage({
            type: 'stop',
            time: this.stopTime
        });

        return this;
    }

    then(fn) {
        const privates$1 = privates(this);

        if (!privates$1.promise) {
            privates$1.promise = new Promise((resolve, reject) => {
                privates$1.resolve = resolve;
            });
        }

        return privates$1.promise.then(fn);
    }
}

// Mix in property definitions
define$5(Recorder.prototype, {
    playing: getOwnPropertyDescriptor(PlayNode.prototype, 'playing')
});

Recorder.preload = function(base, context) {
    return context
    .audioWorklet
    .addModule(base + '/nodes/recorder.worklet.js?cachebuster=1');
};

/*
Sink

```
const sink = stage.create('sink');
```

You can't automate params until their nodes have a route to
context.destination. That's just the way things work. A sink
allows you to attach to destination without outputting any
sound. There is one sink node per context – all 'instances'
of sink in all graphs for a context are actually the same
instance.
*/


const $sink = Symbol('sink');

function Sink(context) {
    if (!context[$sink]) {
        context[$sink] = context.createGain();
        context[$sink].gain.value = 0;
        context[$sink].gain.setValueAtTime(0, 0);
        context[$sink].connect(context.destination);
    }

    return context[$sink];
}

// Fetch audio buffer from a URL and decode it

var requests = {};

function requestBuffer(context, url) {
    return requests[url] || (requests[url] = new Promise(function(accept, reject) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onload = () => context.decodeAudioData(request.response, accept, reject);
        request.onerror = reject;
        request.send();
    }));
}

function requestData(url) {
    return url.slice(-3) === '.js' ?
        // Import JS module
        Promise.resolve(require(url)).then(get$1('default')) :
        // Import JSON
        fetch(url).then((response) => response.json()) ;
}

const DEBUG$2  = window.DEBUG;
const assign$a = Object.assign;
const define$6 = Object.defineProperties;
const getOwnPropertyDescriptor$1 = Object.getOwnPropertyDescriptor;

const graph$2 = {
    nodes: [
        { id: 'detune', type: 'constant', data: { offset: 0 }},
        { id: 'gain',   type: 'gain',     data: { gain: 1 }}
    ],

    properties: {
        detune: 'detune.offset'
    },

    output: 'gain'
};

const properties$2 = {
    src: {
        get: function() {
            return privates(this).src;
        },

        set: function(src) {
            const privates$1 = privates(this);

            // Import JSON
            // Todo: Expose a better way than this.promise
            this.promise = requestData(src).then((data) => {
                this.promise = undefined;
                privates$1.src = src;
                privates$1.map = data;
                return this;
            });
        }
    },

    frequency: { value: 440, writable: true, enumerable: true },
    gain:      { value: 1, writable: true, enumerable: true }
};

const defaults$3 = {
    gain:      1,
    frequency: 440
};

const cache$1 = {};

function regionRate(region, frequency, gain) {
    return region.frequency ?
        frequency / region.frequency :
        1 ;
}

function regionGain(region, note, gain) {
    // Set gain based on note range - linear interpolate (assume
    // waveforms are coherent) the crossfade at the 'ends' of the
    // note range
    const noteRange = region.noteRange;
    const noteGain = !noteRange ? 1 :
        noteRange.length < 3 ? 1 :
        note < noteRange[1] ? (note - noteRange[2]) / (noteRange[1] - noteRange[2]) :
        note > noteRange[noteRange.length - 2] ? 1 - (note - noteRange[2]) / (noteRange[1] - noteRange[2]) :
        1 ;

    // Set gain based on velocity range - linear interpolate (assume
    // waveforms are coherent) the crossfade at the 'ends' of the
    // gain range
    const gainRange = region.gainRange;
    const gainGain = !gainRange ? 1 :
        gainRange.length < 3 ? 1 :
        gain < gainRange[1] ? (gain - gainRange[2]) / (gainRange[1] - gainRange[2]) :
        gain > gainRange[gainRange.length - 2] ? 1 - (gain - gainRange[2]) / (gainRange[1] - gainRange[2]) :
        1 ;

    return gain * noteGain * gainGain;
}

function start(time, node) {
    // For nodes that accept a offset as a parameter to .start(time, offset),
    // this function starts them 'in the past', as it were, if time is less
    // than currentTime
    const currentTime = node.context.currentTime;

    if (time > currentTime) {
        node.start(time);
    }
    else {
        // Todo: do we need to work out offset in buffer sample rate timeframe? Experiment!
        node.start(currentTime, currentTime - time);
    }

    return node;
}

function setupGainNode(context, destination, gainNode, time, region, note, level) {
    // Create gain for source that does not yet exist
    if (!gainNode) {
        gainNode = context.createGain();
        gainNode.connect(destination);
    }

    const gain = regionGain(region, note, level);

    // Schedule attack
    if (region.attack) {
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(gain, time + region.attack);
    }
    else {
        gainNode.gain.setValueAtTime(gain, time);
    }

    return gainNode;
}

function setupBufferNode(context, destination, detuneNode, region, buffer, time, frequency) {
    const bufferNode = context.createBufferSource();
    bufferNode.buffer    = buffer;
    bufferNode.loopStart = region.loopStart || 0;
    bufferNode.loopEnd   = region.loopEnd || 0;
    bufferNode.loop      = !!region.loop;

    const rate = regionRate(region, frequency);
    bufferNode.playbackRate.setValueAtTime(rate, time);

    detuneNode.connect(bufferNode.detune);
    bufferNode.connect(destination);

    return start(time, bufferNode);
}

function startSources(sources, destination, detuneNode, map, time, frequency, note = 69, gain = 1) {
    const context = destination.context;

    sources.length = 0;

    // Neuter velocity 0s - they dont seem to get filtered below
    return gain === 0 ? sources : map
    .filter((region) => (
        (!region.noteRange || (region.noteRange[0] <= note
        && region.noteRange[region.noteRange.length - 1] >= note))
        &&
        (!region.gainRange || (region.gainRange[0] <= gain
        && region.gainRange[region.gainRange.length - 1] >= gain))
    ))
    .reduce((sources, region, i) => {
        // Handle cached buffers synchronously
        if (cache$1[region.src]) {
            sources[i] = setupGainNode(context, destination, sources[i], time, region, note, gain);
            sources[i].bufferNode = setupBufferNode(context, destination, detuneNode, region, cache$1[region.src], time, frequency, note, gain);
            sources[i].region = region;
        }
        else {
            requestBuffer(context, region.src)
            .then((buffer) => {
                cache$1[region.src] = buffer;
                sources[i] = setupGainNode(context, destination, sources[i], time, region, note, gain);
                sources[i].bufferNode = setupBufferNode(context, destination, detuneNode, region, cache$1[region.src], time, frequency, note, gain);
                sources[i].region = region;
            });
        }

        sources.length = i + 1;
        return sources;
    }, sources) ;
}

function stopGain(gainNode, region, time) {
    // Schedule release
    if (region.release) {
        // Time constant 5 means reduction by about -60dB...
        // Todo: calc an accurate time constant for -60dB
        gainNode.gain.setTargetAtTime(0, time, (region.release * 0.9) / 5);
        gainNode.gain.cancelAndHoldAtTime(time + region.release * 0.9);
        gainNode.gain.linearRamptoValueAtTime(0, time + region.release);
        gainNode.stopTime = time + region.release;
    }
    else {
        gainNode.gain.setValueAtTime(0, time);
        gainNode.stopTime = time;
    }
}

function stopBuffer(bufferNode, region, time) {
    // Wait for release tail to stop
    if (region.release) {
        bufferNode.stop(time + region.release);
    }
    else {
        bufferNode.stop(time);
    }
}

function stopSources(sources, time) {
    let n = -1;
    let stopTime = time;

    while (sources[++n]) {
        const source = sources[n];
        const region = source.region;

        stopGain(source, region, time);
        stopBuffer(source.bufferNode, region, time);

        // Advance stopTime to include source tails
        source.stopTime = time + (region.release || 0);
        stopTime = source.stopTime > stopTime ?
            source.stopTime :
            stopTime ;
    }

    return stopTime;
}



function Sample(context, settings) {
    const privates$1 = privates(this);

    // Set up .connect(), .disconnect(), .start, .stop()
    NodeGraph.call(this, context, graph$2);
    PlayNode.call(this, context);

    // Privates
    privates$1.sources = { length: 0 };

    // Properties
    define$6(this, properties$2);

    // Setup
    Sample.reset(this, arguments);
}

Sample.reset = function reset(node, args) {
    PlayNode.reset(node);
    assignSettingz__(node, assign$a({}, defaults$3, args[1]));
    return node;
};

assign$a(Sample.prototype, PlayNode.prototype, NodeGraph.prototype, {
    start: function(time) {
        // Wait for src to load
        if (this.promise) {
            this.promise.then(() => {
                this.start(time);
            });

            return this;
        }

        PlayNode.prototype.start.call(this, time);

        // Get regions from map
        const privates$1   = privates(this);
        const gain       = this.gain;
        const frequency  = this.frequency;
        const note       = frequencyToFloat(440, frequency);
        const gainNode   = this.get('gain');
        const detuneNode = this.get('detune');

        gainNode.gain.setValueAtTime(gain, this.startTime);
        startSources(privates$1.sources, gainNode, detuneNode, privates$1.map.data, this.startTime, frequency, note, gain) ;

        return this;
    },

    stop: function(time) {
        // Clamp stopTime to startTime
        PlayNode.prototype.stop.call(this, time);

        // Stop sources and update stopTime to include stopTime
        // of longest sample
        const privates$1 = privates(this);
        this.stopTime = stopSources(privates$1.sources, this.stopTime);

        return this;
    }
});

// Mix in property definitions
define$6(Sample.prototype, {
    playing: getOwnPropertyDescriptor$1(PlayNode.prototype, 'playing')
});

const assign$b = Object.assign;
const define$7 = Object.defineProperties;
const getOwnPropertyDescriptor$2 = Object.getOwnPropertyDescriptor;

const graph$3 = {
    nodes: [
        { id: 'osc',  type: 'oscillator', data: { type: 'sine', frequency: 440, detune: 0 }},
        { id: 'gain', type: 'gain',       data: { gain: 0 }}
    ],

    connections: [
        { source: 'osc',  target: 'gain' },
    ],

    properties: {
        /*
        .type
        A string. One of `'sine'`, `'square'`, `'sawtooth'` or `'triangle'`.
        */
        type:      'osc.type',

        /*
        .frequency
        An AudioParam representing frequency in Hz.
        */
        frequency: 'osc.frequency',

        /*
        .detune
        An AudioParam representing a deviation from frequency in cents.
        */
        detune:    'osc.detune'
    },

    output: 'gain'
};

const defaults$4 = {
    type:      'sine',
    frequency: 440,
    detune:    0
};

const properties$3 = {
    /*
    .gain
    A float, nominally in the range `0–1`, that is read on calling `.start()`
    to set the gain of the tone. Changes to `.gain` during playback have no
    effect.
    */

    gain: {
        value:    1,
        writable: true
    }
};

function Tone(context, options) {
    // Set up the node graph
    NodeGraph.call(this, context, graph$3);

    // Define .startTime and .stopTime
    PlayNode.call(this, context);

    // Define type
    define$7(this, properties$3);

	// Set up
    this.get('osc').start(context.currentTime);
    Tone.reset(this, arguments);
}

Tone.reset = function(node, args) {
    const settings = args[1];
    PlayNode.reset(node, args);
    assignSettingz__(node, assign$b({}, defaults$4, settings));
};

assign$b(Tone.prototype, NodeGraph.prototype, PlayNode.prototype, {

    /*
    .start(time)
    Start the tone at `time`.
    */

    start: function(time) {
        PlayNode.prototype.start.apply(this, arguments);
        this.get('gain').gain.setValueAtTime(this.gain, this.startTime);
        return this;
    },

    /*
    .stop(time)
    Stop the tone at `time`.
    */

    stop: function(time, frequency, gain) {
        PlayNode.prototype.stop.apply(this, arguments);
        this.get('gain').gain.setValueAtTime(0, this.stopTime);
        return this;
    }
});

// Mixin property definitions
define$7(Tone.prototype, {
    playing: getOwnPropertyDescriptor$2(PlayNode.prototype, 'playing')
});

const assign$c = Object.assign;
const define$8 = Object.defineProperties;
const getOwnPropertyDescriptor$3 = Object.getOwnPropertyDescriptor;

// Duration of noise to generate
const bufferDuration = 4;

const defaults$5 = {
    type:      'white',
//    mix:       1,
//    pan:       0
};

const graph$4 = {
	nodes: [
        { id: 'source', type: 'buffer-source', data: { detune: 0, loopStart: 0, loopEnd: bufferDuration, loop: true }},
		{ id: 'gain',   type: 'gain',   data: { gain: 0 }}
//		{ id: 'mix',    type: 'mix',    data: { gain: 1, pan: 0 }}
	],

	connections: [
        { source: 'source', target: 'gain' },
//        { source: 'gain',   target: 'mix' }
    ],

    properties: {
//        mix:       'mix.gain',
//        pan:       'mix.pan'
    },

	output: 'gain'
};

const properties$4 = {
    /*
    .type
    One of the strings `'white'`, `'pink'` or `'brown'` describing the
    <i>colour</i> of noise to generate.
    */
    type: {
		enumerable: true,

		get: function() {
			return privates(this).type;
		},

		set: function(value) {
			// If type is unrecognised, or has not changed, do nothing
			if (!/white|pink|brown/.test(value) || this.type === value) {
				return;
			}

			// Fill buffer with noise
			// Todo: pink noise, brown noise, some clues about noise here:
			// https://noisehack.com/generate-noise-web-audio-api/
			const buffer = this.get('source').buffer;
			let n = buffer.numberOfChannels;
			while (n--) {
				const channel = buffer.getChannelData(n);
				generators[value](channel);
			}

			privates(this).type = value;
		}
	},

    gain: {
        value:    1,
        writable: true
    },

	channelCount: {
		enumerable: true,

		get: function() {
			return this.get('source').buffer.numberOfChannels;
		}
	}
};

const generators = {
	white: function generateWhiteNoise(channel) {
		let m = channel.length;
		while (m--) {
			channel[m] = Math.random() * 2 - 1;
		}
	},

	// https://noisehack.com/generate-noise-web-audio-api/
	pink: function generatePinkNoise(channel) {
		// http://noisehack.com/generate-noise-web-audio-api/
		var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
		const length = channel.length;
		var i, white;

		for (i = 0; i < length; i++) {
			white = Math.random() * 2 - 1;

			b0 = 0.99886 * b0 + white * 0.0555179;
			b1 = 0.99332 * b1 + white * 0.0750759;
			b2 = 0.96900 * b2 + white * 0.1538520;
			b3 = 0.86650 * b3 + white * 0.3104856;
			b4 = 0.55000 * b4 + white * 0.5329522;
			b5 = -0.7616 * b5 - white * 0.0168980;

			channel[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
			channel[i] *= 0.11;
			b6 = white * 0.115926;
		}
	},

	// https://noisehack.com/generate-noise-web-audio-api/
	brown: function generateBrownNoise(channel) {
		var lastOut = 0;
		const length = channel.length;
		var i, white;

        for (i = 0; i < length; i++) {
            white = Math.random() * 2 - 1;
            channel[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = channel[i];
			// (roughly) compensate for gain
            channel[i] *= 3.5;
        }
	}
};

function Noise(context, options) {
    // Set up the node graph
    NodeGraph.call(this, context, graph$4);

    // Define .startTime and .stopTime
    PlayNode.call(this, context);

	// Define .type and .channelCount
	define$8(this, properties$4);

    // Define params
	const source = this.get('source');
	const channelCount = options.channelCount || 1;

	source.buffer = new AudioBuffer({
		length: bufferDuration * context.sampleRate * channelCount,
		sampleRate: context.sampleRate,
		numberOfChannels: channelCount
	});

	// Expose params
//    this.mix = this.get('mix').gain;
//    this.pan = this.get('mix').pan;

	// Start playing
    source.start(context.currentTime);
    this.reset(context, options);
}

// Mix in property definitions
define$8(Noise.prototype, {
    playing: getOwnPropertyDescriptor$3(PlayNode.prototype, 'playing')
});

assign$c(Noise.prototype, NodeGraph.prototype, PlayNode.prototype, {
    reset: function(context, options) {
        PlayNode.reset(this, arguments);
		// Here type is assigned and the buffer is filled with noise
        assignSettingz__(this, assign$c({}, defaults$5, options));
    },

    start: function(time) {
		// Frequency is unused
        PlayNode.prototype.start.apply(this, arguments);
        this.get('gain').gain.setValueAtTime(this.gain, this.startTime);
        return this;
    },

    stop: function(time) {
        PlayNode.prototype.stop.apply(this, arguments);
        this.get('gain').gain.setValueAtTime(0, this.stopTime);
        return this;
    }
});

const noop$3 = function() {};

const print$2 = window.console ?
    console.log.bind(console, '%cNode %c%s', 'color: #b5002f; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;') :
    noop$3 ;

const printGroup$2 = window.console ?
    console.groupCollapsed.bind(console, '%cNode %c%s', 'color: #b5002f; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;') :
    noop$3 ;

const printGroupEnd$2 = window.console ?
    console.groupEnd.bind(console) :
    noop$3 ;

const log$3 = window.console ?
    function(name, message, ...args) { console.log('%c' + name + ' %c' + message, 'color: #b5002f; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;', ...args); } :
    noop$3 ;

const logGroup$1 = window.console ?
    function(name, message, ...args) { console.groupCollapsed('%c' + name + ' %c' + message, 'color: #b5002f; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;', ...args); } :
    noop$3 ;

const logGroupEnd$1 = window.console ?
    console.groupEnd.bind(console) :
    noop$3 ;

const assign$d = Object.assign;
const define$9 = Object.defineProperties;
const getOwnPropertyDescriptor$4 = Object.getOwnPropertyDescriptor;
const frequencyC4 = floatToFrequency(440, 60);

const defaults$6 = {};

function createNode$1(context, type, settings) {
    const node = new constructors$1[type](context, settings);
    return node;
}

const properties$5 = {
	active:  { writable: true, value: undefined }
};


function Voice(context, data) {
    const settings = data || defaults$6;
    const privates$1 = privates(this);

    // Set up the node graph
	NodeGraph.call(this, context, settings);

	// Define .start(), .stop(), .startTime and .stopTime
	PlayNode.call(this, context);

	// Properties
    define$9(this, properties$5);

    privates$1.__start = settings.__start;

    // Create detune

    /*
    .detune

    AudioParam Todo: description
    */

    const detune = createNode$1(context, 'constant', {
        offset: 0
    });

    this.detune = detune.offset;

    // Connect detune to all detuneable nodes
    //this.nodes.reduce((detune, node) => {
    //    if (node.detune) {
    //        detune.connect(node.detune);
    //    }
    //    return detune;
    //}, detune);

	// Start constant
	detune.start(context.currentTime);

    Voice.reset(this, arguments);
}

// Support pooling via reset function on the constructor
Voice.reset = function(voice, args) {
    PlayNode.reset(voice);

    //const context = args[0];
    //const graph   = args[1];

    //voice.nodes.reduce((entry) => {
    //    const data = graph.nodes.find((data) => data.id === entry.id);
    //    assignSettingz__(entry.node, data, ['context']);
    //});

    return voice;
};

// Mix in property definitions
define$9(Voice.prototype, {
    playing: getOwnPropertyDescriptor$4(PlayNode.prototype, 'playing')
});

function setPropertyOrParam(target, key, value) {
    if (!(key in target)) {
        console.warn('Cannot set property or param "' + key + '" in node', target);
    }

    if (target[key] && target[key].setValueAtTime) {
        target[key].setValueAtTime(value, target.context.currentTime);
    }
    else {
        target[key] = value;
    }
}

assign$d(Voice.prototype, PlayNode.prototype, NodeGraph.prototype, {

    /*
    .start(time, note, velocity)

    Starts nodes in the graph that have `__start` settings.

    Where `note` is a number it is assumed to be a frequency, otherwise note
    names in the form 'C3' or 'Ab8' are converted to frequencies before being
    transformed and set on properties of nodes in the graph (according to
    transforms in their `__start` settings).

    Similarly, velocity is transformed and set on properties of nodes (according
    to transforms in their `__start` settings).

    Returns this.
    */

    start: function(time, note = 49, velocity = 1) {
        PlayNode.prototype.start.apply(this, arguments);

        const privates$1 = privates(this);

        // Note number
        note = typeof note === 'string' ?
            toNoteNumber(note) :
            note ;

        // Frequency of note
        const frequency = floatToFrequency(440, note) ;

        // Frequency relative to C4, middle C
        // Todo: should we choose A440 as a reference instead?
        const frequencyRatio = frequency / frequencyC4;

        // Cycle through targets
        let id, entry;
        for (id in privates$1.__start) {
            entry = privates$1.__start[id];

            const target = this.get(id);
            if (!target) {
                throw new Error('Node "' + id + '" not found in nodes');
            }

            // Cycle through frequency/gain transforms
            let key, transform;
            for (key in entry) {
                transform = entry[key];
                const value = (
                    transform[1] ?
                        transform[1].type === 'none' ?
                            frequency :
                            Math.pow(frequencyRatio, transform[1].scale) :
                        1
                )
                * (
                    transform[2] ?
                        transform[2].type === 'none' ?
                            velocity :
                            denormalise(transform[2].type, transform[2].min, transform[2].max, velocity) :
                        1
                );

                setPropertyOrParam(target, key, value);
            }

            target.start(this.startTime);
        }

        return this;
    },

    /*
    .stop(time)

    Stops nodes in the graph that have `__start` settings.

    Note that where there are nodes such as envelopes in the graph,
    `voice.stopTime` may not be equal `time` after calling `.stop()`.
    Envelopes may have a tail – they can stop some time <i>after</i> they are
    told to, and this is reflected in the `.stopTime` of the voice.

    Returns this.
    */

    stop: function(time, note = 49, velocity = 1) {
        PlayNode.prototype.stop.apply(this, arguments);

        const privates$1 = privates(this);

        // Dodgy.
        // Process stopTime in a node type order. Tone generators need to wait
        // until envelopes have ended, so process Envelopes first to grab their
        // stopTimes. It's a bit pants, this mechanism, but it'll do for now.
        const second = [];
        let id;
        for (id in privates$1.__start) {
            const target = this.get(id);

            // Process envelopes first
            if (target.constructor.name !== 'Envelope') {
                second.push(target);
                continue;
            }

            target.stop(this.stopTime);

            // Advance .stopTime if this node is going to stop later
            this.stopTime = target.stopTime > this.stopTime ?
                target.stopTime :
                this.stopTime ;
        }

        // Cycle through second priority, nodes that should continue until
        // others have stopped
        var n = -1;
        var target;
        while ((target = second[++n])) {
            target.stop(this.stopTime);

            // Todo: Prevent filter feedbacks from ringing past note end?
            // Nah...
        }

        return this;
    }
});

const printGroup$3 = console.groupCollapsed.bind(console, '%cPool %c%s', 'color: #b5002f; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;');
const assign$e = Object.assign;

function Pool(constructor, isIdle, setup) {
    const pool = this.pool = [];

    this.create = function Pooled() {
        let object = pool.find(isIdle);

        if (object) {
            // Support reset() in the instance
            return object.reset ?
                (console.warn('Pool reset fn should be stored on the constructor', constructor, object), object.reset.apply(object, arguments)) :
            // Support reset() on the constructor
            constructor.reset ?
                constructor.reset(object, arguments) :
            object ;
        }

        {
            printGroup$3('  ' + constructor.name, pool.length + 1);
        }

        object = new constructor(...arguments);
        setup && setup(object);
        pool.push(object);

        {
            console.groupEnd();
        }

        return object;
	};
}

assign$e(Pool.prototype, {
    empty: function() {
        this.pool.length = 0;
    },

    find: function(fn) {
        return this.pool.find(fn);
    },

    filter: function(fn) {
        return this.pool.filter(fn);
    },

    reduce: function(fn, value) {
        return this.pool.reduce(fn, value);
    },

    forEach: function(fn) {
        return this.pool.forEach(fn);
    }
});

const DEBUG$3  = window.DEBUG;
const assign$f = Object.assign;
const define$a = Object.defineProperties;

const graph$5 = {
    nodes: [
        { id: 'sink',       type: 'sink' },
        { id: 'pitch',      type: 'constant', data: { offset: 0 } },
        { id: 'detune',     type: 'gain',     data: { gain: 100 } },
        { id: 'modulation', type: 'constant', data: { offset: 120 } },
        { id: 'output',     type: 'gain',     data: {
            channelInterpretation: 'speakers',
            channelCountMode: 'explicit',
            channelCount: 2,
            gain: 1
        }}
    ],

    connections: [
        // Params are not attached to anything by default - they wait
        // to be attached to voices. You can't automate them until they have
        // a route to context.destination. That's just the way things work.
        // Attach them to sink to get them nice and active.
        { source: 'pitch',      target: 'sink' },
        { source: 'modulation', target: 'sink' },
        { source: 'pitch',      target: 'detune' }
    ],

    properties: {
        pitch:      'pitch.offset',
        modulation: 'modulation.offset',
        output:     'output.gain'
    }
};

// Declare some useful defaults
var defaults$7 = assign$f({
    gain:       1,
    pitch:      0,
    modulation: 1,
    output:     0.5,
    voice:      defaults$6
});

const properties$6 = {};

function isIdle(node) {
    return node.startTime !== undefined && node.context.currentTime > node.stopTime;
}

class Instrument extends GainNode {
    constructor(context, settings) {
        if (DEBUG$3) { logGroup$1(new.target === Instrument ? 'Node' : 'mixin ', 'Instrument'); }

        // Init gain node
        super(context, settings);

        // NodeGraph provides the properties and methods:
        // .context
        // .connect()
        // .disconnect()
        // .get()
        NodeGraph.call(this, context, graph$5);

        // Privates
        const privates$1 = privates(this);

        // Properties
        define$a(this, properties$6);
        this.voice = settings.voice;

        // Start constants
        this.get('pitch').start();
        this.get('modulation').start();

        // Voice pool
        privates$1.voices = new Pool(Voice, isIdle, (voice) => {
            // If voice has a detune property connect to it pronto
            if (voice.detune && voice.detune.setValueAtTime) {
                connect(this.get('detune'), voice.detune);
            }

            // If voice has a modulation property connect to it pronto
            if (voice.modulation && voice.modulation.setValueAtTime) {
                connect(this.get('modulation'), voice.modulation);
            }

            connect(voice, this.get('output'));
        });

        // Update settings
        assignSettingz__(this, defaults$7);

        if (DEBUG$3) { logGroupEnd$1(); }
    }
}

assign$f(Instrument.prototype, NodeGraph.prototype, {

    /*
    .start(time, note, velocity)

    Creates a voice node from the data in `.voice`, then calls its `.start()`
    method with the same parameters.

    Returns the voice node, enabling the pattern:

    ```
    instrument
    .start(startTime, note, velocity)
    .stop(stopTime);
    ```
    */

    start: function(time, note, velocity = 1) {
        if (!isDefined(note)) {
            throw new Error('Attempt to .start() a note without passing a note value.')
        }

        const privates$1 = privates(this);

        // Use this as the settings object
        // Todo: is this wise? Dont we want the settings object?
        return privates$1.voices
        .create(this.context, this.voice)
        .start(time, note, velocity);
    },

    /*
    .stop(time, note)

    Stops the first playing voice node found to match `note`. Provided as a
    convenience: normally voice nodes are stopped using their own `.stop()`
    method.

    Returns this.
    */

    stop: function(time, note, velocity = 1) {
        const privates$1 = privates(this);

        time = time || this.context.currentTime;

        // Stop all notes
        if (!isDefined(note)) {
            privates$1.voices.forEach((voice) => {
                voice.stop(time);
            });

            return this;
        }

        const voice = privates$1.voices.find((voice) =>
            voice.name === note
            && note.startTime !== undefined
            && (note.stopTime === undefined || note.stopTime > time)
        );

        if (voice) {
            voice.stop(time, note);
        }

        return this;
    },

    destroy: function() {
        // Privates
        const privates$1 = privates(this);

        this.get('pitch').disconnect();
        this.get('modulation').disconnect();
        this.get('output').disconnect();

        privates$1.voices.forEach((node) => disconnect(node));
    }
});

// Assign defaults
assign$f(Instrument, {
	defaultControls: [{
		source: {
			device: 'midi',
			type: 'note'
		},
		type: 'note'
	}, {
		source: {
			device: 'midi',
			type: 'pitch'
		},
		transform: 'linear',
		min:  -2,
		max:  2,
		type: 'param',
		name: 'pitch'
	}, {
		source: {
			device: 'midi',
			type: 'control',
			name: 'modulation'
		},
		transform: 'logarithmic',
		min:  0.125,
		max:  4,
		type: 'param',
		name: 'frequency'
	}, {
		source: {
			device: 'midi',
			type: 'control',
			name: 'volume'
		},
		transform: 'linear-logarithmic',
		min:  0.00390625,
		max:  1,
		type: 'param',
		name: 'volume'
	}]
});

var constructors$1 = {
    // https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/AnalyserNode
    'analyser': AnalyserNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/AudioBufferSourceNode
    'buffer-source': AudioBufferSourceNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/BiquadFilterNode
    'biquad-filter': BiquadFilterNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/ConstantSourceNode/ConstantSourceNode
    'constant': ConstantSourceNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode/ConvolverNode
    'convolver': ConvolverNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/DelayNode/DelayNode
    'delay': DelayNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode/DynamicsCompressorNode
    'compressor': DynamicsCompressorNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/GainNode/GainNode
    'gain': GainNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/IIRFilterNode/IIRFilterNode
    'iir-filter': IIRFilterNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaElementAudioSourceNode/MediaElementAudioSourceNode
    'element': MediaElementAudioSourceNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode
    'media-source': MediaStreamAudioSourceNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/ChannelMergerNode
    'merger': ChannelMergerNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode/OscillatorNode
    'oscillator': OscillatorNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/PannerNode/PannerNode
    'panner': PannerNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/ChannelSplitterNode/ChannelSplitterNode
    'splitter': ChannelSplitterNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/WaveShaperNode/WaveShaperNode
    'waveshaper': WaveShaperNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/StereoPannerNode/StereoPannerNode
    'pan': StereoPannerNode,

    // ../nodes/meter.js
    'meter': Meter,
    // ../nodes/mix.js
    'eq': EQ,
    // ../nodes/mix.js
    'mix': Mix,
    // ../nodes/envelope.js
    'envelope': Envelope,
    // ../nodes/tick.js
    'tick': Tick,
    // ../nodes/recorder.js
    'recorder': Recorder,
    // ../nodes/sink.js
    'sink': Sink,
    // ../nodes/instrument.js
    'instrument': Instrument,
    // ../nodes/tone.js
    'sample': Sample,
    // ../nodes/tone.js
    'tone': Tone,
    // ../nodes/noise.js
    'noise': Noise
};

/*
ready(fn)
Calls `fn` on DOM content load, or if later than content load, immediately
(on the next tick).
*/

const ready = new Promise(function(accept, reject) {
	function handle(e) {
		document.removeEventListener('DOMContentLoaded', handle);
		window.removeEventListener('load', handle);
		accept(e);
	}

	document.addEventListener('DOMContentLoaded', handle);
	window.addEventListener('load', handle);
});

var ready$1 = ready.then.bind(ready);

/*
style(property, node)

Returns the computed style `property` of `node`.

    style('transform', node);            // returns transform

If `property` is of the form `"property:name"`, a named aspect of the property
is returned.

    style('transform:rotate', node);     // returns rotation, as a number, in radians
    style('transform:scale', node);      // returns scale, as a number
    style('transform:translateX', node); // returns translation, as a number, in px
    style('transform:translateY', node); // returns translation, as a number, in px
*/

var rpx          = /px$/;
var styleParsers = {
	"transform:translateX": function(node) {
		var matrix = computedStyle('transform', node);
		if (!matrix || matrix === "none") { return 0; }
		var values = valuesFromCssFn(matrix);
		return parseFloat(values[4]);
	},

	"transform:translateY": function(node) {
		var matrix = computedStyle('transform', node);
		if (!matrix || matrix === "none") { return 0; }
		var values = valuesFromCssFn(matrix);
		return parseFloat(values[5]);
	},

	"transform:scale": function(node) {
		var matrix = computedStyle('transform', node);
		if (!matrix || matrix === "none") { return 0; }
		var values = valuesFromCssFn(matrix);
		var a = parseFloat(values[0]);
		var b = parseFloat(values[1]);
		return Math.sqrt(a * a + b * b);
	},

	"transform:rotate": function(node) {
		var matrix = computedStyle('transform', node);
		if (!matrix || matrix === "none") { return 0; }
		var values = valuesFromCssFn(matrix);
		var a = parseFloat(values[0]);
		var b = parseFloat(values[1]);
		return Math.atan2(b, a);
	}
};

function valuesFromCssFn(string) {
	return string.split('(')[1].split(')')[0].split(/\s*,\s*/);
}

function computedStyle(name, node) {
	return window.getComputedStyle ?
		window
		.getComputedStyle(node, null)
		.getPropertyValue(name) :
		0 ;
}

function style(name, node) {
    // If name corresponds to a custom property name in styleParsers...
    if (styleParsers[name]) { return styleParsers[name](node); }

    var value = computedStyle(name, node);

    // Pixel values are converted to number type
    return typeof value === 'string' && rpx.test(value) ?
        parseFloat(value) :
        value ;
}

// Units

const runit = /(\d*\.?\d+)(r?em|vw|vh)/;
//var rpercent = /(\d*\.?\d+)%/;

const units = {
	em: function(n) {
		return getFontSize() * n;
	},

	rem: function(n) {
		return getFontSize() * n;
	},

	vw: function(n) {
		return window.innerWidth * n / 100;
	},

	vh: function(n) {
		return window.innerHeight * n / 100;
	}
};

let fontSize;

function getFontSize() {
	return fontSize ||
		(fontSize = style("font-size", document.documentElement), 10);
}

/*
toPx(value)`

Takes a string of the form '10rem', '100vw' or '100vh' and returns a number in pixels.
*/

const toPx = overload(toType, {
	'number': id,

	'string': function(string) {
		var data = runit.exec(string);

		if (data) {
			return units[data[2]](parseFloat(data[1]));
		}

		throw new Error('dom: "' + string + '" cannot be parsed as rem, em, vw or vh units.');
	}
});

const rules = [];

const types$1 = overload(toType, {
    'number':   id,
    'string':   toPx,
    'function': function(fn) { return fn(); }
});

const tests = {
    minWidth: function(value)  { return width >= types$1(value); },
    maxWidth: function(value)  { return width <  types$1(value); },
    minHeight: function(value) { return height >= types$1(value); },
    maxHeight: function(value) { return height <  types$1(value); },
    minScrollTop: function(value) { return scrollTop >= types$1(value); },
    maxScrollTop: function(value) { return scrollTop <  types$1(value); },
    minScrollBottom: function(value) { return (scrollHeight - height - scrollTop) >= types$1(value); },
    maxScrollBottom: function(value) { return (scrollHeight - height - scrollTop) <  types$1(value); }
};

let width = window.innerWidth;
let height = window.innerHeight;
let scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
let scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;

function test(query) {
    var keys = Object.keys(query);
    var n = keys.length;
    var key;

    if (keys.length === 0) { return false; }

    while (n--) {
        key = keys[n];
        if (!tests[key](query[key])) { return false; }
    }

    return true;
}

function update$2(e) {
    var l = rules.length;
    var rule;

    // Run exiting rules
    while (l--) {
        rule = rules[l];

        if (rule.state && !test(rule.query)) {
            rule.state = false;
            rule.exit && rule.exit(e);
        }
    }

    l = rules.length;

    // Run entering rules
    while (l--) {
        rule = rules[l];

        if (!rule.state && test(rule.query)) {
            rule.state = true;
            rule.enter && rule.enter(e);
        }
    }
}

function scroll(e) {
    scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    update$2(e);
}

function resize(e) {
    width = window.innerWidth;
    height = window.innerHeight;
    scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    update$2(e);
}

window.addEventListener('scroll', scroll);
window.addEventListener('resize', resize);

ready$1(update$2);
document.addEventListener('DOMContentLoaded', update$2);

/*
prefix(string)
Returns a prefixed CSS property name where a prefix is required in the current
browser.
*/

const prefixes = ['Khtml','O','Moz','Webkit','ms'];

var node = document.createElement('div');
var cache$2 = {};

function testPrefix(prop) {
    if (prop in node.style) { return prop; }

    var upper = prop.charAt(0).toUpperCase() + prop.slice(1);
    var l = prefixes.length;
    var prefixProp;

    while (l--) {
        prefixProp = prefixes[l] + upper;

        if (prefixProp in node.style) {
            return prefixProp;
        }
    }

    return false;
}

function prefix$1(prop){
    return cache$2[prop] || (cache$2[prop] = testPrefix(prop));
}

const define$b = Object.defineProperties;

/*
features

An object of feature detection results.

```
{
    inputEventsWhileDisabled: true, // false in FF, where disabled inputs don't trigger events
    template: true,                 // false in old browsers where template.content not found
    textareaPlaceholderSet: true,   // false in IE, where placeholder is also set on innerHTML
    transition: true,               // false in older browsers where transitions not supported
    fullscreen: true,               // false where fullscreen API not supported
    scrollBehavior: true,           // Whether scroll behavior CSS is supported
    events: {
        fullscreenchange: 'fullscreenchange',
        transitionend:    'transitionend'
    }
}
```
*/

var features = define$b({
	events: define$b({}, {
		fullscreenchange: {
			get: cache(function() {
				// TODO: untested event names
				return ('fullscreenElement' in document) ? 'fullscreenchange' :
				('webkitFullscreenElement' in document) ? 'webkitfullscreenchange' :
				('mozFullScreenElement' in document) ? 'mozfullscreenchange' :
				('msFullscreenElement' in document) ? 'MSFullscreenChange' :
				'fullscreenchange' ;
			}),

			enumerable: true
		},

		transitionend: {
			// Infer transitionend event from CSS transition prefix

			get: cache(function() {
				var end = {
					KhtmlTransition: false,
					OTransition: 'oTransitionEnd',
					MozTransition: 'transitionend',
					WebkitTransition: 'webkitTransitionEnd',
					msTransition: 'MSTransitionEnd',
					transition: 'transitionend'
				};

				var prefixed = prefix$1('transition');
				return prefixed && end[prefixed];
			}),

			enumerable: true
		}
	})
}, {
	inputEventsWhileDisabled: {
		// FireFox won't dispatch any events on disabled inputs:
		// https://bugzilla.mozilla.org/show_bug.cgi?id=329509

		get: cache(function() {
			var input     = document.createElement('input');
			var testEvent = Event('featuretest');
			var result    = false;

			document.body.appendChild(input);
			input.disabled = true;
			input.addEventListener('featuretest', function(e) { result = true; });
			input.dispatchEvent(testEvent);
			input.remove();

			return result;
		}),

		enumerable: true
	},

	template: {
		get: cache(function() {
			// Older browsers don't know about the content property of templates.
			return 'content' in document.createElement('template');
		}),

		enumerable: true
	},

	textareaPlaceholderSet: {
		// IE sets textarea innerHTML (but not value) to the placeholder
		// when setting the attribute and cloning and so on. The twats have
		// marked it "Won't fix":
		//
		// https://connect.microsoft.com/IE/feedback/details/781612/placeholder-text-becomes-actual-value-after-deep-clone-on-textarea

		get: cache(function() {
			var node = document.createElement('textarea');
			node.setAttribute('placeholder', '---');
			return node.innerHTML === '';
		}),

		enumerable: true
	},

	transition: {
		get: cache(function testTransition() {
			var prefixed = prefix$1('transition');
			return prefixed || false;
		}),

		enumerable: true
	},

	fullscreen: {
		get: cache(function testFullscreen() {
			var node = document.createElement('div');
			return !!(node.requestFullscreen ||
				node.webkitRequestFullscreen ||
				node.mozRequestFullScreen ||
				node.msRequestFullscreen);
		}),

		enumerable: true
	},

	scrollBehavior: {
		get: cache(function() {
			return 'scrollBehavior' in document.documentElement.style;
		})
	}
});

/*
escape(string)
Escapes `string` for setting safely as HTML.
*/

var pre  = document.createElement('pre');
var text = document.createTextNode('');

pre.appendChild(text);

var mimetypes = {
	xml: 'application/xml',
	html: 'text/html',
	svg: 'image/svg+xml'
};

function parse(type, string) {
	if (!string) { return; }

	var mimetype = mimetypes[type];
	var xml;

	// From jQuery source...
	try {
		xml = (new window.DOMParser()).parseFromString(string, mimetype);
	} catch (e) {
		xml = undefined;
	}

	if (!xml || xml.getElementsByTagName("parsererror").length) {
		throw new Error("dom: Invalid XML: " + string);
	}

	return xml;
}

curry$1(parse, true);

// Types

function attribute(name, node) {
	return node.getAttribute && node.getAttribute(name) || undefined ;
}

curry$1(attribute, true);

function contains$2(child, node) {
	return node.contains ?
		node.contains(child) :
	child.parentNode ?
		child.parentNode === node || contains$2(child.parentNode, node) :
	false ;
}

curry$1(contains$2, true);

/*
tag(node)

Returns the tag name of `node`.

```
const li = create('li', 'Salt and vinegar');
tag(li);   // 'li'
```
*/

function tag(node) {
	return node.tagName && node.tagName.toLowerCase();
}

function matches$2(selector, node) {
	return node.matches ? node.matches(selector) :
		node.matchesSelector ? node.matchesSelector(selector) :
		node.webkitMatchesSelector ? node.webkitMatchesSelector(selector) :
		node.mozMatchesSelector ? node.mozMatchesSelector(selector) :
		node.msMatchesSelector ? node.msMatchesSelector(selector) :
		node.oMatchesSelector ? node.oMatchesSelector(selector) :
		// Dumb fall back to simple tag name matching. Nigh-on useless.
		tag(node) === selector ;
}

var matches$3 = curry$1(matches$2, true);

function closest(selector, node) {
	var root = arguments[2];

	if (!node || node === document || node === root || node.nodeType === 11) { return; }

	// SVG <use> elements store their DOM reference in
	// .correspondingUseElement.
	node = node.correspondingUseElement || node ;

	return matches$3(selector, node) ?
		 node :
		 closest(selector, node.parentNode, root) ;
}

var closest$1 = curry$1(closest, true);

function find$2(selector, node) {
	return node.querySelector(selector);
}

curry$1(find$2, true);

function select(selector, node) {
	return toArray(node.querySelectorAll(selector));
}

curry$1(select, true);

/*
children(node)

Returns an array of child elements of `node`.
*/

/*
append(target, node)`

Appends node to `target`.

If `node` is a collection of nodes, appends each node to `target`.
*/

if (!Element.prototype.append) {
    console.warn('A polyfill for Element.append() is needed (https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/append)');
}

function append$1(target, node) {
    target.append(node);
    return node;
}

/*
assign(node, attributes)

Sets the key-value pairs of the object `attributes` as attributes on `node`.
*/

const setAttribute = overload(id, {
	html: function(name, node, content) {
		node.innerHTML = content;
	},

	children: function(name, node, content) {
		content.forEach((child) => { node.appendChild(child); });
	},

	default: function(name, node, content) {
		if (name in node) {
			node[name] = content;
		}
		else {
			node.setAttribute(name, content);
		}
	}
});

function assignAttributes(node, attributes) {
	var names = Object.keys(attributes);
	var n = names.length;

	while (n--) {
		setAttribute(names[n], node, attributes[names[n]]);
	}
}

if (!Element.prototype.prepend) {
    console.warn('A polyfill for Element.prepend() is needed (https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/prepend)');
}

function prepend$2(target, node) {
    target.prepend(node);
    return node;
}

/*
clone(node)`

Returns a deep copy of `node`.
*/

features.textareaPlaceholderSet ?

	function clone(node) {
		return node.cloneNode(true);
	} :

	function cloneWithHTML(node) {
		// IE sets textarea innerHTML to the placeholder when cloning.
		// Reset the resulting value.

		var clone     = node.cloneNode(true);
		var textareas = select('textarea', node);
		var n         = textareas.length;
		var clones;

		if (n) {
			clones = select('textarea', clone);

			while (n--) {
				clones[n].value = textareas[n].value;
			}
		}

		return clone;
	} ;

const testDiv      = document.createElement('div');

/*
identify(node)

Returns the id of `node`, or where `node` has no id, a random id is generated,
checked against the DOM for uniqueness, set on `node` and returned:

```
query('button', document)
.map(identify)
.forEach((id) => ...)
```
*/

/* DOM Mutation */

/*
remove(node)

Removes `node` from the DOM.
*/

function remove$3(node) {
	if (node.remove) {
		node.remove();
	}
	else {
		console.warn('deprecated: remove() no longer removes lists of nodes.');
		node.parentNode && node.parentNode.removeChild(node);
	}

	return node;
}

/*
before(target, node)

Inserts `node` before target.
*/

function before(target, node) {
	target.parentNode && target.parentNode.insertBefore(node, target);
	return node;
}

/*
after(target, node)

Inserts `node` after `target`.
*/

function after(target, node) {
	target.parentNode && target.parentNode.insertBefore(node, target.nextSibling);
	return node;
}

/*
replace(target, node)

Swaps `target` for `node`.
*/

function replace(target, node) {
	before(target, node);
	remove$3(target);
	return node;
}

const classes = get$1('classList');

/*
addClass(class, node)
Adds `'class'` to the classList of `node`.
*/

function addClass(string, node) {
	classes(node).add(string);
}

/*
removeClass(class, node)
Removes `'class'` from the classList of `node`.
*/

function removeClass(string, node) {
	classes(node).remove(string);
}

function requestFrame(n, fn) {
	// Requst frames until n is 0, then call fn
	(function frame(t) {
		return n-- ?
			requestAnimationFrame(frame) :
			fn(t);
	})();
}

function frameClass(string, node) {
	var list = classes(node);
	list.add(string);

	// Chrome (at least) requires 2 frames - I guess in the first, the
	// change is painted so we have to wait for the second to undo
	requestFrame(2, () => list.remove(string));
}

/*
box(node)

Returns a `DOMRect` object describing the draw box of `node`.
(If `node` is `window` a plain object is returned).
*/

function windowBox() {
	return {
		left:   0,
		top:    0,
		right:  window.innerWidth,
		bottom: window.innerHeight,
		width:  window.innerWidth,
		height: window.innerHeight
	};
}

function box(node) {
	return node === window ?
		windowBox() :
		node.getClientRects()[0] ;
}

/*
bounds(node)

Returns a `DOMRect` object describing the bounding box of `node` and its
descendants.
*/

function offset(node1, node2) {
	var box1 = box(node1);
	var box2 = box(node2);
	return [box2.left - box1.left, box2.top - box1.top];
}

if (!NodeList.prototype.forEach) {
    console.warn('A polyfill for NodeList.forEach() is needed (https://developer.mozilla.org/en-US/docs/Web/API/NodeList/forEach)');
}

const assign$g      = Object.assign;
const CustomEvent = window.CustomEvent;

const defaults$8    = {
	// The event bubbles (false by default)
	// https://developer.mozilla.org/en-US/docs/Web/API/Event/Event
	bubbles: true,

	// The event may be cancelled (false by default)
	// https://developer.mozilla.org/en-US/docs/Web/API/Event/Event
	cancelable: true

	// Trigger listeners outside of a shadow root (false by default)
	// https://developer.mozilla.org/en-US/docs/Web/API/Event/composed
	//composed: false
};

/*
Event(type, properties)

Creates a CustomEvent of type `type`.
Additionally, `properties` are assigned to the event object.
*/

function Event$1(type, options) {
	let settings;

	if (typeof type === 'object') {
		settings = assign$g({}, defaults$8, type);
		type = settings.type;
	}

	if (options && options.detail) {
		if (settings) {
			settings.detail = options.detail;
		}
		else {
			settings = assign$g({ detail: options.detail }, defaults$8);
		}
	}

	var event = new CustomEvent(type, settings || defaults$8);

	if (options) {
		delete options.detail;
		assign$g(event, options);
	}

	return event;
}

const assign$h  = Object.assign;
const rspaces = /\s+/;

function prefixType(type) {
	return features.events[type] || type ;
}


// Handle event types

// DOM click events may be simulated on inputs when their labels are
// clicked. The tell-tale is they have the same timeStamp. Track click
// timeStamps.
var clickTimeStamp = 0;

window.addEventListener('click', function(e) {
	clickTimeStamp = e.timeStamp;
});

function listen$1(source, type) {
	if (type === 'click') {
		source.clickUpdate = function click(e) {
			// Ignore clicks with the same timeStamp as previous clicks –
			// they are likely simulated by the browser.
			if (e.timeStamp <= clickTimeStamp) { return; }
			source.update(e);
		};

		source.node.addEventListener(type, source.clickUpdate, source.options);
		return source;
	}

	source.node.addEventListener(type, source.update, source.options);
	return source;
}

function unlisten$1(source, type) {
	source.node.removeEventListener(type, type === 'click' ?
		source.clickUpdate :
		source.update
	);

	return source;
}

/*
events(type, node)

Returns a mappable stream of events heard on `node`:

    var stream = events('click', document.body);
    .map(get('target'))
    .each(function(node) {
        // Do something with nodes
    });

Stopping the stream removes the event listeners:

    stream.stop();
*/

function Source(notify, stop, type, options, node) {
	const types  = type.split(rspaces).map(prefixType);
	const buffer = [];

	function update(value) {
		buffer.push(value);
		notify();
	}

	this._stop   = stop;
	this.types   = types;
	this.node    = node;
	this.buffer  = buffer;
	this.update  = update;
	this.options = options;

	// Potential hard-to-find error here if type has repeats, ie 'click click'.
	// Lets assume nobody is dumb enough to do this, I dont want to have to
	// check for that every time.
	types.reduce(listen$1, this);
}

assign$h(Source.prototype, {
	shift: function shiftEvent() {
		const buffer = this.buffer;
		return buffer.shift();
	},

	stop: function stopEvent() {
		this.types.reduce(unlisten$1, this);
		this._stop(this.buffer.length);
	}
});

function events(type, node) {
	let options;

	if (typeof type === 'object') {
		options = type;
		type    = options.type;
	}

	return new Stream$1(function(notify, stop) {
		return new Source(notify, stop, type, options, node)
	});
}


// -----------------

const A$4 = Array.prototype;
const eventsSymbol = Symbol('events');

function applyTail(fn, args) {
	return function() {
		A$4.push.apply(arguments, args);
		fn.apply(null, arguments);
	};
}

function on$1(node, type, fn) {
	var options;

	if (typeof type === 'object') {
		options = type;
		type    = options.type;
	}

	var types   = type.split(rspaces);
	var events  = node[eventsSymbol] || (node[eventsSymbol] = {});
	var handler = arguments.length > 3 ? applyTail(fn, A$4.slice.call(arguments, 3)) : fn ;
	var handlers, listener;
	var n = -1;

	while (++n < types.length) {
		type = types[n];
		handlers = events[type] || (events[type] = []);
		listener = type === 'click' ?
			function(e) {
				// Ignore clicks with the same timeStamp as previous clicks –
				// they are likely simulated by the browser on inputs when
				// their labels are clicked
				if (e.timeStamp <= clickTimeStamp) { return; }
				handler(e);
			} :
			handler ;
		handlers.push([fn, listener]);
		node.addEventListener(type, listener, options);
	}

	return node;
}

function once(node, types, fn, data) {
	on$1(node, types, function once() {
		off$1(node, types, once);
		fn.apply(null, arguments);
	}, data);
}

function off$1(node, type, fn) {
	var options;

	if (typeof type === 'object') {
		options = type;
		type    = options.type;
	}

	var types   = type.split(rspaces);
	var events  = node[eventsSymbol];
	var handlers, i;

	if (!events) { return node; }

	var n = -1;
	while (n++ < types.length) {
		type = types[n];
		handlers = events[type];
		if (!handlers) { continue; }
		i = handlers.length;
		while (i--) {
			if (handlers[i][0] === fn) {
				node.removeEventListener(type, handlers[i][1]);
				handlers.splice(i, 1);
			}
		}
	}

	return node;
}

/*
trigger(type, node)

Triggers event of `type` on `node`.

```
trigger('dom-activate', node);
```
*/

function trigger(node, type, properties) {
	// Don't cache events. It prevents you from triggering an event of a
	// given type from inside the handler of another event of that type.
	var event = Event$1(type, properties);
	node.dispatchEvent(event);
}

// trigger('type', node)

function trigger$1(type, node) {
    let properties;

    if (typeof type === 'object') {
        properties = type;
        type = properties.type;
    }

    // Don't cache events. It prevents you from triggering an event of a
	// given type from inside the handler of another event of that type.
	var event = Event$1(type, properties);
	node.dispatchEvent(event);
    return node;
}

function delegate(selector, fn) {
	// Create an event handler that looks up the ancestor tree
	// to find selector.
	return function handler(e) {
		var node = closest$1(selector, e.target, e.currentTarget);
		if (!node) { return; }
		e.delegateTarget = node;
		fn(e, node);
		e.delegateTarget = undefined;
	};
}

const keyStrings = {
	8:  'backspace',
	9:  'tab',
	13: 'enter',
	16: 'shift',
	17: 'ctrl',
	18: 'alt',
	27: 'escape',
	32: 'space',
	33: 'pageup',
	34: 'pagedown',
	35: 'pageright',
	36: 'pageleft',
	37: 'left',
	38: 'up',
	39: 'right',
	40: 'down',
	46: 'delete',
	48: '0',
	49: '1',
	50: '2',
	51: '3',
	52: '4',
	53: '5',
	54: '6',
	55: '7',
	56: '8',
	57: '9',
	65: 'a',
	66: 'b',
	67: 'c',
	68: 'd',
	69: 'e',
	70: 'f',
	71: 'g',
	72: 'h',
	73: 'i',
	74: 'j',
	75: 'k',
	76: 'l',
	77: 'm',
	78: 'n',
	79: 'o',
	80: 'p',
	81: 'q',
	82: 'r',
	83: 's',
	84: 't',
	85: 'u',
	86: 'v',
	87: 'w',
	88: 'x',
	89: 'y',
	90: 'z',
	// Mac Chrome left CMD
	91: 'cmd',
	// Mac Chrome right CMD
	93: 'cmd',
	186: ';',
	187: '=',
	188: ',',
	189: '-',
	190: '.',
	191: '/',
	219: '[',
	220: '\\',
	221: ']',
	222: '\'',
	// Mac FF
	224: 'cmd'
};

const keyCodes = Object.entries(keyStrings).reduce(function(object, entry) {
	object[entry[1]] = parseInt(entry[0], 10);
	return object;
}, {});

function toKeyCode(keyString) {
	return keyCodes[keyString];
}

function toKeyString(keyCode) {
	return keyStrings[keyCode];
}

/*
transition(duration, fn)

Calls `fn` on each animation frame until `duration` seconds has elapsed. `fn`
is passed a single argument `progress`, a number that ramps from `0` to `1` over
the duration of the transition. Returns a function that cancels the transition.

```
transition(3, function(progress) {
    // Called every frame for 3 seconds
});
```
*/

const performance$1           = window.performance;
const requestAnimationFrame$1 = window.requestAnimationFrame;
const cancelAnimationFrame$1  = window.cancelAnimationFrame;

function transition(duration, fn) {
	var t0 = performance$1.now();

	function frame(t1) {
		// Progress from 0-1
		var progress = (t1 - t0) / (duration * 1000);

		if (progress < 1) {
			if (progress > 0) {
				fn(progress);
			}
			id = requestAnimationFrame$1(frame);
		}
		else {
			fn(1);
		}
	}

	var id = requestAnimationFrame$1(frame);

	return function cancel() {
		cancelAnimationFrame$1(id);
	};
}

function animate(duration, transform, name, object, value) {
	// denormaliseLinear is not curried! Wrap it.
    const startValue = object[name];
	return transition(
		duration,
		pipe(transform, (v) => linear$1(startValue, value, v), set$1(name, object))
	);
}

const define$c = Object.defineProperties;

define$c({
    left: 0
}, {
    right:  { get: function() { return window.innerWidth; }, enumerable: true, configurable: true },
    top:    { get: function() { return style('padding-top', document.body); }, enumerable: true, configurable: true },
    bottom: { get: function() { return window.innerHeight; }, enumerable: true, configurable: true }
});

/*
scrollRatio(node)
Return the ratio of scrollTop to scrollHeight - clientHeight.
*/

const assign$i = Object.assign;

/*
config

```{
	headers:    fn(data),    // Must return an object with properties to add to the header
	body:       fn(data),    // Must return an object to send as data
	onresponse: function(response)
}```
*/

const config$1 = {
    // Takes data, returns headers
	headers: function(data) { return {}; },

	// Takes data (can be FormData object or plain object), returns data
	body: id,

	// Takes response, returns response
	onresponse: function(response) {
		// If redirected, navigate the browser away from here. Can get
		// annoying when receiving 404s, maybe not a good default...
		if (response.redirected) {
			window.location = response.url;
			return;
		}

		return response;
	}
};

const createHeaders = choose({
	'application/x-www-form-urlencoded': function(headers) {
		return assign$i(headers, {
			"Content-Type": 'application/x-www-form-urlencoded',
			"X-Requested-With": "XMLHttpRequest"
		});
	},

	'application/json': function(headers) {
		return assign$i(headers, {
			"Content-Type": "application/json; charset=utf-8",
			"X-Requested-With": "XMLHttpRequest"
		});
	},

	'multipart/form-data': function(headers) {
		return assign$i(headers, {
			"Content-Type": 'multipart/form-data',
			"X-Requested-With": "XMLHttpRequest"
		});
	},

	'audio/wav': function(headers) {
		return assign$i(headers, {
			"Content-Type": 'audio/wav',
			"X-Requested-With": "XMLHttpRequest"
		});
	},

	'default': function(headers) {
		return assign$i(headers, {
			"Content-Type": 'application/x-www-form-urlencoded',
			"X-Requested-With": "XMLHttpRequest"
		});
	}
});

const createBody = choose({
	'application/json': function(data) {
		return data.get ?
			formDataToJSON(data) :
			JSON.stringify(data);
	},

	'application/x-www-form-urlencoded': function(data) {
		return data.get ?
			formDataToQuery(data) :
			dataToQuery(data) ;
	},

	'multipart/form-data': function(data) {
		// Mmmmmhmmm?
		return data.get ?
            data :
            dataToFormData(data) ;
	}
});

function formDataToJSON(formData) {
	return JSON.stringify(
		// formData.entries() is an iterator, not an array
		Array
		.from(formData.entries())
		.reduce(function(output, entry) {
			output[entry[0]] = entry[1];
			return output;
		}, {})
	);
}

function formDataToQuery(data) {
	return new URLSearchParams(data).toString();
}

function dataToQuery(data) {
	return Object.keys(data).reduce((params, key) => {
		params.append(key, data[key]);
		return params;
	}, new URLSearchParams());
}

function dataToFormData(data) {
    throw new Error('TODO: dataToFormData(data)');
}

function urlFromData(url, data) {
	// Form data
	return data instanceof FormData ?
		url + '?' + formDataToQuery(data) :
		url + '?' + dataToQuery(data) ;
}

function createOptions(method, mimetype, data, controller) {
	return method === 'GET' ? {
		method:  method,
		headers: createHeaders(mimetype, config$1.headers ? config$1.headers(data) : {}),
		credentials: 'same-origin',
		signal: controller && controller.signal
	} : {
		method:  method,
		// Process headers before body, allowing us to read a CSRFToken,
        // which may be in data, in createHeaders() before removing it
        // from data in body().
		headers: createHeaders(mimetype, config$1.headers ? config$1.headers(data) : {}),
		body:    createBody(mimetype, config$1.body ? config$1.body(data) : data),
		credentials: 'same-origin',
		signal: controller && controller.signal
	} ;
}

const responders = {
	'text/html': respondText,
	'application/json': respondJSON,
	'multipart/form-data': respondForm,
	'application/x-www-form-urlencoded': respondForm,
	'audio': respondBlob,
	'audio/wav': respondBlob,
	'audio/m4a': respondBlob
};

function respondBlob(response) {
	return response.blob();
}

function respondJSON(response) {
	return response.json();
}

function respondForm(response) {
	return response.formData();
}

function respondText(response) {
	return response.text();
}

function respond(response) {
	if (config$1.onresponse) {
		response = config$1.onresponse(response);
	}

	if (!response.ok) {
		throw new Error(response.statusText + '');
	}

	// Get mimetype from Content-Type, remembering to hoik off any
	// parameters first
	const mimetype = response.headers
	.get('Content-Type')
	.replace(/\;.*$/, '');

	return responders[mimetype](response);
}


/*
request(type, mimetype, url, data)
*/

function request$2(type = 'GET', mimetype = 'application/json', url, data) {
	const method = type.toUpperCase();

	// If this is a GET and there is data, append data to the URL query string
	if (method === 'GET' && data) {
		url = urlFromData(url, data);
	}

	// param[4] is an optional abort controller
	return fetch(url, createOptions(method, mimetype, data, arguments[4]))
	.then(respond);
}

if (window.console && window.console.log) {
    window.console.log('%cdom%c         – https://github.com/stephband/dom', 'color: #3a8ab0; font-weight: 600;', 'color: inherit; font-weight: 400;');
}
const assign$j  = curry$1(assignAttributes, true);
const append$2  = curry$1(append$1, true);
const prepend$3 = curry$1(prepend$2, true);
const before$1  = curry$1(before, true);
const after$1   = curry$1(after, true);
const replace$1 = curry$1(replace, true);
const addClass$1    = curry$1(addClass, true);
const removeClass$1 = curry$1(removeClass, true);
const frameClass$1  = curry$1(frameClass, true);
const offset$1 = curry$1(offset, true);
const style$1 = curry$1(style, true);
const events$1 = curry$1(events, true);

// Legacy uncurried functions

Object.assign(events$1, {
    on:      on$1,
    once:    once,
    off:     off$1,
    trigger: trigger
});

const on$2 = curry$1(function(type, fn, node) {
    on$1(node, type, fn);
    return node;
}, true);

const off$2 = curry$1(function(type, fn, node) {
    off$1(node, type, fn);
    return node;
}, true);
const trigger$2 = curry$1(trigger$1, true);
const delegate$1 = curry$1(delegate, true);
const animate$1 = curry$1(animate, true);
const transition$1 = curry$1(transition, true);
const request$3 = curry$1(request$2, true, 4);

/*
KeyboardInputSource(selector)

Constructor of muteable objects representing keyboard input bindings. Sources
have the properties:

- `key`

and the methods:

- `each(fn)`: registers `fn` to consume the stream of input messages
- `stop()`: stops the stream of input messages
*/
const define$d    = Object.defineProperties;

const keyRoutes = {};

const keymap = {
    192: 43,
    65:  44,
    90:  45,
    83:  46,
    88:  47,
    67:  48, // C3
    70:  49,
    86:  50,
    71:  51,
    66:  52,
    78:  53,
    74:  54,
    77:  55,
    75:  56,
    188: 57, // A3
    76:  58,
    190: 59,
    191: 60, // C4
    222: 61,

    49:  54,
    81:  55,
    50:  56,
    87:  57,
    51:  58,
    69:  59,
    82:  60, // C4
    53:  61,
    84:  62,
    54:  63,
    89:  64,
    85:  65,
    56:  66,
    73:  67,
    57:  68,
    79:  69,
    48:  70,
    80:  71,
    219: 72, // C5
    187: 73,
    221: 74
};

// A map of currently pressed keys
const keys = {};

const ignoreInputs = {
    'text': true,
    'number': true
};

const ignoreTags = {
    'select': (e) => true,
    'input': (e) => ignoreInputs[e.target.type]
};

function ignore(e) {
    return ignoreTags[e.target.tagName] && ignoreTags[e.target.tagName](e);
}

function fireKeydown(e, fn) {
    // Don't trigger keys that don't map to something
    if (toKeyString(e.keyCode) === undefined) { return; }
    fn(e.timeStamp, 'keydown', toKeyString(e.keyCode), 1);
    return e;
}

function fireKeyup(e, fn) {
    // Don't trigger keys that don't map to something
    if (toKeyString(e.keyCode) === undefined) { return; }
    fn(e.timeStamp, 'keyup', toKeyString(e.keyCode), 0);
    return e;
}

function fireNoteOn(e, fn) {
    // Don't trigger keys that don't map to something
    if (keymap[e.keyCode] === undefined) { return; }
    fn(e.timeStamp, 'noteon', keymap[e.keyCode], 1);
    return e;
}

function fireNoteOff(e, fn) {
    // Don't trigger keys that don't map to something
    if (keymap[e.keyCode] === undefined) { return; }
    fn(e.timeStamp, 'noteoff', keymap[e.keyCode], 0);
    return e;
}

function keydown(e) {
    // Protect against multiple keydowns fired by the OS when
    // the key is held down
    if (keys[e.keyCode]) { return; }
    keys[e.keyCode] = true;

    // Ignore key presses from interactive elements - inputs etc.
    if (ignore(e)) { return; }

    keyRoutes[e.keyCode] && keyRoutes[e.keyCode].reduce(fireKeydown, e);
    keyRoutes.piano && keyRoutes.piano.reduce(fireNoteOn, e);
    keyRoutes['undefined'] && keyRoutes['undefined'].reduce(fireNoteOn, e);
}

function keyup(e) {
    keys[e.keyCode] = false;

    // Ignore key presses from interactive elements
    if (ignore(e)) { return; }

    keyRoutes[e.keyCode] && keyRoutes[e.keyCode].reduce(fireKeyup, e);
    keyRoutes.piano && keyRoutes.piano.reduce(fireNoteOff, e);
    keyRoutes['undefined'] && keyRoutes['undefined'].reduce(fireNoteOff, e);
}

document.addEventListener('keydown', keydown);
document.addEventListener('keyup', keyup);

function KeyboardInputSource(selector) {
    const handler = function handler(timeStamp, type, param, value) {
        return fn(timeStamp, type, param, value);
    };

    let fn      = noop$1;
    let keyCode = selector.key === 'piano' ?
        'piano' :
        toKeyCode(selector.key) ;

    define$d(this, {
        device: {
            enumerable: true,
            value: 'keyboard'
        },

        key: {
            enumerable: true,
            get: function() { return toKeyString(keyCode); },
            set: function(value) {
                (keyRoutes[keyCode] && remove$1(keyRoutes[keyCode], handler));
                keyCode = value === 'piano' ?
                    'piano' :
                    toKeyCode(value) ;
                (keyRoutes[keyCode] || (keyRoutes[keyCode] = [])).push(handler);
            }
        }
    });

    this.each = function each(input) {
        //(keyRoutes[keyCode] && remove(keyRoutes[keyCode], fn));
        fn = input;

        if (!keyRoutes[keyCode]) {
            keyRoutes[keyCode] = [handler];
        }
        else if (keyRoutes[keyCode].indexOf(handler) === -1) {
            keyRoutes[keyCode].push(handler);
        }
    };

    this.stop = function() {
        (keyRoutes[keyCode] && remove$1(keyRoutes[keyCode], handler));
        fn = noop$1;
    };
}

function isKeyboardInputSource(source) {
    return source instanceof KeyboardInputSource;
}

/*
MIDIInputSource(selector)

Constructor of muteable objects representing MIDI Input bindings. Sources have
the properties:

- `port`
- `channel;`
- `type`
- `name`
- `value`

and the methods:

- `each(fn)`: registers `fn` to consume the stream of input messages
- `stop()`: stops the stream of input messages
*/
const define$e = Object.defineProperties;

const normaliseName = choose({
    pitch:        (message) => 'pitch',
    channeltouch: (message) => 'all',
    default:      (message) => message[1]
});

const normaliseValue = choose({
    control:      (message) => int7ToWeightedFloat(message[2]),
    pitch:        (message) => bytesToWeightedFloat(message[1], message[2]),
    default:      (message) => int7ToFloat(message[2])
});

function MIDIInputSource(data) {
    const handler = function handler(e) {
        const message = e.data;
        const type    = toType$2(message[0]);
        return fn(e.timeStamp, type, normaliseName(type, message), normaliseValue(type, message));
    };

    const selector = {
        port:    data.port,
        channel: data.channel,
        type:    data.type === 'all' ? undefined : data.type,
        name:    data.name,
        value:   data.value
    };

    let fn;

    define$e(this, {
        device: {
            enumerable: true,
            value: 'midi'
        },

        port: {
            enumerable: true,
            get: function() { return selector.port; },
            set: function(value) {
                off(selector, handler);
                selector.port = value;
                on(selector, handler);
            }
        },

        channel: {
            enumerable: true,
            get: function() { return selector.channel; },
            set: function(value) {
                off(selector, handler);
                selector.channel = value;
                on(selector, handler);
            }
        },

        type: {
            enumerable: true,
            get: function() { return selector.type || 'all'; },
            set: function(value) {
                off(selector, handler);
                selector.type = value;
                on(selector, handler);
            }
        },

        name: {
            enumerable: true,
            get: function() { return selector.name; },
            set: function(value) {
                off(selector, handler);
                selector.name = value;
                on(selector, handler);
            }
        },

        value: {
            enumerable: true,
            get: function() { return selector.value; },
            set: function(value) {
                off(selector, handler);
                selector.value = value;
                on(selector, handler);
            }
        }
    });

    this.each = function each(input) {
        fn = input;
    };

    this.stop = function() {
        off(selector, handler);
        fn = noop$1;
    };

    on(selector, handler);
}




function isMIDIInputSource(source) {
    return source instanceof MIDIInputSource;
}

function arg2() {
    return arguments[2];
}

const distributors = {

    // Event types
    //
    // [time, "rate", number, curve]
    // [time, "meter", numerator, denominator]
    // [time, "note", number, velocity, duration]
    // [time, "noteon", number, velocity]
    // [time, "noteoff", number]
    // [time, "param", name, value, curve]
    // [time, "pitch", semitones]
    // [time, "chord", root, mode, duration]
    // [time, "sequence", name || events, target, duration, transforms...]

    'note': function(target, time, type, name, value, duration, notify) {
        const number = typeof name === 'number' ? name : toNoteNumber(name) ;
        return (target.start(time, number, value) || target).stop(time + duration, number, value);
    },

    'noteon': function(target, time, type, name, value, duration, notify) {
        const number = typeof name === 'number' ? name : toNoteNumber(name) ;
        return target.start(time, number, value) || target;
    },

    'noteoff': function(target, time, type, name, value, duration, notify) {
        const number = typeof name === 'number' ? name : toNoteNumber(name) ;
        target.stop(time, number, value);
        return target;
    },

    'sequence': function(target, time, type, sequenceId, rate, nodeId, notify) {
        const sequence = target.sequences.find(matches$1({ id: sequenceId }));

        if (!sequence) {
            throw new Error('Sequence "' + sequenceId + '" not found')
        }

        const node = target.get(nodeId);

        if (!node) {
            throw new Error('Node "' + nodeId + '" not found')
        }

        // Stream events
		return {
			clock:     target,
			transport: target,
			events:    sequence.events,
			buffer:    [],
			commands:  [],
			stopCommands: [],
			processed: {},
			// Where target come from?
			target:    node,
			targets:   new Map()
		};
    },

    'param': function(target, time, type, name, value, duration, notify, context) {
        const param = target[name];

        if (!param || !param.setValueAtTime) {
            console.warn('Node property "' + name + '" is not an AudioParam', target);
            return;
        }

        // param, time, curve, value, duration, notify, context
        automato__(target, name, time, 'step', value, null, notify, target.context);
        return target;
    },

    'invoke': function(target, time, type, name, value) {
        target[name](time, value);
        return target;
    },

    'default': function(target, time, type, name, value, duration, notify) {
        print('Cannot cue unrecognised type "' + type + '". (Possible types: noteon, noteoff, noteparam, param).' );
    }
};

const distribute = overload(arg2, distributors);




function Distribute(target, notify) {
    const node  = target.data;
    const notes = {};

    return function distributeEvents(time, type, name, value, duration) {
        if (time < node.context.currentTime) {
            { print('Jitter warning. Control time (' + time.toFixed(3) + ') less than currentTime (' + node.context.currentTime.toFixed(3) + ')', 'Using currentTime'); }
            time = node.context.currentTime;
        }

        if (type === 'noteon') {
            // Avoid doubled notes
            if (notes[name]) { return; }
            // node, time, type, name, value
            notes[name] = distribute(node, time, type, name, value, null, notify);
        }
        else if (type === 'noteoff') {
            // Choose a note node where there is one
            // node, time, type, name, value
            distribute(notes[name] || node, time, type, name, value, null, notify);
            notes[name] = undefined;
        }
        else {
            distribute(node, time, type, name, value, duration, notify);
        }
    };
}

/*
Control(audio, distribute)

Constructor for muteable objects that represent a route from a source stream
through a selectable transform function to a target stream.

```
{
    source: {
        port:    'id',
        channel: 1,
        type:    'control',
        param:   1
        value:   undefined
    },

    transform: 'linear',
    min: 0,
    max: 1,
    type: 'control',
    param: 'pitch',

    target: {
        id:
        type:
        object:
    }
}
```

*/

const DEBUG$4  = window.DEBUG;

const assign$k = Object.assign;
const seal$1   = Object.seal;

const sources = {
    'midi':     MIDIInputSource,
    'keyboard': KeyboardInputSource
};

// Todo: get denormalisers form global denormalisers, we're missing linear-logarithmic
const denormalisers$1 = {
    'pass': function linear(min, max, n, current) {
        return n;
    },

    'linear': function linear(min, max, n, current) {
        return n * (max - min) + min;
    },

    'quadratic': function quadratic(min, max, n, current) {
        return Math.pow(n, 2) * (max - min) + min;
    },

    'cubic': function pow3(min, max, n, current) {
        return Math.pow(n, 3) * (max - min) + min;
    },

    'logarithmic': function log(min, max, n, current) {
        return min * Math.pow(max / min, n);
    },

    'frequency': function toggle(min, max, n, current) {
        return (floatToFrequency(n) - min) * (max - min) / floatToFrequency(127) + min ;
    },

    'toggle': function toggle(min, max, n, current) {
        if (n > 0) {
            return current <= min ? max : min ;
        }
    },

    'switch': function sw(min, max, n, current) {
        return n < 0.5 ? min : max ;
    },

    'continuous': function toggle(min, max, n, current) {
        return current + 64 - n ;
    }
};

function Control(controls, source, target, settings, notify) {
    // Source can be either a string 'midi', 'keyboard', or an object
    // with a device property
    source = typeof source === 'string' ?
        new sources[source]({}) :
        new sources[source.device](source) ;

    if (!source) {
        throw new Error('Control source "' + source + '" not created');
    }

    if (!target) {
        throw new Error('Control target "' + target + '" not found');
    }

    const control  = this;
    const privates$1 = privates(this);
    const taps     = privates$1.taps = [];

    privates$1.notify = notify || noop$1;
    privates$1.controls = controls;

    // Set up source.
    this.source = source;

    // Set up target
    this.target = target;
    this.type   = settings.type;
    this.name   = settings.name;

    // Set up transform
    this.transform = settings.transform || 'linear';
    this.min       = settings.min || 0;
    this.max       = settings.max === undefined ? 1 : settings.max ;
    this.latencyCompensation = settings.latencyCompensation === undefined ?
        true :
        settings.latencyCompensation;

    seal$1(this);

    const distribute = Distribute(target, notify);

    // Keep track of value, it is passed back into transfoms to enable
    // continuous controls
    var value;

    // Bind source output to route input
    this.source.each(function(timeStamp, type, name, n) {
        const time = control.latencyCompensation ?
            timeAtDomTime(target.data.context, timeStamp) :
            getContextTime(target.data.context, timeStamp) ;

        // Set type
        // If type is note, allow value to control whether it is noteon or noteoff
        type = control.type || type;

        if (!type) {
            throw new Error('Control has no type (' + type + ')');
        }

        // Set name
        name = control.name || name ;

        if (name === undefined) {
            throw new Error('Control has no name (' + type + ', ' + name + ')');
        }

        // Set value
        value = denormalisers$1[control.transform] ?
            denormalisers$1[control.transform](control.min, control.max, n, value) :
            n ;

        if (value === undefined) {
            throw new Error('Control has no value (' + type + ', ' + name + ', ' + value + ')');
        }

        // If type is note, allow value to control whether it is noteon or
        // noteoff. This is a bit of a fudge, but it allows us to specify
        // type 'note' on the control and have that split into on/off events
        if (type === 'note') {
            type = value === 0 ? 'noteoff' : 'noteon';
        }

        if (DEBUG$4) {
            console.log(control, type, type, name, value);
        }

        // Schedule the change
        distribute(time, type, name, value);

        // Call taps
        var m = taps.length;
        while (m--) {
            taps[m](time, type, name, value);
        }

        //if (target.record) {
        //    if (!target.recordDestination) {
        //        if (!target.recordCount) {
        //            target.recordCount = 0;
        //        }
        //
        //        const data = {
        //            id: target.id + '-take-' + (target.recordCount++),
        //            events: []
        //        };
        //
        //        target.recordDestination = (new Sequence(target.graph, data)).start(time);
        //        target.graph.sequences.push(data);
        //        target.graph.record(time, 'sequence', data.id, target.id);
        //    }
        //
        //    target.recordDestination.record(time, type, name, value);
        //}
    });

    // Maintain list of controls
    controls.push(this);
    notify(controls);
}

assign$k(Control.prototype, {
    tap: function(fn) {
        privates(this).taps.push(fn);
        return this;
    },

    remove: function() {
        const controls = privates(this).controls;
        this.source.stop();
        remove$1(controls, this);
        privates(this).notify(controls, '.');
        return this;
    },

    toJSON: function() {
        return {
            source: this.source,
            target: this.target.id,
            data:   this.data
        };
    }
});

/*
Input()

```
const input = stage.create('input', {
    channels: [1, 2]    // Device channels to use as input
});
```
*/

var assign$l   = Object.assign;
var defaults$9 = {
	channels: [0, 1]
};

var rautoname = /In\s\d+\/\d+/;

function increment(n) { return ++n; }

class Input extends ChannelMergerNode {
    constructor(context, settings, input) {
		var options = assign$l({}, defaults$9, settings);
		options.numberOfInputs = options.channels.length || 2;
		super(context, options);

		var channels = [];
		var n = 0;

		function update(source, target, channels) {
			var count = channels.length;

			// Don't do this the first time
			if (n++) { source.disconnect(target); }

			while (count--) {
				source.connect(target, channels[count], count);
			}
		}

		/*
		.channels

		An array of channel numbers. For stereo input this would typically be
		`[1, 2]`.
		*/

		Object.defineProperties(this, {
			channels: {
				get: function() { return channels; },
				set: function(array) {
					var count = array.length;

					// Where there is no change do nothing
					if (array + '' === channels + '') { return; }

					while (count--) {
						channels[count] = array[count];
					}

					if (!this.name || rautoname.test(this.name)) {
						this.name = 'In ' + array.map(increment).join('/');
					}

					update(input, this, channels);
				},
				enumerable: true,
				configurable: true
			}
		});

		this.destroy = function destroy() {
			this.disconnect();
			request.then(() => media.disconnect(this));
		};

		// Setting the channels connects the media to the this
		this.channels = options.channels;
    }
}

const assign$m = Object.assign;
const define$f = Object.defineProperties;
const rautoname$1 = /Out\s\d+\/\d+/;
const defaults$a = {
	channels: [0, 1]
};

function increment$1(n) { return n + 1; }

class OutputSplitter extends GainNode {
    constructor(context, settings, output) {
		var options = assign$m({}, defaults$a, settings);
		options.numberOfOutputs = options.channels.length || 2;
		options.channelCountMode = 'explicit';
		options.channelCount = options.numberOfOutputs;

		super(context, {
			gain:                  1,
			channelCountMode:      'explicit',
			channelCount:          options.numberOfOutputs,
			channelInterpretation: 'speakers'
		});

		const splitter = new ChannelSplitterNode(context, options);
		this.connect(splitter);

		var channels = [];

		/*
		.channels

		An array of channel numbers. For stereo output this would typically be
		`[1, 2]`.
		*/

		define$f(this, {
			channels: {
				get: function() { return channels; },
				set: function(array) {
					// Where there is no change do nothing
					if (array + '' === channels + '') { return; }

					//this.disconnect(output);
					var count = array.length > output.numberOfInputs ?
						output.numberOfInputs :
						array.length ;

					while (count--) {
						// output.channelCount may not be as high as the index
						// of channel in array. Ignore routings to channels the
						// output does not have.
						if (array[count] > output.channelCount) { continue; }
						connect(splitter, output, count, array[count]);
						channels[count] = array[count];
					}

					if (!this.name || rautoname$1.test(this.name)) {
						this.name = 'Out ' + channels.map(increment$1).join('-');
					}
				},
				enumerable: true,
				configurable: true
			}
		});

		// Assign
		this.channels = options.channels;
    }
}

if (!NodeGraph.prototype.get) {
	throw new Error('NodeGraph is not fully formed?')
}
const assign$n = Object.assign;
const define$g = Object.defineProperties;
const getOwnPropertyDescriptor$5 = Object.getOwnPropertyDescriptor;

const graph$6 = {
	nodes: [{
        id:   'output',
        type: 'tick',
        data: {
            channelInterpretation: 'speakers',
			channelCountMode: 'clamped-max',
			channelCount: 1
        }
    }],

	connections: [],

	params: { gain: 'output.gain' }
};

const defaults$b = {
	decay:     0.06,
	resonance: 22,
    gain:      0.25,

    tick: [72, 1,   0.03125],
    tock: [64, 0.6, 0.03125],
    events: [
        [0,  'tick'],
        [1,  'tock'],
        [2,  'tock'],
        [3,  'tock'],
		[4,  'tock'],
		[5,  'tock'],
		[6,  'tock'],
		[7,  'tock'],
		[8,  'tock'],
		[9,  'tock'],
		[10, 'tock'],
		[11, 'tock'],
		[12, 'tock']
    ]
};

const properties$7 = {
    "tick":   { enumerable: true, writable: true },
    "tock":   { enumerable: true, writable: true },
    "events": { enumerable: true, writable: true },

    "resonance": {
        get: function() { return this.get('output').resonance; },
        set: function(value) { this.get('output').resonance = value; }
    },

    "decay": {
        get: function() { return this.get('output').decay; },
        set: function(value) { this.get('output').decay = value; }
    }
};

const events$2 = [];

function Event$2(b1, beat, type) {
	// A cheap object pool
	const event = events$2.find((event) => event[0] < b1);

	if (event) {
		event[0] = beat;
		event[1] = type;
		return event;
	}

	this[0] = beat;
	this[1] = type;
	events$2.push(this);
}

function fillEventsBuffer(transport, events, buffer, frame) {
	const b1   = frame.b1;
	const b2   = frame.b2;
	const bar1 = transport.barAtBeat(b1);
	const bar2 = transport.barAtBeat(b2);

	let bar      = bar1;
	let bar1Beat = transport.beatAtBar(bar1);
	let localB1  = b1 - bar1Beat;
	let localB2, bar2Beat;
	let n = -1;

	//console.log('FRAME events', bar, localB1, events.length);
	buffer.length = 0;

	// Ignore events before b1
	while (++n < events.length && events[n][0] < localB1);
	--n;

	// Cycle through bars if there are whole bars left
	while (bar < bar2) {
		bar2Beat = transport.beatAtBar(bar + 1);
		localB2  = bar2Beat - bar1Beat;

		while (++n < events.length && events[n][0] < localB2) {
			//events[n].time = transport.timeAtBeat(events[n][0] + bar1Beat);
			buffer.push(new Event$2(b1, bar1Beat + events[n][0], events[n][1]));
		}

		bar += 1;
		n = -1;
		bar1Beat = bar2Beat;
	}

	// Cycle through final, partial bar
	localB2  = b2 - bar1Beat;

	while (++n < events.length && events[n][0] < localB2) {
		//console.log('timeAtBeat', events[n][0], bar1Beat)
		//events[n].time = transport.timeAtBeat(bar1Beat + events[n][0]);
		buffer.push(new Event$2(b1, bar1Beat + events[n][0], events[n][1]));
	}

	return buffer;
}

function Metronome(context, settings, transport) {
	if (!transport.sequence) { throw new Error('Metronome requires access to transport.'); }

	// Graph
	NodeGraph.call(this, context, graph$6);
    const voice = this.get('output');

	// Private
	const privates$1 = privates(this);
	privates$1.voice = voice;
	privates$1.transport = transport;

	// Properties
	define$g(this, properties$7);

    // Params
    this.gain = voice.gain;

	// Update settings
	assignSettingz__(this, assign$n({}, defaults$b, settings));
}

assign$n(Metronome.prototype, PlayNode.prototype, NodeGraph.prototype, {
	start: function(time) {
		const privates$1  = privates(this);
		const transport = privates$1.transport;
		const metronome = this;
		const voice     = this.get('output');
		const buffer    = [];

        PlayNode.prototype.start.apply(this, arguments);

		privates$1.sequence = transport
		.sequence((data) => fillEventsBuffer(transport, this.events, buffer, data))
		.each(function distribute(e) {
			const options = metronome[e[1]];
			voice.start(e.time, options[0], options[1]);
		})
		.start(this.startTime);

		return this;
	},

	stop: function(time) {
		const privates$1 = privates(this);
		PlayNode.prototype.stop.apply(this, arguments);
		privates$1.sequence.stop(this.stopTime);
		return this;
	}
});

// Mix in property definitions
define$g(Metronome.prototype, {
    playing: getOwnPropertyDescriptor$5(PlayNode.prototype, 'playing')
});

Metronome.defaults  = {
	filterQ:         { min: 0,   max: 100,   transform: 'quadratic',   value: 0.25 },
	filterFrequency: { min: 16,  max: 16000, transform: 'logarithmic', value: 16 }
};

const generateUnique = function(values) {
    var value  = -1;
    while (values.indexOf(++value + '') !== -1);
    return value + '';
};

function roundBeat(n) {
    // Mitigate floating-point rounding errors by rounding to the nearest
    // trillionth
    return Math.round(1000000000000 * n) / 1000000000000;
}

//import Sequence from './sequence.js';

const assign$o = Object.assign;
const define$h = Object.defineProperties;

const properties$8 = {
    graph:             { writable: true },
    record:            { writable: true },
    recordDestination: { writable: true },
    recordCount:       { writable: true, value: 0 }
};

const blacklist = {
    channelCount: true,
    channelCountMode: true,
    channelInterpretation: true,
    context: true,
    numberOfInputs: true,
    numberOfOutputs: true,
    onended: true
};

function Node(graph, type, id, label, data, context, requests, transport) {
    define$h(this, properties$8);

    this.graph = graph;
    this.id    = id;
    this.type  = type;
    this.label = label || '';
    this.request = (requests[type] || requests.default)(type, context, data, transport)
    .then((node) => {
        assignSettingz__(node, data);
        this.node = node;
        // Legacy name??
        this.data = node;
        return node;
    });

    graph.nodes.push(this);
}

assign$o(Node.prototype, {
    automate: function(type, time, name, value, duration) {
        const privates$1 = privates(this.graph);

        //        if (this.record) {
        //            if (!this.recordDestination) {
        //                const data = {
        //                    id: this.id + '-take-' + (this.recordCount++),
        //                    events: []
        //                };
        //
        //                this.recordDestination = (new Sequence(this.graph, data)).start(time);
        //                this.graph.sequences.push(data);
        //                this.graph.record(time, 'sequence', data.id, this.id, arguments[4]);
        //            }
        //
        //            this.recordDestination.record.apply(this.recordDestination, arguments);
        //        }

        return typeof this.data[type] === 'function' ?
            this.data[type](time, name, value) :
        isAudioParam(this.data[type]) ?
            // param, time, curve, value, duration, notify, context
            automato__(this.data, type, time, name, value, duration, privates$1.notify, this.data.context) :
        undefined ;
    },

    records: function() {
        return this.data.records && this.data.records()
        .map((record) => {
            record.nodeId = this.id;
            return record;
        });
    },

    remove: function() {
        // Remove connections that source or target this
        this.graph.connections && this.graph.connections
        .filter((connection) => connection.source === this.data || connection.target === this.data)
        .forEach((connection) => connection.remove());

        // Remove controls that target this
        this.graph.controls && this.graph.controls
        .filter((control) => control.target === this.data)
        .forEach((control) => control.remove());

        // Remove from nodes
        remove$1(this.graph.nodes, this);

        // Notify observers
        const privates$1 = privates(this.graph);
        privates$1.notify(this.graph.nodes, '');

        return this;
    },

    toJSON: function toJSON() {
        const node = this.data;
        const data = {};
        var name;

        for (name in node) {
            //if (!this.hasOwnProperty(name)) { continue; }
            if (node[name] === null) { continue; }
            if (node[name] === undefined) { continue; }
            if (blacklist[name]) { continue; }

            data[name] = node[name].setValueAtTime ?
                    node[name].value :
                node[name].connect ?
                    toJSON.apply(node[name]) :
                node[name] ;
        }

        return {
            id:    this.id,
            type:  this.type,
            label: this.label,
            data:  data
        };
    }
});

const assign$p = Object.assign;
const define$i = Object.defineProperties;
const seal$2   = Object.seal;

function Connection(graph, sourceId, targetId, sourceChan, targetChan) {

    // Get source node
    //const sourceParts = sourceId.split('.');
    const sourceNode = typeof sourceId === 'object' ?
        graph.nodes.find((entry) => entry === sourceId || entry.data === sourceId).data :
        graph.get(sourceId) ;

    // Get target node or param
    //const targetParts = targetId.split('.');
    const targetNode = typeof targetId === 'object' ?
        graph.nodes.find((entry) => entry === targetId || entry.data === targetId).data :
        graph.get(targetId) ;

    const targetParam  = targetChan
        && !/^\d/.test(targetChan)
        && targetNode[targetChan] ;

    // Define properties
    define$i(this, {
        graph: { value: graph }
    });

    this.source   = sourceNode ;
    this.target   = targetNode ;
    this.targetParam = targetParam;

    if (sourceChan || targetChan) {
        this.data = [
            sourceChan && parseInt(sourceChan, 10) || 0,
            targetChan && /^\d/.test(targetChan) && parseInt(targetChan, 10) || 0
        ];
    }

    // Make immutable
    seal$2(this);

    // Connect them up
    if (connect(this.source, this.targetParam || this.target, this.data && this.data[0], this.data && this.data[1])) {
        graph.connections.push(this);
    }
}

assign$p(Connection.prototype, {
    remove: function() {
        // Disconnect them
        if (disconnect(this.source, this.targetParam || this.target, this.data && this.data[0], this.data && this.data[1])) {
            remove$1(this.graph.connections, this);

            // Notify observers
            const privates$1 = privates(this.graph);
            privates$1.notify(this.graph.connections, '');
        }

        return this;
    },

    toJSON: function() {
        return {
            source: this.graph.nodes.find((entry) => entry.data === this.source).id,
            target: this.graph.nodes.find((entry) => entry.data === this.target).id,
            data:   this.data
        }
    }
});

const assign$q    = Object.assign;
const define$j    = Object.defineProperties;

function addConnection(graph, setting) {
    new Connection(graph, setting.source, setting.target, setting.output, setting.input);
    return graph;
}

function Graph(context, requests, data, transport) {
    const graph       = this;
    const privates$1    = privates(this);

    privates$1.requests = requests;
    privates$1.transport = transport;

    define$j(this, {
        nodes:       { enumerable: true, value: [] },
        connections: { enumerable: true, value: [] }
    });

    if (data.nodes) {
        data.nodes.map(function(settings) {
            return new Node(graph, settings.type, settings.id, settings.label, settings.data, context, requests, transport);
        });
    }

    // Load nodes
	const promise = Promise.all(
        graph.nodes.map((node) => node.request)
    )
    .then(function(loaders) {
        if (data.connections) {
            data.connections.reduce(addConnection, graph);
        }

        print('graph', graph.nodes.length + ' nodes, ' + graph.connections.length + ' connections');

        return graph;
    });

    this.ready = promise.then.bind(promise);
}

assign$q(Graph.prototype, {

    /*
    .get(id)
    Return the node with `id`, or undefined.
    */

    get: function(id) {
        return this.nodes.find(has$1('id', id)).data;
    },

    identify: function(data) {
        return this.nodes.find(has$1('data', data)).id;
    },

    /*
    .create(type, settings)
    Creates a new node of `type`, generates an id for it and adds it to the
    stage. It is not connected to anything by default.
    */

    create: function(type, data) {
        const graph     = this;
        const privates$1  = privates(this);
        const requests  = privates$1.requests;
        const transport = privates$1.transport;
        const notify    = privates$1.notify;
        const id = generateUnique(this.nodes.map(get$1('id')));

        return new Node(graph, type, id, type, data, graph.context, requests, transport)
        .request
        .then((node) => {
            notify(graph.nodes, '.');
            return node;
        });
    },

    /*
    .createConnection(source, target)
    Creates a connection between two nodes in `.nodes`, where `source` and
    `target` are node ids.
    */

    createConnection: function(source, target, output, input) {
        return new Connection(this, source, target, output, input);
    }
});

/*var registry = {};

function register(path, module) {
    if (registry[path]) {
        throw new Error('soundstage: Calling Soundstage.register(name, fn) but name already registered: ' + name);
    }

    registry[name] = module;
}
*/
var modules = {};

function importPlugin(path) {
    path = /\.js$/.test(path) ? path : path + '.js' ;

    // Don't request the module again if it's already been registered
    return modules[path] || (
        modules[path] = Promise.resolve(require(path)).then(function(module) {
            /*register(path, module);*/
            return module.default;
        })
    );
}

const worker = new Worker(config.basePath + 'modules/timer.worker.js');
const assign$r = Object.assign;

const defaults$c = {
	lookahead: 0.12,
    duration:  0.24
};

const startMessage = {
    command: 'start'
};

const stopMessage = {
    command: 'stop'
};

const timers = [];

let active = false;

function stop() {
    worker.postMessage(stopMessage);
    active = false;
}

worker.onmessage = function frame(e) {
    let n = -1;

    while (++n < timers.length) {
        timers[n].frame(e.data);
    }

    if (!timers.length) {
        stop();
    }
};

function Timer$1(now, duration = defaults$c.duration, lookahead = defaults$c.lookahead) {
	this.now         = now;
    this.requests    = [];
    this.buffer      = [];
	this.currentTime = 0;
	this.lookahead   = lookahead;
	this.duration    = duration;
}

assign$r(Timer$1.prototype, {
    frame: function(count) {
        const currentRequests = this.requests;

        this.requests    = this.buffer;
        this.buffer      = currentRequests;
        this.currentTime = this.now() + this.duration + this.lookahead;

        let request;

        while ((request = currentRequests.shift())) {
            request(this.currentTime);
        }

        if (!this.requests.length) {
            this.active = false;
            remove$1(timers, this);
        }

        // For debugging
        //if (Soundstage.inspector) {
        //	Soundstage.inspector.drawCue(now(), time);
        //}
    },

    request: function(fn) {
        if (!active) {
			startMessage.duration = this.duration;
            worker.postMessage(startMessage);
            active = true;
        }

        if (!this.active) {
            this.active = true;
            timers.push(this);
        }

        this.requests.push(fn);

		// Return the callback for use as an identifier, because why not
		return fn;
    },

    cancel: function(fn) {
        remove$1(this.requests, fn);

        if (this.requests.length === 0) {
            this.active = false;
            remove$1(timers, this);

            if (!timers.length) {
                stop();
            }
        }
    }
});

const assign$s           = Object.assign;
const getData          = get$1('data');

const pitchBendRange   = 2;

function pitchToFloat(message) {
	return bytesToSignedFloat(message[1], message[2]) * pitchBendRange;
}

// Event
//
// A constructor for pooled event objects, for internal use only. Internal
// events are for flows of data (rather than storage), and have extra data
// assigned.
/*
export default Event = Pool({
	name: 'Soundstage Event',

	create: noop,

	reset: function reset() {
		assign(this, arguments);
		var n = arguments.length - 1;
		while (this[++n] !== undefined) { delete this[n]; }
		this.recordable = false;
		this.idle       = false;
	},

	isIdle: function isIdle(object) {
		return !!object.idle;
	}
}, defineProperties({
	toJSON: function() {
		// Event has no length by default, we cant loop over it
		var array = [];
		var n = -1;
		while (this[++n] !== undefined) { array[n] = this[n]; }
		return array;
	}
}, {
	time:       { writable: true },
	object:     { writable: true },
	recordable: { writable: true },
	idle:       { writable: true }
}));
*/
function Event$3(time, type, name, value, duration) {
	assign$s(this, arguments);
	this.length = arguments.length;
}

assign$s(Event$3.prototype, {
	remove: function() {
		if (!this.sequence) {
			console.warn('Trying to remove event. Event has not had a sequence assigned. This should (probably) not be possible.');
			return this;
		}

		remove$1(this.sequence, this);
		return this;
	},

	toJSON: function() {
		// Event has no length by default, we cant loop over it
		var array = [];
		var n = -1;
		while (this[++n] !== undefined) { array[n] = this[n]; }
		return array;
	}
});

Event$3.of = function() {
	return arguments[6] !== undefined ? new Event$3(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6]) :
		arguments[5] !== undefined ? new Event$3(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]) :
		arguments[4] !== undefined ? new Event$3(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]) :
		arguments[3] !== undefined ? new Event$3(arguments[0], arguments[1], arguments[2], arguments[3]) :
		new Event$3(arguments[0], arguments[1], arguments[2]) ;
};

Event$3.from = function(data) {
	return data[6] !== undefined ? new Event$3(data[0], data[1], data[2], data[3], data[4], data[5], data[6]) :
		data[5] !== undefined ? new Event$3(data[0], data[1], data[2], data[3], data[4], data[5]) :
		data[4] !== undefined ? new Event$3(data[0], data[1], data[2], data[3], data[4]) :
		data[3] !== undefined ? new Event$3(data[0], data[1], data[2], data[3]) :
		new Event$3(data[0], data[1], data[2]) ;
};









Event$3.fromMIDI = overload(compose(toType$2, getData), {
	pitch: function(e) {
		return Event$3.of(e.timeStamp, 'pitch', pitchToFloat(e.data));
	},

	pc: function(e) {
		return Event$3.of(e.timeStamp, 'program', e.data[1]);
	},

	channeltouch: function(e) {
		return Event$3.of(e.timeStamp, 'touch', 'all', e.data[1] / 127);
	},

	polytouch: function(e) {
		return Event$3.of(e.timeStamp, 'touch', e.data[1], e.data[2] / 127);
	},

	default: function(e) {
		return Event$3.of(e.timeStamp, toType$2(e.data), e.data[1], e.data[2] / 127) ;
	}
});

function isRateEvent(e)  { return e[1] === 'rate'; }
function isMeterEvent(e) { return e[1] === 'meter'; }

const getBeat = get$1(0);
const getType = get$1(1);

function getDuration(e)  {
	return e[1] === 'note' ? e[4] :
		e[1] === 'sequence' ? e[4] :
		undefined ;
}

// Event types
//
// [time, "rate", number, curve]
// [time, "meter", numerator, denominator]
// [time, "note", number, velocity, duration]
// [time, "noteon", number, velocity]
// [time, "noteoff", number]
// [time, "param", name, value, curve]
// [time, "pitch", semitones]
// [time, "chord", root, mode, duration]
// [time, "sequence", name || events, target, duration, transforms...]

const isValidEvent = overload(get$1(1), {
	note: (event) => {
		return event.length === 5;
	},

	noteon: (event) => {
		return event.length === 4;
	},

	noteoff: (event) => {
		return event.length === 4;
	},

	sequence: (event) => {
		return event.length > 4;
	},

	meter: (event) => {
		return event.length === 4;
	},

	rate: (event) => {
		return event.length === 3;
	},

	default: function() {
		return false;
	}
});

// Event types
//
// [time, "rate", number, curve]
// [time, "meter", numerator, denominator]
// [time, "note", number, velocity, duration]
// [time, "noteon", number, velocity]
// [time, "noteoff", number]
// [time, "param", name, value, curve]
// [time, "pitch", semitones]
// [time, "chord", root, mode, duration]
// [time, "sequence", name || events, target, duration, transforms...]


const eventValidationHint = overload(get$1(1), {
	note: (event) => {
		return 'Should be of the form [time, "note", number, velocity, duration]';
	},

	noteon: (event) => {
		return 'Should be of the form [time, "noteon", number, velocity]';
	},

	noteoff: (event) => {
		return 'Should be of the form [time, "noteoff", number]';
	},

	sequence: (event) => {
		return 'Should be of the form [time, "sequence", id, target, duration]';
	},

	meter: (event) => {
		return 'Should be of the form [time, "meter", numerator, denominator]';
	},

	rate: (event) => {
		return 'Should be of the form [time, "rate", number, curve]';
	},

	default: function() {
		return 'Probably should be of the form [time, "param", name, value, curve]';
	}
});

var assign$t = Object.assign;
var freeze = Object.freeze;
var meter0 = freeze({ 0: 0, 1: 'meter', 2: 4, 3: 1, bar: 0 });

function barAtBeat(events, beat) {
	let barCount = 0;
	let event = meter0;
	let n = -1;

	while (events[++n] && events[n][0] < beat) {
		barCount += Math.floor((events[n][0] - event[0]) / event[2]) ;
		event = events[n];
	}

	return barCount + Math.floor((beat - event[0]) / event[2]);
}

function beatAtBar(events, bar) {
	let barCount = 0;
	let event = meter0;
	let n = -1;

	while (events[++n]) {
		const bars = barCount + (events[n][0] - event[0]) / event[2] ;
		if (bars >= bar) { break; }
		barCount = bars;
		event = events[n];
	}

	return event[0] + (bar - barCount) * event[2];
}

function Meter$1(events) {
	this.events = events;
}

assign$t(Meter$1.prototype, {
	/*
	.barAtBeat(beat)
	Returns the bar at a given `beat`.
	*/

	barAtBeat: function(beat) {
		return barAtBeat(this.events && this.events.filter(isMeterEvent) || nothing, beat);
	},

	/*
	.beatAtBar(bar)
	Returns the beat at the start of a given `bar`.
	*/

	beatAtBar: function(bar) {
		return beatAtBar(this.events && this.events.filter(isMeterEvent) || nothing, bar);
	}
});

var freeze$1 = Object.freeze;
var rate0  = freeze$1({ 0: 0, 1: 'rate', 2: 2, location: 0 });
var automationDefaultEvent = freeze$1({ time: 0, curve: 'step', value: 1, beat: 0 });
var get1   = get$1('1');


function beatAtTimeStep(value0, time) {
	// value0 = start rate
	// time   = current time
	return time * value0;
}

function beatAtTimeExponential(value0, value1, duration, time) {
	// value0   = rate at start
	// value1   = rate at end
	// duration = time from start to end
	// time     = current time
	const n = value1 / value0;
	return duration * value0 * (Math.pow(n, time / duration) - 1) / Math.log(n);
}

function beatAtTimeExponentialBeats(value0, value1, beats, time) {
	// value0   = rate at start
	// value1   = rate at end
	// beats    = beats from start to end
	// time     = current time
	const n = value1 / value0;
	const d = beats * Math.log(n) / (value0 * (n - 1));
	return beatAtTimeExponential(value0, value1, d, time);
}

function timeAtBeatStep(value0, beat) {
	// value0 = start rate
	// beat   = current beat
	return beat / value0;
}

function timeAtBeatExponential(value0, value1, beats, beat) {
	// value0   = rate at start
	// value1   = rate at end
	// beats    = beats from start to end
	// beat     = current beat
	const n = value1 / value0;
	return beats * Math.log(1 + beat * (n - 1) / beats) / (value0 * (n - 1));
}


/*
beatAtTimeAutomation(e0, e1, time)

Returns the rate beat at a given `time`.
*/

function beatAtTimeAutomation(e0, e1, time) {
	// Returns beat relative to e0[0], where l is location from e0 time
	return time === e0.time ? 0 :
		e1 && e1.curve === "exponential" ?
			beatAtTimeExponential(e0.value, e1.value, e1.time - e0.time, time - e0.time) :
			beatAtTimeStep(e0.value, time - e0.time) ;
}

function beatAtTimeOfAutomation(events, seed = defaultAutomationEvent, time) {
	let b = seed.beat || 0;
	let n = -1;

	while (events[++n] && events[n].time < time) {
		b = events[n].beat || (
			events[n].beat = b + beatAtTimeAutomation(seed, events[n], events[n].time)
		);
		seed = events[n];
	}

	return b + beatAtTimeAutomation(seed, events[n], time);
}


/*
timeAtBeatAutomation(e0, e1, beat)

Returns the time of a given rate `beat`.
*/

function timeAtBeatAutomation(e0, e1, beat) {
	// Returns time relative to e0 time, where b is beat from e0[0]
	return beat === e0.beat ? 0 :
		e1 && e1.curve === "exponential" ?
			timeAtBeatExponential(e0.value, e1.value, e1.beat - e0.beat, beat - e0.beat) :
			timeAtBeatStep(e0.value, beat - (e0.beat || 0)) ;
}

function timeAtBeatOfAutomation(events, seed = defaultAutomationEvent, beat) {
	let b = seed.beat || 0;
	let n = -1;

	while (events[++n]) {
		b = events[n].beat || (
			events[n].beat = b + beatAtTimeAutomation(seed, events[n], events[n].time)
		);

		if (b > beat) { break; }
		seed = events[n];
	}

	return seed.time + timeAtBeatAutomation(seed, events[n], beat);
}


/*
.locationAtBeat(beat)

Returns the location of a given `beat`.
*/

function timeAtBeatOfEvents(e0, e1, b) {
	// Returns time relative to e0 time, where b is beat from e0[0]
	return b === 0 ? 0 :
		e1 && e1[3] === "exponential" ?
			timeAtBeatExponential(e0[2], e1[2], e1[0] - e0[0], b) :
			timeAtBeatStep(e0[2], b) ;
}

function locationAtBeat(events, event, beat) {
	let loc = 0;
	let n = -1;

	while (events[++n] && events[n][0] < beat) {
		loc += timeAtBeatOfEvents(event, events[n], events[n][0] - event[0]);
		event = events[n];
	}

	return loc + timeAtBeatOfEvents(event, events[n], beat - event[0]);
}


/*
.beatAtLocation(location)

Returns the beat at a given `location`.
*/

function beatAtTimeOfEvents(e0, e1, l) {
	// Returns beat relative to e0[0], where l is location from e0 time
	return e1 && (e1[3] === "exponential" || e1.curve === "exponential") ?
		beatAtTimeExponentialBeats(e0[2], e1[2], e1[0] - e0[0], l) :
		beatAtTimeStep(e0[2], l) ;
}

function beatAtLocation(events, event, location) {
	let locCount = 0;
	let n = -1;

	while (events[++n]) {
		const loc = locCount + timeAtBeatOfEvents(event, events[n], events[n][0] - event[0]);
		if (loc >= location) { break; }
		locCount = loc;
		event = events[n];
	}

	return event[0] + beatAtTimeOfEvents(event, events[n], location - locCount);
}

const assign$u = Object.assign;
const define$k = Object.defineProperties;
const getOwnPropertyDescriptor$6 = Object.getOwnPropertyDescriptor;

const properties$9 = {

	/*
	.context
	The AudioContext.
	*/

	context:       { writable: true },

	/*
	.startTime
	The time at which the clock was scheduled to start.
	*/

	startTime:     { writable: true, value: undefined },

	/*
	.startLocation
	*/

	startLocation: { writable: true, value: undefined },

	/*
	.stopTime
	The time at which the clock has been scheduled to stop.
	*/

	stopTime:      { writable: true, value: undefined }
};

function Clock(context, notify) {
	// Properties
	define$k(this, properties$9);
	this.context = context;

	privates(this).notify = notify;
}

assign$u(Clock.prototype, {
	// Todo: Inherit start/stop from PlayNode

	start: function(time) {
		// If clock is running, don't start it again
		if (this.startTime !== undefined && this.stopTime === undefined) {
			return this;
		}

		if (this.context.currentTime < this.stopTime) {
			return this;
		}

		this.startTime     = time !== undefined ? time : this.context.currentTime ;
		this.startLocation = undefined;
		this.stopTime      = undefined;

		//Privates(this).notify(this, 'playing');

		return this;
	},

	stop: function(time) {
		// If clock is running, don't start it again
		if (this.startTime === undefined || this.startTime < this.stopTime) {
			{ return this; }
		}

		time = time === undefined ? this.context.currentTime : time ;

		if (time < this.startTime) {
			throw new Error('Clock .stop(time) attempted with time less than .startTime');
		}

		this.stopTime = time;
		//Privates(this).notify(this, 'playing');

		return this;
	}
});

// Mix in property definitions
define$k(Clock.prototype, {
    playing: getOwnPropertyDescriptor$6(PlayNode.prototype, 'playing')
});

const assign$v = Object.assign;
const define$l = Object.defineProperties;
const getOwnPropertyDescriptor$7 = Object.getOwnPropertyDescriptor;

const defaultRateEvent  = Object.freeze({ time: 0, value: 2, curve: 'step', beat: 0 });
const defaultMeterEvent = Object.freeze({ 0: 0, 1: 'meter', 2: 4, 3: 1 });

function Transport(context, rateParam, timer, notify) {
	Clock.call(this, context, notify);

	// Private
	const privates$1 = privates(this);
	privates$1.rateParam = rateParam;
	privates$1.meters = [defaultMeterEvent];
	privates$1.timer  = timer;
	privates$1.notify = notify;
	privates$1.sequenceCount = 0;
}

assign$v(Transport.prototype, Clock.prototype, {
	beatAtTime: function(time) {
		if (time < 0) { throw new Error('Location: beatAtLoc(loc) does not accept -ve values.'); }

		const privates$1  = privates(this);
		const events    = getAutomation(privates$1.rateParam);
		// Cache startLocation as it is highly likely to be needed again
		//console.log('transport.beatAtTime', this.startTime, defaultRateEvent, events);
		const startBeat = this.startLocation || (this.startLocation = beatAtTimeOfAutomation(events, defaultRateEvent, this.startTime));
		const timeBeat  = beatAtTimeOfAutomation(events, defaultRateEvent, time);

		return roundBeat(timeBeat - startBeat);
	},

	timeAtBeat: function(beat) {
		if (beat < 0) { throw new Error('Location: locAtBeat(beat) does not accept -ve values.'); }

		const privates$1  = privates(this);
		const events    = getAutomation(privates$1.rateParam);
		// Cache startLocation as it is highly likely to be needed again
		const startBeat = this.startLocation || (this.startLocation = beatAtTimeOfAutomation(events, defaultRateEvent, this.startTime));

		return timeAtBeatOfAutomation(events, defaultRateEvent, startBeat + beat);
	},

	beatAtBar: function(bar) {
		const privates$1 = privates(this);
		const meters   = privates$1.meters;
		return beatAtBar(meters, bar);
	},

	barAtBeat: function(beat) {
		const privates$1 = privates(this);
		const meters   = privates$1.meters;
		return barAtBeat(meters, beat);
	},

	rateAtTime: function(time) {
		return getValueAtTime(privates(this).rateParam);
	},

	setMeterAtBeat: function(beat, bar, div) {
		const privates$1 = privates(this);
		const meters   = privates$1.meters;

		// Shorten meters to time
		let n = -1;
		while (++n < meters.length) {
			if (meters[n][0] >= beat) {
				meters.length = n;
				break;
			}
		}

		meters.push({ 0: beat, 1: 'meter', 2: bar, 3: div });
		return true;
	},

	sequence: function(toEventsBuffer) {
		const privates$1 = privates(this);
		const stream = Stream$1
		.fromTimer(privates$1.timer)
		.map((frame) => {
			// Filter out frames before startTime
			if (frame.t2 <= this.startTime) {
				return;
			}

			// If this.stopTime is not undefined or old
			// and frame is after stopTime
			if (this.stopTime > this.startTime
				&& frame.t1 >= this.stopTime) {
				return;
			}

			// Trancate b1 to startTime and b2 to stopTime
			frame.b1 = this.beatAtTime(frame.t1 < this.startTime ? this.startTime : frame.t1);
			frame.b2 = this.beatAtTime(this.stopTime > this.startTime && frame.t2 > this.stopTime ? this.stopTime : frame.t2);

			return frame;
		})
		.map(toEventsBuffer);

		const output = stream
		.chain(id)
		.tap((event) => event.time = this.timeAtBeat(event[0]));

		output.start = (time) => {
			stream.start(time || privates$1.timer.now());
			privates$1.sequenceCount++;
			return stream;
		};

		output.stop = (time) => {
			stream.stop(time || privates$1.timer.now());
			privates$1.sequenceCount--;
			return stream;
		};

		return output;
	},

	// Todo: work out how stages are going to .connect(), and
    // sort out how to access rateParam (which comes from Transport(), BTW)
    connect: function(target, outputName, targetChan) {
        return outputName === 'rate' ?
            connect(privates(this).rateParam, target, 0, targetChan) :
            connect() ;
    },

    disconnect: function(outputName, target, outputChan, targetChan) {
        if (outputName !== 'rate') { return; }
        if (!target) { return; }
        disconnect(privates(this).rateParam, target, 0, targetChan);
    }
});

define$l(Transport.prototype, {
	playing: getOwnPropertyDescriptor$7(Clock.prototype, 'playing'),

	beat: {
		get: function() {
			return this.playing ?
				this.beatAtTime(this.context.currentTime) :
				0 ;
		}
	},

	bar: {
		get: function() {
			return this.playing ?
				this.barAtBeat(this.beat) :
				0 ;
		}
	},

	tempo: {
		get: function() {
			return getValueAtTime(this.context.currentTime, this.rate.value) * 60;
		},

		set: function(tempo) {
			var privates$1 = privates(this);

			//getValueAtTime(this.rate, context.currentTime);
			// param, time, curve, value, duration, notify, context
			automate(this.rate.value, this.context.currentTime, 'step', tempo / 60, 0, privates$1.notify, this.context);
		}
	},

 	/*
	Duration of one process cycle. At 44.1kHz this works out just
	shy of 3ms.
	*/

	blockDuration: {
		get: function() {
			return 128 / this.context.sampleRate;
		}
	},

	frameDuration: {
		get: function() {
			return privates(this).timer.duration;
		}
	},

	frameLookahead: {
		get: function() {
			return privates(this).timer.lookahead;
		}
	}
});

const A$5      = Array.prototype;
const assign$w = Object.assign;
const freeze$2 = Object.freeze;

const insertByBeat = insert$1(get$1('0'));

const rate0$1  = freeze$2({ 0: 0, 1: 'rate', 2: 1, location: 0 });

function round(n) {
	return Math.round(n * 1000000000000) / 1000000000000;
}

function Sequence(transport, data) {
	// Super
	Clock.call(this, transport.context);

	// Private
	privates(this).transport = transport;

	// Properties

	/*
	.events
	An array of events that are played on `.start(time)`.
    See <a href="#events">Events</a>.
	*/

	this.events    = data && data.events || [];

	/*
	.sequences
	An array of sequences that may be triggered by `'sequence'` events
	stored in `.events`. See <a href="#sequences">Sequences</a>.
	*/

	this.sequences = data && data.sequences || [];
}

assign$w(Sequence.prototype, Clock.prototype, {
	/*
	.beatAtTime(time)
	Returns the beat at a given `time`.
	*/

	beatAtTime: function(time) {
		if (time < 0) { throw new Error('Sequence.beatAtTime(time) does not accept -ve time values'); }

		const privates$1  = privates(this);
		const transport = privates$1.transport;
		const startLoc  = this.startLocation || (this.startLocation = transport.beatAtTime(this.startTime));
		const timeLoc   = transport.beatAtTime(time);
		const events    = this.events ?
			this.events.filter(isRateEvent) :
			nothing ;

		return beatAtLocation(events, rate0$1, timeLoc - startLoc);
	},

	/*
	.timeAtBeat(beat)
	Returns the time at a given `beat`.
	*/

	timeAtBeat: function(beat) {
		const privates$1  = privates(this);
		const transport = privates$1.transport;
		const startLoc  = this.startLocation || (this.startLocation = transport.beatAtTime(this.startTime));
		const events    = this.events ?
			this.events.filter(isRateEvent) :
			nothing ;

		const beatLoc   = locationAtBeat(events, rate0$1, beat);

		return round(transport.timeAtBeat(startLoc + beatLoc));
	},

	record: function(time, type) {
		const event = A$5.slice.apply(arguments);

		// COnvert time to beats
		event[0] = this.beatAtTime(time);

		// Convert duration to beats
		if (event[4] !== undefined) {
			event[4] = this.beatAtTime(time + event[4]) - event[0];
		}

		if (!isValidEvent(event)) {
			throw new Error('Sequence cant .record(...) invalid event ' + JSON.stringify(event));
		}

		insertByBeat(this.events, event);
		return this;
	}
});

const DEBUG$5 = window.DEBUG;

const assign$x    = Object.assign;
const define$m    = Object.defineProperties;
const getOwnPropertyDescriptor$8 = Object.getOwnPropertyDescriptor;

const seedRateEvent  = { 0: 0, 1: 'rate' };
const getId          = get$1('id');
const idQuery        = { id: '' };

function byBeat(a, b) {
	return a[0] === b[0] ? 0 :
		a[0] > b[0] ? 1 :
		-1 ;
}


/* Command constructor and pool */

function Command(beat, type, event) {
	// If there is a command in the pool use that
	if (Command.pool.length) {
		return Command.reset(Command.pool.shift(), beat, type, event);
	}

	Command.reset(this, beat, type, event);
}

Command.pool = [];

Command.reset = function(command, beat, type, event) {
	command.beat  = beat;
	command.type  = type;
	command.event = event;

	command.time         = undefined;
	command.data         = undefined;
	command.target       = undefined;
	command.stopCommand  = undefined;
	command.startCommand = undefined;

	return command;
};

function updateFrame(sequence, frame) {
	// This assumes rateParam is already populated, or is
	// populated dynamically
	frame.b1 = sequence.beatAtTime(frame.t1);
	frame.b2 = sequence.beatAtTime(frame.t2);
}

function advanceToB1(events, frame) {
	// Ignore events before b1
	let n = -1;
	while (++n < events.length && events[n][0] < frame.b1);
	return n - 1;
}

function processFrame(data, frame) {
	if (frame.type === 'stop') {
		// Todo: stop all events
		console.log('Implement stop frames');
		return data;
	}

	const sequence     = data.sequence;
	const buffer       = data.buffer;
	const commands     = data.commands;
	const stopCommands = data.stopCommands;
	const processed    = data.processed;
	const events       = sequence.events;

	// Empty buffer
	buffer.length = 0;

	// Event index of first event after frame.b1
	let n = advanceToB1(events, frame);

	// Grab events up to b2
	while (++n < events.length && events[n][0] < frame.b2) {
		let event = events[n];

		if (event[1] === 'meter' || event[1] === 'rate') {
			continue;
		}

		let eventType = event[1];
		let eventName = event[2];

		// Check that we are after the last buffered event of
		// this type and kind
		if (!processed[eventType]) {
			processed[eventType] = {};
			buffer.push(event);
			processed[eventType] = { [eventName]: event };
		}
		else if (!processed[eventType][eventName] || processed[eventType][eventName][0] < event[0]) {
			buffer.push(event);
			processed[eventType][eventName] = event;
		}
	}
	--n;

	// Grab exponential events beyond b2 that should be cued in this frame
	while (++n < events.length) {
		let event     = events[n];
		let eventType = event[1];
		let eventName = event[2];

		// Ignore non-param, non-exponential events
		if (event[1] !== "param" && event[4] !== "exponential") {
			continue;
		}

		// Check that we are after the last buffered event of
		// this type and kind, and that last event is before b2
		if (!processed[eventType]) {
			processed[eventType] = {};
			buffer.push(event);
			processed[eventType] = { [eventName]: event };
		}
		else if (!processed[eventType][eventName]) {
			buffer.push(event);
			processed[eventType][eventName] = event;
		}
		else if (processed[eventType][eventName][0] < frame.b2 && processed[eventType][eventName][0] < event[0]) {
			buffer.push(event);
			processed[eventType][eventName] = event;
		}
	}
	--n;

	// Populate commands
	commands.length = 0;

	// Transfer commands from the stopCommands buffer
	n = -1;
	while (++n < stopCommands.length) {
		if (stopCommands[n].beat < frame.b2) {
			stopCommands[n].time = sequence.timeAtBeat(stopCommands[n].beat);
			commands.push(stopCommands[n]);
			stopCommands.splice(n, 1);
		}
	}

	// Populate commands from buffer
	n = -1;
	while (++n < buffer.length) {
		const event = buffer[n];

		if (!isValidEvent(event)) {
			throw new Error('Invalid event ' + JSON.stringify(event) + '. ' + eventValidationHint(event));
		}

		const command = new Command(event[0], event[1], event);
		//console.log('COMMAND', event, JSON.stringify(command));
		command.time = sequence.timeAtBeat(command.beat);
		commands.push(command);

		// Deal with events that have duration
		const duration = getDuration(buffer[n]);

		if (duration !== undefined) {
			// This should apply to sequenceon/sequenceoff too, but sequence
			// is bugging for that. Investigate.
			if (command.type === 'note') { command.type = 'noteon'; }
			const stopCommand = new Command(event[0] + duration, event[1] + 'off', event);

			// Give stop and start a reference to each other
			stopCommand.startCommand = command;
			command.stopCommand = stopCommand;

			// If the stop is in this frame
			if (stopCommand.beat < frame.b2) {
				stopCommand.time = sequence.timeAtBeat(stopCommand.beat);
				commands.push(stopCommand);
			}
			else {
				stopCommands.push(stopCommand);
			}
		}
	}

	// Expose frame to allow it to be passed to sub sequences
	data.frame = frame;

	return data;
}

function addSequenceData(data, command) {
	const target     = data.target;
	const sequenceId = command.event[2];
	const nodeId     = command.event[3];

	idQuery.id = sequenceId;
	const sequence   = target.sequences.find(matches$1(idQuery));

	if (!sequence) {
		throw new Error('Sequence "' + sequenceId + '" not found')
	}

	const node = target.get(nodeId);

	if (!node) {
		throw new Error('Node "' + nodeId + '" not found')
	}

	// Stream events
	const childData = {
		sequence:     new Sequence(target, sequence).start(command.time),
		buffer:       [],
		commands:     [],
		stopCommands: [],
		sequences:    [],
		processed:    {},
		target:       node
	};

	data.sequences.push(childData);

	return childData;
}

function distributeCommand(data, command) {
	if (command.type === 'sequence') {
		command.data = addSequenceData(data, command);
		//console.log('ADD', data.sequences.length)
	}
	else if (command.type === 'sequenceoff') {
		command.startCommand.data.stopTime = command.time;
		command.startCommand.data.sequence.stop(command.time);
	}
	else {
		const target = command.startCommand ?
			command.startCommand.target :
			data.target ;

		command.target = distribute(target, command.time, command.type, command.event[2], command.event[3], command.event[4]);
	}

	if (!command.stopCommand) {
		if (command.startCommand) {
			// Release back to pool
			Command.pool.push(command.startCommand);

			// Unlink start and stop commands
			command.startCommand.stopCommand = undefined;
			command.startCommand = undefined;
		}

		// Release back to pool
		Command.pool.push(command);
	}
}

function distributeSequence(data, sequenceData) {
	updateFrame(sequenceData.sequence, data.frame);
	processFrame(sequenceData, data.frame);
	distributeData(sequenceData);
}

function distributeData(data) {
	if (data.commands.length) {
		let n = -1;
		while (++n < data.commands.length) {
			distributeCommand(data, data.commands[n]);
		}
	}

	if (data.sequences.length) {
		let n = -1;
		while (++n < data.sequences.length) {
			distributeSequence(data, data.sequences[n]);

			if (data.sequences[n].stopTime !== undefined) {
				data.sequences.splice(n--, 1);
			}
		}
	}
}

function assignTime(e0, e1) {
	e1.time = e0.time + timeAtBeatOfEvents(e0, e1, e1[0] - e0[0]);
	return e1;
}

function automateRate(privates, event) {
	// param, time, curve, value, duration, notify, context
	automate(privates.rateParam, event.time, event[3] || 'step', event[2], null, privates.notify, privates.context) ;
	return privates;
}

function Sequencer(transport, data, rateParam, timer, notify) {

	// PlayNode provides the properties:
	//
	// startTime:  number || undefined
	// stopTime:   number || undefined
	// playing:    boolean

	PlayNode.call(this);


	// Sequence assigns the proerties:
	//
	// events:         array
	// sequences:      array

	Sequence.call(this, transport, data);


	// Mix in Meter
	//
	// beatAtBar:  fn(n)
	// barAtBeat:  fn(n)
	//
	// There is no point in calling this as the constructor does nothing
	// Meter.call(this)


	// Private

	const privates$1 = privates(this);

	privates$1.timer     = timer;
	privates$1.rateParam = rateParam;
	privates$1.beat      = 0;
	privates$1.notify    = notify;
	privates$1.context   = this.context;

	define$m(this, {
		rate: {
			value: rateParam
		}
	});
}

define$m(Sequencer.prototype, {

	/* .time
	The time of audio now leaving the device output. On browsers the have not
	yet implemented `context.getOutputTimestamp()` this value is estimated from
	`currentTime` and a guess at the output latency.
	*/

	time: {
		get: function() {
			return this.context.getOutputTimestamp().contextTime;
		}
	},

	/* .tempo
	The rate of the transport clock, expressed in bpm.
	*/

	tempo: {
		get: function() {
			const privates$1  = privates(this);
			return getValueAtTime(privates$1.rateParam, this.time) * 60;
		},

		set: function(tempo) {
			const privates$1  = privates(this);
			// param, time, curve, value, duration, notify, context
			automate(privates$1.rateParam, this.context.currentTime, 'step', tempo / 60, null, privates$1.notify, this.context);
		}
	},

	/* .meter
	The current meter.
	*/

	meter: {
		get: function() {
			const transport = privates(this).transport;
			return transport.getMeterAtTime(transport.currentTime);
		},

		set: function(meter) {
			const transport = privates(this).transport;
			transport.setMeterAtTime(meter, transport.currentTime);
		}
	},

	/* .beat
	The current beat count.
	*/

	beat: {
		get: function() {
			const privates$1 = privates(this);

			if (this.startTime === undefined || this.startTime >= this.context.currentTime || this.stopTime < this.context.currentTime) {
				return privates$1.beat;
			}

			return this.beatAtTime(this.time);
		},

		set: function(value) {
			const privates$1 = privates(this);

			if (this.startTime === undefined || this.stopTime < this.context.currentTime) {
				privates$1.beat = value;
				// Todo: update state of entire graph with evented settings for
				// this beat
			}
			else {
				// Sequence is started - can we move the beat? Ummm... I don't thunk so...
				throw new Error('Beat cannot be moved while sequencer is running');
			}
		}
	},

	/*
	.bar
	The current bar count.
	*/

	bar: {
		get: function() {
			return this.barAtBeat(this.beat) ;
		}
	},

	playing: getOwnPropertyDescriptor$8(PlayNode.prototype, 'playing')
});

assign$x(Sequencer.prototype, Sequence.prototype, Meter$1.prototype, {
	createSequence: function() {
		// Todo: turn this into a constructor that creates objects with a
		// .remove() method, ie.
		// new Sequence(stage, options)
		const sequence = {
			id: generateUnique(this.sequences.map(getId)),
			label: '',
			events: [],
			sequences: []
		};

		this.sequences.push(sequence);
		return sequence;
	},

	beatAtTime: function(time) {
		const transport     = privates(this).transport;
		const startLocation = this.startLocation
		   || (this.startLocation = transport.beatAtTime(this.startTime)) ;

		return transport.beatAtTime(time) - startLocation;
	},

	timeAtBeat: function(beat) {
		const transport     = privates(this).transport;
		const startLocation = this.startLocation
		   || (this.startLocation = transport.beatAtTime(this.startTime)) ;

		return transport.timeAtBeat(startLocation + beat);
	},

	/*
	.start(time)
	Starts the sequencer at `time`.
	*/

	start: function(time, beat) {
		const privates$1  = privates(this);

		time = time || this.context.currentTime;
		beat = beat === undefined ? privates$1.beat : beat ;

		// Run transport, if it is not already - Todo: .playing uses currentTIme
		// write some logic that uses time (kind of like what .playing does)
		if (this.transport.playing) {
			time = this.transport.timeAtBeat(Math.ceil(this.transport.beatAtTime(time)));
		}
		else {
			this.transport.start(time, beat);
		}

		const stream    = privates$1.stream;
		const transport = privates$1.transport;
		const events    = this.events;
		const rateParam = privates$1.rateParam;

		// If stream is not waiting, stop it and start a new one
		if (stream) {
			stream.stop(time);
		}

		// Set this.startTime
		Sequence.prototype.start.call(this, time, beat);

		// Set rates
		const rates = this.events ?
			this.events.filter(isRateEvent).sort(byBeat) :
			[] ;

		seedRateEvent.time = time;
		seedRateEvent[2]   = getValueAtTime(rateParam, time);
		rates.reduce(assignTime, seedRateEvent);
		rates.reduce(automateRate, privates$1);

		// Stream events
		const data = {
			sequence:     this,
			buffer:       [],
			commands:     [],
			sequences:    [],
			stopCommands: [],
			processed:    {},
			target:       this
		};

		privates$1.stream = Stream$1
		.fromTimer(privates$1.timer)
		.tap((frame) => {
			updateFrame(this, frame);

			// Event index
			let n = advanceToB1(events, frame);

			// Grab meter events up to b2
			// We do this first so that a generator might follow these changes
			let m = n;
			while (++m < events.length && events[m][0] < frame.b2) {
				// Schedule meter events on transport
				if (events[m][1] === 'meter') {
					transport.setMeterAtBeat(events[m][0] + transport.beatAtTime(this.startTime), events[m][2], events[m][3]);
				}
			}
		})
		.fold(processFrame, data)
		.each(distributeData)
		.start(time);

		return this;
	},

	/*
	.stop(time)
	Stops the sequencer at `time`.
	*/

	stop: function(time) {
		time = time || this.context.currentTime;

		const privates$1 = privates(this);
		const stream   = privates$1.stream;
		const rateParam = privates$1.rateParam;

		// Set this.stopTime
		Sequence.prototype.stop.call(this, time);

		// Hold automation for the rate node
		// param, time, curve, value, duration, notify, context
		automate(rateParam, this.stopTime, 'hold', null, null, privates$1.notify, this.context);

		// Store beat
		privates$1.beat = this.beatAtTime(this.stopTime);

		// Stop the stream
		stream && stream.stop(this.stopTime);

		// Stop transport
		privates$1.transport.stop(this.stopTime);

		// Log the state of Pool shortly after stop
		//if (DEBUG) {
		//	setTimeout(function() {
		//		logSequence(sequencer);
		//		console.log('Pool –––––––––––––––––––––––––––––––––');
		//		console.table(Pool.snapshot());
		//	}, 400);
		//}

		return this;
	},

	sequence: function(toEventsBuffer) {
		const privates$1 = privates(this);
		const transport = privates$1.transport;
		return transport.sequence(toEventsBuffer);
	},

	/*
	.cue(beat, fn)
	Cues `fn` to be called on `beat`.
	*/

	cue: function(beat, fn) {
		var stream = privates(this).stream;
		stream.cue(beat, fn);
		return this;
	}
});

const DEBUG$6        = window.DEBUG || false;
const assign$y       = Object.assign;
const define$n       = Object.defineProperties;
const getOwnPropertyDescriptor$9 = Object.getOwnPropertyDescriptor;

const defaultData = {
    nodes: [{ id: '0', type: 'output' }]
};

// Nodes

function createOutputMerger(context, target) {
    // Safari sets audio.destination.maxChannelCount to
    // 0 - possibly something to do with not yet
    // supporting multichannel audio, but still annoying.
    var count = target.maxChannelCount > config.channelCountLimit ?
        config.channelCountLimit :
        target.maxChannelCount ;

    var merger = new ChannelMergerNode(context, {
        numberOfInputs: count
    });

    // Used by meter-canvas controller - there is no way to automatically
    // determine the number of channels in a signal.
    //
    // Huh? What about numberOfInputs?
    merger.outputChannelCount = count;

    // Make sure incoming connections do not change the number of
    // output channels (number of output channels is determined by
    // the sum of channels from all inputs).
    merger.channelCountMode = 'explicit';

    // Upmix/downmix incoming connections.
    merger.channelInterpretation = 'discrete';

    merger.connect(target);
    return merger;
}

function rewriteURL(basePath, url) {
    // Append relative URLs, including node types, to basePath
    return /^https?:\/\/|^\//.test(url) ? url : basePath + url;
}

function requestAudioNode(type, context, settings, transport, basePath) {
    return (
        constructors$1[type] ?
            Promise.resolve(constructors$1[type]) :
            // settings.type is a URL
            importPlugin(rewriteURL(basePath, type))
    )
    .then(function(Node) {
        // If the constructor has a preload fn, it has special things
        // to prepare (such as loading AudioWorklets) before it can
        // be used.
        return Node.preload ?
            Node.preload(basePath, context).then(() => {
                print('Node', Node.name, 'preloaded');
                return Node;
            }) :
            Node ;
    })
    .then(function(Node) {
        // Create the audio node
        return new Node(context, settings, transport);
    });
}


/*
Soundstage(data, settings)

Import Soundstage and create a new Soundstage object, passing in some setup
data.

```
import Soundstage from 'http://sound.io/soundstage/module.js';

const stage = new Soundstage({
    nodes: [
        { id: '1', type: 'instrument', data: {...} },
        { id: '2', type: 'output', data: {...} }
    ],

    connections: [
        { source: '1', target: '2' }
    ],

    sequences: [...],
    events: [...]
});
```

A stage is a graph of AudioNodes and connections, and a sequencer of events
targeted at those nodes. A stage also quacks like an AudioNode, and can
be connected to other nodes (although by default it is connected to
`context.destination`). Finally, a stage can be stringified to JSON, and
that JSON can be used to recreate the same node graph elsewhere.

```
const json = JSON.stringify(stage);

// '{
//     "nodes": [...],
//     "connections": [...],
//     "sequences": [...],
//     "events": [...]
// }'

// Elsewhere
const stage = new Soundstage(JSON.parse(json));
```
*/

/*
Options

The Soundstage constructor also accepts an optional second object, options.

`.context`

By default an AudioContext is created and shared by all stages. Pass in an
AudioContext to have the stage use a different context.

`.destination`

[Todo: rename as a boolean option.]
By default the output of the stage graph is connected to `context.destination`.
Pass in `null` to create a disconnected stage (and use `stage.connect()`
to route it elsewhere).

`.notify`

```
const stage = new Soundstage({...}, {
    notify: function(node, property, value) {...}
});
```

A function that is called when an AudioParam is scheduled to change. A
fundamental problem when creating a UI for a WebAudio graph is the lack of
observability. Everything happens on a seperate thread, and cannot be
interrogated. Use notify to have Soundstage notify changes to AudioParam values.
*/

function Soundstage(data = defaultData, settings = nothing) {
    if (!Soundstage.prototype.isPrototypeOf(this)) {
        // Soundstage has been called without the new keyword
        return new Soundstage(data, settings);
    }

    if (isDefined(data.version) && data.version !== this.version) {
        throw new Error('Soundstage: data version mismatch.', this.version, data.version);
    }

    if (DEBUG$6) { printGroup('Soundstage()'); }

    const context$1     = settings.context || context;
    const destination = settings.destination === undefined ? context$1.destination : settings.destination ;
    const notify      = settings.notify || noop$1;
    const output      = createOutputMerger(context$1, destination);
    const rateNode    = new window.ConstantSourceNode(context$1, { offset: 2 });
    const rateParam   = rateNode.offset;
    const timer       = new Timer$1(() => context$1.currentTime);
    const transport   = new Transport(context$1, rateParam, timer, notify);

    rateNode.start(0);


    // Privates

    const privates$1 = privates(this);

    privates$1.notify = notify;
    privates$1.outputs = {
        default: output,
        rate:    rateNode
    };


    // Properties

    /*
    .label
    */

    this.label = data.label || '';

    /*
    .mediaChannelCount
    */

    define$n(this, {
        mediaChannelCount: { value: undefined, writable: true, configurable: true },
        // roundTripLatency:  { value: Soundstage.roundTripLatency, writable: true, configurable: true },
    });


    // Initialise audio regions. Assigns:
    //
    // regions:    array

    //const regions
    //    = this.regions
    //    = (settings.regions || []).map(function(data) {
    //        return Region(context, data);
    //    });


    // Initialise soundstage as a graph. Assigns:
    //
    // nodes:       array
    // connections: array

    const requestTypes = {
        input: function(type, context, data) {
            return requestInputSplitter(context).then(function(input) {
                return new Input(context, data, input);
            });
        },

        metronome: function(type, context, data) {
            return Promise.resolve(new Metronome(context, data, transport));
        },

        output: function(type, context, data) {
            return Promise.resolve(new OutputSplitter(context, data, output));
        },

        default: function(type, context, data, transport) {
            return requestAudioNode(type, context, data, transport, config.basePath + 'nodes/');
        }
    };

    Graph.call(this, context$1, requestTypes, data, transport);


    // Initialise MIDI and keyboard controls. Assigns:
    //
    // controls:   array-like

    this.__promise = this.ready(function graphReady(stage) {
        define$n(stage, {
            controls: {
                enumerable: true,
                value: data.controls ?
                    data.controls.reduce(function(controls, options) {
                        // Get target graph node from target id
                        const target  = stage.nodes.find((object) => object.id === options.target);
                        new Control(controls, options.source, target, options, notify);
                        return controls;
                    }, []) :
                    []
            }
        });

        if (DEBUG$6) {
            const sources = map$1(get$1('source'), stage.controls);
            print('controls', sources.filter(isKeyboardInputSource).length + ' keyboard, ' + sources.filter(isMIDIInputSource).length + ' MIDI');
        }

        // Notify observers that objects have mutated
        // Todo: work out what's happening in Observer that we have to do
        // controls differently - something to do with immutable key / frozen state,
        // I suspect...
        notify(stage.nodes, '.');
        notify(stage.connections, '.');
        notify(stage, 'controls');
    })
    .then(function() {
        return context$1.resume();
    });


    // Initialise soundstage as a Sequencer. Assigns:
    //
    // start:       fn
    // stop:        fn
    // beatAtTime:  fn
    // timeAtBeat:  fn
    // beatAtBar:   fn
    // barAtBeat:   fn
    // cue:         fn

    Sequencer.call(this, transport, data, rateParam, timer, notify);


    // Initialise as a recorder...
    //var recordStream   = RecordStream(this, this.sequences);


    // Create metronome.
    //this.metronome = new Metronome(context, data.metronome, this);
    //this.metronome.start(0);
    // Todo: is this really necessary? Is there another way of getting
    // transport inside sound.io?
    this.transport = transport;


    if (DEBUG$6) { printGroupEnd(); }
}

define$n(Soundstage.prototype, {
    version: { value: 1 },

    time:           getOwnPropertyDescriptor$9(Sequencer.prototype, 'time'),
    tempo:          getOwnPropertyDescriptor$9(Sequencer.prototype, 'tempo'),
    meter:          getOwnPropertyDescriptor$9(Sequencer.prototype, 'meter'),
    beat:           getOwnPropertyDescriptor$9(Sequencer.prototype, 'beat'),
    bar:            getOwnPropertyDescriptor$9(Sequencer.prototype, 'bar'),
    playing:        getOwnPropertyDescriptor$9(Sequencer.prototype, 'playing'),
    //blockDuration:  getOwnPropertyDescriptor(Transport.prototype, 'blockDuration'),
    //frameDuration:  getOwnPropertyDescriptor(Transport.prototype, 'frameDuration'),
    //frameLookahead: getOwnPropertyDescriptor(Transport.prototype, 'frameLookahead'),

    /*
    .metronome

    A boolean property that is a shortcut control the first metronome node in
    the graph. Indicates whether a metronome is playing at the current time.
    Setting .metronome to true will create a metronome node (if there inspect
    not already one in the graph, and then start it.
    */

    metronome: {
        enumerable: true,

        get: function() {
            const node = this.nodes.find(matches$1({ type: 'metronome' }));
            if (!node) { return false; }
            const metronome = node.data;
            return metronome.startTime < this.context.currentTime && (metronome.stopTime === undefined || metronome.stopTime > this.context.currentTime);
        },

        set: function(value) {
            const node = this.nodes.find(matches$1({ type: 'metronome' }));

            if (value) {
                if (!node) {
                    this.create('metronome').then(function(m) {
                        connect(m, this.get('output'));
                    });
                }
                else {
                    const metronome = node.data;
                    metronome.start(this.context.currentTime);
                }
            }
            else if (node) {
                const metronome = node.data;
                metronome.stop(metronome.context.currentTime);
            }
        }
    }
});

assign$y(Soundstage.prototype, Sequencer.prototype, Graph.prototype, {
    createControl: function(source, target, options) {
        const privates$1 = privates(this);

        // Target must be the graph node
        target = typeof target === 'string' ?
            this.nodes.find((object) => object.id === target) :
            target ;

        return new Control(this.controls, source, target, options, privates$1.notify);
    },

    connect: function(input, port, channel) {
        const outputs = privates(this).outputs;
        const output = typeof port === 'string' ? outputs[port] : outputs.default ;

        if (!output) { throw new Error('Output "' + port + '" not found'); }
        connect(output, input, typeof port === 'string' ? 0 : port, channel);

        return input;
    },

    disconnect: function(input, port) {
        const outputs = privates(this).outputs;
        const output = typeof port === 'string' ? outputs[port] : outputs.default ;

        if (!port) { throw new Error('Output "' + port + '" not found'); }
        disconnect(output, input, typeof port === 'string' ? 0 : port, channel);

        return this;
    },

    /*
    .timeAtDomTime(domTime)
    Returns audio context time at the given `domTime`, where `domTime` is a
    time in seconds relative to window.performance.now().
    */

    timeAtDomTime: function(domTime) {
        return timeAtDomTime(this.context, domTime);
    },

    /*
    .domTimeAtTime(time)
    Returns DOM performance time at the given context `time`.
    */

    domTimeAtTime: function(domTime) {
        return domTimeAtTime(this.context, domTime);
    },

    destroy: function() {
        // Destroy the playhead.
        //Head.prototype.destroy.call(this);

        // Remove soundstage's input node from mediaInputs, and disconnect
        // media from it.
        //var input = AudioObject.getInput(this);
        //var i     = mediaInputs.indexOf(input);

        //if (i > -1) {
        //    mediaInputs.splice(i, 1);
        //}

        //requestMedia(this.audio).then(function(media) {
        //    media.disconnect(input);
        //});

        const privates$1 = privates(this);
        var output = privates$1.outputs.default;
        output.disconnect();

        this[$store].modify('clear');
        return this;
    },

    /*
    .records()
    Returns an array of record objects containing unsaved data.
    */

    records: function() {
        return this.nodes.reduce((list, node) => {
            const data = node.records && node.records();
            return data ? list.concat(data) : list ;
        }, []);
    }
});

const transforms = {
    // From Fn

    'pass': {
        tx: id,
        ix: id
    },

    'linear': {
        tx: (value, min, max) => linear$1(min, max, value),
        ix: (value, min, max) => linear(min, max, value)
    },

    'quadratic': {
        tx: (value, min, max) => quadratic$1(min, max, value),
        ix: (value, min, max) => quadratic(min, max, value)
    },

    'cubic': {
        tx: (value, min, max) => cubic$1(min, max, value),
        ix: (value, min, max) => cubic(min, max, value)
    },

    'logarithmic': {
        tx: (value, min, max) => logarithmic$1(min, max, value),
        ix: (value, min, max) => logarithmic(min, max, value)
    },

    'linear-logarithmic': {
        // The bottom 1/9th of the fader travel is linear from 0 to min, while
        // the top 8/9ths is dB linear from min to max.
        tx: (value, min, max) => linearLogarithmic$1(min, max, value),
        ix: (value, min, max) => linearLogarithmic(min, max, value)
    },


    // From MIDI

    'frequency': {
        tx: (value, min, max) => {
            return (floatToFrequency(value) - min) * (max - min) / floatToFrequency(127) + min ;
        },

        ix: function(value, min, max) {
            // Todo
        }
    },


    // Soundstage

    'toggle': {
        tx: function toggle(value, min, max, current) {
            return value > 0 ?
                current <= min ? max : min :
                current ;
        },

        ix: function(value, min, max, current) {
            return value > 0 ?
                current <= min ? max : min :
                current ;
        }
    },

    'switch': {
        tx: function swtch(min, max, current, n) {
            return n < 0.5 ? min : max ;
        },

        ix: function() {

        }
    },

    'continuous': {
        tx: function toggle(min, max, current, n) {
            return current + 64 - n ;
        },

        ix: function() {
            // Todo
        }
    }
};

const parseValue = capture$1(/-?[\d\.]+\s*(?:(dB))/, {
    // dB
    1: (n, tokens) => toLevel(parseFloat(tokens[0]))
}, null);

// Adapted from
// https://github.com/Jam3/audiobuffer-to-wav/blob/master/index.js
//
// published under the MIT license
//
// The MIT License (MIT) Copyright (c) 2015 Jam3
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


function bufferToWAV(buffer, opt) {
    opt = opt || {};

    var numChannels = buffer.numberOfChannels;
    var sampleRate = buffer.sampleRate;
    var format = opt.float32 ? 3 : 1;
    var bitDepth = format === 3 ? 32 : 16;

    var result;
    if (numChannels === 2) {
        result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
    } else {
        result = buffer.getChannelData(0);
    }

    return encodeWAV(result, format, sampleRate, numChannels, bitDepth)
}

function encodeWAV (samples, format, sampleRate, numChannels, bitDepth) {
    var bytesPerSample = bitDepth / 8;
    var blockAlign = numChannels * bytesPerSample;

    var buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
    var view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * bytesPerSample, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, format, true);
    /* channel count */
    view.setUint16(22, numChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * blockAlign, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, blockAlign, true);
    /* bits per sample */
    view.setUint16(34, bitDepth, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * bytesPerSample, true);

    if (format === 1) { // Raw PCM
        floatTo16BitPCM(view, 44, samples);
    } else {
        writeFloat32(view, 44, samples);
    }

    return buffer
}

function interleave (inputL, inputR) {
    var length = inputL.length + inputR.length;
    var result = new Float32Array(length);

    var index = 0;
    var inputIndex = 0;

    while (index < length) {
        result[index++] = inputL[inputIndex];
        result[index++] = inputR[inputIndex];
        inputIndex++;
    }

    return result
}

function writeFloat32 (output, offset, input) {
    for (var i = 0; i < input.length; i++, offset += 4) {
        output.setFloat32(offset, input[i], true);
    }
}

function floatTo16BitPCM (output, offset, input) {
    for (var i = 0; i < input.length; i++, offset += 2) {
        var s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

function writeString (view, offset, string) {
    for (var i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function getEventsDuration() {
    return 4;
    throw new Error('Import this from old');
}

function getEventDuration() {
    return 4;
    throw new Error('Import this from old');
}

print(' - http://github.com/soundio/soundstage');

exports.automate = automate;
exports.automato__ = automato__;
exports.bufferToWAV = bufferToWAV;
exports.default = Soundstage;
exports.domTimeAtTime = domTimeAtTime$1;
exports.getContextTime = getContextTime;
exports.getEventDuration = getEventDuration;
exports.getEventsDuration = getEventsDuration;
exports.getValueAtTime = getValueAtTime;
exports.isAudioParam = isAudioParam;
exports.parseValue = parseValue;
exports.requestBuffer = requestBuffer;
exports.timeAtDomTime = timeAtDomTime;
exports.transforms = transforms;
