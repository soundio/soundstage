

#Event

<p>An event requires a <code>beat</code>, <code>type</code> and some <code>data</code>.</p>
<pre><code class="language-js">stage<span class="token punctuation">.</span><span class="token function">createEvent</span><span class="token punctuation">(</span>beat<span class="token punctuation">,</span> type<span class="token punctuation">,</span> data<span class="token operator">...</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code></pre>
<ul>
<li><code>beat</code> is a number representing the time in beats from the start of a
sequence at which to play the event</li>
<li><code>type</code> is a string</li>
</ul>
<p>Data parameters are dependent on the event type. The built-in
events types and the data they expect are:</p>






























