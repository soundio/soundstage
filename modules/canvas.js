
const assign        = Object.assign;
const axisStyle     = { strokeStyle: "rgba(0,0,0,0.4)", lineWidth: 0.5 };
const axisZeroStyle = { strokeStyle: "black", lineWidth: 1 };
const plotStyle     = { strokeStyle: "white", lineWidth: 1 };
const waveformStyle = { strokeStyle: "white", lineWidth: 1 };

export function plotYAxis(ctx, box, style) {
    let [x, y, w, h] = box;

    // y lines
    let n = 2;
    ctx.beginPath();
    while ((n /= 2) > 0.008) {
        ctx.moveTo(x,     y - n * h);
        ctx.lineTo(x + w, y - n * h);
        ctx.moveTo(x,     y + n * h);
        ctx.lineTo(x + w, y + n * h);
    }
    assign(ctx, axisStyle, style);
    ctx.stroke();
    ctx.closePath();

    // y=0 line
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    assign(ctx, axisZeroStyle, style);
    ctx.stroke();
    ctx.closePath();
}

export function plotBeats(ctx, box, duration, events, index, style) {
    let [x, y, w, h] = box;
    let beat = 0;
    let div  = 1;

    // x lines
    ctx.beginPath();

    // Plot lines from
    let i = -1, event;
    while (event = events[++i]) if (event[1] === 'meter') {
        // Draw lines up to and including event time
        if (div) while ((beat += div) <= event[0] && beat < duration) {
            ctx.moveTo(w * beat / duration, y + -1.5 * h);
            ctx.lineTo(w * beat / duration, y + 1.5 * h);
        }

        // Update position
        beat = event[0];
        div  = event[index];
    }

    // Fill lines to end of duration
    while ((beat += div) < duration) {
        ctx.moveTo(w * beat / duration, y + -1.5 * h);
        ctx.lineTo(w * beat / duration, y + 1.5 * h);
    }

    assign(ctx, axisStyle, style);
    ctx.stroke();
    ctx.closePath();
}

export function plotMeter(ctx, box, duration, events, index, style) {
    // Plot division lines
    plotBeats(ctx, box, duration, events, 3, style);
    // Plot bar lines
    plotBeats(ctx, box, duration, events, 2, { strokeStyle: 'rgba(0,0,0,0.5)' });
}

export function plot(ctx, box, points, style) {
    const [x, y, w, h] = box;
    let n = -1;
    ctx.beginPath();
    ctx.moveTo(points[++n] * w + x, points[++n] * h + y);
    while(points[++n] !== undefined) ctx.lineTo(points[n] * w + x, points[++n] * h + y);
    assign(ctx, plotStyle, style);
    ctx.stroke();
    ctx.closePath();
}

export function plotWaveform(ctx, box, samples, style) {
    let [x, y, w, h] = box;
    let dx = w / samples.length;
    let n = -1;
    ctx.beginPath();
    ctx.moveTo(x, samples[++n] * h + y);
    while(samples[++n] !== undefined) ctx.lineTo(x += dx, samples[n] * h + y);
    // Return to y=samples[0] at the end, as waveform is a repeating series
    ctx.lineTo(x += dx, samples[0] * h + y);
    assign(ctx, waveformStyle, style);
    ctx.stroke();
    ctx.closePath();
}

export function plotSamples(ctx, box, samples, style) {
    let [x, y, w, h] = box;
    let dx = w / samples.length;
    let n = -1;
    ctx.beginPath();
    ctx.moveTo(x, samples[++n] * h + y);
    while(samples[++n] !== undefined) ctx.lineTo(x += dx, samples[n] * h + y);
    // Return to y=0 at the end
    ctx.lineTo(x += dx, 0 * h + y);
    assign(ctx, waveformStyle, style);
    ctx.stroke();
    ctx.closePath();
}

export function plotBuffer(ctx, box, buffer, style) {
    let n = -1;
    while(++n < buffer.numberOfChannels) plotWaveform(ctx, box, buffer.getChannelData(n), style);
}

export function plotSignpost(ctx, box, x, y, style) {
    plot(ctx, box, [
        // Draw a wee signpost
        x, 0,
        x,         y - 0.02,
        x - 0.004, y - 0.02,
        x - 0.004, y + 0.02,
        x + 0.004, y + 0.02,
        x + 0.004, y - 0.02,
        x,         y - 0.02
    ], style);
}
