
import { getPrivates } from './utilities/privates.js';
import { connect, disconnect } from './connect.js';

const define = Object.defineProperties;

export default function Backstage(stage) {
    // Whitelist an object of methods to pass to node
    // constructors as a third argument.

    this.beatAtTime     = stage.beatAtTime.bind(stage);
    this.timeAtBeat     = stage.timeAtBeat.bind(stage);
    this.beatAtLocation = stage.beatAtLocation.bind(stage);
    this.locationAtBeat = stage.locationAtBeat.bind(stage);
    this.beatAtBar      = stage.beatAtBar.bind(stage);
    this.barAtBeat      = stage.barAtBeat.bind(stage);
    this.sequence       = stage.sequence.bind(stage);
    this.cue            = stage.cue.bind(stage);
    this.regions        = stage.regions;
    //on, off?

    define(this, {
        beat: {
            get: function() { return stage.beat; }
        }
    });

    // Todo: work out how stages are going to .connect(), and
    // sort out how to access rateNode (which comes from Transport(), BTW)
    this.connect = function(target, outputName, targetChan) {
        return outputName === 'rate' ?
            connect(getPrivates(stage).rateNode, target, 0, targetChan) :
            connect() ;
    };

    this.disconnect = function(outputName, target, outputChan, targetChan) {
        if (outputName !== 'rate') { return; }
        if (!target) { return; }
        disconnect(getPrivates(stage).rateNode, target, 0, targetChan);
    };

    this.start = function(time) {
        // Start the transport
        Clock.prototype.start.call(stage, time);
    },

    this.stop = function(time) {
        // Stop the transport
        Clock.prototype.stop.call(stage, time);
    }
}
