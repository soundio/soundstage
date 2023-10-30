
import isAudioParam from './is-audio-param.js';

/**
getAutomation(param)
**/

const $automation = Symbol('soundstage-automation');

export function getAutomation(param) {
    if (window.DEBUG && !isAudioParam(param)) {
        throw new Error('Not an AudioParam ' + JSON.stringify(param));
    }

    // FF refuses to allow AudioParams as WeakMap keys. So lets use an expando.
    return param[$automation] || (param[$automation] = []);
}

export function hasAutomation(param) {
    return !!param[$automation];
}
