
const audio = new window.AudioContext();
audio.destination.channelInterpretation = "discrete";
audio.destination.channelCount = audio.destination.maxChannelCount;
export default audio;
