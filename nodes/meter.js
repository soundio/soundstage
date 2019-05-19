
const decay = 0.9;

export default class Meter extends window.AudioWorkletNode {
    constructor(context, settings) {
        super(context, 'meter');

        this.peaks = [];

        this.port.onmessage = (e) => {
//            let p = e.data.peaks.length;
//
//            while (p--) {
//                e.data.peaks[p] = this.peaks[p] * decay > e.data.peaks[p] ?
//                    this.peaks[p] * decay :
//                     e.data.peaks[p] ;
//            }

            this.peaks = e.data.peaks;
        };

        // It's ok, this doesn't emit anything
        this.connect(context.destination);
    }
}

Meter.preload = function(base, context) {
    return context
    .audioWorklet
    .addModule(base + '/nodes/meter.worklet.js');
};
