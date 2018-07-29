
import { curry, noop, nothing } from '../../fn/fn.js';
import Track from './track.js';

var Track       = window.Track;

var assign      = Object.assign;

//var privates    = Symbol('track');

// Todo: Copied from soundstage.js - find some common place to put
// this?
//var findIn = curry(function(objects, id) {
//	var hasId = compose(is(id), getId);
//	return find(hasId, objects);
//});

export default function Loop(audio, settings, stage) {
	settings = settings || nothing;

	// Set up loop as track
	Track.apply(this, arguments);
}

Loop.prototype = Object.create(Track.prototype);

assign(Loop.prototype, {
	start: noop,
	stop: noop
});
