

<header class="@0-x1 @0-3x @1-x3 @1-4x @2-x3 @0-x-stretch">
    <h1 class="docs-text-01" id="graph"><code>&lt;Graph&gt;</code></h1>
</header>

<section class="@0-x1 @0-3x @1-x3 @1-4x @2-x3 @0-x-stretch">
    <p>Constructs a graph of AudioNodes.</p>

</section>


<div class="@0-x1 @0-3x @1-x3 @1-2x @2-x3 @2-3x @0-x-stretch @0-y-start">
    
    
    

    
    
    

    
    <h3 class="doctext-03">Properties</h3>
    

<div class="property-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="property|selector-nodes">
<h3 class="property-docs-text-05 docs-text-05">
    <a href="#property|selector-nodes">
        <code class="property language-js">.nodes</code>
    </a>
</h3>

<p>An array of objects defining graph nodes. See <a href="#nodes-and-connections">Nodes and Connectors</a>.</p>

</div>



<div class="property-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="property|selector-connections">
<h3 class="property-docs-text-05 docs-text-05">
    <a href="#property|selector-connections">
        <code class="property language-js">.connections</code>
    </a>
</h3>

<p>An array of objects defining connections. See <a href="#nodes-and-connections">Nodes and Connectors</a>.</p>

</div>



    
    <h3 class="doctext-03">Methods</h3>
    

<div class="method-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="method-createnode">
<h3 class="method-docs-text-05 docs-text-05">
    <a href="#method-createnode">
        <code class=" language-js">.createNode(<span class="param">type</span>, <span class="param">settings</span>)</code>
    </a>
</h3>

<p>Creates a new AudioNode in the Soundstage graph.</p>
<pre><code class="language-js"><span class="token keyword">var</span> wrap <span class="token operator">=</span> stage<span class="token punctuation">.</span><span class="token function">createNode</span><span class="token punctuation">(</span><span class="token string">'delay'</span><span class="token punctuation">,</span> <span class="token punctuation">{</span>
    delayTime<span class="token operator">:</span> <span class="token number">0.5</span>
<span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code></pre>
<p>The <code>type</code> parameter is a string, and must be one of the <a href="#node-types">node types</a>
either built-in or registered with Soundstage. The <code>settings</code> parameter is an
object of settings specific to that node type.</p>
<p>The AudioNode is wrapped in an object with an id and label in the <code>.nodes</code>
array. The wrapper object is returned.</p>

</div>



<div class="method-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="method-createconnector">
<h3 class="method-docs-text-05 docs-text-05">
    <a href="#method-createconnector">
        <code class=" language-js">.createConnector(<span class="param">source</span>, <span class="param">target</span>)</code>
    </a>
</h3>

<p>Creates a connection between two nodes in the graph. The parameters
<code>source</code> and <code>target</code> are node ids.</p>

</div>



<div class="method-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="method-get">
<h3 class="method-docs-text-05 docs-text-05">
    <a href="#method-get">
        <code class=" language-js">.get(<span class="param">id</span>)</code>
    </a>
</h3>

<p>Returns the AudioNode with <code>id</code> from the graph, or undefined.</p>
<pre><code class="language-js"><span class="token keyword">const</span> node <span class="token operator">=</span> stage<span class="token punctuation">.</span><span class="token function">get</span><span class="token punctuation">(</span><span class="token string">'0'</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code></pre>

</div>



<div class="method-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="method-identify">
<h3 class="method-docs-text-05 docs-text-05">
    <a href="#method-identify">
        <code class=" language-js">.identify(<span class="param">node</span>)</code>
    </a>
</h3>

<p>Returns the id of the graph node that wraps the AudioNode <code>node</code>.</p>
<pre><code class="language-js"><span class="token keyword">const</span> id <span class="token operator">=</span> stage<span class="token punctuation">.</span><span class="token function">identify</span><span class="token punctuation">(</span>node<span class="token punctuation">)</span><span class="token punctuation">;</span></code></pre>

</div>



    
    
    
</div>

<div class="@-x1 @0-3x @1-x5 @1-2x @2-x6 @2-3x @0-x-stretch @0-y-start">
    
    
    

    
    
    
</div>
