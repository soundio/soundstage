
import nothing       from '../../../../fn/modules/nothing.js';
import overload      from '../../../../fn/modules/overload.js';
import remove        from '../../../../fn/modules/remove.js';


/**
Collection()
Turns a stream into a collection of objects being piped to, giving it '.length',
'.find()' and '.findAll()', and JSONifying to an array.
**/

const assign = Object.assign;
const define = Object.defineProperties;
const answer = [];

export default function Collection() {}

define(Collection.prototype, {
    length: {
        get: function() {
            let n = -1;
            while (this[++n]);
            return n;
        }
    }
});


function toTypeCheck(object) {
    const t = typeof object;

    // Debug unsupported types
    const type = t === 'object' ? object.type : object ;
    if (!(this.constructor.types && (this.constructor.types[type] || this.constructor.types.default))) {
        throw new Error(this.constructor.name + ': cannot .create() type "' + type
            + '", supported types: '
            + (this.constructor.types ?
                '"' + Object.keys(this.constructor.types).join('", "') + '"' :
                'none'
            )
        );
    }

    return t;
}

assign(Collection.prototype, {
    create: overload(window.DEBUG ? toTypeCheck : (object) => typeof object, {
        object: function(data) {
            const Constructor = this.constructor.types[data.type] ||
                this.constructor.types.default ;
            return this.pipe(Constructor.from(data));
        },

        string: function(type, ...params) {
            const Constructor = this.constructor.types[type] ||
                this.constructor.types.default ;
            return this.pipe(new Constructor(...params));
        }
    }),

    find: function(fn) {
        let n = -1, node;
        while (node = this[++n]) {
            if (fn(node)) {
                return node;
            }

            if (node.find) {
                const object = node.find(fn);
                if (object) {
                    return object;
                }
            }
        }
    },

    findAll: function(fn) {
        let n = -1, node;
        answer.length = 0;
        while (node = this[++n]) {
            if (fn(node)) {
                answer.push(node);
            }

            if (node.findAll) {
                answer.push.apply(answer, node.findAll(fn));
            }
        }

        return answer;
    },

    toJSON: function() {
        return Array.from(this);
    }
});
