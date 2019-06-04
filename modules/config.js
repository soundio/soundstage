export default {
    // The maximum number of channels for the output node, a merger, of a
    // soundstage instance. If audioContext.destination's maxChannelCount
    // is lower, the output channelCount is set to that instead
    channelCountLimit: 12,

    // Path used by various modules to find and load their web workers, as
    // web workers require paths relative to the base document
    basePath: window.soundstageBasePath || '/soundstage/',

    // Expando names added to AudioParams in order to help observe
    // value changes
    automationEventsKey: 'automationEvents',
    animationFrameKey: 'animationFrame',

    // Value considered to be 0 for the purposes of scheduling
    // exponential curves.
    minExponentialValue: 1.40130e-45,

    // Multiplier for duration of target events indicating roughly when
    // they can be considered 'finished'
    targetDurationFactor: 9
};
