
/**
compileWorker(code)
Compiles `code` into a worker and returns a function `post(data, transferables)`
that returns a promise of a returned result. Code must contain a `process(data)`
function that returns an object with the shape `{ data, transferables }`.
**/

let id = 0;

function onmessage(e, requests) {
    const { id, data, error } = e.data;
    if (!requests[id]) return;

    const { resolve, reject } = requests[id];
    if (error) reject(new Error(error));
    else resolve(data);

    delete requests[id];
}

class CompiledWorker {
    #url;
    #worker;
    #requests = {};

    constructor(code) {
        code += `; self.onmessage = async (e) => {
            try {
                // Support both sync and async process functions
                const { data, transferables } = await process(e.data.data);
                self.postMessage({ id: e.data.id, data }, transferables);
            }
            catch (error) {
                self.postMessage({ id: e.data.id, error: error.message });
            }
        };`;

        const blob = new Blob([code], { type: 'application/javascript' });
        this.#url = URL.createObjectURL(blob);
    }

    post(data, transferables) {
        // Get or make worker
        const worker = this.getWorker();

        // Return promise of data
        return new Promise((resolve, reject) => {
            this.#requests[++id] = { resolve, reject };
            worker.postMessage({ id, data }, transferables);
        });
    }

    getWorker() {
        if (this.#worker) return this.#worker;

        const requests = this.#requests;
        const worker = this.#worker = new Worker(this.#url);

        worker.onmessage = (e) => onmessage(e, requests);
        worker.onerror = (e) => {
            // Notify all pending requests in case of catastrophic worker failure
            let id;
            for (id in requests) {
                const { reject } = requests[id];
                reject(e);
                delete requests[id];
            }

            // Trash worker so another will be created on next use
            this.#worker = undefined;
        };

        return worker;
    }
}

// Expose a functional interface
export default function compileWorker(code) {
    const compiled = new CompiledWorker(code);
    return function post(data, transferables) {
        return compiled.post(data, transferables);
    };
}
