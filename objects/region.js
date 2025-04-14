
export default class AudioRegion extends StageObject {
    constructor() {

    }

    start(time, rate) {
        const source = new AudioBufferSourceNode(this.context, {
            buffer:       this.buffer,
            loop:         true,
            loopStart:    0,
            loopEnd:      this.buffer.duration,
            playbackRate: 1
        });

        // Connect transport rate to source rate
        rate.connect(source.playbackRate);

        // If we are scheduling to start in the past offset the playback
        const offset = this.startTime < this.context.currentTime ?
            this.context.currentTime - this.startTime :
            0 ;

        // Don't forget this loops offset to sync it with
        const startOffset = mod(this.duration, this.recordOffset + offset);

        log('Region', `start() current ${ this.context.currentTime.toFixed(3) } .startTime ${ this.startTime.toFixed(3) }`);
        source.start(this.startTime, startOffset);
        return source;
    }
}
