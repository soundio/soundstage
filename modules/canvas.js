
function drawBg(box, ctx, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.rect.apply(ctx, box);
    ctx.closePath();
    ctx.fill();
}

/*
drawY(ctx, box, y, color)

Draws a line at y position.

ctx:   canvas context
box:   array of 4 numbers describing view box
y:     y position
color: color
*/

export function drawY(ctx, box, y, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(box[0], box[1] + (box[3] / 2) - (y * box[3] / 2));
    ctx.lineTo(box[0] + box[2], box[1] + (box[3] / 2) - (y * box[3] / 2));
    ctx.closePath();
    ctx.stroke();
}

export function drawYLine(ctx, box, valueBox, y, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(box[0], box[1] + (box[3]) - (y * box[3]));
    ctx.lineTo(box[0] + box[2], box[1] + (box[3]) - (y * box[3]));
    ctx.closePath();
    ctx.stroke();
}

/*
drawYAxisAmplitude(ctx, box, color)

Draws Y axis lines from -1 to 1 ready to plot waveforms.

ctx:   canvas context
box:   array of 4 numbers describing view box
color: color
*/

export function drawYAxisAmplitude(ctx, box, color) {
    ctx.lineWidth   = '1';
    ctx.lineCap     = 'round';

    drawY(ctx, box,  1,       color + '66');  //  0dB
    drawY(ctx, box,  0.5,     color + '22');  // -6dB
    drawY(ctx, box,  0.25,    color + '22');  // -12dB
    drawY(ctx, box,  0.125,   color + '22');  // -18dB
    drawY(ctx, box,  0.0625,  color + '22');  // -24dB
    drawY(ctx, box,  0.03125, color + '22');  // -30dB
    drawY(ctx, box,  0,       color);
    drawY(ctx, box, -0.03125, color + '22');
    drawY(ctx, box, -0.0625,  color + '22');
    drawY(ctx, box, -0.125,   color + '22');
    drawY(ctx, box, -0.25,    color + '22');
    drawY(ctx, box, -0.5,     color + '22');
    drawY(ctx, box, -1,       color + '66');
}

/*
drawPoint(ctx, box, x, y, color)

Draws a data point.

ctx:   canvas context
box:   array of 4 numbers describing view box
x:     data points per px
y:     array of data points
color: color
*/

export function drawPoint(box, ctx, x, y, color) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
}

/*
drawCurve(ctx, box, rate, data, color)

Draws a filled automation curve.

ctx:   canvas context
box:   array of 4 numbers describing view box
rate:  data points per px
data:  array of data points
color: base color
*/

export function drawCurve(ctx, box, rate, data, color) {
    let n = 0;

    ctx.lineWidth   = '1';
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(
        box[0],
        box[1] + (box[3] / 2) - (data[n] * box[3] / 2)
    );

    while (++n < data.length) {
        ctx.lineTo(
            box[0] + n / rate,
            box[1] + (box[3] / 2) - (data[n] * box[3] / 2)
        );
    }

    // Stroke the waveform
    ctx.strokeStyle = color;
    ctx.stroke();

    // Now complete its area and then fill it
    ctx.lineTo(
        box[0] + box[2],
        box[1] + box[3] / 2
    );

    ctx.lineTo(
        box[0],
        box[1] + box[3] / 2
    );

    //ctx.closePath();
    ctx.fillStyle = color + '2b';
    ctx.fill();
}

/*
drawCurvePositive(ctx, box, rate, data, color)

Draws a filled automation curve.

ctx:   canvas context
box:   array of 4 numbers describing view box
rate:  data points per px
data:  array of data points
color: base color
*/

export function drawCurvePositive(ctx, box, rate, data, color) {
    let n = 0;

    ctx.lineWidth   = '2';
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(
        box[0],
        box[1] + (box[3]) - (data[n] * box[3])
    );

    while (++n < data.length) {
        ctx.lineTo(
            box[0] + n / rate,
            box[1] + (box[3]) - (data[n] * box[3])
        );
    }

    // Stroke the waveform
    ctx.strokeStyle = color;
    ctx.stroke();

    // Now complete its area and then fill it
    ctx.lineTo(
        box[0] + box[2],
        box[1] + box[3]
    );

    ctx.lineTo(
        box[0],
        box[1] + box[3]
    );

    //ctx.closePath();
    ctx.fillStyle = color + '2b';
    ctx.fill();
}
