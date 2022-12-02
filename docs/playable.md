

<header class="@0-x1 @0-3x @1-x3 @1-4x @2-x3 @0-x-stretch">
    <h1 class="docs-text-01" id="playable"><code>&lt;Playable&gt;</code></h1>
</header>

<section class="@0-x1 @0-3x @1-x3 @1-4x @2-x3 @0-x-stretch">
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
</section>


<div class="@0-x1 @0-3x @1-x3 @1-2x @2-x3 @2-3x @0-x-stretch @0-y-start">
    
    
    

    
    
    

    
    <h3 class="doctext-03">Properties</h3>
    

<div class="property-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="property|selector-starttime-1">
<h3 class="property-docs-text-05 docs-text-05">
    <a href="#property|selector-starttime-1">
        <code class="property language-js">.startTime</code>
    </a>
</h3>

<p>The time at which playback is scheduled to start.</p>

</div>



<div class="property-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="property|selector-stoptime-1">
<h3 class="property-docs-text-05 docs-text-05">
    <a href="#property|selector-stoptime-1">
        <code class="property language-js">.stopTime</code>
    </a>
</h3>

<p>The time at which playback is scheduled to stop.</p>

</div>



<div class="property-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="property|selector-playing">
<h3 class="property-docs-text-05 docs-text-05">
    <a href="#property|selector-playing">
        <code class="property language-js">.playing</code>
    </a>
</h3>

<p>A boolean indicating whether the node is started and playing (<code>true</code>) or
stopped and idle (<code>false</code>).</p>

</div>



    
    <h3 class="doctext-03">Methods</h3>
    

<div class="method-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="method-start">
<h3 class="method-docs-text-05 docs-text-05">
    <a href="#method-start">
        <code class=" language-js">.start(<span class="param">time</span>)</code>
    </a>
</h3>

<p>Sets <code>.startTime</code> to <code>time</code>, or where <code>time</code> is undefined, to
<code>context.currentTime</code>.</p>
<p>Returns <code>this</code>.</p>

</div>



<div class="method-doc-to ggle-block doc-tog gle-block tog gle-block block" data-tog gleable id="method-stop">
<h3 class="method-docs-text-05 docs-text-05">
    <a href="#method-stop">
        <code class=" language-js">.stop(<span class="param">time</span>)</code>
    </a>
</h3>

<p>Sets <code>.stopTime</code> to <code>time</code> or where <code>time</code> is undefined, to
<code>context.currentTime</code>, this time is before <code>.startTime</code>, in which case
<code>.stopTime</code> is set equal to <code>.startTime</code>.</p>
<p>Returns <code>this</code>.</p>

</div>



    
    
    
</div>

<div class="@-x1 @0-3x @1-x5 @1-2x @2-x6 @2-3x @0-x-stretch @0-y-start">
    
    
    

    
    
    
</div>
