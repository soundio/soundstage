
var Observable  = window.Observable;
var assign      = Object.assign;
var define      = Object.defineProperties;

export default function Graph(audio, settings) {
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
