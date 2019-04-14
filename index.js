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

/* cache(fn)
Returns a function that caches results of calling it.
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

/*
function curry(fn, muteable, arity) {
    arity = arity || fn.length;
    return function curried() {
        return arguments.length >= arity ?
            fn.apply(null, arguments) :
            curried.bind(null, ...arguments) ;
    };
}
*/

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

function rest(i, object) {
    if (object.slice) { return object.slice(i); }
    if (object.rest)  { return object.rest(i); }

    var a = [];
    var n = object.length - i;
    while (n--) { a[n] = object[n + i]; }
    return a;
}

function choose(map) {
    return function choose(key) {
        var fn = map[key] || map.default;
        return fn && fn.apply(this, rest(1, arguments)) ;
    };
}

function noop$1() {}

const resolved = Promise.resolve();

function requestTick(fn) {
    resolved.then(fn);
    return fn;
}

// Throttle

function toArray$1(object) {
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
        array1.concat(Array.isArray(array2) ? array2 : toArray$1(array2)) :

    array1.concat ?
        // It has it's own concat method. Lets assume it's robust
        array1.concat(array2) :
    // 1 is not an array, but 2 is
    toArray$1(array1).concat(Array.isArray(array2) ? array2 : toArray$1(array2)) ;
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

function insert(fn, array, object) {
    var n = -1;
    var l = array.length;
    var value = fn(object);
    while(++n < l && fn(array[n]) <= value);
    A$1.splice.call(array, n, 0, object);
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

// choke
//
// Returns a function that waits for `time` seconds without being invoked
// before calling `fn` using the context and arguments from the latest
// invocation

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

function compose(fn2, fn1) {
    return function compose() {
        return fn2(fn1.apply(null, arguments));
    };
}

function deprecate(fn, message) {
    // Recall any function and log a depreciation warning
    return function deprecate() {
        console.warn('Deprecation warning: ' + message);
        return fn.apply(this, arguments);
    };
}

function id(object) { return object; }

function isDefined(value) {
    // !!value is a fast out for non-zero numbers, non-empty strings
    // and other objects, the rest checks for 0, '', etc.
    return !!value || (value !== undefined && value !== null && !Number.isNaN(value));
}

function latest(source) {
    var value = source.shift();
    return value === undefined ? arguments[1] : latest(source, value) ;
}

var nothing = Object.freeze({
    shift: noop$1,
    push:  noop$1,
    stop:  noop$1,
    length: 0
});

function now() {
    // Return time in seconds
    return +new Date() / 1000;
}

function once(fn) {
    return function once() {
        var value = fn.apply(this, arguments);
        fn = noop$1;
        return value;
    };
}

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

function apply(value, fn) {
    return fn(value);
}

const A$2 = Array.prototype;

function pipe() {
    const fns = arguments;
    return fns.length ?
        (value) => A$2.reduce.call(fns, apply, value) :
        id ;
}

const O = Object.prototype;

function toClass(object) {
    return O.toString.apply(object).slice(8, -1);
}

function toType(object) {
    return typeof object;
}

function prepend(string1, string2) {
    return '' + string1 + string2;
}

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

assign(Fn.prototype, {
    shift: noop$1,

    // Input

    of: function() {
        // Delegate to the constructor's .of()
        return this.constructor.of.apply(this.constructor, arguments);
    },

    // Transform

    ap: function(object) {
        var shift = this.shift;

        return create(this, function ap() {
            var fn = shift();
            return fn === undefined ?
                undefined :
                object.map(fn) ;
        });
    },

    unshift: function() {
        // Create an unshift buffer, such that objects can be inserted
        // back into the stream at will with stream.unshift(object).
        var source = this;
        var buffer = toArray$1(arguments);

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

    chain: function(fn) {
        return this.map(fn).join();
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
        var sources = toArray$1(arguments);
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

    dedup: function() {
        var v;
        return this.filter(function(value) {
            var old = v;
            v = value;
            return old !== value;
        });
    },

    filter: function(fn) {
        var source = this;

        return create(this, function filter() {
            var value;
            while ((value = source.shift()) !== undefined && !fn(value));
            return value;
        });
    },

    first: function() {
        var source = this;
        return create(this, once(function first() {
            source.status = 'done';
            return source.shift();
        }));
    },

    join: function() {
        var source = this;
        var buffer = nothing;

        return create(this, function join() {
            var value = buffer.shift();
            if (value !== undefined) { return value; }
            buffer = source.shift();
            if (buffer !== undefined) { return join(); }
            buffer = nothing;
        });
    },

    latest: function() {
        var source = this;
        return create(this, function shiftLast() {
            return latest(source);
        });
    },

    map: function(fn) {
        return create(this, compose(function map(object) {
            return object === undefined ? undefined : fn(object) ;
        }, this.shift));
    },

    chunk: function(n) {
        var source = this;
        var buffer = [];

        return create(this, n ?
            // If n is defined batch into arrays of length n.
            function shiftChunk() {
                var value, _buffer;

                while (buffer.length < n) {
                    value = source.shift();
                    if (value === undefined) { return; }
                    buffer.push(value);
                }

                if (buffer.length >= n) {
                    _buffer = buffer;
                    buffer = [];
                    return Fn.of.apply(Fn, _buffer);
                }
            } :

            // If n is undefined or 0, batch all values into an array.
            function shiftChunk() {
                buffer = source.toArray();
                // An empty array is equivalent to undefined
                return buffer.length ? buffer : undefined ;
            }
        );
    },

    fold: function(fn, seed) {
        var i = 0;
        return this
        .map(function fold(value) {
            seed = fn(seed, value, i++);
            return seed;
        });

        // Why would we want this? To gaurantee a result? It's a bad idea
        // when streaming, as you get an extra value in front...
        //.unshift(seed);
    },

    scan: function(fn, seed) {
        return this.map((value) => (seed = fn(seed, value)));
    },

    partition: function(fn) {
        var source = this;
        var buffer = [];
        var streams = new Map();

        fn = fn || Fn.id;

        function createPart(key, value) {
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

    reduce: function reduce(fn, seed) {
        return this.fold(fn, seed).latest().shift();
    },

    take: function(n) {
        var source = this;
        var i = 0;

        return create(this, function take() {
            var value;

            if (i < n) {
                value = source.shift();
                // Only increment i where an actual value has been shifted
                if (value === undefined) { return; }
                if (++i === n) { source.status = 'done'; }
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

    rest: function(i) {
        var source = this;

        return create(this, function rest() {
            while (i-- > 0) { source.shift(); }
            return source.shift();
        });
    },

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

    pipe: function(stream) {
        return stream.on ?
            stream.on('pull', this.shift) :
            stream ;
    },

    tap: function(fn) {
        // Overwrite shift to copy values to tap fn
        this.shift = shiftTap(this.shift, fn);
        return this;
    },

    toJSON: function() {
        return this.reduce(arrayReducer, []);
    },

    toString: function() {
        return this.reduce(prepend, '');
    },


    // Deprecated

    process: deprecate(function(fn) {
        return fn(this);
    }, '.process() is deprecated'),

    last: deprecate(function() {
        var source = this;
        return create(this, function shiftLast() {
            return latest(source);
        });
    }, '.last() is now .latest()'),
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

function remove$1(array, value) {
    if (array.remove) { array.remove(value); }
    var i = array.indexOf(value);
    if (i !== -1) { array.splice(i, 1); }
}

// Timer

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

var A$3         = Array.prototype;
var assign$1    = Object.assign;


// Functions

function call(value, fn) {
    return fn(value);
}

function isValue(n) { return n !== undefined; }

function isDone$1(stream) {
    return stream.status === 'done';
}


// Events

var $events = Symbol('events');

function notify(type, object) {
    var events = object[$events];

    if (!events) { return; }
    if (!events[type]) { return; }

    var n = -1;
    var l = events[type].length;
    var value;

    while (++n < l) {
        value = events[type][n](type, object);
        if (value !== undefined) {
            return value;
        }
    }
}

function createNotify(stream) {
    var _notify = notify;

    return function trigger(type) {
        // Prevent nested events, so a 'push' event triggered while
        // the stream is 'pull'ing will do nothing. A bit of a fudge.
        var notify = _notify;
        _notify = noop$1;
        var value = notify(type, stream);
        _notify = notify;
        return value;
    };
}


// Sources
//
// Sources that represent stopping and stopped states of a stream

var doneSource = {
    shift: noop$1,
    push:  noop$1,
    start: noop$1,
    stop:  noop$1
};

function StopSource(source, n, done) {
    this.source = source;
    this.n      = n;
    this.done   = done;
}

assign$1(StopSource.prototype, doneSource, {
    shift: function() {
        if (--this.n < 1) { this.done(); }
        return this.source.shift();
    }
});


// Stream

function Stream$1(Source, options) {
    // Enable construction without the `new` keyword
    if (!Stream$1.prototype.isPrototypeOf(this)) {
        return new Stream$1(Source, options);
    }

    var stream  = this;
    var resolve = noop$1;
    var source;
    var promise;

    function done() {
        stream.status = 'done';
        source = doneSource;
    }

    function stop(n, value) {
        // Neuter events and schedule shutdown of the stream
        // after n values
        delete stream[$events];

        if (n) { source = new StopSource(source, n, done); }
        else { done(); }

        resolve(stream);
    }

    function getSource() {
        var notify = createNotify(stream);
        source = new Source(notify, stop, options);

        // Gaurantee that source has a .stop() method
        if (!source.stop) { source.stop = noop$1; }

        getSource = function() { return source; };

        return source;
    }

    // Properties and methods

    this[$events] = {};

    this.push = function push() {
        var source = getSource();
        source.push.apply(source, arguments);
        return stream;
    };

    this.shift = function shift() {
        return getSource().shift();
    };

    this.start = function start() {
        var source = getSource();
        source.start.apply(source, arguments);
        return stream;
    };

    this.stop = function stop() {
        var source = getSource();
        source.stop.apply(source, arguments);
        return stream;
    };

    this.done = function done(fn) {
        promise = promise || new Promise((res, rej) => {
            resolve = res;
        });

        return promise.then(fn);
    };
}


// Buffer Stream

function BufferSource(notify, stop, list) {
    const buffer = list === undefined ? [] :
        Fn.prototype.isPrototypeOf(list) ? list :
        Array.from(list).filter(isValue) ;

    this._buffer = buffer;
    this._notify = notify;
    this._stop   = stop;
}

assign$1(BufferSource.prototype, {
    shift: function() {
        var buffer = this._buffer;
        var notify = this._notify;
        return buffer.length ? buffer.shift() : notify('pull') ;
    },

    push: function() {
        var buffer = this._buffer;
        var notify = this._notify;
        buffer.push.apply(buffer, arguments);
        notify('push');
    },

    stop: function() {
        var buffer = this._buffer;
        this._stop(buffer.length);
    }
});

Stream$1.from = function BufferStream(list) {
    return new Stream$1(BufferSource, list);
};

Stream$1.of = function ArgumentStream() {
    return Stream$1.from(arguments);
};


// Promise Stream

function PromiseSource(notify, stop, promise) {
    const source = this;

    promise
    // Todo: Put some error handling into our streams
    .catch(stop)
    .then(function(value) {
        source.value = value;
        notify('push');
        stop();
    });
}

PromiseSource.prototype.shift = function() {
    const value = this.value;
    this.value = undefined;
    return value;
};

Stream$1.fromPromise = function(promise) {
    return new Stream$1(PromiseSource, promise);
};


// Callback stream

Stream$1.fromCallback = function(object, name) {
    const stream = Stream$1.of();
    const args = rest(2, arguments);
    args.push(stream.push);
    object[name].apply(object, args);
    return stream;
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
            this.notify('push');
            this.end();

            // Release event
            clockEventPool.push(event);
            return;
        }

        event.t2 = time;
        this.notify('push');
        // Todo: We need this? Test.
        this.value     = undefined;
        this.requestId = this.timer.request(this.frame);
    }
});

Stream$1.fromTimer = function TimeStream(timer) {
    return new Stream$1(TimeSource, timer);
};

Stream$1.fromDuration = function(duration) {
    return Stream$1.fromTimer(new Timer(duration));
};

Stream$1.frames = function() {
    return Stream$1.fromTimer(frameTimer);
};




// Stream.Combine

function toValue(data) {
    var source = data.source;
    var value  = data.value;
    return data.value = value === undefined ? latest(source) : value ;
}

function CombineSource(notify, stop, fn, sources) {
    var object = this;

    this._notify  = notify;
    this._stop    = stop;
    this._fn      = fn;
    this._sources = sources;
    this._hot     = true;

    this._store = sources.map(function(source) {
        var data = {
            source: source,
            listen: listen
        };

        // Listen for incoming values and flag as hot
        function listen() {
            data.value = undefined;
            object._hot = true;
        }

        source.on('push', listen);
        source.on('push', notify);
        return data;
    });
}

assign$1(CombineSource.prototype, {
    shift: function combine() {
        // Prevent duplicate values going out the door
        if (!this._hot) { return; }
        this._hot = false;

        var sources = this._sources;
        var values  = this._store.map(toValue);
        if (sources.every(isDone$1)) { this._stop(0); }
        return values.every(isValue) && this._fn.apply(null, values) ;
    },

    stop: function stop() {
        var notify = this._notify;

        // Remove listeners
        each(function(data) {
            var source = data.source;
            var listen = data.listen;
            source.off('push', listen);
            source.off('push', notify);
        }, this._store);

        this._stop(this._hot ? 1 : 0);
    }
});

Stream$1.Combine = function(fn) {
    var sources = A$3.slice.call(arguments, 1);

    if (sources.length < 2) {
        throw new Error('Stream: Combine requires more than ' + sources.length + ' source streams')
    }

    return new Stream$1(function setup(notify, stop) {
        return new CombineSource(notify, stop, fn, sources);
    });
};


// Stream.Merge

function MergeSource(notify, stop, sources) {
    var values = [];
    var buffer = [];

    function update(type, source) {
        buffer.push(source);
    }

    this._notify  = notify;
    this._stop    = stop;
    this._sources = sources;
    this._values  = values;
    this._buffer  = buffer;
    this._i       = 0;
    this._update  = update;

    each(function(source) {
        // Flush the source
        values.push.apply(values, toArray$1(source));

        // Listen for incoming values
        source.on('push', update);
        source.on('push', notify);
    }, sources);
}

assign$1(MergeSource.prototype, {
    shift: function() {
        var sources = this._sources;
        var values  = this._values;
        var buffer  = this._buffer;
        var stop    = this._stop;

        if (values.length) { return values.shift(); }
        var stream = buffer.shift();
        if (!stream) { return; }
        var value = stream.shift();
        // When all the sources are empty, stop
        if (stream.status === 'done' && ++this._i >= sources.length) { stop(0); }
        return value;
    },

    stop: function() {
        var notify  = this._notify;
        var sources = this._sources;
        var stop    = this._stop;
        var update  = this._update;

        // Remove listeners
        each(function(source) {
            source.off('push', update);
            source.off('push', notify);
        }, sources);

        stop(this._values.length + this._buffer.length);
    }
});

Stream$1.Merge = function(source1, source2) {
    var args = arguments;

    return new Stream$1(function setup(notify, stop) {
        return new MergeSource(notify, stop, Array.from(args));
    });
};





// Stream Timers

Stream$1.Choke = function(time) {
    return new Stream$1(function setup(notify, done) {
        var value;
        var update = choke(function() {
            // Get last value and stick it in buffer
            value = arguments[arguments.length - 1];
            notify('push');
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


// Stream timer

function StreamTimer(stream) {
    var timer = this;
    var fns0  = [];
    var fns1  = [];
    this.fns = fns0;

    stream.each(function() {
        timer.fns = fns1;
        fns0.reduce(call, undefined);
        fns0.length = 0;
        fns1 = fns0;
        fns0 = timer.fns;
    });
}

assign$1(StreamTimer.prototype, {
    request: function(fn) {
        this.fns.push(fn);
        return fn;
    },

    cancel: function(fn) {
        remove$1(this.fns, fn);
    }
});


// Stream.throttle

function schedule() {
    var timer   = this.timer;

    this.queue = noop$1;
    this.ref   = timer.request(this.update);
}

function ThrottleSource(notify, stop, timer) {
    var source   = this;

    this._stop   = stop;
    this.timer   = timer;
    this.queue   = schedule;
    this.update  = function update() {
        source.queue = schedule;
        notify('push');
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
    if (typeof timer === 'function') {
        throw new Error('Dont accept request and cancel functions anymore');
    }

    timer = typeof timer === 'number' ?
        new Timer(timer) :
    timer instanceof Stream$1 ?
        new StreamTimer(timer) :
    timer ? timer :
        frameTimer ;

    return new Stream$1(function(notify, stop) {
        return new ThrottleSource(notify, stop, timer);
    });
};


// Stream Methods

Stream$1.prototype = assign$1(Object.create(Fn.prototype), {
    clone: function() {
        var source  = this;
        var shift   = this.shift;
        var buffer1 = [];
        var buffer2 = [];

        var stream  = new Stream$1(function setup(notify, stop) {
            var buffer = buffer2;

            source.on('push', notify);

            return {
                shift: function() {
                    if (buffer.length) { return buffer.shift(); }
                    var value = shift();

                    if (value !== undefined) { buffer1.push(value); }
                    else if (source.status === 'done') {
                        stop(0);
                        source.off('push', notify);
                    }

                    return value;
                },

                stop: function() {
                    var value;

                    // Flush all available values into buffer
                    while ((value = shift()) !== undefined) {
                        buffer.push(value);
                        buffer1.push(value);
                    }

                    stop(buffer.length);
                    source.off('push', notify);
                }
            };
        });

        this.done(stream.stop);

        this.shift = function() {
            if (buffer1.length) { return buffer1.shift(); }
            var value = shift();
            if (value !== undefined && stream.status !== 'done') { buffer2.push(value); }
            return value;
        };

        return stream;
    },

    combine: function(fn, source) {
        return Stream$1.Combine(fn, this, source);
    },

    merge: function() {
        var sources = toArray$1(arguments);
        sources.unshift(this);
        return Stream$1.Merge.apply(null, sources);
    },

    choke: function(time) {
        return this.pipe(Stream$1.Choke(time));
    },

    throttle: function(timer) {
        return this.pipe(Stream$1.throttle(timer));
    },

    clock: function(timer) {
        return this.pipe(Stream$1.clock(timer));
    },


    // Consume

    each: function(fn) {
        var args   = arguments;
        var source = this;

        // Flush and observe
        Fn.prototype.each.apply(source, args);

        return this.on('push', function each() {
            // Delegate to Fn#each().
            Fn.prototype.each.apply(source, args);
        });
    },

    pipe: function(stream) {
        this.each(stream.push);
        return Fn.prototype.pipe.apply(this, arguments);
    },

    // Events

    on: function(type, fn) {
        var events = this[$events];
        if (!events) { return this; }

        var listeners = events[type] || (events[type] = []);
        listeners.push(fn);
        return this;
    },

    off: function off(type, fn) {
        var events = this[$events];
        if (!events) { return this; }

        // Remove all handlers for all types
        if (arguments.length === 0) {
            Object.keys(events).forEach(off, this);
            return this;
        }

        var listeners = events[type];
        if (!listeners) { return; }

        // Remove all handlers for type
        if (!fn) {
            delete events[type];
            return this;
        }

        // Remove handler fn for type
        var n = listeners.length;
        while (n--) {
            if (listeners[n] === fn) { listeners.splice(n, 1); }
        }

        return this;
    }
});

const $observer = Symbol('Observer');
const DOMPrototype = (window.EventTarget || window.Node).prototype;
const nothing$1      = Object.freeze([]);

function fire(fns, value, record) {
	if (!fns) { return; }
    fns = fns.slice(0);
	var n = -1;
	while (fns[++n]) {
        // For OO version
        //fns[n].update(value, record);
		fns[n](value, record);
	}
}

function notify$1(object, path, value) {
	const observer = object[$observer];
	if (!observer) { return; }

	const fns = observer.properties;
	fire(fns[path], value === undefined ? object[path] : value);

    const mutate = observer.mutate;
	fire(mutate, object);
}

/*
parseSelector(string)

Takes a string of the form '[key=value, ... ]' and returns a function isMatch
that returns true when passed an object that matches the selector.
*/

const nothing$2 = Object.freeze([]);

function set(key, object, value) {
    return typeof object.set === "function" ?
        object.set(key, value) :
        (object[key] = value) ;
}

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
        findByProperty(key,
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
    rpath.lastIndex = 0;
    return setRegexPath(rpath, path, object, value);
}

function call$1(fn) {
	return fn();
}

// Just for debugging
var loggers = [];

// Pool
function Pool(options, prototype) {
	var create = options.create || noop$1;
	var reset  = options.reset  || noop$1;
	var isIdle = options.isIdle;
	var store = [];

	// Todo: This is bad! It keeps a reference to the pools hanging around,
	// accessible from the global scope, so even if the pools are forgotten
	// they are never garbage collected!
	loggers.push(function log() {
		var total = store.length;
		var idle  = store.filter(isIdle).length;
		return {
			name:   options.name,
			total:  total,
			active: total - idle,
			idle:   idle
		};
	});

	return function PoolObject() {
		var object = store.find(isIdle);

		if (!object) {
			object = Object.create(prototype || null);
			create.apply(object, arguments);
			store.push(object);
		}

		reset.apply(object, arguments);
		return object;
	};
}

Pool.release = function() {
	loggers.length = 0;
};

Pool.snapshot = function() {
	return Fn
	.from(loggers)
	.map(call$1)
	.toJSON();
};

function requestTime(s, fn) {
    return setTimeout(fn, s * 1000);
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

function get(key, object) {
    // Todo? Support WeakMaps and Maps and other map-like objects with a
    // get method - but not by detecting the get method
    return object[key];

    // Why are we protecting against null again? To innoculate ourselves
    // against DOM nodes?
    //return value === null ? undefined : value ;
}

/*
has(key, value, object)

Returns `true` if `object[key]` is strictly equal to `value`.
*/

function has(key, value, object) {
    return object[key] === value;
}

var _is = Object.is || function is(a, b) { return a === b; };

function invoke(name, values, object) {
    return object[name].apply(object, values);
}

function matches(object, item) {
	let property;
	for (property in object) {
		if (object[property] !== item[property]) { return false; }
	}
	return true;
}

function error(regex, reducers, string) {
    if (string.input !== undefined && string.index !== undefined) {
        string = string.input;
    }

    throw new Error('Cannot capture() in invalid string "' + string + '"');
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

const N     = Number.prototype;
const isNaN = Number.isNaN;

function toFixed(n, value) {
    if (isNaN(value)) {
        throw new Error('Fn.toFixed does not accept NaN.');
    }

    return N.toFixed.call(value, n);
}

function ap(data, fns) {
	let n = -1;
	let fn;
	while (fn = fns[++n]) {
		fn(data);
	}
}

function take(i, object) {
    if (object.slice) { return object.slice(0, i); }
    if (object.take)  { return object.take(i); }

    var a = [];
    var n = i;
    while (n--) { a[n] = object[n]; }
    return a;
}

const assign$2 = Object.assign;

function update(fn, target, array) {
    return array.reduce(function(target, obj2) {
        var obj1 = target.find(compose(is(fn(obj2)), fn));
        if (obj1) {
            assign$2(obj1, obj2);
        }
        else {
            insert(fn, target, obj2);
        }
        return target;
    }, target);
}

function diff(array, object) {
    var values = toArray$1(array);

    return filter(function(value) {
        var i = values.indexOf(value);
        if (i === -1) { return true; }
        values.splice(i, 1);
        return false;
    }, object)
    .concat(values);
}

function intersect(array, object) {
    var values = toArray$1(array);

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

function append(string1, string2) {
    return '' + string2 + string1;
}

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

function postpad(chars, n, value) {
    var string = value + '';

    while (string.length < n) {
        string = string + chars;
    }

    return string.slice(0, n);
}

/*
slugify(string)

Replaces any series of non-word characters with a `'-'` and lowercases the rest.

    slugify('Party on #mydudes!') // 'party-on-mydudes'
*/

const DEBUG = window.DEBUG === undefined || window.DEBUG;

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

const checkType = DEBUG ? function checkType(type, value, file, line, message) {
    if (!defs[type]) {
        throw new RangeError('Type "' + type + '" not recognised');
    }

    if (!defs[type](value)) {
        throw new Error(message || 'value not of type "' + type + '": ' + value, file, line);
    }
} : noop$1 ;

const checkTypes = DEBUG ? function checkTypes(types, args, file, line) {
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

    return DEBUG ? function() {
        checkTypes(types, arguments, file, line);
        const output = fn.apply(this, arguments);
        checkType(returnType, output, file, line, 'return value not of type "' + returnType + '": ' + output);
        return output;
    } : fn ;
}

// Cubic bezier function (originally translated from
// webkit source by Christian Effenberger):
// http://www.netzgesta.de/dev/cubic-bezier-timing-function.html


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
    (begin, end, value) => linear$1(cubicBezier({
        0: linear(begin.point[0], end.point[0], begin.handle[0]),
        1: linear(begin.point[0], end.point[0], begin.handle[0])
    }, {
        0: linear(begin.point[0], end.point[0], end.handle[0]),
        1: linear(begin.point[0], end.point[0], end.handle[0])
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

function add(a, b)  { return b + a; }
function multiply(a, b) { return b * a; }
function min(a, b)  { return a > b ? b : a ; }
function max(a, b)  { return a < b ? b : a ; }
function pow(n, x)  { return Math.pow(x, n); }
function exp(n, x)  { return Math.pow(n, x); }
function log$1(n, x)  { return Math.log(x) / Math.log(n); }
function root(n, x) { return Math.pow(x, 1/n); }

function mod(d, n) {
    // JavaScript's modulu operator % uses Euclidean division, but for
    // stuff that cycles through 0 the symmetrics of floored division
    // are more useful.
    // https://en.wikipedia.org/wiki/Modulo_operation
    var value = n % d;
    return value < 0 ? value + d : value ;
}

function limit(min, max, n) {
    return n > max ? max : n < min ? min : n ;
}

function wrap(min, max, n) {
    return (n < min ? max : min) + (n - min) % (max - min);
}

function gcd(a, b) {
    // Greatest common divider
    return b ? gcd(b, a % b) : a ;
}

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

var parseDate = overload(toType, {
	number:  secondsToDate,
	string:  exec$1(rdate, createDate),
	object:  function(date) {
		return isValidDate(date) ? date : undefined ;
	},
	default: noop$1
});

var parseDateLocal = overload(toType, {
	number:  secondsToDate,
	string:  exec$1(rdate, createDateLocal),
	object:  function(date) {
		return date instanceof Date ? date : undefined ;
	},
	default: noop$1
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
		throw new Error('Time.parseDateLocal() will not parse a string with a time zone "' + zone + '".');
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
	ddd:  function(data)       { return data.weekday.slice(0,3); },
	dddd: function(data, lang) { return data.weekday; },
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

	return match ? (
		fn.apply(null, match),
		matchEach(regex, fn, text)
	) :
	undefined ;
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
		return formats[$0] ? formats[$0](data, lang) : $0 ;
	});
}

function formatDateLocal(string, locale, date) {
	var formatters = dateFormatters;
	var lang = locale.slice(0, 2);

	// Use date formatters to get time as current local time
	return string.replace(rtoken, function($0) {
		return formatters[$0] ? formatters[$0](date, lang) : $0 ;
	});
}

function formatDateISO(date) {
	return rdatejson.exec(JSON.stringify(parseDate(date)))[1];
}


// Time operations

var days   = {
	mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0
};

var dayMap = [6,0,1,2,3,4,5];

function toDay(date) {
	return dayMap[date.getDay()];
}

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

function floorDateByGrain(grain, date) {
	var diff, week;

	if (grain === 'ms') { return date; }

	date.setUTCMilliseconds(0);
	if (grain === 'second') { return date; }

	date.setUTCSeconds(0);
	if (grain === 'minute') { return date; }

	date.setUTCMinutes(0);
	if (grain === 'hour') { return date; }

	date.setUTCHours(0);
	if (grain === 'day') { return date; }

	if (grain === 'week') {
		date.setDate(date.getDate() - toDay(date));
		return date;
	}

	if (grain === 'fortnight') {
		week = floorDateByDay(1, new Date());
		diff = mod(14, _diffDateDays(week, date));
		date.setUTCDate(date.getUTCDate() - diff);
		return date;
	}

	date.setUTCDate(1);
	if (grain === 'month') { return date; }

	date.setUTCMonth(0);
	if (grain === 'year') { return date; }

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

function _floorDate(grain, date) {
	// Clone date before mutating it
	date = cloneDate(date);

	// Take a day string or number, find the last matching day
	var day = typeof grain === 'number' ?
		grain :
		days[grain] ;

	return isDefined(day) ?
		floorDateByDay(day, date) :
		floorDateByGrain(grain, date) ;
}

const addDate = curry$1(function(diff, date) {
	return _addDate(diff, parseDate(date));
});

const diffDateDays = curry$1(_diffDateDays);

const floorDate = curry$1(function(token, date) {
	return _floorDate(token, parseDate(date));
});

const formatDate = curry$1(function(string, timezone, locale, date) {
	return string === 'ISO' ?
		formatDateISO(parseDate(date)) :
	timezone === 'local' ?
		formatDateLocal(string, locale, date) :
	_formatDate(string, timezone, locale, parseDate(date)) ;
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

function prefix(n) {
	return n >= 10 ? '' : '0';
}

// Hours:   00-23 - 24 should be allowed according to spec
// Minutes: 00-59 -
// Seconds: 00-60 - 60 is allowed, denoting a leap second

//var rtime   = /^([+-])?([01]\d|2[0-3])(?::([0-5]\d)(?::([0-5]\d|60)(?:.(\d+))?)?)?$/;
//                sign   hh       mm           ss
var rtime     = /^([+-])?(\d{2,}):([0-5]\d)(?::((?:[0-5]\d|60)(?:.\d+)?))?$/;
var rtimediff = /^([+-])?(\d{2,}):(\d{2,})(?::(\d{2,}(?:.\d+)?))?$/;

var parseTime = overload(toType, {
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

var timeFormatters = {
	'+-': function sign(time) {
		return time < 0 ? '-' : '' ;
	},

	www: function www(time) {
		time = time < 0 ? -time : time;
		var weeks = Math.floor(secondsToWeeks(time));
		return prefix(weeks) + weeks;
	},

	dd: function dd(time) {
		time = time < 0 ? -time : time;
		var days = Math.floor(secondsToDays(time));
		return prefix(days) + days;
	},

	hhh: function hhh(time) {
		time = time < 0 ? -time : time;
		var hours = Math.floor(secondsToHours(time));
		return prefix(hours) + hours;
	},

	hh: function hh(time) {
		time = time < 0 ? -time : time;
		var hours = Math.floor(secondsToHours(time % 86400));
		return prefix(hours) + hours;
	},

	mm: function mm(time) {
		time = time < 0 ? -time : time;
		var minutes = Math.floor(secondsToMinutes(time % 3600));
		return prefix(minutes) + minutes;
	},

	ss: function ss(time) {
		time = time < 0 ? -time : time;
		var seconds = Math.floor(time % 60);
		return prefix(seconds) + seconds ;
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
			'00' + ms ;
	}
};

function createTime(match, sign, hh, mm, sss) {
	var time = hoursToSeconds(parseInt(hh, 10)) + (
		mm ? minutesToSeconds(parseInt(mm, 10)) + (
			sss ? parseFloat(sss, 10) : 0
		) : 0
	);

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

const formatTime = curry$1(function(string, time) {
	return string === 'ISO' ?
		_formatTimeISO(parseTime(time)) :
		formatTimeString(string, parseTime(time)) ;
});

const addTime = curry$1(function(time1, time2) {
	return parseTime(time2) + parseTimeDiff(time1);
});

const subTime = curry$1(function(time1, time2) {
	return parseTime(time2) - parseTimeDiff(time1);
});

const diffTime = curry$1(function(time1, time2) {
	return parseTime(time1) - parseTime(time2);
});

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

const assign$3      = curry$1(Object.assign, true, 2);
const capture$1     = curry$1(capture);
const define      = curry$1(Object.defineProperties, true, 2);
const equals$1      = curry$1(equals, true);
const exec$2        = curry$1(exec);
const get$1         = curry$1(get, true);
const has$1         = curry$1(has, true);
const is          = curry$1(_is, true);
const invoke$1      = curry$1(invoke, true);
const matches$1     = curry$1(matches, true);
const parse       = curry$1(capture);
const set$1         = curry$1(set, true);
const toFixed$1     = curry$1(toFixed);
const getPath$1     = curry$1(getPath, true);
const setPath$1     = curry$1(setPath, true);

const by$1          = curry$1(by, true);
const byAlphabet$1  = curry$1(byAlphabet);

const ap$1          = curry$1(ap, true);
const concat$1      = curry$1(concat, true);
const contains$1    = curry$1(contains, true);
const each$1        = curry$1(each, true);
const filter$1      = curry$1(filter, true);
const find$1        = curry$1(find, true);
const insert$1      = curry$1(insert, true);
const map$1         = curry$1(map, true);
const reduce$2      = curry$1(reduce, true);
const remove$2      = curry$1(remove$1, true);
const rest$1        = curry$1(rest, true);
const slice$1       = curry$1(slice, true, 3);
const sort$1        = curry$1(sort, true);
const take$1        = curry$1(take, true);
const update$1      = curry$1(update, true);

const diff$2        = curry$1(diff, true);
const intersect$1   = curry$1(intersect, true);
const unite$1       = curry$1(unite, true);

const append$1      = curry$1(append);
const prepend$1     = curry$1(prepend);
const prepad$1      = curry$1(prepad);
const postpad$1     = curry$1(postpad);

const add$1         = curry$1(add);
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

function requestInputSplitter(audio) {
    var request = inputRequests.get(audio);

    if (!request) {
        request = requestMedia().then(function(stream) {
            var source       = audio.createMediaStreamSource(stream);
            var splitter     = audio.createChannelSplitter(source.channelCount);

            source.connect(splitter);
            return splitter;
        });

        inputRequests.set(audio, request);
    }

    return request;
}

const $privates = Symbol('privates');

function Privates(object) {
    return object[$privates] || (object[$privates] = {});
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
    console.log('USER INTERACTION REQUIRED (Audio context suspended)');

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
            console.log('USER ' + e.type + ' RECEIVED (Audio context resumed)');
            types.reduce(remove, fn);
        });
    });
}

function timeAtDomTime(context, domTime) {
    var stamps = context.getOutputTimestamp();
    return stamps.contextTime + (domTime - stamps.performanceTime) / 1000;
}

function domTimeAtTime$1(context, time) {
    var stamp = context.getOutputTimestamp();
    return stamp.performanceTime + (time - stamp.contextTime) * 1000;
}

// 60 frames/sec frame rate
const frameDuration = 1000 / 60;

// Config

const config = {
    automationEventsKey: 'automationEvents',

    animationFrameKey: 'animationFrame',

    // Value considered to be 0 for the purposes of scheduling
    // exponential curves.
    minExponentialValue: 1.40130e-45,

    // Multiplier for duration of target events indicating roughly when
    // they can be considered 'finished'
    targetDurationFactor: 9
};

const methodNames = {
	"step":        "setValueAtTime",
	"linear":      "linearRampToValueAtTime",
	"exponential": "exponentialRampToValueAtTime",
	"target":      "setTargetAtTime"
};

const curves = {
    "equalpowerin": function equalpowerin(t) {
        return Math.pow(t, 0.5);
    },

    "equalpowerout": function equalpowerout(t) {
        return Math.pow(1 - t, 0.5);
    }
};

function isAudioParam(object) {
	return window.AudioParam && window.AudioParam.prototype.isPrototypeOf(object);
}




// Polyfill cancelAndHoldAtTime
//
// Todo - this polyfill is not finished. This algorithm needs to be
// implemented:
//
// https://www.w3.org/TR/webaudio/#dom-audioparam-cancelandholdattime

if (!AudioParam.prototype.cancelAndHoldAtTime) {
    AudioParam.prototype.cancelAndHoldAtTime = function cancelAndHoldAtTime(time) {
    	const param  = this;
        const events = getAutomation(param);
    	const tValue = getValueAtTime(events, time);

        while (events[--n] && events[n][0] >= time);

    	const event1 = events[n];
    	const event2 = events[n + 1];
    	const tCurve = event2[2];

    	console.log(event1, event2, tValue);
    	console.log(methodNames[curve], value, time, duration);

        param.cancelScheduledValues(time);
    	param[methodNames[tCurve]](tValue, time);
    };
}

function getAutomation(param) {

	// Todo: I would love to use a WeakMap to store data about AudioParams,
	// but FF refuses to allow AudioParams as WeakMap keys. So... lets use
	// an expando *sigh*.
	return param[config.automationEventsKey] || (param[config.automationEventsKey] = []);
}

function automateParamEvents(param, events, time, value, curve, duration) {
    // Round to 32-bit floating point
    value = value ? Math.fround(value) : 0 ;

    // Curve is optional, defaults to step
    curve = curve || "step";

	var n = events.length;
	while (events[--n] && events[n].time >= time);

    // Before and after events
	var event0 = events[n];
	var event1 = events[n + 1];

    // Deal with exponential curves starting or ending with value 0. Swap them
    // for step curves, which is what they tend towards for low values.
    // Todo: deal with -ve values.
	if (curve === "exponential") {
		if (value <= config.minExponentialValue) {
			time = event0 ? event0.time : 0 ;
			curve = "step";
		}
		else if (event0 && event0.value < config.minExponentialValue) {
			curve = "step";
		}

        // Schedule the param event
        param.exponentialRampToValueAtTime(value, time, duration);
	}
    else if (curve === "equalpowerin") {
        curve = "curve";
        const m = Math.round(duration * 44100 / 64);
        const values = new Float32Array(m);
        let n = m;

        while (n--) {
            values[n] = curves['equalpowerin'](n / m) * value;
        }

        param.setValueCurveAtTime(values, time, duration);
        value = values;
    }
    else if (curve === "equalpowerout") {
        curve = "curve";
        const startValue = getValueAtTime(param, time);
        const m = Math.round(duration * 44100 / 32);
        const values = new Float32Array(m);
        let n = m;

        while (n--) {
            values[n] = curves['equalpowerout'](n / m) * startValue;
        }

        param.setValueCurveAtTime(values, time, duration);
        value = values;
    }
    else if (curve === "hold") {
        // Schedule the param event
        param.cancelAndHoldAtTime(time);
        value = getValueAtTime(param, time);
        curve = event1 && event1.curve === 'exponential' ?
            'exponential' :
            'step' ;
        events.length = n + 1;
        events.push({ time, value, curve, duration });
        return;
    }
    else {
        // Schedule the param event
        param[methodNames[curve]](value, time, duration);
    }

	// Keep events organised as AudioParams do
	var event = { time, value, curve, duration };

	// If the new event is at the end of the events list
	if (!event1) {
		events.push(event);
		return;
	}

	// Where the new event is at the same time as an existing event...
	if (event1.time === time) {
        // scan forward through events at this time...
		while (events[++n] && events[n].time === time) {
            // and if an event with the same curve is found, replace it...
			if (events[n].curve === curve) {
				events.splice(n, 1, event);
				return;
			}
		}

        // or tack it on the end of those events.
		events.splice(n - 1, 0, event);
        return;
	}

	// The new event is between event1 and event2
	events.splice(n + 1, 0, event);
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
    //console.log('AUTOMATE', arguments[5], time, curve, value, duration, param);
	var events = getAutomation(param);
	automateParamEvents(param, events, time, value, curve, duration);

    if (!notify) {
        return;
    }

    if (!context) {
        return;
    }

    // If param is flagged as already notifying, do nothing
    if (param[config.animationFrameId]) { return; }

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
        param[config.animationFrameId] = outputTime <= lastEvent.time ?
            requestAnimationFrame(frame) :
            undefined ;

        notify(param, 'value', outputValue);
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
	var curve  = event2.curve;
	return interpolate[curve](event1.value, event2.value, event1.time, event2.time, time, event1.duration);
}

function getEventsValueAtEvent(events, n, time) {
	var event = events[n];
	return event.curve === "target" ?
		interpolate.target(getEventsValueAtEvent(events, n - 1, event.time), event.value, 0, event.time, time, event.decay) :
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

function connect(source, target, sourceChan, targetChan) {
    if (!source) {
        { print('Trying to connect to undefined source. Dropping connection.'); }
        return;
    }

    if (!target) {
        { print('Trying to connect to undefined target. Dropping connection.'); }
        return;
    }

    if (!isAudioParam(target) && !target.numberOfInputs) {
        { print('Trying to connect target with no inputs. Dropping connection.'); }
        return;
    }

    if (isDefined(sourceChan)) {
        if (sourceChan >= source.numberOfOutputs) {
            {
                print('Trying to .connect() from a non-existent output (' +
                    sourceChan + ') on output node {numberOfOutputs: ' + source.numberOfOutputs + '}. Dropping connection.');
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
    }
    else if (isDefined(targetChan)) {
        sourceChan = 0;

        if (targetChan >= target.numberOfInputs) {
            print('Trying to .connect() to a non-existent input (' +
                targetChan + ') on input node {numberOfInputs: ' + target.numberOfInputs + '}. Dropping connection.');
            return;
        }

        source.connect(target, sourceChan, targetChan);
    }
    else {
        source.connect(target);
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

    if (features.disconnectParameters) {
        source.disconnect(target, sourceChan, targetChan);
    }
    else {
        if (connections) {
            disconnectDestination(source, outName, outputNode, inputNode, outputNumber, inputNumber, connections);
        }
        else {
            print('Cant disconnect when features.disconnectParameters is false and connections object is not passed to disconenct.');
            return;
        }
    }

    // Indicate successful disconnection (we hope)
    return true;
}

function disconnectDestination(source, outName, outputNode, inputNode, outputNumber, inputNumber, connections) {
    outputNode.disconnect();

    if (!inputNode) { return; }

    var connects = connections.filter(function(connect) {
        return connect.source === source
            && connect.output === (outName || 'default') ;
    });

    if (connects.length === 0) { return; }

    // Reconnect all entries apart from the node we just disconnected.
    var n = connects.length;
    var target;

    while (n--) {
        target = connects[n].target;
        inputNode = AudioObject.getInput(target.object, connects[n].input);
        outputNode.connect(inputNode);
    }
}

const assign$4 = Object.assign;
const define$1 = Object.defineProperties;
const seal   = Object.seal;

const blacklist = {
    channelCount: true,
    channelCountMode: true,
    channelInterpretation: true,
    context: true,
    numberOfInputs: true,
    numberOfOutputs: true,
    onended: true
};

function createNode(context, type, settings) {
    const node = new constructors[type](context, settings);
    return node;
}

function createConnection(nodes, data) {
    // Split paths such as env.gain.0 to ['env', 'gain', 0]
    const srcPath = data.source.split('.');
    const srcLast = srcPath[srcPath.length - 1];
    let srcChan;

    if (/^\d+$/.test(srcLast)) {
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

    connect(source, target, srcChan, tgtChan);
    return nodes;
}

function NodeGraph(context, data) {

    const privates = Privates(this);
    privates.outputId = data.output || 'output' ;

    // Create nodes
    const nodes = privates.nodes = data.nodes && data.nodes.reduce(function(nodes, data) {
        nodes[data.id] = createNode(context, data.type, data.data);
        return nodes;
    }, {});

    // Include this in the graph if it is an audio node
    if (AudioNode.prototype.isPrototypeOf(this)) {
        nodes.self = this;
    }

    // Otherwise make it quack like an audio node
    else {
        const output = nodes[privates.outputId];
        define$1(this, {
            context: { value: context },
            numberOfOutputs: { value: output ? output.numberOfOutputs : 0 }
        });
    }

    seal(nodes);
    data.connections && data.connections.reduce(createConnection, nodes);
}

assign$4(NodeGraph.prototype, {
    get: function(id) {
        const privates = Privates(this);
        return privates.nodes && privates.nodes[id];
    },

    connect: function() {
        const privates = Privates(this);
        const output = this.get(privates.outputId);
        return output.connect.apply(output, arguments);
    },

    disconnect: function() {
        const privates = Privates(this);
        const output = this.get(privates.outputId);
        return output.disconnect.apply(output, arguments);
    },

    toJSON: function toJSON() {
        const json = {};

        for (name in this) {
            //if (!this.hasOwnProperty(name)) { continue; }
            if (this[name] === null) { continue; }
            if (this[name] === undefined) { continue; }
            if (blacklist[name]) { continue; }

            json[name] = this[name].setValueAtTime ?
                    this[name].value :
                this[name].connect ?
                    toJSON.apply(this[name]) :
                this[name] ;
        }

        return json;
    }
});

const graph = {
    nodes: [
		{ id: 'pan', type: 'pan', data: { pan: 0 }},
	],

	output: 'pan'
};

class Mix extends GainNode {
    constructor(context, options) {
        // Init gain node
        super(context, options);

        // Set up the node graph
    	NodeGraph.call(this, context, graph);
        this.pan = this.get('pan').pan;

        // Connect gain (this) to pan
        GainNode.prototype.connect.call(this, this.get('pan'));
    }

    // Inherit from NodeGraph. We don't seem able to do this with Object.assign
    // to prototype. Another stupid limitation if class syntax. Who the hell
    // thought this was a good idea?

    get() {
        return NodeGraph.prototype.get.apply(this, arguments);
    }

    connect() {
        return NodeGraph.prototype.connect.apply(this, arguments);
    }

    disconnect() {
        return NodeGraph.prototype.disconnect.apply(this, arguments);
    }

    toJSON() {
        return NodeGraph.prototype.toJSON.apply(this, arguments);
    }
}

/*
PlayNode()

Sets up an object to be playable. Provides the properties:

- `.startTime`
- `.stopTime`

And the methods:

- `.start(time)`
- `.stop(time)`

And also, for internal use:

- `.reset()`
*/
const assign$5 = Object.assign;
const define$2 = Object.defineProperties;

const properties = {
    startTime: { writable: true },
    stopTime:  { writable: true }
};

function PlayNode() {
    define$2(this, properties);
}

assign$5(PlayNode.prototype, {
    reset: function() {
        this.startTime = undefined;
        this.stopTime  = undefined;
    },

    start: function(time) {

        this.startTime = time || this.context.currentTime;
        return this;
    },

    stop: function(time) {

        // Clamp stopTime to startTime
        time = time || this.context.currentTime;
        this.stopTime = time > this.startTime ? time : this.startTime ;
        return this;
    }
});

const defaults = {
    attack: [
        [0, 'step', 1]
    ],

    release: [
        [0, 'step', 0]
    ]
};

const constantOptions = {
    offset: 0
};

const validateEvent = overload(get$1(1), {
    "target": function(event) {
        if (event[3] === undefined) {
            throw new Error('Event "target" must have 2 parameters: value, duration');
        }
    },

    default: function(event) {
        if (event[2] === undefined) {
            throw new Error('Event "' + event[1] + '" must have 1 parameter: value');
        }
    }
});

function cueAutomation(param, events, time, gain, rate) {
    param.cancelAndHoldAtTime(time);

    for (let event of events) {
        validateEvent(event);

        // param, time, curve, value, decay
        automate(param, time + event[0] / rate, event[1], event[2] * gain, event[3]);
    }
}

class Envelope extends ConstantSourceNode {
    constructor(context, options) {
        super(context, constantOptions);
        super.start.call(this, context.currentTime);

        PlayNode.call(this, context);

        this.attack  = (options && options.attack)  || defaults.attack;
        this.release = (options && options.release) || defaults.release;
    }

    start(time, name, gain = 1, rate = 1) {
        // Envelopes may be 'start'ed multiple times with new named envelopes -
        // We don't want PlayNode to error in this case.
        this.startTime = undefined;
        //if (this.startTime === undefined) {
            PlayNode.prototype.start.apply(this, arguments);
        //}

        if (this[name]) {
            cueAutomation(this.offset, this[name], this.startTime, gain, rate, 'ConstantSource.offset');
        }

        return this;
    }

    stop(time) {
        return PlayNode.prototype.stop.apply(this, arguments);
    }
}

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
significant byte), returns a float in the range `-1`-`1`.

    bytesToSignedFloat(0, 64);   // 0
*/

function bytesToSignedFloat(lsb, msb) {
	return int14ToSignedFloat(bytesToInt14(lsb, msb));
}

/*
int7ToFloat(n)

Returns a float in the range `0`-`1` for values of `n` in the range `0`-`16383`.

    int7ToFloat(64);      // 0.503937
*/

function int7ToFloat(n) {
	return n / 127;
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
controlToNumber(name)

Returns a value in the range `0`-`127` from a shorthand controller `name`.

    controlToNumber('volume')   // 7
	controlToNumber('sustain')  // 64
	controlToNumber('98')       // 98
*/

function controlToNumber(name) {
	const entry = entries(controlNames).find(function(entry) {
		return entry[1] === name;
	});

	return entry ? parseInt(entry[0], 10) : parseInt(name, 10);
}

/*
normaliseNote(name)

Replaces the characters `'b'` and `'#'` with the unicode musical characters `'♭'`
and `'♯'` respectively.

    normaliseNote('Eb6');      // 'E♭6'
*/

const rTextSymbol = /b|#/g;

const unicodeSymbols = {
	'b': '♭',
	'#': '♯'
};

function replaceSymbol($0) {
	return unicodeSymbols[$0];
}

function normaliseNote(name) {
	return name.replace(rTextSymbol, replaceSymbol);
}

/*
noteToNumber(name)

Given a note name, returns a value in the range 0-127.

    noteToNumber('D6');     // 86
*/

const noteNumbers = {
	'C':  0, 'C♯': 1, 'D♭': 1, 'D': 2, 'D♯': 3, 'E♭': 3, 'E': 4,
	'F':  5, 'F♯': 6, 'G♭': 6, 'G': 7, 'G♯': 8, 'A♭': 8, 'A': 9,
	'A♯': 10, 'B♭': 10, 'B': 11
};

const rnotename   = /^([A-G][♭♯]?)(-?\d)$/;

function noteToNumber(str) {
	var r = rnotename.exec(normaliseNote(str));
	return (parseInt(r[2], 10) + 1) * 12 + noteNumbers[r[1]];
}

/*
numberToControl(n)

Returns a shorthand controller name from a value in the range `0`-`127`. Not all
contollers have a standardised name, and this library implements only the
more common ones. Where a name is not found, returns the controller number as a
string.

    numberToControl(7);       // 'volume'
	numberToControl(64);      // 'sustain'
	numberToControl(98);      // '98'

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
	84:  'portamento amount',
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

function numberToControl(n) {
	return controlNames[n] || ('' + n);
}

/*
numberToFrequency(refFreq, n)

Given a note number `n`, returns the frequency of the fundamental tone of that
note. `refFreq` is a reference frequency for middle A4/69 (usually `440`).

    numberToFrequency(440, 69);  // 440
    numberToFrequency(440, 60);  // 261.625565
    numberToFrequency(442, 69);  // 442
    numberToFrequency(442, 60);  // 262.814772
*/

function numberToFrequency(ref, n) {
	return ref * Math.pow(2, (n - A4) / 12);
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

/* toType(message)

Returns message type as one of the strings `'noteoff'`, `'noteon'`, `'polytouch'`,
`'control'`, `'program'`, `'channeltouch'` or `'pitch'`.

    toType([145,80,20]);          // 'noteon'.
*/

const types = Object.keys(statuses);

function toType$2(message) {
	var name = types[Math.floor(message[0] / 16) - 8];

	// Catch type noteon with zero velocity and rename it as noteoff
	return name;
    //name === types[1] && message[2] === 0 ?
	//	types[0] :
	//	name ;
}

function overload$1(fn, map) {
    return function overload() {
        const key     = fn.apply(null, arguments);
        const handler = (map[key] || map.default);
        //if (!handler) { throw new Error('overload() no handler for "' + key + '"'); }
        return handler.apply(this, arguments);
    };
}

function remove$3(array, value) {
    var i = array.indexOf(value);
    if (i !== -1) { array.splice(i, 1); }
}

const performance = window.performance;


// Routing

const roots = {};

function fire$1(e) {
    normalise$1(e.data);

    // Fire port-specific listeners, if there are any
    const portRoot = roots[e.target && e.target.id];
	if (portRoot) { fireRoute(0, portRoot, e); }

    // Fire port-generic listeners, if there are any
    const allRoot = roots['undefined'];
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
		tree['undefined'] && tree['undefined'].forEach((fn) => fn(e));
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
	remove$3(fns, fn);
}

const query = {};

function toNoteQuery(selector) {
	query[0] = toStatus(selector[0], selector[1]);
	query[1] = typeof selector[2] === 'string' ?
		noteToNumber(selector[2]) :
		selector[2] ;
	query[2] = selector[3];
	return query;
}

function toControlQuery(selector) {
	query[0] = toStatus(selector[0], selector[1]);
	query[1] = typeof selector[2] === 'string' ?
		controlToNumber(selector[2]) :
		selector[2] ;
	query[2] = selector[3];
	return query;
}

function toQuery(selector) {
	query[0] = toStatus(selector[0], selector[1]);
	query[1] = selector[2];
	query[2] = selector[3];
	return query;
}

// Transforms

function get1(object) { return object[1]; }
function type1(object) { return typeof object[1]; }

/*
on(selector, fn)

Registers a handler `fn` for incoming MIDI events that match object `selector`.

    on([1, 'note'], function(e) {
        // Do something with CH1 NOTEON and NOTEOFF event objects
        const time    = e.timeStamp;
        const port    = e.target;
        const message = e.data;
    });

A selector is either an array in the form of a MIDI message
`[status, data1, data2]`:

    // Call fn on CH1 NOTEON events
	on([144], fn);

    // Call fn on CH1 NOTEON C4 events
	on([144, 60], fn);

    // Call fn on CH1 NOTEON C4 127 events
	on([144, 60, 127], fn);

or more conveniently an array of interpretive data of the form
`[chan, type, param, value]`:

    // Call fn on CH2 NOTEON events
	on([2, 'noteon'], fn);

    // Call fn on CH2 NOTEOFF C4 events
	on([2, 'noteoff', 'C4'], fn)

    // Call fn on CH2 NOTEON and NOTEOFF C4 events
	on([2, 'note', 'C4'], fn)

Finally, a selector may have a property `port`, the id of an input port.

    // Call fn on CH4 CC events from port '012345'
	on({ port: '012345', 0: 4, 1: 'control' }}, fn);

    // Call fn on CH4 CC 64 events from port '012345'
	on({ port: '012345', 0: 4, 1: 'control', 2: 64 }}, fn);

Selectors pre-create paths in a filter tree through which incoming events flow,
for performance.
*/

const setSelectorRoute = overload$1(type1, {
	'string': overload$1(get1, {
		'note': function(selector, root, fn) {
			var query = toNoteQuery(selector);

			query[0] = toStatus(selector[0], 'noteon');
			setRoute(0, query, root, fn);

			query[0] = toStatus(selector[0], 'noteoff');
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

		'default': function(selector, root, fn) {
			var query = toQuery(selector);
			setRoute(0, query, root, fn);
		}
	}),

	'default': function(query, root, fn) {
		setRoute(0, query, root, fn);
	}
});

function on(selector, fn) {
    const id = selector.port || 'undefined' ;
    const root = roots[id] || (roots[id] = {});
    setSelectorRoute(selector, root, fn);
}

/*
off(selector, fn)

Removes an event listener 'fn' from MIDI events matching object 'selector'. Where
'fn' is not given, removes all handlers from events matching the selector.

    off(['note'], fn);
*/

const removeSelectorRoute = overload$1(type1, {
	'string': overload$1(get1, {
		'note': function(selector, root, fn) {
			var query = toNoteQuery(selector);

			query[0] = toStatus(selector[0], 'noteon');
			removeRoute(query, root, fn);

			query[0] = toStatus(selector[0], 'noteoff');
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
			setRoute(query, root, fn);
		},

		'default': function(selector, root, fn) {
			var query = toQuery(selector);
			removeRoute(query, root, fn);
		}
	}),

	'default': function(query, root, fn) {
		removeRoute(query, root, fn);
	}
});

function off(selector, fn) {
    const id = selector.port || 'undefined' ;
    const root = roots[id] || (roots[id] = {});
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
promise. Library functions are available to use without requesting the midiAccess
object, but this request is useful for alerting the user.

    request().catch(function(error) {
        // Alert the user they don't have MIDI
    });
*/

function listen(port) {
	// It's suggested here that we need to keep a reference to midi inputs
	// hanging around to avoid garbage collection:
	// https://code.google.com/p/chromium/issues/detail?id=163795#c123
	//store.push(port);

	port.onmidimessage = fire$1;
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

var assign$6      = Object.assign;


// Define

const defaults$1 = {
	gain:      0.25,
	decay:     0.06,
	resonance: 22
};

var dB48  = toLevel(-48);


// Tick

function Tick(audio, options) {
	if (!Tick.prototype.isPrototypeOf(this)) {
		return new Tick(audio, options);
	}

	var settings   = assign$6({}, defaults$1, options);

	var oscillator = audio.createOscillator();
	var filter     = audio.createBiquadFilter();
	var gain       = audio.createGain();
	var output     = audio.createGain();
	var merger     = audio.createChannelMerger(2);


	//NodeGraph.call(this, {
	//	nodes: [
	//		{ id: 'oscillator', type: 'oscillator',    settings: { channelCount: 1 } },
	//		{ id: 'filter',     type: 'biquad-filter', settings: { channelCount: 1 } },
	//		{ id: 'gain',       type: 'gain',          settings: { channelCount: 1 } },
	//		{ id: 'output',     type: 'gain',          settings: { channelCount: 1 } },
	//		{ id: 'merger',     type: 'merger',        settings: { numberOfInputs: 2 } }
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
	output.connect(merger, 0, 0);
	output.connect(merger, 0, 1);

	this.gain = output.gain;

	this.resonance = settings.resonance;
	this.decay     = settings.decay;
	//this.gain      = settings.gain;

	this.start = function(time, number, level) {
		var frequency = typeof number === 'string' ?
			numberToFrequency(440, noteToNumber(number)) :
			numberToFrequency(440, number) ;

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

	this.stop = function(time) {
		stop(time || audio.currentTime, this.decay);
	};

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


// Export

Tick.prototype.stop = noop$1;

function resolve(privates, buffers) {
    privates.resolve(buffers);
    privates.promise = undefined;
    privates.resolve = undefined;
}

class Recorder extends AudioWorkletNode {
    constructor(context, settings, stage = nothing, notify = noop$1) {
        super(context, 'recorder');
        const privates = Privates(this);

        this.startTime = undefined;
        this.stopTime  = undefined;
        this.duration  = settings && settings.duration || 120;

        this.port.onmessage = (e) => {
            if (e.data.type === 'done') {
                this.buffers = e.data.buffers;
                notify(this, 'buffers');

                if (privates.promise) {
                    resolve(privates, e.data.buffers);
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
            sample: Math.ceil((time - this.context.currentTime) * this.context.sampleRate),
            bufferLength: Math.ceil(this.duration * this.context.sampleRate)
        });

        return this;
    }

    stop(time) {
        PlayNode.prototype.stop.call(this, time);

        // Round duration such that stopTime - startTime is a duration
        // corresponding to an exact number of samples
        const length = Math.ceil((this.stopTime - this.startTime) * this.context.sampleRate);
        this.stopTime = this.startTime + length / this.context.sampleRate;

        // Tell the worklet to stop recording
        this.port.postMessage({
            type: 'stop',
            bufferLength: length
        });

        return this;
    }

    then(fn) {
        const privates = Privates(this);

        if (!privates.promise) {
            privates.promise = new Promise((resolve, reject) => {
                privates.resolve = resolve;
            });
        }

        return privates.promise.then(fn);
    }
}

Recorder.preload = function(context) {
    return context
    .audioWorklet
    .addModule('./nodes/recorder.worklet.js');
};

var constructors = {
    // https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/AnalyserNode
    'analyser': AnalyserNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/AudioBufferSourceNode
    'buffer': AudioBufferSourceNode,
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
    'media': MediaStreamAudioSourceNode,
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
    // ../nodes/mix.js
    'mix': Mix,
    // ../nodes/envelope.js
    'envelope': Envelope,
    // ../nodes/tick.js
    'tick': Tick,
    // ../nodes/recorder.js
    'recorder': Recorder
};

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
        const number = typeof name === 'number' ? name : noteToNumber(name) ;
        return (target.start(time, number, value) || target).stop(time + duration, number, value);
    },

    'noteon': function(target, time, type, name, value, duration, notify) {
        const number = typeof name === 'number' ? name : noteToNumber(name) ;
        return target.start(time, number, value) || target;
    },

    'noteoff': function(target, time, type, name, value, duration, notify) {
        const number = typeof name === 'number' ? name : noteToNumber(name) ;
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
        // param, time, curve, value, duration, notify, context
        automate(param, time, 'step', value, null, notify, target.context);
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
    const notes = {};

    return function distributeEvents(time, type, name, value, duration) {
        if (type === 'noteon') {
            if (notes[name]) { return; }
            // target, time, type, name, value
            notes[name] = distribute(target, time, type, name, value, null, notify);
        }
        else if (type === 'noteoff') {
            // Choose a note target where there is one
            // target, time, type, name, value
            distribute(notes[name] || target, time, type, name, value, null, notify);
            notes[name] = undefined;
        }
        else {
//if (!notify) { console.log('No notify!!'); debugger; }
            distribute(target, time, type, name, value, duration, notify);
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

const DEBUG$1  = window.DEBUG;

const assign$7 = Object.assign;
const seal$1   = Object.seal;

const types$1 = {
    'note':    function control(type, name, value) {
        return value ? 'noteon' : 'noteoff' ;
    },

    'control': function control(type, param) {
        return 'param';
    }
};

const transforms = {
    'pass': function linear(min, max, current, n) {
        return n;
    },

    'linear': function linear(min, max, current, n) {
        return n * (max - min) + min;
    },

    'quadratic': function quadratic(min, max, current, n) {
        return Math.pow(n, 2) * (max - min) + min;
    },

    'cubic': function pow3(min, max, current, n) {
        return Math.pow(n, 3) * (max - min) + min;
    },

    'logarithmic': function log(min, max, current, n) {
        return min * Math.pow(max / min, n);
    },

    'frequency': function toggle(min, max, current, n) {
        return (MIDI.numberToFrequency(n) - min) * (max - min) / MIDI.numberToFrequency(127) + min ;
    },

    'toggle': function toggle(min, max, current, n) {
        if (n > 0) {
            return current <= min ? max : min ;
        }
    },

    'switch': function toggle(min, max, current, n) {
        return n < 0.5 ? min : max ;
    },

    'continuous': function toggle(min, max, current, n) {
        return current + 64 - n ;
    }
};

function getControlLatency(stamps, context) {
    // In order to play back live controls without jitter we must add
    // a latency to them to push them beyond currentTime.
    // AudioContext.outputLatency is not yet implemented so we need to
    // make a rough guess. Here we track the difference between contextTime
    // and currentTime, ceil to the nearest 32-sample block and use that –
    // until we detect a greater value.

    const contextTime = stamps.contextTime;
    const currentTime = context.currentTime;

    if (context.controlLatency === undefined || currentTime - contextTime > context.controlLatency) {
        const diffTime = currentTime - contextTime;
        const blockTime = 32 / context.sampleRate;

        // Cache controlLatency on the context as a stop-gap measure
        context.controlLatency = Math.ceil(diffTime / blockTime) * blockTime;

        // Let's keep tabs on how often this happens
        console.log('Control latency change', context.controlLatency, '(' + Math.round(context.controlLatency * context.sampleRate) + ' frames)');
    }

    return context.controlLatency;
}

function timeAtDomTime$1(stamps, domTime) {
    return stamps.contextTime + (domTime - stamps.performanceTime) / 1000;
}

function getControlTime(context, domTime) {
    const stamps         = context.getOutputTimestamp();
    const controlLatency = getControlLatency(stamps, context);
    const time           = timeAtDomTime$1(stamps, domTime);
    return time + controlLatency;
}

function getContextTime(context, domTime) {
    const stamps = context.getOutputTimestamp();
    return timeAtDomTime$1(stamps, domTime);
}

function Control(controls, source, target, settings, notify) {
    const data = {
        type:      settings.type,
        name:      settings.name,
        transform: settings.transform || 'linear',
        min:       settings.min || 0,
        max:       settings.max || 1,
        latencyCompensation: settings.latencyCompensation === undefined ?
            true :
            settings.latencyCompensation
    };

    let value;

    this.controls = controls;
    this.source   = source;
    this.target   = target;
    this.data     = data;
    this.notify   = notify || noop$1;

    seal$1(this);

    const distribute = Distribute(target.data, notify);

    // Bind source output to route input
    source.each(function input(timeStamp, type, name, n) {
        // Catch keys with no name
        if (!name && !data.name) { return; }

        const context = target.data.context;
        let time = data.latencyCompensation ?
            getControlTime(context, timeStamp) :
            getContextTime(context, timeStamp) ;

        if (data.latencyCompensation && time < context.currentTime) {
            if (DEBUG$1) { console.log('Jitter warning. Control time (' + time + ') less than currentTime (' + context.currentTime + '). Advancing to currentTime.'); }
            time = context.currentTime;
        }

        // Select type based on data
        type = data.type ?
            types$1[data.type] ?
                types$1[data.type](type, name, n) :
                data.type :
            type ;

        name = data.name || name ;

        value = transforms[data.transform] ?
            transforms[data.transform](data.min, data.max, value, n) :
            n ;

        // target, time, type, name, value, duration, notify
        distribute(time, type, name, value);

        if (target.record) {
            if (!target.recordDestination) {
                if (!target.recordCount) {
                    target.recordCount = 0;
                }

                const data = {
                    id: target.id + '-take-' + (target.recordCount++),
                    events: []
                };

                target.recordDestination = (new Sequence(target.graph, data)).start(time);
                target.graph.sequences.push(data);
                target.graph.record(time, 'sequence', data.id, target.id);
            }

            target.recordDestination.record(time, type, name, value);
        }
    });
}

assign$7(Control.prototype, {
    remove: function() {
        this.source.stop();
        remove$2(this.controls, this);
        this.notify(this.controls, '.');
    },

    toJSON: function() {
        return {
            source: this.source,
            target: this.target.id,
            data:   this.data
        };
    }
});

var assign$8   = Object.assign;
var defaults$2 = {
	channels: [0, 1]
};

var rautoname = /In\s\d+\/\d+/;

function increment(n) { return ++n; }

class Input extends ChannelMergerNode {
    constructor(context, settings, input) {
		var options = assign$8({}, defaults$2, settings);
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

const assign$9 = Object.assign;
const define$3 = Object.defineProperties;
const rautoname$1 = /Out\s\d+\/\d+/;
const defaults$3 = {
	channels: [0, 1]
};

function increment$1(n) { return n + 1; }

class OutputSplitter extends GainNode {
    constructor(context, settings, output) {
		var options = assign$9({}, defaults$3, settings);
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

		define$3(this, {
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

function assignSetting(node, key, value, notify) {
    // Are we trying to get a value from an AudioParam? No no no.
    if (value && value.setValueAtTime) {
        return;
        //throw new Error('Cannot set ' + key + ' from param on node ' + JSON.stringify(node));
    }

    // Does it quack like an AudioParam?
    if (node[key] && node[key].setValueAtTime) {
        // param, time, curve, value, duration, notify, context
        automate(node[key], node.context.currentTime, 'step', value, null);
    }

    // Or an AudioNode?
    else if (node[key] && node[key].connect) {
        assignSettings(node[key], value);
    }

    // Or an array-like?
//    else if (node[key] && typeof node[key] === 'object' && node[key].length !== undefined) {
//        let n = node[key].length;
//        while (n--) {
//            console.log(node[key][n], value[n]);
//            assignSettings(node[key][n], value[n]);
//        }
//    }

    // Then set it as a property
    else {
        node[key] = value;
    }
}

function assignSettings(node, defaults, settings, ignored) {

    const keys = {};

    if (settings) {
        for (let key in settings) {
            // Ignore ignored key
            if (ignored && ignored.indexOf(key) > -1) { continue; }

            // Ignore AudioParams
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
}

if (!NodeGraph.prototype.get) {
	throw new Error('NodeGraph is not fully formed?')
}
const assign$a = Object.assign;
const define$4 = Object.defineProperties;

const graph$1 = {
	nodes: [{
        id:   'output',
        type: 'tick',
        data: {
            //channelInterpretation: 'speakers',
			//channelCountMode: 'explicit',
			channelCount: 1
        }
    }],

	connections: [],

	params: { gain: 'output.gain' }
};

const defaults$4 = {
	decay:     0.06,
	resonance: 22,
    gain:      0.25,

    tick: [72, 1,   0.03125],
    tock: [64, 0.6, 0.03125],

    events: [
        [0, 'tick'],
        [1, 'tock'],
        [2, 'tock'],
        [3, 'tock'],
		[4, 'tock'],
		[5, 'tock'],
		[6, 'tock'],
		[7, 'tock']
    ]
};

const properties$1 = {
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

const events = [];

function Event$1(b1, beat, type) {
	// A cheap object pool
	let event = events.find((event) => event[0] < b1);

	if (event) {
		event[0] = beat;
		event[1] = type;
		return event;
	}
	else {
		events.push(this);
	}

	this[0] = beat;
	this[1] = type;
}

function fillEventsBuffer(stage, events, buffer, frame) {
	const b1       = frame.b1;
	const b2       = frame.b2;
	const bar1     = stage.barAtBeat(b1);
	const bar2     = stage.barAtBeat(b2);

	let bar        = bar1;
	let bar1Beat   = stage.beatAtBar(bar1);
	let localB1    = b1 - bar1Beat;
	let localB2, bar2Beat;
	let n = -1;

	//console.log('FRAME events', bar, localB1, events.length);

	buffer.length = 0;

	// Ignore events before b1
	while (++n < events.length && events[n][0] < localB1);
	--n;

	// Cycle through bars if there are whole bars left
	while (bar < bar2) {
		bar2Beat = stage.beatAtBar(bar + 1);
		localB2  = bar2Beat - bar1Beat;

		while (++n < events.length && events[n][0] < localB2) {
			//events[n].time = stage.timeAtBeat(events[n][0] + bar1Beat);
			buffer.push(new Event$1(b1, bar1Beat + events[n][0], events[n][1]));
		}

		bar += 1;
		n = -1;
		bar1Beat = bar2Beat;
	}

	// Cycle through final, partial bar
	localB2  = b2 - bar1Beat;

	while (++n < events.length && events[n][0] < localB2) {
		//console.log('timeAtBeat', events[n][0], bar1Beat)
		//events[n].time = stage.timeAtBeat(bar1Beat + events[n][0]);
		buffer.push(new Event$1(b1, bar1Beat + events[n][0], events[n][1]));
	}

	return buffer;
}

function Metronome(context, settings, stage) {
	if (!stage.sequence) { throw new Error('Metronome requires access to transport.'); }

	// Graph
	NodeGraph.call(this, context, graph$1);
    const voice = this.get('output');

	// Private
	const privates = Privates(this);
	privates.voice = voice;
	privates.stage = stage;

	// Properties
	define$4(this, properties$1);

    // Params
    this.gain = voice.gain;

	// Update settings
	assignSettings(this, defaults$4, settings);
}

assign$a(Metronome.prototype, NodeGraph.prototype, {
	start: function(time) {
		const privates  = Privates(this);
		const stage     = privates.stage;
		const metronome = this;
		const voice     = this.get('output');
		const buffer    = [];

		privates.sequence = stage
		.sequence((data) => fillEventsBuffer(stage, this.events, buffer, data))
		.each(function distribute(e) {
			const options = metronome[e[1]];
			voice.start(e.time, options[0], options[1]);
		})
		.start(time || this.context.currentTime);

		return this;
	},

	stop: function(time) {
		const privates = Privates(this);
		privates.sequence.stop(time || this.context.currentTime);
		return this;
	}
});

Metronome.defaults  = {
	filterQ:         { min: 0,   max: 100,   transform: 'quadratic',   value: 0.25 },
	filterFrequency: { min: 16,  max: 16000, transform: 'logarithmic', value: 16 }
};

const generateUnique = function(key, values) {
    var value  = -1;
    while (values.indexOf(++value + '') !== -1);
    return value + '';
};

function roundBeat(n) {
    // Mitigate floating-point rounding errors by rounding to the nearest
    // trillionth
    return Math.round(1000000000000 * n) / 1000000000000;
}

const assign$b = Object.assign;
const define$5 = Object.defineProperties;

const properties$2 = {
	context:       { writable: true },
	startTime:     { writable: true, value: undefined },
	startLocation: { writable: true, value: undefined },
	stopTime:      { writable: true, value: undefined }
};

function Clock(context) {
	// Properties
	define$5(this, properties$2);

	if (!this.context) {
		this.context = context;
	}
}

assign$b(Clock.prototype, {
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
		return this;
	}
});

const assign$c           = Object.assign;
const defineProperties = Object.defineProperties;
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

Event = Pool({
	name: 'Soundstage Event',

	create: noop$1,

	reset: function reset() {
		assign$c(this, arguments);
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

Event.of = Event;

Event.from = function toEvent(data) {
	return Event.apply(null, data);
};

Event.fromMIDI = overload(compose(toType$2, getData), {
	pitch: function(e) {
		return Event(e.timeStamp, 'pitch', pitchToFloat(e.data));
	},

	pc: function(e) {
		return Event(e.timeStamp, 'program', e.data[1]);
	},

	channeltouch: function(e) {
		return Event(e.timeStamp, 'touch', 'all', e.data[1] / 127);
	},

	polytouch: function(e) {
		return Event(e.timeStamp, 'touch', e.data[1], e.data[2] / 127);
	},

	default: function(e) {
		return Event(e.timeStamp, toType$2(e.data), e.data[1], e.data[2] / 127) ;
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

var freeze = Object.freeze;
var rate0  = freeze({ 0: 0, 1: 'rate', 2: 2, location: 0 });
var automationDefaultEvent = freeze({ time: 0, curve: 'step', value: 1, beat: 0 });
var get1$1   = get$1('1');


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

const A$4      = Array.prototype;
const assign$d = Object.assign;
const freeze$1 = Object.freeze;

const insertByBeat = insert$1(get$1('0'));

const rate0$1  = freeze$1({ 0: 0, 1: 'rate', 2: 1, location: 0 });

function round(n) {
	return Math.round(n * 1000000000000) / 1000000000000;
}

function Sequence$1(transport, data) {
	// Super
	Clock.call(this, transport.context);

	// Private
	Privates(this).transport = transport;

	// Properties
	this.events    = data && data.events;
	this.sequences = data && data.sequences;
}

assign$d(Sequence$1.prototype, Clock.prototype, {
	beatAtTime: function(time) {
		if (time < 0) { throw new Error('Sequence.beatAtTime(time) does not accept -ve time values'); }

		const privates  = Privates(this);
		const transport = privates.transport;
		const startLoc  = this.startLocation || (this.startLocation = transport.beatAtTime(this.startTime));
		const timeLoc   = transport.beatAtTime(time);
		const events    = this.events ?
			this.events.filter(isRateEvent) :
			nothing ;

		return beatAtLocation(events, rate0$1, timeLoc - startLoc);
	},

	timeAtBeat: function(beat) {
		const privates  = Privates(this);
		const transport = privates.transport;
		const startLoc  = this.startLocation || (this.startLocation = transport.beatAtTime(this.startTime));
		const events    = this.events ?
			this.events.filter(isRateEvent) :
			nothing ;

		const beatLoc   = locationAtBeat(events, rate0$1, beat);

		return round(transport.timeAtBeat(startLoc + beatLoc));
	},

	record: function(time, type) {
		const event = A$4.slice.apply(arguments);

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

const assign$e = Object.assign;
const define$6 = Object.defineProperties;
const seal$2   = Object.seal;

const properties$3 = {
    graph:             { writable: true },
    record:            { writable: true },
    recordDestination: { writable: true },
    recordCount:       { writable: true, value: 0 }
};

function Node(graph, type, id, object) {
    define$6(this, properties$3);

    this.graph = graph;
    this.id    = id;
    this.type  = type;
    this.data  = object;
    this.distribute = Distribute(object);

    seal$2(this);
}

assign$e(Node.prototype, {
    automate: function(time, type) {
        this.distribute.apply(null, arguments);

        if (this.record) {
            if (!this.recordDestination) {
                const data = {
                    id: this.id + '-take-' + (this.recordCount++),
                    events: []
                };

                this.recordDestination = (new Sequence$1(this.graph, data)).start(time);
                this.graph.sequences.push(data);
                this.graph.record(time, 'sequence', data.id, this.id, arguments[4]);
            }

            this.recordDestination.record.apply(this.recordDestination, arguments);
        }
    }
});

const assign$f = Object.assign;
const seal$3   = Object.seal;

function Connection(graph, sourceId, targetId, sourceChan, targetChan) {

    // Get source node
    //const sourceParts = sourceId.split('.');
    const sourceObject = graph.get(sourceId);

    // Get target node or param
    //const targetParts = targetId.split('.');
    const targetObject = graph.get(targetId);
    const targetNode   = targetObject ;

    const targetParam  = targetChan
        && !/^\d/.test(targetChan)
        && targetNode[targetChan] ;

    // Define properties
    this.graph    = graph;
    this.source   = sourceObject ;
    this.target   = targetObject ;
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.targetParam = targetParam;

    if (sourceChan || targetChan) {
        this.data = [
            sourceChan && parseInt(sourceChan, 10) || 0,
            targetChan && /^\d/.test(targetChan) && parseInt(targetChan, 10) || 0
        ];
    }

    // Make immutable
    seal$3(this);

    // Connect them up
    if (connect(this.source, this.targetParam || this.target, this.data && this.data[0], this.data && this.data[1])) {
        graph.connections.push(this);
    }
}

assign$f(Connection.prototype, {
    remove: function() {
        // Connect them up
        if (disconnect(this.source, this.targetParam || this.target, this.data && this.data[0], this.data && this.data[1])) {
            remove(this.graph.connections, this);
        }

        return this;
    },

    toJSON: function() {
        return {
            source: this.sourceId,
            target: this.targetId,
            data:   this.data
        }
    }
});

const assign$g    = Object.assign;
const define$7    = Object.defineProperties;

function addConnection(graph, setting) {
	new Connection(graph, setting.source, setting.target, setting.output, setting.input);
	return graph;
}

function Graph(context, requests, data, api) {
	const graph       = this;
    const nodes       = [];
    const connections = [];

	define$7(this, {
		nodes:       { enumerable: true, value: nodes },
		connections: { enumerable: true, value: connections }
	});

    // Load nodes
	const promise = Promise.all(
        data.nodes ?
            data.nodes.map(function(data) {
                return (requests[data.type] || requests.default)(context, data, api)
                .then(function(module) {
                    nodes.push(new Node(graph, data.type, data.id, module));
                });
            }) :
            nothing
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

assign$g(Graph.prototype, {
	get: function(id) {
		//console.log('GET', id, this.nodes.find(has('id', id)));
		return this.nodes.find(has$1('id', id)).data;
	},

	identify: function(data) {
		return this.nodes.find(has$1('data', data)).id;
	},

	create: function(type, settings) {
		const plugin = {};
		const id = generateUnique('id', this.nodes.map(get$1('id')));
		this.nodes.push(new Node(this, type, id, plugin));
		return plugin;
	}
});

var registry = {};

function register(path, module) {
    if (registry[path]) {
        throw new Error('soundstage: Calling Soundstage.register(name, fn) but name already registered: ' + name);
    }

    registry[name] = module;
}

var modules = {};

function importPlugin(path) {
    path = /\.js$/.test(path) ? path : path + '.js' ;

    // Don't request the module again if it's already been registered
    return modules[path] || (
        modules[path] = Promise.resolve(require(path)).then(function(module) {
            register(path, module);
            return module.default;
        })
    );
}

/*
.push(array, value)


*/

const A$5 = Array.prototype;

function push(array, value) {
    if (array.push) {
        array.push(value);
    }
    else {
        A$5.push.call(array, value);
    }

    return value;
}

const ready = new Promise(function(accept, reject) {
	function handle() {
		document.removeEventListener('DOMContentLoaded', handle);
		window.removeEventListener('load', handle);
		accept();
	}

	document.addEventListener('DOMContentLoaded', handle);
	window.addEventListener('load', handle);
});

var ready$1 = ready.then.bind(ready);

const rules = [];
const rem = /(\d*\.?\d+)r?em/;
const rpercent = /(\d*\.?\d+)%/;

const types$2 = {
    number: function(n) { return n; },

    function: function(fn) { return fn(); },

    string: function(string) {
        var data, n;

        data = rem.exec(string);
        if (data) {
            n = parseFloat(data[1]);
            return getFontSize() * n;
        }

        data = rpercent.exec(string);
        if (data) {
            n = parseFloat(data[1]) / 100;
            return width * n;
        }

        throw new Error('[window.breakpoint] \'' + string + '\' cannot be parsed as rem, em or %.');
    }
};

const tests = {
    minWidth: function(value)  { return width >= types$2[typeof value](value); },
    maxWidth: function(value)  { return width <  types$2[typeof value](value); },
    minHeight: function(value) { return height >= types$2[typeof value](value); },
    maxHeight: function(value) { return height <  types$2[typeof value](value); },
    minScrollTop: function(value) { return scrollTop >= types$2[typeof value](value); },
    maxScrollTop: function(value) { return scrollTop <  types$2[typeof value](value); },
    minScrollBottom: function(value) { return (scrollHeight - height - scrollTop) >= types$2[typeof value](value); },
    maxScrollBottom: function(value) { return (scrollHeight - height - scrollTop) <  types$2[typeof value](value); }
};

let width, height, scrollTop, scrollHeight, fontSize;

function getStyle(node, name) {
    return window.getComputedStyle ?
        window
        .getComputedStyle(node, null)
        .getPropertyValue(name) :
        0 ;
}

function getFontSize() {
    return fontSize ||
        (fontSize = parseFloat(getStyle(document.documentElement, "font-size"), 10));
}

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

function update$2() {
    var l = rules.length;
    var rule;

    // Run exiting rules
    while (l--) {
        rule = rules[l];

        if (rule.state && !test(rule.query)) {
            rule.state = false;
            rule.exit && rule.exit();
        }
    }

    l = rules.length;

    // Run entering rules
    while (l--) {
        rule = rules[l];

        if (!rule.state && test(rule.query)) {
            rule.state = true;
            rule.enter && rule.enter();
        }
    }
}

function scroll(e) {
    scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    update$2();
}

function resize(e) {
    width = window.innerWidth;
    height = window.innerHeight;
    scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    update$2();
}

window.addEventListener('scroll', scroll);
window.addEventListener('resize', resize);

ready$1(update$2);
document.addEventListener('DOMContentLoaded', update$2);

width = window.innerWidth;
height = window.innerHeight;
scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;

var pre  = document.createElement('pre');
var text = document.createTextNode('');

pre.appendChild(text);

var mimetypes = {
	xml:  'application/xml',
	html: 'text/html',
	svg:  'image/svg+xml'
};

function parse$1(type, string) {
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

// Types

function tag(node) {
	return node.tagName && node.tagName.toLowerCase();
}

function contains$2(child, node) {
	return node.contains ?
		node.contains(child) :
	child.parentNode ?
		child.parentNode === node || contains$2(child.parentNode, node) :
	false ;
}

function attribute(name, node) {
	return node.getAttribute && node.getAttribute(name) || undefined ;
}

function find$2(selector, node) {
	return node.querySelector(selector);
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

function closest(selector, node) {
	var root = arguments[2];

	if (!node || node === document || node === root || node.nodeType === 11) { return; }

	// SVG <use> elements store their DOM reference in
	// .correspondingUseElement.
	node = node.correspondingUseElement || node ;

	return matches$2(selector, node) ?
		 node :
		 closest(selector, node.parentNode, root) ;
}

function query$1(selector, node) {
	return toArray$1(node.querySelectorAll(selector));
}

if (!Element.prototype.append) {
    console.warn('A polyfill for Element.append() is needed (https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/append)');
}

function append$2(target, node) {
    target.append(node);
    return node;
}

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

const prefixes = ['Khtml','O','Moz','Webkit','ms'];

var node = document.createElement('div');
var cache$1 = {};

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
    return cache$1[prop] || (cache$1[prop] = testPrefix(prop));
}

const define$8 = Object.defineProperties;

var features$1 = define$8({
	events: define$8({}, {
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

	// Deprecated

	transitionend: {
		get: function() {
			console.warn('dom.features.transitionend deprecated in favour of dom.features.events.transitionend.');
			return features.events.transitionend;
		},

		enumerable: true
	}
});

features$1.textareaPlaceholderSet ?

	function clone(node) {
		return node.cloneNode(true);
	} :

	function cloneWithHTML(node) {
		// IE sets textarea innerHTML to the placeholder when cloning.
		// Reset the resulting value.

		var clone     = node.cloneNode(true);
		var textareas = query$1('textarea', node);
		var n         = textareas.length;
		var clones;

		if (n) {
			clones = query$1('textarea', clone);

			while (n--) {
				clones[n].value = textareas[n].value;
			}
		}

		return clone;
	} ;

const testDiv      = document.createElement('div');

// Returns a node's id, generating one if the node does not alreay have one

// DOM Mutation

function remove$4(node) {
	if (node.remove) {
		node.remove();
	}
	else {
		console.warn('deprecated: remove() no longer removes lists of nodes.');
		node.parentNode && node.parentNode.removeChild(node);
	}

	return node;
}

function before(target, node) {
	target.parentNode && target.parentNode.insertBefore(node, target);
	return node;
}

function after(target, node) {
	target.parentNode && target.parentNode.insertBefore(node, target.nextSibling);
	return node;
}

function replace(target, node) {
	before(target, node);
	remove$4(target);
	return node;
}

const classes = get$1('classList');

function addClass(string, node) {
	classes(node).add(string);
}

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

function offset(node1, node2) {
	var box1 = box(node1);
	var box2 = box(node2);
	return [box2.left - box1.left, box2.top - box1.top];
}

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
		return getFontSize$1() * n;
	},

	rem: function(n) {
		return getFontSize$1() * n;
	},

	vw: function(n) {
		return window.innerWidth * n / 100;
	},

	vh: function(n) {
		return window.innerHeight * n / 100;
	}
};

let fontSize$1;

function getFontSize$1() {
	return fontSize$1 ||
		(fontSize$1 = parseFloat(style("font-size", document.documentElement), 10));
}


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

if (!NodeList.prototype.forEach) {
    console.warn('A polyfill for NodeList.forEach() is needed (https://developer.mozilla.org/en-US/docs/Web/API/NodeList/forEach)');
}

// Event(type)
// Event(settings, properties)

const assign$h      = Object.assign;
const CustomEvent = window.CustomEvent;
const defaults$5    = {
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

function Event$2(type, options) {
	let settings;

	if (typeof type === 'object') {
		settings = assign$h({}, defaults$5, type);
		type = settings.type;
	}

	if (options && options.detail) {
		if (settings) {
			settings.detail = options.detail;
		}
		else {
			settings = assign$h({ detail: options.detail }, defaults$5);
		}
	}

	var event = new CustomEvent(type, settings || defaults$5);

	if (options) {
		delete options.detail;
		assign$h(event, options);
	}

	return event;
}

const assign$i  = Object.assign;
const rspaces = /\s+/;

function prefixType(type) {
	return features$1.events[type] || type ;
}

function Source(notify, stop, type, options, node) {
	const types  = type.split(rspaces).map(prefixType);
	const buffer = [];

	function update(value) {
		buffer.push(value);
		notify('push');
	}

	this.stop   = stop;
	this.types  = types;
	this.node   = node;
	this.buffer = buffer;
	this.update = update;

	types.forEach(function(type) {
		node.addEventListener(type, update, options);
	});
}

assign$i(Source.prototype, {
	shift: function shiftEvent() {
		const buffer = this.buffer;

		return buffer.shift();
	},

	stop: function stopEvent() {
		const stop   = this.stop;
		const types  = this.types;
		const node   = this.node;
		const buffer = this.buffer;
		const update = this.update;

		types.forEach(function(type) {
			node.removeEventListener(type, update);
		});

		stop(buffer.length);
	}
});

function events$1(type, node) {
	let options;

	if (typeof type === 'object') {
		options = type;
		type    = options.type;
	}

	return new Stream$1(function setup(notify, stop) {
		return new Source(notify, stop, type, options, node);
	});
}



// -----------------

const A$6 = Array.prototype;
const eventsSymbol = Symbol('events');

function bindTail(fn) {
	// Takes arguments 1 and up and appends them to arguments
	// passed to fn.
	var args = A$6.slice.call(arguments, 1);
	return function() {
		A$6.push.apply(arguments, args);
		fn.apply(null, arguments);
	};
}

function on$1(node, type, fn, data) {
	var options;

	if (typeof type === 'object') {
		options = type;
		type    = options.type;
	}

	var types   = type.split(rspaces);
	var events  = node[eventsSymbol] || (node[eventsSymbol] = {});
	var handler = data ? bindTail(fn, data) : fn ;
	var handlers;

	var n = -1;
	while (++n < types.length) {
		type = types[n];
		handlers = events[type] || (events[type] = []);
		handlers.push([fn, handler]);
		node.addEventListener(type, handler, options);
	}

	return node;
}

function once$1(node, types, fn, data) {
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

function trigger(node, type, properties) {
	// Don't cache events. It prevents you from triggering an event of a
	// given type from inside the handler of another event of that type.
	var event = Event$2(type, properties);
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
	var event = Event$2(type, properties);
	node.dispatchEvent(event);
    return node;
}

function delegate(selector, fn) {
	// Create an event handler that looks up the ancestor tree
	// to find selector.
	return function handler(e) {
		var node = closest(selector, e.target, e.currentTarget);
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

// transition(duration, fn)
//
// duration  - duration seconds
// fn        - callback that is called on animation frames with a float
//             representing progress in the range 0-1
//
// Returns a function that cancels the transition.

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
	console.log('linear', 0, object[name], value);
	return transition(
		duration,
		pipe(transform, linear$1(object[name], value), set$1(name, object))
	);
}

const define$9 = Object.defineProperties;

define$9({
    left: 0
}, {
    right:  { get: function() { return window.innerWidth; }, enumerable: true, configurable: true },
    top:    { get: function() { return style('padding-top', document.body); }, enumerable: true, configurable: true },
    bottom: { get: function() { return window.innerHeight; }, enumerable: true, configurable: true }
});

var view = document.scrollingElement;

// disableScroll(node)

if (window.console && window.console.log) {
    window.console.log('%cdom%c         – https://github.com/stephband/dom', 'color: #3a8ab0; font-weight: 600;', 'color: inherit; font-weight: 400;');
}
const parse$2 = curry$1(parse$1, true);
const contains$3 = curry$1(contains$2, true);
const attribute$1 = curry$1(attribute, true);
const find$3 = curry$1(find$2, true);
const closest$1 = curry$1(closest, true);
const matches$3 = curry$1(matches$2, true);
const query$2 = curry$1(query$1, true);
const assign$j  = curry$1(assignAttributes, true);
const append$3  = curry$1(append$2, true);
const prepend$3 = curry$1(prepend$2, true);
const before$1  = curry$1(before, true);
const after$1   = curry$1(after, true);
const replace$1 = curry$1(replace, true);
const addClass$1    = curry$1(addClass, true);
const removeClass$1 = curry$1(removeClass, true);
const frameClass$1  = curry$1(frameClass, true);
const offset$1 = curry$1(offset, true);
const style$1 = curry$1(style, true);
const events$2 = curry$1(events$1, true);

// Legacy uncurried functions

Object.assign(events$2, {
    on:      on$1,
    once:    once$1,
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

/*
KeyboardInputSource(selector)

Constructor of muteable objects representing keyboard input bindings. Sources
have the properties:

- `key`

and the methods:

- `each(fn)`: registers `fn` to consume the stream of input messages
- `stop()`: stops the stream of input messages
*/

const define$a    = Object.defineProperties;
const keyRoutes = {};
const keyStates = {};


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

function keydown(e) {
    // Ignore key presses from interactive elements
    if ('value' in e.target) {
        return;
    }

    // Track key states in order to avoid double triggering of noteons
    // when a key is left depressed for some time
    if (keyStates[e.keyCode]) { return; }
    keyStates[e.keyCode] = true;

    keyRoutes[e.keyCode] && keyRoutes[e.keyCode].reduce(fireKeydown, e);
    keyRoutes['undefined'] && keyRoutes['undefined'].reduce(fireKeydown, e);

    // keyRoutes[e.keyCode] && keyRoutes[e.keyCode].reduce(fireNoteOn, e);
    // keyRoutes['undefined'] && keyRoutes['undefined'].reduce(fireNoteOn, e);
}

function keyup(e) {
    // Ignore key presses from interactive elements
    if ('value' in e.target) {
        return;
    }

    // Track key states in order to avoid double triggering
    if (!keyStates[e.keyCode]) { return; }
    keyStates[e.keyCode] = false;

    keyRoutes[e.keyCode] && keyRoutes[e.keyCode].reduce(fireKeyup, e);
    keyRoutes['undefined'] && keyRoutes['undefined'].reduce(fireKeyup, e);

    // keyRoutes[e.keyCode] && keyRoutes[e.keyCode].reduce(fireNoteOff, e);
    // keyRoutes['undefined'] && keyRoutes['undefined'].reduce(fireNoteOff, e);
}

document.addEventListener('keydown', keydown);
document.addEventListener('keyup', keyup);

function KeyboardInputSource(selector) {
    const handler = function handler(timeStamp, type, param, value) {
        return fn(timeStamp, type, param, value);
    };

    let fn      = noop$1;
    let keyCode = toKeyCode(selector.key);

    define$a(this, {
        device: {
            enumerable: true,
            value: 'keyboard'
        },

        key: {
            enumerable: true,
            get: function() { return toKeyString(keyCode); },
            set: function(value) {
                (keyRoutes[keyCode] && remove$2(keyRoutes[keyCode], handler));
                keyCode = toKeyCode(value);
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
        (keyRoutes[keyCode] && remove$2(keyRoutes[keyCode], handler));
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
- `param`
- `value`

and the methods:

- `each(fn)`: registers `fn` to consume the stream of input messages
- `stop()`: stops the stream of input messages
*/

const define$b = Object.defineProperties;

const pitchBendRange$1 = 2;

function get1$2(object) {
    return object[1];
}

// noteoff, noteon, polytouch, control, program, channeltouch, pitch
const controlTypes = [
    'noteoff',
    'noteon',
    'touch',
    'param',
    'patch',
    'touch',
    'param'
];

const controlParams = [
    get1$2,
    get1$2,
    get1$2,

    function control(message) {
        return numberToControl(message[1]);
    },

    get1$2,

    function channeltouch() {
        return 'noteparam';
    },

    function pitch(message) {
        return 'pitch';
    }
];

const controlValues = [
    function noteoff(message) {
        return 0;
    },

    function noten(message) {
        return int7ToFloat(message[2]);
    },

    function polytouch(message) {
        return int7ToFloat(message[2]);
    },

    function control(message) {
        return int7ToFloat(message[2]);
    },

    noop$1,

    function channeltouch(message) {
        return int7ToFloat(message[2]);
    },

    function pitch(message) {
        return pitchBendRange$1 * bytesToSignedFloat(message[1], message[2]);
    }
];

function MIDIInputSource(data) {
    const handler = function handler(e) {
        const n = Math.floor((e.data[0] - 128) / 16);
        return fn(e.timeStamp, controlTypes[n], controlParams[n](e.data), controlValues[n](e.data));
    };

    const selector = {
        port: data.port,
        0:    data.channel,
        1:    data.type,
        2:    data.param,
        3:    data.value
    };

    let fn;

    define$b(this, {
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
            get: function() { return selector[0]; },
            set: function(value) {
                off(selector, handler);
                selector[0] = value;
                on(selector, handler);
            }
        },

        type: {
            enumerable: true,
            get: function() { return selector[1]; },
            set: function(value) {
                off(selector, handler);
                selector[1] = value;
                on(selector, handler);
            }
        },

        param: {
            enumerable: true,
            get: function() { return selector[2]; },
            set: function(value) {
                off(selector, handler);
                selector[2] = value;
                on(selector, handler);
            }
        },

        value: {
            enumerable: true,
            get: function() { return selector[3]; },
            set: function(value) {
                off(selector, handler);
                selector[3] = value;
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

const assign$k = Object.assign;

function createControl(controls, getTarget, setting, notify) {
    // Detect type of source - do we need to add a type field? Probably. To the
    // route or to the source? Hmmm. Maybe to the route. Maybe to the source.
    // Definitely the source. I think.
    const source = setting.source.device === 'midi' ?
        new MIDIInputSource(setting.source) :
        new KeyboardInputSource(setting.source) ;

    const target = getTarget(setting.target);

    if (!source || !target) {
        print('Control dropped', setting);
        return;
    }

    return new Control(controls, source, target, setting.data, notify);
}

function Controls(getTarget, settings, notify) {
    const controls = assign$k([], Controls.prototype);

    // Set up routes from data
    if (settings) {
        settings.reduce(function(routes, setting) {
            const route = createControl(controls, getTarget, setting, notify);
            if (route) { push(routes, route); }
            return routes;
        }, controls);
    }

    const sources = map$1(get$1('source'), controls);
    print('controls', sources.filter(isKeyboardInputSource).length + ' keyboard, ' + sources.filter(isMIDIInputSource).length + ' MIDI');
    return controls;
}

// Soundstage color theme
//
// Red          #d60a3f
// Muted red    #b5002f
// Orange       #d8841d
// Palegreen fg #acb9b8
// Darkgreen bg #1c2726

var config$1 = {
    // The maximum number of channels for the output node, a merger, of a
    // soundstage instance. If audioContext.destination's maxChannelCount
    // is lower, the output channelCount is set to that instead
    channelCountLimit: 12,

    // Path used by various modules to find and load their web workers, as
    // web workers require paths relative to the base document
    basePath: '/soundstage/',

    // Status constants
    // Start has not yet been called
    WAITING: undefined,

    // Start has been called, currentTime is less than startTime
    CUEING:  'cued',

    // Start has been called, currentTime is greater than startTime
    PLAYING: 'active',

    // currentTime is greater than or equal to stopTime
    STOPPED: 'done'
};

const assign$l         = Object.assign;

const config$2 = {
	lookahead: 0.12,
    duration:  0.24
};

const worker = new Worker(config$1.basePath + 'modules/timer.worker.js');

const startMessage = {
    command: 'start'
};

const stopMessage = {
    command: 'stop'
};

let active = false;
let timers = [];

function stop$1() {
    worker.postMessage(stopMessage);
    active = false;
}

worker.onmessage = function frame(e) {
    let n = -1;

    while (++n < timers.length) {
        timers[n].frame(e.data);
    }

    if (!timers.length) {
        stop$1();
    }
};

function Timer$1(now, duration = config$2.duration, lookahead = config$2.lookahead) {
	this.now         = now;
    this.requests    = [];
    this.buffer      = [];
	this.currentTime = 0;
	this.lookahead   = lookahead;
	this.duration    = duration;
}

assign$l(Timer$1.prototype, {
    frame: function(count) {
        const currentRequests = this.requests;

        this.requests    = this.buffer;
        this.buffer      = currentRequests;
        this.currentTime = this.now() + this.duration + this.lookahead;

        let request;

        while (request = currentRequests.shift()) {
            request(this.currentTime);
        }

        if (!this.requests.length) {
            this.active = false;
            remove$2(timers, this);
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
        remove$2(this.requests, fn);

        if (this.requests.length === 0) {
            this.active = false;
            remove$2(timers, this);

            if (!timers.length) {
                stop$1();
            }
        }
    }
});

var assign$m = Object.assign;
var freeze$2 = Object.freeze;
var meter0 = freeze$2({ 0: 0, 1: 'meter', 2: 4, 3: 1, bar: 0 });

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

function Meter(events) {
	this.events = events;
}

assign$m(Meter.prototype, {
	barAtBeat: function(beat) {
		return barAtBeat(this.events && this.events.filter(isMeterEvent) || nothing, beat);
	},

	beatAtBar: function(bar) {
		return beatAtBar(this.events && this.events.filter(isMeterEvent) || nothing, bar);
	}
});

const assign$n = Object.assign;
const define$c = Object.defineProperties;

const defaultRateEvent  = Object.freeze({ time: 0, value: 2, curve: 'step', beat: 0 });
const defaultMeterEvent = Object.freeze({ 0: 0, 1: 'meter', 2: 4, 3: 1 });

function Transport(context, rateParam, timer, notify) {
	Clock.call(this, context);

	// Private
	const privates = Privates(this);
	privates.rateParam = rateParam;
	privates.meters = [defaultMeterEvent];
	privates.timer  = timer;
	privates.notify = notify;
}

assign$n(Transport.prototype, Clock.prototype, {
	beatAtTime: function(time) {
		if (time < 0) { throw new Error('Location: beatAtLoc(loc) does not accept -ve values.'); }

		const privates  = Privates(this);
		const events    = getAutomation(privates.rateParam);
		// Cache startLocation as it is highly likely to be needed again
		//console.log('transport.beatAtTime', this.startTime, defaultRateEvent, events);
		const startBeat = this.startLocation || (this.startLocation = beatAtTimeOfAutomation(events, defaultRateEvent, this.startTime));
		const timeBeat  = beatAtTimeOfAutomation(events, defaultRateEvent, time);

		return roundBeat(timeBeat - startBeat);
	},

	timeAtBeat: function(beat) {
		if (beat < 0) { throw new Error('Location: locAtBeat(beat) does not accept -ve values.'); }

		const privates  = Privates(this);
		const events    = getAutomation(privates.rateParam);
		// Cache startLocation as it is highly likely to be needed again
		const startBeat = this.startLocation || (this.startLocation = beatAtTimeOfAutomation(events, defaultRateEvent, this.startTime));

		return timeAtBeatOfAutomation(events, defaultRateEvent, startBeat + beat);
	},

	beatAtBar: function(bar) {
		const privates = Privates(this);
		const meters   = privates.meters;
		return beatAtBar(meters, bar);
	},

	barAtBeat: function(beat) {
		const privates = Privates(this);
		const meters   = privates.meters;
		return barAtBeat(meters, beat);
	},

	rateAtTime: function(time) {
		return getValueAtTime(Privates(this).rateParam);
	},

	setMeterAtBeat: function(beat, bar, div) {
		const privates = Privates(this);
		const meters   = privates.meters;

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
		const privates = Privates(this);
		const stream = Stream$1
		.fromTimer(privates.timer)
		.tap((frame) => {
			frame.b1 = this.beatAtTime(frame.t1);
			frame.b2 = this.beatAtTime(frame.t2);
		})
		.map(toEventsBuffer)
		.chain(id)
		.tap((event) => {
			event.time = this.timeAtBeat(event[0]);
		});

		const _start = stream.start;
		const _stop  = stream.stop;

		stream.start = (time) => {
			// If clock is running, don't start it again
			if (this.startTime === undefined || this.stopTime < this.context.currentTime) {
				this.start(time);
			}

			_start.call(stream, time || privates.timer.now());
			return stream;
		};

		stream.stop = (time) => {
			_stop.call(stream, time || privates.timer.now());
			return stream;
		};

		return stream;
	},

	// Todo: work out how stages are going to .connect(), and
    // sort out how to access rateParam (which comes from Transport(), BTW)
    connect: function(target, outputName, targetChan) {
        return outputName === 'rate' ?
            connect(Privates(this).rateParam, target, 0, targetChan) :
            connect() ;
    },

    disconnect: function(outputName, target, outputChan, targetChan) {
        if (outputName !== 'rate') { return; }
        if (!target) { return; }
        disconnect(Privates(this).rateParam, target, 0, targetChan);
    }
});

define$c(Transport.prototype, {
	beat: {
		get: function() {
			var privates = Privates(this);
			var stream   = privates.stream;
			var status   = stream.status;

			return stream && status !== 'waiting' && status !== 'done' ?
				stream.beatAtTime(privates.audio.currentTime) :
				this[$private].beat ;
		},

		set: function(beat) {
			var sequencer = this;
			var privates  = Privates(this);
			var stream    = privates.stream;

			if (stream && stream.status !== 'waiting') {
				stream.on({
					stop: function(stopTime) {
						sequencer.start(stopTime, beat);
					}
				});

				this.stop();
				return;
			}

			privates.beat = beat;
		},

		// Make observable via get/set
		configurable: true
	},

	tempo: {
		get: function() {
			return getValueAtTime(this.context.currentTime, this.rate.value) * 60;
		},

		set: function(tempo) {
			var privates = Privates(this);

			//getValueAtTime(this.rate, context.currentTime);
			// param, time, curve, value, duration, notify, context
			automate(this.rate.value, this.context.currentTime, 'step', tempo / 60, 0, privates.notify, this.context);
		}
	},

 	/*
	Duration of one process cycle. At 44.1kHz this works out just
	shy of 3ms.
	*/

	processDuration: {
		get: function() {
			return 128 / this.context.sampleRate;
		}
	},

	frameDuration: {
		get: function() {
			return Privates(this).timer.duration;
		}
	},

	frameLookahead: {
		get: function() {
			return Privates(this).timer.lookahead;
		}
	}
});

const DEBUG$2 = window.DEBUG;

const assign$o    = Object.assign;
const define$d    = Object.defineProperties;

const seedRateEvent  = { 0: 0, 1: 'rate' };

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
		sequence:     new Sequence$1(target, sequence).start(command.time),
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


// Sequencer
//
// A singleton, Sequencer is a persistent, reusable wrapper for Cuestreams
// and RecordStreams, which are read-once. It is the `master` object from
// whence event streams sprout.

function Sequencer(transport, data, rateParam, timer, notify) {

	// The base Clock provides the properties:
	//
	// startTime:      number || undefined
	// stopTime:       number || undefined
	//
	// Sequence assigns the proerties:
	//
	// events:         array
	// sequences:      array

	Sequence$1.call(this, transport, data);


	// Mix in Meter
	//
	// beatAtBar:  fn(n)
	// barAtBeat:  fn(n)
	//
	// There is no point in calling this as the constructor does nothing
	// Meter.call(this)


	// Private

	const privates = Privates(this);

	privates.timer     = timer;
	privates.rateParam = rateParam;
	privates.beat      = 0;
	privates.notify    = notify;
	privates.context   = this.context;
}

define$d(Sequencer.prototype, {
	tempo: {
		get: function() {
			const privates  = Privates(this);
			return getValueAtTime(privates.rateParam, this.context.currentTime) * 60;
		},

		set: function(tempo) {
			const privates  = Privates(this);
			// param, time, curve, value, duration, notify, context
			automate(privates.rateParam, this.context.currentTime, 'step', tempo / 60, null, privates.notify, this.context);
		}
	},

	meter: {
		get: function() {
			const transport = Privates(this).transport;
			return transport.getMeterAtTime(transport.currentTime);
		},

		set: function(meter) {
			const transport = Privates(this).transport;
			transport.setMeterAtTime(meter, transport.currentTime);
		}
	},

	beat: {
		get: function() {
			const privates = Privates(this);
			if (this.startTime === undefined || this.startTime >= this.context.currentTime || this.stopTime < this.context.currentTime) {
				return privates.beat;
			}
			else {
				return this.beatAtTime(this.context.currentTime);
			}
		},

		set: function(value) {
			const privates = Privates(this);

			if (this.startTime === undefined || this.stopTime < this.context.currentTime) {
				privates.beat = value;
				// Todo: update state of entire graph with evented settings for
				// this beat
			}
			else {
				// Sequence is started - can we move the beat? Ummm... I don't thunk so...
				throw new Error('Beat cannot be moved while sequencer is running');
			}
		}
	}
});

assign$o(Sequencer.prototype, Sequence$1.prototype, Meter.prototype, {
	beatAtTime: function(time) {
		const transport     = Privates(this).transport;
		const startLocation = this.startLocation
		   || (this.startLocation = transport.beatAtTime(this.startTime)) ;

		return transport.beatAtTime(time) - startLocation;
	},

	timeAtBeat: function(beat) {
		const transport     = Privates(this).transport;
		const startLocation = this.startLocation
		   || (this.startLocation = transport.beatAtTime(this.startTime)) ;

		return transport.timeAtBeat(startLocation + beat);
	},

	start: function(time, beat) {
		const privates  = Privates(this);

		time = time || this.context.currentTime;
		beat = beat === undefined ? privates.beat : beat ;

		const stream    = privates.stream;
		const transport = privates.transport;
		const events    = this.events;
		const rateParam = privates.rateParam;

		// If stream is not waiting, stop it and start a new one
		if (stream) {
			stream.stop(time);
		}

		// Run transport, if it is not already
		privates.transport.start(time, beat);

		// Set this.startTime
		Sequence$1.prototype.start.call(this, time, beat);

		// Set rates
		const rates = this.events ?
			this.events.filter(isRateEvent).sort(byBeat) :
			nothing ;

		seedRateEvent.time = time;
		seedRateEvent[2]   = getValueAtTime(rateParam, time);
		rates.reduce(assignTime, seedRateEvent);
		rates.reduce(automateRate, privates);

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

		privates.stream = Stream
		.fromTimer(privates.timer)
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

	stop: function(time) {
		time = time || this.context.currentTime;

		const privates = Privates(this);
		const stream   = privates.stream;
		const rateParam = privates.rateParam;

		// Set this.stopTime
		Sequence$1.prototype.stop.call(this, time);

		// Hold automation for the rate node
		// param, time, curve, value, duration, notify, context
		automate(rateParam, this.stopTime, 'hold', null, null, privates.notify, this.context);

		// Store beat
		privates.beat = this.beatAtTime(this.stopTime);

		// Stop the stream
		stream && stream.stop(this.stopTime);

		// Stop transport
		privates.transport.stop(this.stopTime);

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
		const privates = Privates(this);
		const transport = privates.transport;
		return transport.sequence(toEventsBuffer);
	},

	cue: function(beat, fn) {
		var stream = Privates(this).stream;
		stream.cue(beat, fn);
		return this;
	}
});

const DEBUG$3        = window.DEBUG || false;
const assign$p       = Object.assign;
const define$e       = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

const idSelect = { id: undefined };
const matchesId = matches$1(idSelect);


// Soundstage

function createOutputMerger(context, target) {
    // Safari sets audio.destination.maxChannelCount to
    // 0 - possibly something to do with not yet
    // supporting multichannel audio, but still annoying.
    var count = target.maxChannelCount > config$1.channelCountLimit ?
        config$1.channelCountLimit :
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

function requestAudioNode(context, settings, transport) {
    return (
        constructors[settings.type] ?
            Promise.resolve(constructors[settings.type]) :
            importPlugin(settings.type)
    )
    .then(function(Node) {
        // If the constructor has a preload fn, it has special things
        // to prepare (such as loading AudioWorklets) before it can
        // be used.
        // Todo: Need some way of passing base url from soundstage settings
        // (not these node settings) into preload fn, I fear
        return Node.preload ?

            Node.preload(context).then(() => {
                print('AudioWorklet', Node.name, 'loaded');
                return Node;
            }) :

            Node ;
    })
    .then(function(Node) {
        // Create the audio node
        return new Node(context, settings.data, transport);
    });
}

function Soundstage(data = nothing, settings = nothing) {
    if (!Soundstage.prototype.isPrototypeOf(this)) {
        // Soundstage has been called without the new keyword
        return new Soundstage(data, settings);
    }

    if (isDefined(data.version) && data.version !== this.version) {
        throw new Error('Soundstage: data version mismatch.', this.version, data.version);
    }

    if (DEBUG$3) { printGroup('Soundstage()'); }

    const context$1     = settings.context || context;
    const destination = settings.destination || context$1.destination;
    const notify      = settings.notify || noop$1;
    const output      = createOutputMerger(context$1, destination);
    const rateNode    = new window.ConstantSourceNode(context$1, { offset: 2 });
    const rateParam   = rateNode.offset;
    const timer       = new Timer$1(() => context$1.currentTime);
    const transport   = new Transport(context$1, rateParam, timer, notify);

    rateNode.start(0);

    // Privates

    const privates = Privates(this);

    privates.outputs = {
        default: output,
        rate:    rateNode
    };


    // Properties

    this.label = data.label;

    define$e(this, {
        mediaChannelCount: { value: undefined, writable: true, configurable: true },
//        roundTripLatency:  { value: Soundstage.roundTripLatency, writable: true, configurable: true },
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
        input: function(context, data) {
            return requestInputSplitter(context).then(function(input) {
                return new Input(context, data.data, input);
            });
        },

        metronome: function(context, data) {
            return Promise.resolve(new Metronome(context, data.data, transport));
        },

        output: function(context, data) {
            return Promise.resolve(new OutputSplitter(context, data.data, output));
        },

        default: requestAudioNode
    };

    Graph.call(this, context$1, requestTypes, data, transport);


    // Initialise MIDI and keyboard controls. Assigns:
    //
    // controls:   array-like

    this.ready(function graphReady(stage) {
        define$e(stage, {
            controls: {
                enumerable: true,
                value: new Controls(function findTarget(selector) {
                    const parts = selector.split('.');
                    const param = parts[1];

                    idSelect.id = parts[0];

                    return param === undefined ?
                        stage.nodes.find(matchesId) :
                        stage.nodes.find(matchesId)[param] ;
                }, data.controls, notify)
            }
        });

        // Notify observers that objects have mutated
        // Todo: work out what's happening in Observer that we have to do
        // controls differently - something to do with immutable key / frozen state,
        // I suspect...
        notify(stage.nodes, '.');
        notify(stage.connections, '.');
        notify(stage, 'controls');
    });


    // Initialise soundstage as a Sequencer. Assigns:
    //
    // start:      fn
    // stop:       fn
    // beatAtTime: fn
    // timeAtBeat: fn
    // beatAtBar:  fn
    // barAtBeat:  fn
    // meterAtBeat: fn
    // cue:        fn
    // status:     string

    Sequencer.call(this, transport, data, rateParam, timer, notify);


    /*
    // Initialise as a recorder...

    var recordStream   = RecordStream(this, this.sequences);
    */


    // Create metronome.
    //this.metronome = new Metronome(context, data.metronome, this);
    //this.metronome.start(0);


    if (DEBUG$3) { printGroupEnd(); }
}

define$e(Soundstage.prototype, {
    version: { value: 1 },
    tempo:           getOwnPropertyDescriptor(Sequencer.prototype, 'tempo'),
    meter:           getOwnPropertyDescriptor(Sequencer.prototype, 'meter'),
    beat:            getOwnPropertyDescriptor(Sequencer.prototype, 'beat'),
    processDuration: getOwnPropertyDescriptor(Transport.prototype, 'processDuration'),
    frameDuration:   getOwnPropertyDescriptor(Transport.prototype, 'frameDuration'),
    frameLookahead:  getOwnPropertyDescriptor(Transport.prototype, 'frameLookahead'),

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

/*
.timeAtDomTime(domTime)

Returns audio context time at a given DOM time, where `domTime` is a time in
seconds relative to window.performance.now().
*/

assign$p(Soundstage.prototype, Sequencer.prototype, Graph.prototype, {
    createControl: function(source, target, data) {
        const control = new Control(this.controls, source, target, data);
        this.controls.push(control);
        notify$1(this.controls, '.');
        console.log('Control', control);
        return control;
    },

    connect: function(input, port, channel) {
        const outputs = Privates(this).outputs;
        let output = typeof port === 'string' ? outputs[port] : outputs.default ;

        if (!output) { throw new Error('Output "' + port + '" not found'); }
        connect(output, input, typeof port === 'string' ? 0 : port, channel);

        return input;
    },

    disconnect: function(input, port) {
        const outputs = Privates(this).outputs;
        let output = typeof port === 'string' ? outputs[port] : outputs.default ;

        if (!port) { throw new Error('Output "' + port + '" not found'); }
        disconnect(output, input, typeof port === 'string' ? 0 : port, channel);

        return this;
    },

    timeAtDomTime: function(domTime) {
        return timeAtDomTime(this.context, domTime);
    },

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

        const privates = Privates(this);
        var output = privates.outputs.default;
        output.disconnect();

        this[$store].modify('clear');
        return this;
    }
});

const transforms$1 = {
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
            return (numberToFrequency(value) - min) * (max - min) / numberToFrequency(127) + min ;
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
        tx: function toggle(min, max, current, n) {
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

print(' - http://github.com/soundio/soundstage');

exports.automate = automate;
exports.default = Soundstage;
exports.domTimeAtTime = domTimeAtTime$1;
exports.getValueAtTime = getValueAtTime;
exports.isAudioParam = isAudioParam;
exports.parseValue = parseValue;
exports.timeAtDomTime = timeAtDomTime;
exports.transforms = transforms$1;
