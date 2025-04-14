
import Data    from 'fn/data.js';
import dB      from 'fn/to-db.js';
import toGain  from 'fn/to-gain.js';
import { createContext }     from '../../modules/context.js';
import { calculateArrayRMS } from '../../nodes/waveshaper/fns.js';
import { calculatePercussiveLUFS, calculateTruePeak, calculateDynamicRange, detectTransients } from '../../modules/dsp/detect.js';
import SampleMap             from '../sample-map.js';

const define = Object.defineProperties;

const context = createContext();

const data = {
    analysisDuration: 0.4
};

const writableNotEnumerable = { writable: true, enumerable: false };

const properties = {
    peak:           writableNotEnumerable,
    truePeak:       writableNotEnumerable,
    maxRMS:         writableNotEnumerable,
    avgRMS:         writableNotEnumerable,
    rms:            writableNotEnumerable,
    lufs:           writableNotEnumerable,
    dynamicRange:   writableNotEnumerable,
    transientCount: writableNotEnumerable,
    firstTransient: writableNotEnumerable
};

async function analyseRegion(analysisDuration, region) {
    try {
        // Get the buffer
        const buffer = await sampleMap.context.decodeAudioData(
            await (await fetch(region.src)).arrayBuffer()
        );

        // Extract first second of audio (or full buffer if shorter)
        const sampleRate = buffer.sampleRate;
        const samples = Math.min(sampleRate * analysisDuration, buffer.length);

        let maxPeak = 0;
        let sumOfSquaredRMS = 0;
        const channelRMSValues = [];

        // Analyze all channels
        for (let c = 0; c < buffer.numberOfChannels; c++) {
            const channelData = buffer.getChannelData(c);
            const analysisWindow = channelData.slice(0, samples);

            // Calculate peak for this channel
            const channelPeak = Math.max.apply(Math, analysisWindow.map(Math.abs));
            maxPeak = Math.max(maxPeak, channelPeak);

            // Calculate RMS for this channel
            const channelRMS = calculateArrayRMS(analysisWindow);
            channelRMSValues.push(channelRMS);

            // Sum of squared RMS values (power)
            sumOfSquaredRMS += channelRMS * channelRMS;
        }

        // Calculate combined RMS using different methods

        // Method 1: Maximum channel RMS (good for asymmetric signals)
        const maxRMS = Math.max(...channelRMSValues);

        // Method 2: Average of RMS values (simple approach)
        const avgRMS = channelRMSValues.reduce((sum, rms) => sum + rms, 0) / buffer.numberOfChannels;

        // Method 3: RMS of combined power (most accurate for overall energy)
        // Dividing by number of channels to normalize (RMS would be artificially high for stereo otherwise)
        const combinedRMS = Math.sqrt(sumOfSquaredRMS / buffer.numberOfChannels);

        // Calculate advanced measurements for percussive sounds
        const percussiveLUFS = calculatePercussiveLUFS(buffer, sampleRate, 0.02); // Use 20ms attack time
        const truePeak = calculateTruePeak(buffer, sampleRate);
        const dynamicRange = calculateDynamicRange(buffer, sampleRate, 0.05, 0.025); // Use shorter windows
        const transients = detectTransients(buffer, sampleRate, 0.3);

        // Number of significant transients in the sample
        const transientCount = transients.length;

        // Detect if peak has been defined yet, if not define region extensions as non-enumerable
        if (!Object.getOwnPropertyDescriptor(region, 'peak')) define(region, properties);

        // Store all measurements in the region (but not enumerably, we don't want
        // these things ending up in the JSON export)
        const regionData = Data.of(region);

        regionData.peak = maxPeak;
        regionData.truePeak = truePeak;
        regionData.maxRMS = maxRMS;
        regionData.avgRMS = avgRMS;
        regionData.rms = combinedRMS; // Using power sum method as default
        regionData.lufs = percussiveLUFS;
        regionData.dynamicRange = dynamicRange;
        regionData.transientCount = transientCount;
        regionData.firstTransient = transients.length > 0 ? transients[0] / sampleRate : 0;
    }
    catch (error) {
        console.error(`Error analyzing region ${region.src}:`, error);
    }
}





const sampleMap = new SampleMap(context, {
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/Udu/samples.json',
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/Gretsch-Kit/samples.json',
    src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/piano-steinway-b.json',
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/piano-upright-knight.json'
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/wine-glasses.json'
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/pipe-organ-quiet-pedal.json'
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/marimba.json'
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/piano-kawai-grand.json'
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/kalimba-kenya.json',
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/organ-renaissance-4foot.json'
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/organ-renaissance-8foot.json'
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/organ-renaissance-full.json'
});

// A naff way of waiting for regions
sampleMap.promise.then(() => {
    console.log('Start analysis');
    sampleMap.regions.forEach((region) => analyseRegion(data.analysisDuration, region));
});

sampleMap.connect(context.destination);

data.sampleMap = sampleMap;





import Stage from '../../../module.js';

const stage = Stage.load({
    objects: [
        { id: 1, type: 'midi-in' },
        { id: 3, type: 'polyphonic', data: {
            nodes: {
                samples: {
                    type:  'sample',
                    data:  {
                        //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/Udu/samples.json',
                        //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/Gretsch-Kit/samples.json',
                        src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/piano-steinway-b.json',
                        //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/piano-upright-knight.json'
                        //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/wine-glasses.json'
                        //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/pipe-organ-quiet-pedal.json'
                        //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/marimba.json'
                        //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/piano-kawai-grand.json'
                        //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/kalimba-kenya.json',
                        //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/organ-renaissance-4foot.json'
                        //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/organ-renaissance-8foot.json'
                        //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/organ-renaissance-full.json'
                    },
                    start: ['start'],
                    stop:  ['stop']
                },

                output: {
                    type:  'gain',
                    data:  { gain: 0 },
                    start: [null, null, 'gain']
                }
            },

            connections: [
                'samples', 'output'
            ]
        }},
        { id: 4, type: 'audio-out' }
    ],

    pipes: [
        1, 0, 3, 0
    ],

    connections: [
        3, 0, 4, 0
    ]
}).then((stage) => {
    data.stage = stage;

    const object = stage.get(3);

    object.node
    .start(0, 60, 0.001)
    .stop(0, 60, 0.001);

    window.stage = stage;
});


export default data;

