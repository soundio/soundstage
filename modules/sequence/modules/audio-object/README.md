# AudioObject
A wrapper for a graph of AudioNodes that exposes AudioParam values as
getter/setters on an plain ol' object. An AudioObject can serve as an
observable, JSONifiable model of an audio sub-graph – an audio 'plugin'
– in an app.

During an automation a property of an AudioObject is updated from it's
audio param value at the browser frame rate. Changes are
<code>Object.observe</code>-able (or observable using that technique
where the getter/setter is redefined).


## AudioObject(context, input, output, params)

Here is an example of a compressor and a gain wrapped into a single
audio object:

    var audio = new AudioContext();
    var compressor = audio.createDynamicsCompressor();
    var gain = audio.createGain();

    compressor.connect(gain);

    var audioObject = new AudioObject(audio, compressor, gain, {
        threshold: compressor.threshold,
        ratio: compressor.ratio,
        level: gain.gain
    });

Now <code>audioObject</code> is an object with the enumerable properties:

    {
        threshold: -20,
        ratio: 8,
        level: 1
    }

Easy to JSONify. Easy to observe. Setting a property updates the corresponding
audio param behind the scenes. Automating a property via <code>.automate()</code>
updates the audio param and notifies any property observers of changes at the
browser frame rate for the duration of the automation.

#### Multiple inputs and outputs

An AudioObject can have more than one input and/or more than one output. They
are named in a definition object:

    var compressor = audio.createDynamicsCompressor();
    var sideGain = audio.createGain();
    var outGain = audio.createGain();

    var audioObject = new AudioObject(audio, {
        default: compressor,
        sidechain: sideGain
    }, outGain);


#### Exposing audio params as properties

To read more about what can be passed into <code>AudioObject()</code> as
<code>params</code>, see
<a href="#audioobjectdefineaudiopropertiesobject-audiocontext-audioparams">AudioObject.defineAudioProperties()</a>.


### Instance methods

An instance of AudioObject has the methods <code>.automate()</code> and
<code>.destroy()</code>.

    var audioObject = AudioObject(audio, input, output, params);

<!--#### .connect()

A bit like a Web Audio node's <code>.connect()</code> method, although it
handles connections to AudioObjects as well as AudioNodes:

    var delayNode = audioContext.createDelay();
    audioObject.connect(delayNode);

<code>.connect(destination)</code><br/>
Connects the <code>default</code> output to <code>destination</code>'s <code>default</code> input.

<code>.connect(outputName, destination)</code><br/>
Connects the output named <code>outputName</code> to <code>destination</code>'s
<code>default</code> input.

<code>.connect(outputName, destination, inputName)</code><br/>
Connects the output named <code>outputName</code> to <code>destination</code>'s
<code>inputName</code> input.

Input and output names were defined when the AudioObject was first constructed.

#### .disconnect()

A bit like a Web Audio node's <code>.disconnect()</code> method, although it
disconnects AudioObjects as well as AudioNodes.

    audioObject.disconnect(delay);

<code>.disconnect(destination)</code><br/>
Disconnects the <code>default</code> output from <code>destination</code>'s
<code>default</code> input.

<code>.disconnect(outputName, destination)</code><br/>
Disconnects output <code>outputName</code> from <code>destination</code>'s
<code>default</code> input.

<code>.disconnect(outputName, destination, inputName)</code><br/>
Disconnects output <code>outputName</code> from <code>destination</code>'s
<code>inputName</code> input.

Input and output names were defined when the AudioObject was first constructed. -->

#### .automate(name, value, duration, [curve])

Automate a property. The property <code>name</code> will ramp to <code>value</code>
from it's current value over <code>duration</code> (in seconds). The optional
parameter <code>curve</code> can be either <code>'linear'</code> (the default) or
<code>'exponential'</code>.

    audioObject.automate('level', 0, 1.2)

Properties of the audioObject are updated at the browser's frame rate during an
automation.

Note that while the Web Audio API only accepts positive non-zero values for
exponential curves, an audioObject will accept a zero value. It exponentially
automates to as near zero as possible and sets <code>0</code> at the end of the
ramp. Negative values are still a no-no.

#### .destroy()

Destroy is a noop by default. It should be overidden so that it destroys the nodes
in the audioObject's audio graph.

    audioObject.destroy()


