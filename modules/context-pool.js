
const DEBUG  = true;
const print  = DEBUG && console.log.bind(console, '%cPool %c%s', 'color: #b5002f; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;');
const assign = Object.assign;

export function getContextPool(constructor, context) {
    // Todo: this could be WeakMap, but lets test on Map first
    const pools = constructor.pools || (constructor.pools = new Map());
    let pool    = pools.get(context);

    if (!pool) {
        pool = [];
        pools.set(context, pool);
    }

    return pool;
}

export function emptyContextPool(constructor, context) {
    const pools = constructor.pools;
    if (!pools) { return; }

    const pool = pools.get(context);
    if (!pool) { return; }

    pool.length = 0;
    if (DEBUG) { print('Context pool ' + constructor.name + ' emptied.', context); }
}

export default function ContextPool(constructor, isIdle) {
	return function Pooled(context) {
		const pool = getContextPool(constructor, context);
        let object = pool.find(isIdle);

		if (object) {
			return object.reset ?
                object.reset.apply(object, arguments) :
                object ;
		}

		object = new constructor(...arguments);
		pool.push(object);

        if (DEBUG) { print('Created new ' + constructor.name + '() for pool of', pool.length); }

		return object;
	};
}

/*
export function Pool(constructor, isIdle) {
    const pool = [];

    function Pooled() {
        let object = pool.find(isIdle);

		if (object) {
			return object.reset ?
                object.reset.apply(object, arguments) :
                object ;
		}

		object = new constructor(...arguments);
		pool.push(object);

        if (DEBUG) { print('Created new ' + constructor.name + '() for pool of', pool.length); }

		return object;
	};
}
*/

export function Pool(constructor, isIdle, setup) {
    const pool = this.pool = [];

    this.create = function Pooled() {
        let object = pool.find(isIdle);

        if (object) {
            return object.reset ?
                object.reset.apply(object, arguments) :
                object ;
        }

        object = new constructor(...arguments);
        setup && setup(object);
        pool.push(object);

        if (DEBUG) { print('Created new ' + constructor.name + '() for pool of', pool.length); }

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
