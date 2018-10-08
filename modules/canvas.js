
function drawBg(box, ctx, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.rect.apply(ctx, box);
    ctx.closePath();
    ctx.fill();
}

function drawY(box, ctx, y, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(box[0], box[1] + (box[3] / 2) - (y * box[3] / 2));
    ctx.lineTo(box[0] + box[2], box[1] + (box[3] / 2) - (y * box[3] / 2));
    ctx.closePath();
    ctx.stroke();
}

export function drawYAxisAmplitude(ctx, box, color) {
    ctx.lineWidth   = '1';
    ctx.lineCap     = 'round';

    drawY(box, ctx,  1,       color + '66');  //  0dB
    drawY(box, ctx,  0.5,     color + '22');  // -6dB
    drawY(box, ctx,  0.25,    color + '22');  // -12dB
    drawY(box, ctx,  0.125,   color + '22');  // -18dB
    drawY(box, ctx,  0.0625,  color + '22');  // -24dB
    drawY(box, ctx,  0.03125, color + '22'); // -30dB
    drawY(box, ctx,  0,       color);
    drawY(box, ctx, -0.03125, color + '22');
    drawY(box, ctx, -0.0625,  color + '22');
    drawY(box, ctx, -0.125,   color + '22');
    drawY(box, ctx, -0.25,    color + '22');
    drawY(box, ctx, -0.5,     color + '22');
    drawY(box, ctx, -1,       color + '66');
}

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
        box[1] + (box[3] / 2) - (data[n - 1] * box[3] / 2)
    );

    ctx.lineTo(
        box[0],
        box[1] + box[3] / 2
    );

    //ctx.closePath();
    ctx.fillStyle = color + '2b';
    ctx.fill();
}
