// <script src="vumeternode.js"></script>
// <script>
//   importAudioWorkletNode.then(function () {
//     let context = new AudioContext();
//     let oscillator = new Oscillator(context);
//     let vuMeterNode = new VUMeterNode(context, { updatingInterval: 50 });
// 
//     oscillator.connect(vuMeterNode);
// 
//     function drawMeter () {
//       vuMeterNode.draw();
//       requestAnimationFrame(drawMeter);
//     }
// 
//     drawMeter();
//   });
// </script>

window.audioWorklet.addModule()


class VUMeterNode extends AudioWorklet {

  constructor (context, options) {
    // Setting default values for the input, the output and the channel count.
    options.numberOfInputs = 1;
    options.numberOfOutputs = 0;
    options.channelCount = 1;
    options.updatingInterval = options.hasOwnProperty('updatingInterval')
      ? options.updatingInterval
      : 100;

    super(context, 'VUMeter', options);

    // States in AudioWorkletNode
    this._updatingInterval = options.updatingInterval;
    this._volume = 0;

    // Handles updated values from AudioWorkletProcessor
    this.port.onmessage = event => {
      if (event.data.volume)
        this._volume = event.data.volume;
    }
    this.port.start();
  }

  get updatingInterval() {
    return this._updatingInterval;
  }

  set updatingInterval (intervalValue) {
    this._updatingInterval = intervalValue;
    this.port.postMessage({ updatingInterval: intervalValue });
  }

  draw () {
    /* Draw the meter based on the volume value. */
  }

}

// The application can use the node when this promise resolves.
let importAudioWorkletNode = window.audioWorklet.addModule('./meter.worklet.js');
