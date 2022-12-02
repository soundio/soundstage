

#Soundstage

<p>Import Soundstage.</p>
<pre><code class="language-js"><span class="token keyword">import</span> Soundstage <span class="token keyword">from</span> <span class="token string">'/soundstage/build/module.js'</span><span class="token punctuation">;</span></code></pre>
<p>Create a new stage.</p>
<pre><code class="language-js"><span class="token keyword">const</span> stage <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Soundstage</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code></pre>
<p>A stage is a graph of AudioNodes and a sequencer of events. It has the
following properties and methods.</p>












##Properties


###`.label`

<p>A string name for this Soundstage document.</p>





###`.mediaChannelCount`






###`.metronome`

<p>A boolean property that is a shortcut control the first metronome node in
the graph. Indicates whether a metronome is playing at the current time.
Setting .metronome to true will create a metronome node (if there inspect
not already one in the graph, and then start it.</p>






##Methods


###`.timeAtDomTime(_domTime_`

<p>Returns audio context time at the given <code>domTime</code>, where <code>domTime</code> is a
time in milliseconds relative to window.performance.now().</p>





###`.domTimeAtTime(_time_`

<p>Returns DOM performance time at the given context <code>time</code>.</p>





###`.records(__`

<p>Returns an array of record objects containing unsaved data.</p>
















