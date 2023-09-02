
import isDefined from '../../fn/modules/is-defined.js';
import { create, append, style, events } from '../../dom/module.js';


// Create inspector and place it in the DOM

var body = document.body;

var inspector = create('div', {
    id:     'soundstage-inspector',
    style:  'position: fixed; bottom: 0; left: 0; right: 0; height: 256px; background-color: white;'
});

var time = create('div', {
    id:     'soundstage-timeline',
    style:  'width: 100%; height: 256px; overflow: auto; -webkit-overflow-scrolling: auto;'
});

var node = create('canvas', {
    id:     'soundstage-timeline-canvas',
    width:  '7200',
    height: '256',
    style:  'width: 7200px;'
});

body.style.height = 'calc(100% - 256px)';
body.style.minHeight = '0';
append(time, node);
append(inspector, time);
append(body, inspector);


// Scroll timeline wrapper to current time position on animation frames,
// until the user tries to scroll the inspector himself.

var frameId;

function scrollTimeline(t) {
    var width;

    if (window.audio) {
        width = style('width', time);
        time.scrollLeft = toX(audio.currentTime) - 0.8 * width;
        if (audio.currentTime > 30) { return; }
    }

    frameId = window.requestAnimationFrame(scrollTimeline);
}

events.on(inspector, 'touchstart wheel', function(e) {
    window.cancelAnimationFrame(frameId);
});

scrollTimeline();


// Draw timeline canvas

var canvas = node.getContext('2d');

var colors = [
    { r: 140, g: 190, b: 100 },
    { r: 180, g: 155, b: 100 },
    { r: 140, g: 155, b: 140 }
];

var warningColor = 'red';
var waveColor    = '#4C565C'

var audioTrackY  = 256 - 24;

//	var workerPath   = '/static/soundstage/js/worker.waveform.js';
var workerPath   = '/soundstage/modules/waveform.worker.js';
var worker       = new Worker(workerPath);

// Memory cache for audio nodes
var cache = [];



function toX(seconds) {
    return seconds * 240;
}

function drawLabel(x, text, size, color) {
    canvas.font = (size || 14) + "px sans-serif";
    canvas.textBaseline = "hanging";
    canvas.fillStyle = color;
    canvas.fillText(text, x + 3, 3, 300);
}

function drawBar(x, y, color) {
    canvas.strokeStyle = color;
    canvas.lineWidth = 0.5;
    canvas.beginPath();
    canvas.moveTo(x, y);
    canvas.lineTo(x, node.height);
    canvas.closePath();
    canvas.stroke();
}

function drawHorizontal(y, color) {
    canvas.strokeStyle = color;
    canvas.lineWidth = 0.5;
    canvas.beginPath();
    canvas.moveTo(0, y);
    canvas.lineTo(node.width, y);
    canvas.closePath();
    canvas.stroke();
}

function drawRegion(x1, x2, y, color) {
    canvas.fillStyle = color;
    canvas.lineWidth = 0;
    canvas.beginPath();
    canvas.moveTo(x1, y);
    canvas.lineTo(x2, y);
    canvas.lineTo(x2, node.height);
    canvas.lineTo(x1, node.height);
    canvas.lineTo(x1, y);
    canvas.closePath();
    canvas.fill();
}

function drawLine(x1, x2, y, color) {
    canvas.strokeStyle = color;
    canvas.lineWidth = 1;
    canvas.beginPath();
    canvas.moveTo(x1, y);
    canvas.lineTo(x2, y);
    canvas.closePath();
    canvas.stroke();
}

function drawNoteEvent(x1, x2, y, color) {
    canvas.strokeStyle = color;
    canvas.lineWidth = 1;
    canvas.beginPath();
    canvas.moveTo(x1, y);
    canvas.lineTo(x2, y);
    canvas.closePath();
    canvas.stroke();

    canvas.fillStyle = color;
    canvas.beginPath();
    canvas.fillRect(x2, y - 3, 6, 6);
    //canvas.arc(x2, y, 3, 0, 2 * Math.PI, false);
    canvas.closePath();
    canvas.fill();
}

function drawNoteOffEvent(x1, x2, y, color) {
    canvas.strokeStyle = color;
    canvas.lineWidth = 1;
    canvas.beginPath();
    canvas.moveTo(x1, y);
    canvas.lineTo(x2, y);
    canvas.closePath();
    canvas.stroke();

    canvas.fillStyle = color;
    canvas.beginPath();
    canvas.strokeRect(x2, y - 3, 6, 6);
    canvas.closePath();
    canvas.fill();
}

