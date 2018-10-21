
const DEBUG = true;

export function getContextPool(constructor, context) {
    // Todo: this could be WeakMap, but lets test on Map first
    const pools = constructor.pools || (constructor.pools = new Map());
    let pool    = pools.get(context);

    if (!pool) {
        pool = [];
        pools.set(context, pool);
        if (DEBUG) { console.log('Pool', constructor.name, pool); }
    }

    return pool;
}

export function emptyContextPool(constructor, context) {
    const pools = constructor.pools;
    if (!pools) { return; }

    const pool = pools.get(context);
    if (!pool) { return; }

    pool.length = 0;
    if (DEBUG) { console.log('Context pool ' + constructor.name + ' emptied.', context); }
}

export default function ContextPool(constructor, isIdle) {
	return function Pool(context) {
		const pool = getContextPool(constructor, context);
        console.log('Checking ' + constructor.name + ' pool of ', pool.length);
        let object = pool.find(isIdle);

		if (object) {
            console.log('REUSE!')
			return object.reset ?
                object.reset.apply(object, arguments) :
                object ;
		}

		object = new constructor(...arguments);
		pool.push(object);
		return object;
	};
}
