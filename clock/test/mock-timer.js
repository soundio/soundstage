(function(window) {
	"use strict";

	var Fn      = window.Fn;
	var toArray = Fn.toArray;

	function MockTimer() {
		this._fns = [];
		this.currentTime = 0;
	}

	MockTimer.prototype.request = function(fn) {
		this._fns.push(fn);
	};

	MockTimer.prototype.cancel  = function(fn) {
		var n = this._fns.length;
		while (n--) {
			if (fn === this._fns[n]) {
				this._fns.splice(n, 1);
			}
		}
	};

	MockTimer.prototype.trigger = function(time) {
		var fn;
		var fns = this._fns;
		this._fns = [];
		while ((fn = fns.shift())) {
			fn(time);
		}
		this.currentTime = time;
	};

	window.MockTimer = MockTimer;

})(this);