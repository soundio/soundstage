
/*
A timer launched in a worker is not subject to being paused when a browser tab
becomes not visible. This allows us to continue scheduling events at a
reasonable rate.
*/

const worker = this;

let count = 0;
let interval;

const commands = {
    start: function(data) {
        interval = setInterval(
            () => worker.postMessage(++count),
            data.duration * 1000
        );
    },

    stop: function() {
        clearInterval(interval);
        interval = undefined;
    }
};

this.onmessage = (e) => {
    commands[e.data.command](e.data);
};
