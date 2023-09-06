
const DEBUG  = true;
const printGroup = DEBUG && console.groupCollapsed.bind(console, '%cPool %c%s', 'color: #b5002f; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;');
const log = DEBUG && console.log.bind(console, '%cPool %c%s', 'color: #b5002f; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;');
const assign = Object.assign;

export default function Pool(constructor, isIdle, setup) {
    const pool = this.pool = [];

    this.create = function Pooled() {
        let object = pool.find(isIdle);

        if (object) {
            // Support reset() in the instance
            return object.reset ?
                (console.warn('Pool .reset() should be stored on the constructor', constructor, object), object.reset.apply(object, arguments)) :
            // Support reset() on the constructor
            constructor.reset ?
                constructor.reset(object, arguments) :
            object ;
        }

        if (DEBUG) {
            printGroup('  ' + constructor.name, pool.length + 1);
        }

        object = new constructor(...arguments);
        setup && setup(object);
        pool.push(object);

        if (DEBUG) {
            console.groupEnd();
        }

        return object;
	};
}

assign(Pool.prototype, {
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
