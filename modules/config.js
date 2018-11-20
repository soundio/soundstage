// Soundstage color theme
//
// Red          #d60a3f
// Muted red    #b5002f
// Orange       #d8841d
// Palegreen fg #acb9b8
// Darkgreen bg #1c2726

export default {
    // A small latency added to incoming events to reduce timing jitter
    // caused by the soonest scheduling time being the next audio.currentTime,
    // which updates every 128 samples. At 44.1kHz this works out just shy of 3ms.
    jitterLatency: 128 / 441000,

    // The maximum number of channels for the output node, a merger, of a
    // soundstage instance. If audioContext.destination's maxChannelCount
    // is lower, the output channelCount is set to that instead
    channelCountLimit: 12,

    // Path used by various modules to find and load their web workers, as
    // web workers require paths relative to the base document
    basePath: '/soundstage/',

    // Status constants
    // Start has not yet been called
    WAITING: undefined,

    // Start has been called, currentTime is less than startTime
    CUEING:  'cued',

    // Start has been called, currentTime is greater than startTime
    PLAYING: 'active',

    // currentTime is greater than or equal to stopTime
    STOPPED: 'done'
};
