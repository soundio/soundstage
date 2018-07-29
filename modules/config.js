export default {
    // A small latency added to incoming events to reduce timing jitter
    // caused by the soonest scheduling time being the next audio.currentTime,
    // which updates every 128 samples. At 44.1kHz this works out at about 3ms.
    jitterLatency: 128 / 441000;
};
