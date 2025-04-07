/**
hold(param, time)
**/

// FF has no param.cancelAndHoldAtTime() (despite it being in the spec for,
// like, forever), try and work around it
if (!AudioParam.prototype.cancelAndHoldAtTime) {
    AudioParam.prototype.cancelAndHoldAtTime = function(time) {
        // Set a curve of the same type as what was the next event at this
        // time and value. TODO: get the curve and intermediate value from
        // next set event.
        const events = getAutomation(this);
        let n = -1;
        while (events[++n] && events[n][0] <= time);
        const event1 = events[n];
        const curve  = event1 ? event1[1] : 'step' ;
        const value  = event1 ? getValueAtTime() : 0 ;

        // Cancel values
        this.cancelScheduledValues(time);

        // Truncate curve
        if (curve === 'linear') {
            param.linearRampToValueAtTime(value, time);
        }
        else if (curve === 'exponential') {
            this.exponentialRampToValueAtTime(value, time);
        }
        else if (curve === 'step') {
            this.setValueAtTime(value, time);
        }
    }
}
