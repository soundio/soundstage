
/*
.name()

Name of the soundstage insance.
*/

/*
.events()

An array of events.
*/

/*
.sequences()

An array of sequences.
*/

import { Functor as Fn, compose, get, isDefined, map, postpad, slugify, toString } from '../../fn/fn.js';
import { print }    from './print.js';
import { createId } from './utilities.js';


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
            value: data && data.sequences ?
                data.sequences.map(toSequence) :
                []
        },

        events: {
            enumerable: true,
            writable:   true,
            value: data && data.events ?
                data.events :
                []
        }
    });

    print('Sequence set up with ' + this.events.length + ' events');
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
