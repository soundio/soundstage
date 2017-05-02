# Fn

A library of functional functions.


### Functional functions

##### `id(object)`

Returns `object`.

##### `noop()`

Returns `undefined`.


##### `id(object)`

Returns `object`.

##### `noop()`

Returns `undefined`.

##### `self()`

returns `this`.

##### `cache(fn)`

    var fn2 = Fn.cache(fn);

Caches the results of calls to `fn2(value)`.

##### `choose(object)`

Returns a function that calls the function at property of `object` that matches
it's first argument. It is called with the remaining arguments.

    var fn = choose({
        'pie':   function fn1(a, b) {...},
        'chips': function fn2(a, b) {...}
    });

	fn('pie', a, b);   // Calls fn1(a, b)

Accepts `Map` objects as well as plain objects.

##### `compose(fn2, fn1)`

Composes two functions into a single function, where `fn2` is passed the result
of `fn1` and the result is returned.

##### `curry(fn)`

    var fn2 = Fn.curry(fn);

Curries `fn`. If `fn` normally requires 3 parameters, the curried result can
take those parameters in any grouping:

    fn2(a, b, c);
    fn2(a)(b)(c);
    fn2(a, b)(c);

If the curried function returns a curried function, that function can be called
in the same chain of parameters.

    var fn = curry(function(a, b, c) {
        var t = a + b + c;
        return curry(function(d, e) {
	        return t + d + e;
        });
    });

	fn(a, b, c, d, e);

By default a curried function expects immutable objects to be passed in. If a
function expects only primitives there's no problem, but if it is to operate on
objects that may change shape – or if it is a function with side effects –
switch on mutability by passing `true` as the second parameter. 

    var fn2 = curry(fn1, true);

All the curried helpers in the library can take mutable objects.

##### `flip(fn)`

Returns a function that calls `fn` with it's parameters in reverse order.

##### `once(fn)`

    var fn2 = Fn.once(fn1);

Calls `fn1` once, the first time `fn2` is called.

##### `overload(fn, object)`

Returns a function that calls a function at the property of `object` that
matches the result of calling `fn` (with all arguments). `overload` is curried.

	var overloadTypes = overload(function() {
	   return map(toType, arguments).join(' '); 
    });

    var fn = overloadTypes({
        'string number': function a() {...},
        'number number': function b() {...}
    });

	fn('pie', 4);   // Calls a('pie', 4)
	fn(1, 2);       // Calls b(1, 2)

##### `pipe(fn1, fn2, ...)`

Composes functions into a pipe. `fn2` is passed the result of `fn1`, `fn3` is
passed the result of `fn2` and so on until the result of the last function is
returned.

##### `throttle(fn [, time])`

Returns a function that calls `fn` periodically after it is called, with the
latest context and arguments. By default calls are throttled to animation
frames. Pass in `time` (in seconds) to use a setTimeout based timer, or pass
in a custom timer object with a `.request()` function.

##### `wait(fn, time)`

Returns a function that waits for `time` seconds without being invoked
before calling `fn` using the context and arguments from its latest invocation.

    var wait = Fn.wait(console.log, 1.5);

	wait(1);
	wait(2);
	wait(3);        // Calls fn(3) after 1.5 seconds

### Types

##### `equals(a, b)`

Test for deep equality.

##### `is(a, b)`

Test for referential equality.

##### `isDefined(object)`

Test returns `false` if `object` is `null` or `undefined` or `NaN`.

##### `isIn(array, object)`

Test for presence of `object` in `array`.

See `contains` for a flipped version of this function.

##### `toArray(object)`
##### `toClass(object)`
##### `toInt(object)`
##### `toFloat(object)`
##### `toString(object)`
##### `toType(object)`
##### `toStringType(string)`

    toStringType('http://cruncher.ch');  // 'url'
    toStringType('1955-09-12');          // 'date'
    toStringType('hello@cruncher.ch');   // 'email'
    toStringType('42');                  // 'int'
    toStringType('41.5');                // 'float'
    toStringType('{}');                  // 'json'
    toStringType('...');                 // 'string'


### Objects

Curried functions that operate on objects and maps.

##### `assign(source, object)`

