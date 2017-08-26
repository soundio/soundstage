(function(window) {
	"use strict";
	
	var AudioObject = window.AudioObject;
	var assign      = Object.assign;

	function Graph() {
		this.plugins  = [];
		this.connects = [];
	}

	assign(Graph.prototype, {
		
	});

	window.Graph = Graph;
})(this);
