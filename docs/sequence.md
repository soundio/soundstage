

#Sequence

<p>A sequence is an object with an <code>.events</code> array. A stage itself is a
sequence: it has an <code>.events</code> array. Events may be created in the stage
events array by calling <code>stage.createEvent()</code>:</p>
<pre><code class="language-js">stage<span class="token punctuation">.</span><span class="token function">createEvent</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">,</span> <span class="token string">'rate'</span><span class="token punctuation">,</span> <span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code></pre>
<p>A stage may be initialised with events by passing them in the data object to the
<code>Soundstage</code> constructor:</p>
<pre><code class="language-js"><span class="token keyword">const</span> stage <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Soundstage</span><span class="token punctuation">(</span><span class="token punctuation">{</span>
    events<span class="token operator">:</span> <span class="token punctuation">[</span>
        <span class="token punctuation">[</span><span class="token number">0</span><span class="token punctuation">,</span> <span class="token string">'rate'</span><span class="token punctuation">,</span> <span class="token number">1</span><span class="token punctuation">]</span>
    <span class="token punctuation">]</span>
<span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code></pre>
<p>Events in the <code>.events</code> array are played when the sequencer is started:</p>
<pre><code class="language-js">stage<span class="token punctuation">.</span><span class="token function">start</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code></pre>












##Properties


###`.label`

<p>A string.</p>





###`.events`

<p>An array of events that are played on <code>.start(time)</code>.
See <a href="#events">Events</a>.</p>





###`.sequences`

<p>An array of sequences that may be triggered by <code>&#39;sequence&#39;</code> events
stored in <code>.events</code>. See <a href="#sequences">Sequences</a>.</p>






##Methods


###`.createEvent(_beat_, _type_, _…_`






###`.createSequence(__`






###`.beatAtTime(_time_`

<p>Returns the beat at a given <code>time</code>.</p>





###`.timeAtBeat(_beat_`

<p>Returns the time at a given <code>beat</code>.</p>
















