(function(window) {
	"use strict";

	var Observable  = window.Observable;
	var AudioObject = window.AudioObject;
	var assign      = Object.assign;
	var define      = Object.defineProperties;


	function Graph(audio, settings) {
		const graph = this;

		define(this, {
			plugins:    { value: Observable([]), enumerable: true },
			connectors: { value: Observable([]), enumerable: true }
		});
	}

	assign(Graph.prototype, {
		connect: function() {
			
		},

		disconnect: function() {
			
		}
	});

	window.Graph = Graph;
})(this);
