

<header class="@0-x1 @0-3x @1-x3 @1-4x @2-x3 @0-x-stretch">
    <h1 class="docs-text-01" id="sequence"><code>&lt;Sequence&gt;</code></h1>
</header>

<section class="@0-x1 @0-3x @1-x3 @1-4x @2-x3 @0-x-stretch">
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

</section>


<div class="@0-x1 @0-3x @1-x3 @1-2x @2-x3 @2-3x @0-x-stretch @0-y-start">
    
    
    

    
    
    

    
    <h3 class="doctext-03">Properties</h3>
    

<div class="property-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="property|selector-label">
<h3 class="property-docs-text-05 docs-text-05">
    <a href="#property|selector-label">
        <code class="property language-js">.label</code>
    </a>
</h3>

<p>A string.</p>

</div>



<div class="property-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="property|selector-events">
<h3 class="property-docs-text-05 docs-text-05">
    <a href="#property|selector-events">
        <code class="property language-js">.events</code>
    </a>
</h3>

<p>An array of events that are played on <code>.start(time)</code>.
See <a href="#events">Events</a>.</p>

</div>



<div class="property-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="property|selector-sequences">
<h3 class="property-docs-text-05 docs-text-05">
    <a href="#property|selector-sequences">
        <code class="property language-js">.sequences</code>
    </a>
</h3>

<p>An array of sequences that may be triggered by <code>&#39;sequence&#39;</code> events
stored in <code>.events</code>. See <a href="#sequences">Sequences</a>.</p>

</div>



    
    <h3 class="doctext-03">Methods</h3>
    

<div class="method-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="method-createevent">
<h3 class="method-docs-text-05 docs-text-05">
    <a href="#method-createevent">
        <code class=" language-js">.createEvent(<span class="param">beat</span>, <span class="param">type</span>, <span class="param">…</span>)</code>
    </a>
</h3>


</div>



<div class="method-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="method-createsequence">
<h3 class="method-docs-text-05 docs-text-05">
    <a href="#method-createsequence">
        <code class=" language-js">.createSequence(<span class="param"></span>)</code>
    </a>
</h3>


</div>



<div class="method-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="method-beatattime">
<h3 class="method-docs-text-05 docs-text-05">
    <a href="#method-beatattime">
        <code class=" language-js">.beatAtTime(<span class="param">time</span>)</code>
    </a>
</h3>

<p>Returns the beat at a given <code>time</code>.</p>

</div>



<div class="method-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="method-timeatbeat">
<h3 class="method-docs-text-05 docs-text-05">
    <a href="#method-timeatbeat">
        <code class=" language-js">.timeAtBeat(<span class="param">beat</span>)</code>
    </a>
</h3>

<p>Returns the time at a given <code>beat</code>.</p>

</div>



    
    
    
</div>

<div class="@-x1 @0-3x @1-x5 @1-2x @2-x6 @2-3x @0-x-stretch @0-y-start">
    
    
    

    
    
    
</div>
