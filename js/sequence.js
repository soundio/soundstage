(function(window) {
	"use strict";

	var Fn         = window.Fn;
	var Collection = window.Collection;
	var slugify    = Fn.slugify;

	// Sequence

	function Sequence(data) {
		if (this === undefined || this === window) {
			// If this is undefined the constructor has been called without the
			// new keyword, or without a context applied. Do that now.
			return new Sequence(data);
		}

		Object.defineProperties(this, {
			name: {
				enumerable:   true,
				configurable: true,
				writable:     true,
				value: data && data.name ?
					data.name + '' :
					''
			},

			slug: {
				enumerable:   true,
				configurable: true,
				writable:     true,
				value: data && data.slug ? data.slug + '' :
					data.name ? slugify(data.name) :
					''
			},

			sequences: {
				enumerable: true,
				value: new Collection(
					data && data.sequences ? data.sequences.map(Sequence) : [],
					{ index: 'slug' }
				)
			},

			events: {
				enumerable: true,
				writable:   true,
				value: data && data.events ?
					data.events.length ?
						new Collection(data.events,	{}) :
						data.events :
					new Collection([], {})
			}
		});
	}

	Sequence.prototype.toJSON = function() {
		return assign({}, this, {
			sequences: this.sequences.length ? this.sequences : undefined,
			events: this.events.length ? this.events : undefined
		});
	};

	window.Sequence = Sequence;
})(this);