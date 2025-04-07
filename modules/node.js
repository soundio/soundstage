
export function isAudioNode(object) {
    return window.AudioNode && window.AudioNode.prototype.isPrototypeOf(object);
}

export function isAudioNodeLike(object) {
    return object.context && object.connect && object.disconnect;
}
