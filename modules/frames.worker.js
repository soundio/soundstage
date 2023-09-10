
const worker = this;

let count = 0;
let interval;

const commands = {
    start: function(data) {
        interval = setInterval(
            () => worker.postMessage(count++),
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
