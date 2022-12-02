

#rate

<p>An AudioParam representing the rate of the transport clock in
beats per second.</p>












##Properties


###`.rate`

<p>An AudioParam representing the rate of the transport clock in
beats per second.</p>





###`.time`

<p>The time of audio now leaving the device output. (In browsers the have not
yet implemented <code>AudioContext.getOutputTimestamp()</code> this value is estimated from
<code>currentTime</code> and a guess at the output latency. Which is a bit meh, but
better than nothing.)</p>





###`.rate`

<p>The rate of the transport clock in beats per second.</p>





###`.tempo`

<p>The rate of the transport clock, expressed in bpm.</p>





###`.meter`

<p>The current meter.</p>





###`.beat`

<p>The current beat count.</p>





###`.bar`

<p>The current bar count.</p>






##Methods


###`.start(_time_`

<p>Starts the sequencer at <code>time</code>.</p>





###`.stop(_time_`

<p>Stops the sequencer at <code>time</code>.</p>
















