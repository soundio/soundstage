registerProcessor('VUMeter', class extends AudioWorkletProcessor {

  static meterSmoothingFactor = 0.9;
  static meterMinimum = 0.00001;

  constructor (options) {
    super(options);
    this._volume = 0;
    this._updatingInterval = options.updatingInterval;
    this._nextUpdateFrames = this.interval;

    this.port.onmessage = event => {
      if (event.data.updatingInterval)
        this._updatingInterval = event.data.updatingInterval;
    }

    this.port.start();
  }

  get interval () {
    return this._updatingInterval / 1000 * this.contextInfo.sampleRate;
  }

  process (inputs, outputs, parameters) {
    // Note that the input will be down-mixed to mono; however, if no inputs are
    // connected then zero channels will be passed in.
    if (inputs[0].length > 0) {
      let buffer = inputs[0][0];
      let bufferLength = buffer.length;
      let sum = 0, x = 0, rms = 0;

      // Calculated the squared-sum.
      for (let i = 0; i < bufferLength; ++i) {
        x = buffer[i];
        sum += x * x;
      }

      // Calculate the RMS level and update the volume.
      rms = Math.sqrt(sum / bufferLength);
      this.volume = Math.max(rms, this._volume * meterSmoothingFactor);

      // Update and sync the volume property with the main thread.
      this._nextUpdateFrame -= bufferLength;
      if (this._nextUpdateFrame < 0) {
        this._nextUpdateFrame += this.interval;
        this.port.postMessage({ volume: this._volume });
      }
    }

    // Keep on processing if the volume is above a threshold, so that
    // disconnecting inputs does not immediately cause the meter to stop
    // computing its smoothed value.
    return this._volume >= meterMinimum;
  }

});