function drawParamEvent(x1, x2, y, color) {
    canvas.strokeStyle = color;
    canvas.lineWidth = 1;
    canvas.beginPath();
    canvas.moveTo(x1, y);
    canvas.lineTo(x2, y);
    canvas.closePath();
    canvas.stroke();

    canvas.fillStyle = color;
    canvas.beginPath();
    canvas.arc(x2, y, 5, 0, 2 * Math.PI, false);
    canvas.closePath();
    canvas.fill();
}

function drawSample(x, y, data) {
    /* Square root the min and max to give us a non-linear representation
       that corresponds closer to what we hear. */
    canvas.beginPath();
    canvas.moveTo(x, -Math.sqrt(-data[0]) * 24);
    canvas.lineTo(x,  Math.sqrt(data[1])  * 24);
    canvas.closePath();
    canvas.stroke();
}

function drawWave(x, y, data) {
    canvas.save();
    canvas.strokeStyle = waveColor;
    canvas.lineWidth = 1;
    canvas.lineCap = 'round';
    canvas.translate(0, y);

    var xSample = data.length;

    while (xSample--) {
        drawSample(x + xSample, y, data[xSample]);
    }

    canvas.restore();
}

function drawDeciSeconds() {
    var n = 300;
    while (n--) {
        drawBar(toX(n) / 10, 0, '#eaeaea');
    }
}

function drawSeconds() {
    var n = 30;
    while (n--) {
        drawBar(toX(n), 0, '#bbbbbb');
        drawLabel(toX(n), n + 's', 14, '#bbbbbb');
    }
}

function drawAudioTrack() {
    canvas.fillStyle = 'rgba(0,0,0,0.08)';
    canvas.beginPath();
    canvas.rect(0, audioTrackY - 24, node.width, 48);
    canvas.closePath();
    canvas.fill();

    drawHorizontal(audioTrackY, '#bbbbbb');
}

// Set colours and everything
canvas.strokeStyle = 'black';
canvas.fillStyle = "#808080";

// Align single pixel strokes with the pixel grid
canvas.translate(0.5, 0.5);
canvas.lineCap = "butt";

// Set up some shapes
drawDeciSeconds();
drawAudioTrack();
drawSeconds();

var n = 0;
var c = colors[0];
var frameY = 20;

export default {
    drawCue: function(s1, s2) {
        n = (n + 1) % 3;
        c = colors[n];
        drawRegion(toX(s1), toX(s2), n * 4 + frameY, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.1)');
        drawLine(toX(s1), toX(s2),   n * 4 + frameY, 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')');
    },

    drawBar: function(seconds, color, text) {
        drawBar(toX(seconds), 0, color || 'blue');
        drawLabel(toX(seconds), isDefined(text) ? text : seconds.toFixed(3) + 's', 12, color || 'blue');
    },

    drawEvent: function(s1, s2, type, value, color) {
        if (type === "param") {
            drawParamEvent(toX(s1), toX(s2), 256 * (1 - value), s2 < s1 ? warningColor : color || 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')');
        }
        else if (type === "noteoff") {
            drawNoteOffEvent(toX(s1), toX(s2), (128 - value) * 2, s2 < s1 ? warningColor : color || 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')');
        }
        else {
            drawNoteEvent(toX(s1), toX(s2), (128 - value) * 2, s2 < s1 ? warningColor : color || 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')');
        }
    },

    drawAudioBuffer: function(s1, buffer) {
        var data = [];
        var n    = buffer.numberOfChannels;

        while (n--) {
            // It doesn't matter what order we push data in
            data.push(buffer.getChannelData(n));
        }

        worker.postMessage({
            data: data,
            // Width in pixels that the actual drawn part of the waveform
            // will take up. The worker generates one min/max data array for
            // each pixel.
            resolution: toX(buffer.duration)
        });

        worker.onmessage = function(e) {
            drawWave(toX(s1), audioTrackY, e.data);
        };
    },

    drawAudioFromNode: function(source) {
        var audio = source.context;
        var node = audio.createScriptProcessor(512);
        var inspector = this;

        node.onaudioprocess = function(e) {
            // Todo: TEMP hard time limit
            if (e.playbackTime > 30) { return; }
            inspector.drawAudioBuffer(e.playbackTime, e.inputBuffer);
        };

        node.channelCountMode      = "explicit";
        node.channelInterpretation = "discrete";

        // Script nodes should be kept in memory to avoid Chrome bugs
        cache.push(node);

        // Script nodes do nothing unless connected in Chrome due to a bug. This
        // will have no effect, since we don't pass the input to the output.
        node.connect(audio.destination);

        // Connect the source to the script
        source.connect(node);
    }
};