Copies keys of `object` to `source`.

##### `get(key, object)`

Gets property `key` of `object`, where `object` has a `get` method (eg. Map,
WeakMap) or where `key` is a property of object.

##### `set(key, object, value)`

Sets property `key` of `object`, where `object` has a `set` method (eg. Map,
WeakMap) or where object can have `key` set on it.

##### `invoke(name, args, object)`
Invokes method `name` of `object` with `args`.


### Lists

Curried functions that operate on arrays and array-like objects such as
`arguments`. Many delegate to using a method of the same name if the object
has one, so they can also be used points-free style on functors and streams.

##### `concat(array2, array1)`

Concatenates `list2` to `list1`. More robust than Array#concat as it handles
arrays, array-like objects, functors and streams.

##### `contains(object, array)`
##### `each(fn, array)`
##### `filter(fn, array)`
##### `find(fn, array)`
##### `insert(fn, array, value)`
##### `last(array)`

Picks the last value from an array or array-like object.

##### `latest(stream)`

Consumes an array, functor or stream and returns the latest value.

##### `map(fn, array)`
##### `reduce(fn, seed, array)`
##### `remove(array, object)`
##### `rest(i, array)`

Returns values indexed `i` and above from `array`.

##### `sort(fn, array)`
##### `split(fn, array)`
##### `take(i)`

Returns values up to index `i` from `array`.

##### `diff(array1, array2)`
##### `intersect(array1, array2)`
##### `unite(array1, array2)`
##### `unique(array)`

<!--
##### `by(key, a, b)`
##### `byGreater(a, b)`
##### `byAlphabet(a, b)`
-->

### Numbers

##### `add(a, b)`
##### `gcd(a, b)`

Returns greatest common denominator.

##### `lcm(a, b)`

Returns lowest common multiple.

##### `max(a, b)`
##### `min(a, b)`
##### `mod(a, b)`
##### `multiply(a, b)`
##### `exp(n, x)`
##### `log(n, x)`
##### `pow(n, x)`
##### `root(n, x)`

Returns the `n`th root of `x`.

##### `toDeg(n)`
##### `toRad(n)`
##### `todB(n)`

Returns `n` as a ratio expressed in dB.

##### `toLevel(n)`

If `n` is a ratio expressed in dB, returns linear value.

##### `toCartesian(array)`
##### `toPolar(array)`
##### `limit(min, max, n)`
##### `normalise(min, max, n)`

Normalises `n` from range `min`-`max` to range 0-1.

##### `denormalise(min, max, n)`

Denormalises `n` from range 0-1 to range `min`-`max`.

##### `wrap(min, max, n)`
##### `cubicBezier(p1, p2, precision, x)`
##### `gaussian()`
Returns a random number with a bell curve probability centred around 0 with
limits -1 to 1.

##### `toFixed(n, value)`


### Strings

##### `append(string2, string1)`
##### `prepend(string1, string2)`
##### `slugify(string)`


### Time

##### `now()`

Returns `performance.now()` or date time, in seconds.

##### `requestTick(fn)`

