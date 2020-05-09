
var worker = this;

worker.onmessage = function(e) {
    var data       = e.data.data;
    var resolution = e.data.resolution;
    var waveform   = [];
    var r = 0;
    var n = 0;
    var length = data[0].length;
    var min, max, b, limit;

    // Loop over blocks of samples
    while (r++ < resolution) {
        min = 0;
        max = 0;
        limit = Math.floor(r * length/resolution);

        // Loop over samples
        --n;
        while (++n < limit) {

            // Loop over data and extract the min and max samples
            b = data.length;
            while (b--) {
                min = data[b][n] < min ? data[b][n] : min ;
                max = data[b][n] > max ? data[b][n] : max ;
            }
        }

        waveform.push([min, max]);
    }

    worker.postMessage(waveform);
}
