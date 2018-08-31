export default {
    // A small latency added to incoming events to reduce timing jitter
    // caused by the soonest scheduling time being the next audio.currentTime,
    // which updates every 128 samples. At 44.1kHz this works out just shy of 3ms.
    jitterLatency: 128 / 441000,

    // The maximum number of channels for the output node, a merger, of a
    // soundstage instance. If audioContext.destination's maxChannelCount
    // is lower, the output channelCount is set to that instead
    channelCountLimit: 12
};
