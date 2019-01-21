import { cache, id, Observer, Target, observe, set, overload, todB } from '../../../../fn/fn.js';
import Sparky, { functions } from '../../../../sparky/sparky.js';
import { isAudioParam, getValueAtTime, automate, transforms, parseValue } from '../../../soundstage.js';

let faderId = 0;

const fadeDuration = 0.003;

const transformOutput = overload(id, {
    pan: function(unit, value) {
        return value === 0 ? '0' :
            value.toFixed(2) ;
    },

    dB: function(unit, value) {
        value = todB(value) ;
        return isFinite(value) ?
            value < -1 ? value.toPrecision(3) :
                value.toFixed(2) :
            // Allow Infinity to pass through as it is already gracefully
            // rendered by Sparky
            value ;
    },

    Hz: function(unit, value) {
        return value < 1 ? value.toFixed(2) :
            value > 1000 ? (value / 1000).toPrecision(3) :
            value.toPrecision(3) ;
    },

    default: function(unit, value) {
        return value < 1 ? (value * 1000).toPrecision(3) :
            value > 1000 ? (value / 1000).toPrecision(3) :
            value.toPrecision(3) ;
    }
});

const transformUnit = overload(id, {
    pan: function(unit, value) {
        return value < 0 ? 'left' :
            value > 0 ? 'right' :
            'center' ;
    },

    dB: id,

    Hz: function(unit, value) {
        return value > 1000 ? 'k' + unit :
            unit ;
    },

    default: function(unit, value) {
        return value < 1 ? 'm' + unit :
            value > 1000 ? 'k' + unit :
            unit ;
    }
});

const toFaderScope = function(module, name, get, set, unit, min, max, transform, prefix) {
    const scope = Observer({
        id:          'fader-' + (faderId++),
        name:        name,
        label:       name || '',
        value:       get(),
        inputValue:  0,
        outputValue: 0,
        min:         min,
        max:         max,
        step:        'any',
        prefix:      prefix,
        unit:        unit || '',
        transform:   transform || '',
        ticks:       [0, 25, 50, 75, 100]
    });

    // A flag to tell us what is currently in control of changes
    let changing = undefined;

    // Value may be controlled via the param
    observe(name, () => {
        changing = changing || 'param';
        scope.value = get();
        changing = changing === 'param' ? undefined : changing ;
    }, module);

    // inputValue and outputValue are dependent on value
    observe('value', (value) => {
        changing = changing || 'value';
        scope.outputValue = transformOutput(unit, value);
        scope.unit        = transformUnit(unit, value);

        if (changing !== 'inputValue') {
            scope.inputValue = transforms[scope.transform || 'linear'].ix(value, scope.min, scope.max);
        }

        changing = changing === 'value' ? undefined : changing ;
    }, scope);

    // Value may be controlled be the input
    observe('inputValue', (value) => {
        changing = changing || 'inputValue';
        value = transforms[scope.transform || 'linear'].tx(value, scope.min, scope.max) ;

        if (changing !== 'param') { set(value); }
        if (changing !== 'value') { scope.value = value; }

        changing = changing === 'inputValue' ? undefined : changing ;
    }, scope);

    return scope;
};

functions.fader = function(node, scopes, params) {
    const name = params[0];

    const min = typeof params[2] === 'number' ?
        params[2] :
        parseValue(params[2]) ;

    const max = typeof params[3] === 'number' ?
        params[3] :
        parseValue(params[3]) ;

    return scopes.map((scope) => {
        // Make sure we're dealing with the param and not it's
        // observer proxy, else the param's method's don't work
        const module  = Target(scope);
        const context = module.context;
        const param   = module[name];
        const isParam = isAudioParam(param);

        const get = isParam ?
            (value) => getValueAtTime(module[name], value, module.context.currentTime) :
            (value) => module[name] ;

        const set = isParam ?
            // param, time, curve, value, duration
            (value) => {
                automate(param, context.currentTime, 'step', value);
                automate(param, context.currentTime + fadeDuration, 'linear', value);
            } :
            (value) => scope[name] = value ;

        return toFaderScope(module, name, get, set, params[1], min, max, params[4], params[5]);
    });
};
