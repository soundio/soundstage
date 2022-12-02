

<header class="@0-x1 @0-3x @1-x3 @1-4x @2-x3 @0-x-stretch">
    <h1 class="docs-text-01" id="soundstage"><code>&lt;Soundstage&gt;</code></h1>
</header>

<section class="@0-x1 @0-3x @1-x3 @1-4x @2-x3 @0-x-stretch">
    <p>Import Soundstage.</p>
<pre><code class="language-js"><span class="token keyword">import</span> Soundstage <span class="token keyword">from</span> <span class="token string">'/soundstage/build/module.js'</span><span class="token punctuation">;</span></code></pre>
<p>Create a new stage.</p>
<pre><code class="language-js"><span class="token keyword">const</span> stage <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">Soundstage</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></code></pre>
<p>A stage is a graph of AudioNodes and a sequencer of events. It has the
following properties and methods.</p>

</section>


<div class="@0-x1 @0-3x @1-x3 @1-2x @2-x3 @2-3x @0-x-stretch @0-y-start">
    
    
    

    
    
    

    
    <h3 class="doctext-03">Properties</h3>
    

<div class="property-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="property|selector-label-1">
<h3 class="property-docs-text-05 docs-text-05">
    <a href="#property|selector-label-1">
        <code class="property language-js">.label</code>
    </a>
</h3>

<p>A string name for this Soundstage document.</p>

</div>



<div class="property-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="property|selector-mediachannelcount">
<h3 class="property-docs-text-05 docs-text-05">
    <a href="#property|selector-mediachannelcount">
        <code class="property language-js">.mediaChannelCount</code>
    </a>
</h3>


</div>



<div class="property-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="property|selector-metronome">
<h3 class="property-docs-text-05 docs-text-05">
    <a href="#property|selector-metronome">
        <code class="property language-js">.metronome</code>
    </a>
</h3>

<p>A boolean property that is a shortcut control the first metronome node in
the graph. Indicates whether a metronome is playing at the current time.
Setting .metronome to true will create a metronome node (if there inspect
not already one in the graph, and then start it.</p>

</div>



    
    <h3 class="doctext-03">Methods</h3>
    

<div class="method-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="method-timeatdomtime">
<h3 class="method-docs-text-05 docs-text-05">
    <a href="#method-timeatdomtime">
        <code class=" language-js">.timeAtDomTime(<span class="param">domTime</span>)</code>
    </a>
</h3>

<p>Returns audio context time at the given <code>domTime</code>, where <code>domTime</code> is a
time in milliseconds relative to window.performance.now().</p>

</div>



<div class="method-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="method-domtimeattime">
<h3 class="method-docs-text-05 docs-text-05">
    <a href="#method-domtimeattime">
        <code class=" language-js">.domTimeAtTime(<span class="param">time</span>)</code>
    </a>
</h3>

<p>Returns DOM performance time at the given context <code>time</code>.</p>

</div>



<div class="method-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="method-records">
<h3 class="method-docs-text-05 docs-text-05">
    <a href="#method-records">
        <code class=" language-js">.records(<span class="param"></span>)</code>
    </a>
</h3>

<p>Returns an array of record objects containing unsaved data.</p>

</div>



    
    
    
</div>

<div class="@-x1 @0-3x @1-x5 @1-2x @2-x6 @2-3x @0-x-stretch @0-y-start">
    
    
    

    
    
    
</div>
