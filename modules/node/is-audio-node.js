export default function isAudioNode(object) {
    return window.AudioNode && window.AudioNode.prototype.isPrototypeOf(object);
}