### AudioObject functions

#### .automate(param, value, time, duration, curve)

Automates a value change on an AudioParam.

<code>param</code> is the AudioParam.
<code>value</code> is the value to automate to.
<code>time</code> is the time to start the automation. Use <code>param.context.currentTime</code>
to start the automation now.
<code>duration</code> is the duration of the automation. If duration is <code>0</code> or not
defined, <code>curve</code> is set to <code>'step'</code>. 
<code>curve</code> is the name of the automation curve. Choices are:

- <code>'step'</code>'step' uses param.setValueAtTime() to set <code>value</code> immediately
- <code>'linear'</code> uses <code>param.linearRampToValue()</code> to automate to <code>value</code> over <code>duration</code>
- <code>'exponential'</code> uses <code>param.exponentialRampToValue()</code> to automate to <code>value</code> over <code>duration</code>

returns <code>undefined</code>.


<!-- #### .connections(object)

Get the current connection state of any AudioObject:

    var connections = AudioObject.connections(object);

returns <code>connections</code> object. -->

#### .defineAudioProperties(object, audioContext, audioParams)

<code>.defineAudioProperties()</code> takes a map of audio params and defines
properties on <code>object</code> that are bound to the values of those params.
It's used by the <code>AudioObject()</code> constructor to set up an audio
object.

Echoes the JS function <code>Object.defineProperties()</code>, but an audio
property is a getter/setter that is bound to the value of an audio
param.

    var object = {};

    AudioObject.defineAudioProperties(object, audioContext, {
        // Define the property with an object...
        level: {
            param: gain.gain,
            curve: 'exponential',
            enumerable: false
        },

        // ...or as a shortcut, pass in the param directly.
        ratio: compressor.ratio
    });

As with <code>.defineProperties()</code>, <code>enumerable</code> and
<code>configurable</code> can be set, although they are <code>true</code>
by default. <code>curve</code> can also be set, which, if <code>object</code> is
an AudioObject, sets the default curve to be used by <code>.automate()</code>.

To control more than one audio param with a single property, define a setter. It
is the setter's responsibility to automate the audio param values with the given
value, time, duration and curve. <code>AudioObject.automate()</code> Can help
with that.

    AudioObject.defineAudioProperties(object, audioContext, {
        response: {
            set: function(value, time, duration, curve) {
                AudioObject.automate(compressor.attack, value, time, duration, curve);
                AudioObject.automate(compressor.release, value * 6, time, duration, curve);
            },

            defaultValue: 1,
            curve: 'linear'
        }
    });

Returns <code>object</code>.

#### .defineAudioProperty(object, name, audioContext, audioParam)

As <code>.defineAudioProperties()</code>, but defines a single property with
name <code>name</code>.

Returns <code>object</code>.

#### .isAudioObject(object)

Returns <code>true</code> if <code>object</code> is an has <code>AudioObject.prototype</code>
in it's prototype chain.


### AudioObject properties

#### .features

A key-value store of results from feature tests in the browser. Currently there is
one feature test, <code>disconnectParameters</code>:

    // Does the audioNode.disconnect() method accept parameters?
    if (AudioObject.features.disconnectParameters) {
        node1.disconnect(node2, output, input)
    }
    else {
        node1.disconnect();
        // Reconnect nodes that should not have been disconnected...
    }


<!--
## The problem

In Web Audio, changes to AudioParam values are difficult to observe.
Neither <code>Object.observe</code> nor redefining them as getters/setters will
work (for good performance reasons, as observers could potentially be called
at the sample rate).

An audioObject provides an observable interface to graphs of AudioNodes and
AudioParams. Changes to the properties of an audioObject are reflected
immediately in the audio graph, but observers of those properties are notified
of the changes at the browser's frame rate. That's good for creating UIs.

//### Properties
//
//#### AudioObject.inputs<br/>AudioObject.outputs
//
//WeakMaps where inputNode and outputNode for audio objects are stored. Normally
//you will not need to touch these, but they can be useful for debugging. They are
//used internally by audioObject <code>.connect()</code> and
//<code>.disconnect()</code>.
//
//    var inputNode = AudioObject.inputs.get(audioObject);
*/
-->
