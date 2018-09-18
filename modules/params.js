
// Polyfill cancelAndHoldAtTime
//
// Todo - this polyfill is not finished, you need to implement the algorithm
// here:
//
// https://www.w3.org/TR/webaudio/#dom-audioparam-cancelandholdattime

if (!AudioParam.prototype.cancelAndHoldAtTime) {
    AudioParam.prototype.cancelAndHoldAtTime = function cancelAndHoldAtTime(time) {
    	const param  = this;
        const events = getParamEvents(param);
    	const tValue = getValueAtTime(events, time);

        while (events[--n] && events[n][0] >= time);

    	const event1 = events[n];
    	const event2 = events[n + 1];
    	const tCurve = event2[2];

    	console.log(event1, event2, tValue);
    	console.log(longnames[curve], value, time, duration);

        param.cancelScheduledValues(time);
    	param[longnames[tCurve]](tValue, time);
    }
}


export function getParam(name, node) {
    // Support Audio Objects, for now
    return isAudioObject(node) ?
        getObjectParam(node, name) :
        node[name] ;
}

function getParamEvents(param) {
	// Todo: I would love to use a WeakMap to store data about AudioParams,
	// but FF refuses to allow AudioParams as WeakMap keys. So... lets use
	// an expando *sigh*.
	return param.automationEvents || (
        param.automationEvents = [{ 0: 0, 1: param.value, 2: 'step' }]
    );
}

function automateParamEvents(param, events, time, value, curve, duration) {
	curve = curve || "step";

	var n = events.length;

	while (events[--n] && events[n][0] >= time);

	var event1 = events[n];
	var event2 = events[n + 1];

	// Swap exponential to- or from- 0 values for step
	// curves, which is what they tend towards for low
	// values. This does not deal with -ve values,
	// however. It probably should.
	if (curve === "exponential") {
		if (value < minExponentialValue) {
			time = event1 && event1[0] || 0 ;
			curve = "step";
		}
		else if (event1 && event1[1] < minExponentialValue) {
			curve = "step";
		}
	}

	// Schedule the param event - curve is shorthand for one of the
	// automation methods

	//param.cancelAndHoldAtTime(time);
	param[longnames[curve]](value, time, duration);

	// Keep events organised as AudioParams do
	var event = [time, value, curve, duration];

	// If the new event is at the end of the events list
	if (!event2) {
		events.push(event);
		return;
	}

	// If the new event is at the same time as an
	// existing event spool forward through events at
	// this time and if an event with the same curve is
	// found, replace it
	if (event2[0] === time) {
		while (events[++n] && events[n][0] === time) {
			if (events[n][2] === curve) {
				events.splice(n + 1, 1, event);
				return;
			}
		}

		--n;
	}

	// The new event is between event1 and event2
	events.splice(n + 1, 0, event);
}

function automateParam(param, time, value, curve, duration) {
	var events = getParamEvents(param);
	automateParamEvents(param, events, time, value, curve, duration);
}

export function automate(param, time, value, curve, duration) {
    time = curve === "linear" || curve === "exponential" ?
        time + duration :
        time ;

    return automateParam(param, time, value, curve === "decay" ? "target" : curve, curve === "decay" && duration || undefined);
}

const longnames = {
	"step":        "setValueAtTime",
	"linear":      "linearRampToValueAtTime",
	"exponential": "exponentialRampToValueAtTime",
	"target":      "setTargetAtTime"
};

const curves = {
	// Automation curves as described at:
	// http://webaudio.github.io/web-audio-api/#h4_methods-3

	'step': function stepValueAtTime(value1, value2, time1, time2, time) {
		return time < time2 ? value1 : value2 ;
	},

	'linear': function linearValueAtTime(value1, value2, time1, time2, time) {
		return value1 + (value2 - value1) * (time - time1) / (time2 - time1) ;
	},

	'exponential': function exponentialValueAtTime(value1, value2, time1, time2, time) {
		return value1 * Math.pow(value2 / value1, (time - time1) / (time2 - time1)) ;
	},

	'target': function targetEventsValueAtTime(value1, value2, time1, time2, time, duration) {
		return time < time2 ?
			value1 :
			value2 + (value1 - value2) * Math.pow(Math.E, -(time - time2) / duration);
	},

	'decay': function targetEventsValueAtTime(value1, value2, time1, time2, time, duration) {
		return time < time2 ?
			value1 :
			value2 + (value1 - value2) * Math.pow(Math.E, -(time - time2) / duration);
	}
};

function getEventsValueBetweenEvents(event1, event2, time) {
	var curve  = event2[2];
	return curves[curve](event1[1], event2[1], event1[0], event2[0], time, event1[3]);
}

function getEventsValueAtEvent(events, n, time) {
	var event = events[n];

	return event[2] === "target" ?
		curves.target(getEventsValueAtEvent(events, n - 1, event[0]), event[1], 0, event[0], time, event[3]) :
		event[1] ;
}

function getEventsValueAtTime(events, time) {
	var n = events.length;

	while (events[--n] && events[n][0] >= time);

	var event1 = events[n];
	var event2 = events[n + 1];

	if (!event2) {
		return getEventsValueAtEvent(events, n, time);
	}

	if (event2[0] === time) {
		// Spool through to find last event at this time
		while (events[++n] && events[n][0] === time);
		return getEventsValueAtEvent(events, --n, time) ;
	}

	if (time < event2[0]) {
		return event2[2] === "linear" || event2[2] === "exponential" ?
			getEventsValueBetweenEvents(event1, event2, time) :
			getEventsValueAtEvent(events, n, time) ;
	}
}

export function getValueAtTime(param, time) {
	var events = param['audio-object-events'];

	if (!events || events.length === 0) {
		return param.value;
	}

	return getEventsValueAtTime(events, time);
}
