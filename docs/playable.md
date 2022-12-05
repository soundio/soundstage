

# Playable

<p>Takes a <code>context</code> object (an object with a <code>.currentTime</code> property) and
constructs an object that implements the playable API: <code>.start()</code> and <code>.stop()</code>
methods and a <code>.status</code> property.</p>
<p>A playable may be started and stopped repeatedly, but may not be started when
already started, nor stopped when already stopped.</p>
<pre><code class="language-js"><span class="token keyword">const</span> playable <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Playable</span><span class="token punctuation">(</span>context<span class="token punctuation">)</span><span class="token punctuation">;</span></code></pre>
<p>Playable properties are non-enumerable, so they do not stringify to JSON.</p>
<pre><code class="language-js"><span class="token keyword">const</span> json <span class="token operator">=</span> <span class="token constant">JSON</span><span class="token punctuation">.</span><span class="token function">stringify</span><span class="token punctuation">(</span>playable<span class="token punctuation">)</span><span class="token punctuation">;</span>   <span class="token comment">// {}</span></code></pre>












## Properties


#### `.context`

<p>An AudioContext or similar object that must have a <code>.currentTime</code> property.</p>
<p>This property is not enumerable.</p>





#### `.startTime`

<p>The time at which playback was last scheduled to start, or <code>undefined</code>.</p>
<p>This property is not enumerable.</p>





#### `.stopTime`

<p>The time at which playback was last scheduled to stop, or <code>undefined</code>.</p>
<p>This property is not enumerable.</p>





#### `.status`

<p>A string indicating whether the playable is started and playing.</p>
<p>The status is <code>&#39;idle&#39;</code> when:</p>
<ul>
<li><code>.startTime</code> is <code>undefined</code>, or <code>.stopTime</code> is less than or equal to
<code>context.currentTime</code></li>
</ul>
<p>The status is <code>&#39;cued&#39;</code> when both:</p>
<ul>
<li><code>.startTime</code> is a number greater than <code>context.currentTime</code></li>
<li><code>.stopTime</code> is <code>undefined</code>, or a number greater than <code>context.currentTime</code></li>
</ul>
<p>The status is <code>&#39;playing&#39;</code> when both:</p>
<ul>
<li><code>.startTime</code> is a number less than or equal to <code>context.currentTime</code></li>
<li><code>.stopTime</code> is <code>undefined</code> or a number greater than <code>context.currentTime</code></li>
</ul>
<p>This property is not enumerable.</p>






## Methods


#### `.start(time)`

<p>Sets <code>.startTime</code> to <code>time</code>, or where <code>time</code> is <code>undefined</code>, to
<code>context.currentTime</code>. Attempting to start a playable that has already been
started throws an error.</p>
<p>Returns the playable.</p>





#### `.stop(time)`

<p>Sets <code>.stopTime</code> to <code>time</code>, or where <code>time</code> is <code>undefined</code>, to
<code>context.currentTime</code>. Attempting to stop a stopped playable throws an
error.</p>
<p>Returns the playable.</p>
















