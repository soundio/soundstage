

# Graph

<p>Constructs a graph of AudioNodes.</p>












## Properties


#### `.nodes`

<p>An array of objects defining graph nodes. See <a href="#nodes-and-connections">Nodes and Connectors</a>.</p>





#### `.connections`

<p>An array of objects defining connections. See <a href="#nodes-and-connections">Nodes and Connectors</a>.</p>






## Methods


#### `.createNode(type, settings)`

<p>Creates a new AudioNode in the Soundstage graph.</p>
<pre><code class="language-js"><span class="token keyword">var</span> wrap <span class="token operator">=</span> stage<span class="token punctuation">.</span><span class="token function">createNode</span><span class="token punctuation">(</span><span class="token string">'delay'</span><span class="token punctuation">,</span> <span class="token punctuation">{</span>
    delayTime<span class="token operator">:</span> <span class="token number">0.5</span>
<span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code></pre>
<p>The <code>type</code> parameter is a string, and must be one of the <a href="#node-types">node types</a>
either built-in or registered with Soundstage. The <code>settings</code> parameter is an
object of settings specific to that node type.</p>
<p>The AudioNode is wrapped in an object with an id and label in the <code>.nodes</code>
array. The wrapper object is returned.</p>





#### `.createConnection(source, target)`

<p>Creates a connection between two nodes in the graph. The parameters
<code>source</code> and <code>target</code> are node ids.</p>





#### `.get(id)`

<p>Returns the AudioNode with <code>id</code> from the graph, or undefined.</p>
<pre><code class="language-js"><span class="token keyword">const</span> node <span class="token operator">=</span> stage<span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span><span class="token string">'0'</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code></pre>





#### `.identify(node)`

<p>Returns the id of the graph node that wraps the AudioNode <code>node</code>.</p>
<pre><code class="language-js"><span class="token keyword">const</span> id <span class="token operator">=</span> stage<span class="token punctuation">.</span><span class="token function">identify</span><span class="token punctuation">(</span>node<span class="token punctuation">)</span><span class="token punctuation">;</span></code></pre>
















