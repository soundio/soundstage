
import compileWorker from 'fn/compile-worker.js';
import Stream   from 'fn/stream.js';
import remove   from 'fn/remove.js';
import { rslashfilename } from '../regexp.js';
import { log } from '../log.js';


/*
A timer launched in a worker is not subject to being paused when a browser tab
becomes not visible. This allows us to continue scheduling events at a
reasonable rate. We compile the worker from a string to guard against Cross
Origin issues.
*/

const worker = compileWorker(`
    let count = 0;
    let interval;

    const commands = {
        start: (data) => {
            interval = setInterval(
                () => this.postMessage(++count),
                data.duration * 1000
            );
        },

        stop: () => {
            clearInterval(interval);
            interval = undefined;
        }
    };

    this.onmessage = (e) => {
        commands[e.data.command](e.data);
    };
`);


const startMessage = { command: 'start' };
const stopMessage  = { command: 'stop' };
const streams      = [];


let count = 0;


function addStream(stream) {
    // Add this to list of streams to push times to
    streams.push(stream);

    // Push an initial frame count
    stream.push(count);

    // If the worker timer is not currently active, start it going
    if (streams.length === 1) {
        startMessage.duration = TimesStream.duration;
        worker.postMessage(startMessage);
    }
}

function removeStream(stream) {
    // Remove stream
    remove(streams, stream);

    // If there are no streams left stop the worker timer
    if (!streams.length) worker.postMessage(stopMessage);
}

worker.onmessage = function frame(e) {
    count = e.data;
    let n = -1;
    while (++n < streams.length) streams[n].push(count);
};


export default class TimesStream extends Stream {
    constructor(context) {
        // If a TimesStream is cached against context return it
        let n = -1;
        while (streams[++n] && streams[n].context !== context);
        if (streams[n]) return streams[n];

        super();
        this.context = context;
        this.currentTime = context.currentTime + TimesStream.lookahead;
    }

    push(count) {
        // Get frame time
        const time = this.context.currentTime
            + TimesStream.lookahead
            + TimesStream.duration ;

        // Is context suspended?
        if (time === this.currentTime) return;

        // Push frame time
        Stream.push(this, time);
        this.currentTime = time;
    }

    // Handle context "statechange" event
    handleEvent(e) {
        const state = this.context.state;

        if (DEBUG) log('Times', this.context.currentTime.toFixed(3), state);

        if (state === 'running') {
            addStream(this);
            return;
        }

        if (state === 'suspended') {
            removeStream(this);
            return;
        }

        // Context is closed
        this.stop();
    }

    start() {
        if (this.status === 'done') return this;
        const context = this.context;

        // If context is closed we cannot start the stream
        if (context.state === 'closed') return this.stop();

        // Detect context state changes
        context.addEventListener('statechange', this);

        // If context is suspended wait for state change to start it
        if (context.state === 'suspended') return this;

        addStream(this);
        return this;
    }

    stop() {
        removeStream(this);
        return Stream.stop(this);
    }

    static lookahead = 0.125;
    static duration  = 0.200;
    static streams   = streams;

    static from(context) {
        return new TimesStream(context);
    }
}