Calls `fn` at the end of the current tick. (This helper is often called
`setImmediate` in other libraries.

##### `requestFrame(fn)`

An alias for `requestAnimationFrame(fn)`.


## Fn()

Create a functor: a lazy, mappable, readable list of values with chainable
methods. A functor is a fantasy-land compliant Functor, Applicative and Monad.

##### `Fn(fn)`

Creates a functor from a function or generator:

	// An infinite functor of `1`s
    var unity = Fn(function() { return 1; });

Values are extracted from a functor with `.shift()`:

    f.shift() // 1
    f.shift() // 1
    ...

##### `Fn.of(value, ...)`

Creates a functor from arguments.

    var f1 = Fn.of(0, 1, 2, 3);

##### `Fn.from(array)`

Creates a functor from an array or collection.

    var f2 = Fn.from([0, 1, 2, 3]);

#### Transform

##### `ap(object)`
//##### `buffer(object)`
##### `chain(fn)`
##### `chunk(n)`
##### `clone()`
##### `concat(list)`
##### `dedup()`
##### `filter(fn)`
##### `first()`
##### `fold(fn, seed)`
##### `join()`
##### `latest()`
##### `map(fn)`
##### `partition(fn)`
//##### `sort(fn)`
##### `take(i)`
##### `rest(i)`
##### `unique()`

#### Input

##### `buffer()`

<!--Give the functor an `.unshift()` method, creating an entry point for
unshifting values back into the flow.-->

#### Consume

##### `catch(fn)`

Catch errors. The callback is passed the error object, and it's return value
is passed to the flow of values.

##### `each(fn)`
##### `find(fn)`
##### `next()`
##### `pipe(stream)`
##### `reduce(fn, seed)`
##### `shift()`
##### `tap(fn)`
##### `toArray()`
##### `toJSON()`
##### `toString()`

## Stream()

Streams are pushable, observable functors. Streams inherit all methods of a
functor, plus they also get a `.push` method and are observed for `"push"` and
`"pull"` events.

##### `Stream(setup)`

Creates a stream.

    var stream = Stream(function setup() {
		var buffer = [0,1,2,3];
		return buffer;
    });

##### `Stream.of(value1, value2, ...)`

Create a buffer stream of values.

##### `Stream.from(array)`

Create a buffer stream from an array or collection.

#### Transform

##### `ap(object)`
##### `chain(fn)`
##### `choke(time)`
##### `chunk(n)`
##### `concat(source)`
##### `combine(fn, source1, source2, ...)`

Takes any number of streams and combines their latest values into one stream
by passing them through the combinator function `fn`. The combinator should
be able to accept the same number of arguments as the number of streams
(including the current stream).

##### `dedup()`
##### `delay()`
##### `filter(fn)`
##### `first()`
##### `fold(fn, seed)`
##### `interval(request)`
##### `join()`
##### `latest()`
##### `map(fn)`
##### `merge(source1, source2, ...)`
##### `partition(fn)`
##### `take(i)`
##### `rest(i)`
##### `unique()`
##### `delay(time)`
##### `throttle(request)`

#### Input

##### `push(value, ...)`

#### Consume

##### `catch(fn)`

Catch errors. The callback is passed the error object, and it's return value
is passed into the stream.

##### `each(fn)`
##### `find(fn)`
##### `next()`
##### `pipe(stream)`
##### `reduce(fn, seed)`
##### `shift()`
##### `toArray()`
##### `toJSON()`
##### `toString()`

//##### `buffer(value, ...)`
//
//<!--Give the functor an `.unshift()` method, creating an entry point for unshifting
//values back into the flow.-->

#### Control

##### `on(fn)`
##### `off(n)`
##### `stop()`
##### `then(fn)`

## Constructors

##### `Stream.Buffer(array)`

Create a pushable buffer stream from an array of values. Alias of `Stream.from(array)`.

##### `Stream.Combine(fn, source1, source2, ...)`

Takes any number of streams and combines their latest values into one stream
by passing them through the combinator function `fn`. The combinator should
be able to accept the same number of arguments as the number of streams.

##### `Stream.Merge(source1, source2, ...)`

Takes any number of streams and combines their latest values into one stream
by merging them temporally: that is, values are emitted in the order they are
pushed to their respective source streams.

##### `Stream.Choke()`

Create a stream that chokes the flow of values to flow one per frame, where
a frame is a browser animation frame.

##### `Stream.Delay(duration)`

Create a stream that delays the flow of pushed values by `duration` seconds.

##### `Stream.Throttle()`

Create a stream that throttles the flow of values to the latest value per frame,
where a frame is a browser animation frame.

##### `Stream.Timer()`

Create a stream that emits values at constant intervals.


## Pool(options, prototype)

Creates a pseudo-constructor function for pooled objects.

    var Thing = Pool({
	    create: function(...) { ... },
        reset:  function(...) { ... },
        isIdle: function(object) { ... }
    });

Calls to this pseudo-constructor return an idle object from the pool or a newly
created object. The `create` and `reset` functions are called with the object as
(like a constructor function), and are passed all arguments given to the
pseudo-contructor.

    var thing = Thing(0, 1, 2);

Pooled objects are useful for controlling garbage collection.
Garbage cannot be collected until all references to pseudo-constructor are
released.
