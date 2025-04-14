Written by Claude 3.7 with the prompt:

You are an expert at audio DSP. I want to make an AudioWorkletNode that models tape saturation. Its accompanying AudioWorkletProcessor should import WASM built from a Rust project. The processing of the tape saturation model will be written in Rust for high quality and high performance. The resulting saturation should be mostly warm and musical, but also be capable of being driven into crunchy and aggressive territory.

The tape saturation model should feature:

Dynamic non-linearity
Full Preisach Hysteresis – Magnetic memory effects.
Frequency-Dependent Distortion – Distorts highs more than lows, just like real tape.
Pre-Emphasis & De-emphasis – Mimics real-world tape.
Runs in WASM at Sample Rate – No artifacts, high-fidelity processing.
The AudioWorkletNode should expose AudioParams for:

"Drive" – a k-rate gain param that adjusts how hard the tape is being driven.
"Emphasis" – a k-rate param that adjusts the amount of pre-emphasis and de-emphasis applied to the signal.
"Hysteresis Depth" – A k-rate parameter adjusting how much the tape remembers previous saturation states, making it behave more or less like real magnetic tape.
"Saturation Hardness" – A k-rate parameter adjusting the 'softness' to 'hardness' of the saturation curve, where 'soft' means more gentle, warm saturation and 'hard' means more aggressive, crunchy saturation.

Think step-by-step. Remember that `fetch` is not available inside AudioWorkletProcessor. Write a 'tape-saturator.js' file for the AudioWorkletNode, a 'tape-saturator.worklet.js' file for the AudioWorkletProcessor, and a 'lib.rs' file for the model.
