
const DEBUG  = true;
const printGroup = DEBUG && console.groupCollapsed.bind(console, '%cPool %c%s', 'color: #b5002f; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;');
const log = DEBUG && console.log.bind(console, '%cPool %c%s', 'color: #b5002f; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;');
const assign = Object.assign;

export default class Pool extends Array {
    #Constructor;
    #setup;
    #isIdle;

    constructor(Constructor, isIdle, setup) {
        super();
        this.#Constructor = Constructor;
        this.#setup = setup;
        this.#isIdle = isIdle;
    }

    create() {
        const Constructor = this.#Constructor;
        let object = this.find(this.#isIdle);

        if (object) {
            // If Constructor has a static reset() call it with object
            if (Constructor.reset) Constructor.reset(object, arguments);
            return object;
        }

        if (DEBUG) printGroup(Constructor.name, this.length + 1);

        object = new Constructor(...arguments);
        this.#setup && this.#setup(object);
        this.push(object);

        if (DEBUG) console.groupEnd();

        return object;
    }

    purge() {
        this.length = 0;
    }
}
