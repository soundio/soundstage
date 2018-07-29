
import { Functor as Fn, compose, get, isDefined, map, postpad, slugify, toString } from '../../fn/fn.js';
import { createId } from './utilities.js';

var Collection = window.Collection;
var assign     = Object.assign;


// Sequence

export default function Sequence(data) {
    if (this === undefined || this === window) {
        // If this is undefined the constructor has been called without the
        // new keyword, or without a context applied. Do that now.
        return new Sequence(data);
    }

    function toSequence(d) {
        var sequence = new Sequence(d);
        sequence.id = isDefined(d.id) ? d.id : createId(data.sequences) ;
        return sequence;
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
                data && data.sequences ? data.sequences.map(toSequence) : [],
                { index: 'id' }
            )
        },

        events: {
            enumerable: true,
            writable:   true,
            value: data && data.events ?
                data.events.length ?
                    new Collection(data.events,	{ index: '0' }) :
                    // This supports Functors, for just now
                    data.events :
                new Collection([], { index: '0' })
        }
    });
}

Sequence.prototype.toJSON = function() {
    return assign({}, this, {
        sequences: this.sequences.length ? this.sequences : undefined,
        events: this.events.length ? this.events : undefined
    });
};

export function log(sequence) {
    console[arguments[1] === false ? 'groupCollapsed' : 'group']('Sequence '
        + (sequence.id !== undefined ? sequence.id : '')
        + (sequence.id !== undefined && sequence.name ? ', ' : '')
        + (sequence.name ? '"' + sequence.name + '" ' : '')
    );

    sequence.sequences.forEach(function(sequence) {
        log(sequence, false);
    });

    console.log('events –––––––––––––––––––––––––––––');
    console.log('beat      type      name      value');
    console.log(''
      + sequence.events.map(function(event) {
        return map(compose(postpad(' ', 8), toString), event).join('  ');
      }).join('\n')
    );

    console.groupEnd();
};
