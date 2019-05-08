// Soundstage color theme
//
// Red          #d60a3f
// Muted red    #b5002f
// Orange       #d8841d
// Palegreen fg #acb9b8
// Darkgreen bg #1c2726

export default {
    // The maximum number of channels for the output node, a merger, of a
    // soundstage instance. If audioContext.destination's maxChannelCount
    // is lower, the output channelCount is set to that instead
    channelCountLimit: 12,

    // Path used by various modules to find and load their web workers, as
    // web workers require paths relative to the base document
    basePath: window.soundstageBasePath || '/soundstage/',

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
