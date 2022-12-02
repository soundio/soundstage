

# Playable

<p>A mixin that sets up an object to be playable.</p>
<pre><code><span class="token comment">// Call the mixin constructor inside your constructor</span>
<span class="token function">MyNode</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token function">Playable</span><span class="token punctuation">.</span><span class="token function">call</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>

<span class="token comment">// Assign its' prototype properties to your object's prototype</span>
Object<span class="token punctuation">.</span><span class="token function">assign</span><span class="token punctuation">(</span><span class="token class-name">MyNode</span><span class="token punctuation">.</span>prototype<span class="token punctuation">,</span> <span class="token class-name">Playable</span><span class="token punctuation">.</span>prototype<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// Define its' defined properties on your object's prototype</span>
Object<span class="token punctuation">.</span><span class="token function">defineProperties</span><span class="token punctuation">(</span><span class="token class-name">MyNode</span><span class="token punctuation">.</span>prototype<span class="token punctuation">,</span> <span class="token punctuation">{</span>
    playing<span class="token operator">:</span> Object<span class="token punctuation">.</span><span class="token function">getOwnPropertyDescriptor</span><span class="token punctuation">(</span><span class="token class-name">Playable</span><span class="token punctuation">.</span>prototype<span class="token punctuation">,</span> <span class="token string">'playing'</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code></pre>











## Properties


### `.startTime`

<p>The time at which playback is scheduled to start.</p>





### `.stopTime`

<p>The time at which playback is scheduled to stop.</p>





### `.playing`

<p>A boolean indicating whether the node is started and playing (<code>true</code>) or
stopped and idle (<code>false</code>).</p>






## Methods


### `.start(_time_`

<p>Sets <code>.startTime</code> to <code>time</code>, or where <code>time</code> is undefined, to
<code>context.currentTime</code>.</p>
<p>Returns <code>this</code>.</p>





### `.stop(_time_`

<p>Sets <code>.stopTime</code> to <code>time</code> or where <code>time</code> is undefined, to
<code>context.currentTime</code>, this time is before <code>.startTime</code>, in which case
<code>.stopTime</code> is set equal to <code>.startTime</code>.</p>
<p>Returns <code>this</code>.</p>
















