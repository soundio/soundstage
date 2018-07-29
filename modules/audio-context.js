
export default audio = new window.AudioContext();
audio.destination.channelInterpretation = "discrete";
audio.destination.channelCount = audio.destination.maxChannelCount;
