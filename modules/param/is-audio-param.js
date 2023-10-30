
/**
isAudioParam(object)
**/

export default function isAudioParam(object) {
    return window.AudioParam && window.AudioParam.prototype.isPrototypeOf(object);
}
