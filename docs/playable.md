

# Playable

<p>Takes a <code>context</code> object with a <code>.currentTime</code> property and constructs an object
with <code>.start()</code> and <code>.stop()</code> methods and a <code>.playing</code> property. A playable
may be started and stopped repeatedly.</p>
<pre><code class="language-js"><span class="token keyword">const</span> playable <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Playable</span><span class="token punctuation">(</span>context<span class="token punctuation">)</span><span class="token punctuation">;</span></code></pre>
<p>Playable properties are non-enumerable, so they do not stringify to JSON.</p>
<pre><code class="language-js"><span class="token keyword">const</span> json <span class="token operator">=</span> <span class="token constant">JSON</span><span class="token punctuation">.</span><span class="token function">stringify</span><span class="token punctuation">(</span>playable<span class="token punctuation">)</span><span class="token punctuation">;</span>     <span class="token comment">// {}</span></code></pre>
<p>Playable is designed to be assigned as a mixin in other constructors.</p>
<pre><code class="language-js"><span class="token keyword">function</span> <span class="token function">MyObject</span><span class="token punctuation">(</span><span class="token parameter">context</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    <span class="token comment">// Call the Playable constructor inside your constructor</span>
    <span class="token function">Playable</span><span class="token punctuation">.</span><span class="token function">call</span><span class="token punctuation">(</span><span class="token keyword">this</span><span class="token punctuation">,</span> context<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>

<span class="token comment">// Assign its prototype to your object's prototype</span>
Object<span class="token punctuation">.</span><span class="token function">assign</span><span class="token punctuation">(</span><span class="token class-name">MyObject</span><span class="token punctuation">.</span>prototype<span class="token punctuation">,</span> <span class="token class-name">Playable</span><span class="token punctuation">.</span>prototype<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">// Define its properties on your object's prototype</span>
Object<span class="token punctuation">.</span><span class="token function">defineProperties</span><span class="token punctuation">(</span><span class="token class-name">MyObject</span><span class="token punctuation">.</span>prototype<span class="token punctuation">,</span> <span class="token punctuation">{</span>
    playing<span class="token operator">:</span> Object<span class="token punctuation">.</span><span class="token function">getOwnPropertyDescriptor</span><span class="token punctuation">(</span><span class="token class-name">Playable</span><span class="token punctuation">.</span>prototype<span class="token punctuation">,</span> <span class="token string">'playing'</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code></pre>












## Properties


#### `.startTime`

<p>The time at which playback was last scheduled to start, or <code>undefined</code>.</p>





#### `.stopTime`

<p>The time at which playback was last scheduled to stop, or <code>undefined</code>.</p>
<p>Only a playable that has been started may be stopped. Attempting to <code>.stop()</code>
a playable that has not started throws an error.</p>





#### `.playing`

<p>A boolean indicating whether the node is started and playing. A playable is
playing where both:</p>
<ul>
<li><code>.startTime</code> is a number less than or equal to <code>context.currentTime</code></li>
<li><code>.stopTime</code> is undefined or a number greater than <code>context.currentTime</code></li>
</ul>
<p>Under all other conditions <code>.playing</code> is <code>false</code>.</p>






## Methods


#### `.start(time)`

<p>Sets <code>.startTime</code> to <code>time</code>, or where <code>time</code> is undefined, to
<code>context.currentTime</code>.</p>
<p>Attempting to start a playable that has already been started throws an error.</p>
<p>Returns the playable.</p>





#### `.stop(time)`

<p>Sets <code>.stopTime</code> to <code>time</code>, or where <code>time</code> is undefined, to <code>context.currentTime</code>.</p>
<p>Attempting to stop a stopped playable throws an error.</p>
<p> this time is before <code>.startTime</code>, in which case
<code>.stopTime</code> is set equal to <code>.startTime</code>.</p>
<p>Returns the playable.</p>
















