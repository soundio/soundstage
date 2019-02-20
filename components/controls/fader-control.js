
import { cache, choose, id, Observer, Target, observe, set, overload, todB, toLevel, limit, nothing } from '../../../fn/fn.js';
import { isAudioParam, getValueAtTime, automate, transforms, parseValue } from '../../soundstage.js';
import Sparky, { mount } from '../../../sparky/sparky.js';

const DEBUG = false;

const assign = Object.assign;

const eventOptions = {
  // The event bubbles (false by default)
  // https://developer.mozilla.org/en-US/docs/Web/API/Event/Event
  bubbles: true,

  // The event may be cancelled (false by default)
  // https://developer.mozilla.org/en-US/docs/Web/API/Event/Event
  cancelable: true

  // Trigger listeners outside of a shadow root (false by default)
  // https://developer.mozilla.org/en-US/docs/Web/API/Event/composed
  //composed: false
};

const attributes = ['value', 'min', 'max'];

const fadeDuration = 0.003;

const inputEvent = new CustomEvent('input', eventOptions);


function outputMilliKilo(unit, value) {
    return value < 0.001 ? (value * 1000).toFixed(2) :
        value < 1 ? (value * 1000).toPrecision(3) :
        value > 1000 ? (value / 1000).toPrecision(3) :
        value.toPrecision(3) ;
}

const transformOutput = overload(id, {
    pan: function(unit, value) {
        return value === -1 ? 'left' :
            value === 0 ? 'centre' :
            value === 1 ? 'right' :
            value.toFixed(2) ;
    },

    dB: function(unit, value) {
        const db = todB(value) ;
        return isFinite(db) ?
            db < -1 ? db.toPrecision(3) :
                db.toFixed(2) :
            // Allow Infinity to pass through as it is already gracefully
            // rendered by Sparky
            db ;
    },

    Hz: function(unit, value) {
        return value < 1 ? value.toFixed(2) :
            value > 1000 ? (value / 1000).toPrecision(3) :
            value.toPrecision(3) ;
    },

    step: function(unit, value) {
        // detune value is in cents
        return value < 0 ?
            ('♭' + (-value / 100).toFixed(2)) :
            ('♯' + (value / 100).toFixed(2)) ;
    },

    s: outputMilliKilo,

    default: function(unit, value) {
        return value < 0.1 ? value.toFixed(3) :
            value.toPrecision(3) ;
    }
});

function tickMilliKilo(unit, value) {
    return value < 1 ? (value * 1000).toFixed(0) :
        value < 10 ? value.toFixed(1) :
        value < 1000 ? value.toPrecision(1) :
        (value / 1000).toPrecision(1) ;
}

const transformTick = overload(id, {
    pan: function(unit, value) {
        return value === -1 ? 'left' :
            value === 0 ? 'centre' :
            value === 1 ? 'right' :
            value.toFixed(1) ;
    },

    dB: function(unit, value) {
        const db = todB(value) ;
        return isFinite(db) ?
            db.toFixed(0) :
            db ;
    },

    Hz: function(unit, value) {
        return value < 10 ? value.toFixed(1) :
            value < 1000 ? value.toFixed(0) :
            (value / 1000).toFixed(0) ;
    },

    step: function(unit, value) {
        // detune value is in cents
        return (value / 100).toFixed(0);
    },

    s: tickMilliKilo,

    default: function(unit, value) {
        return value.toPrecision(2) ;
    }
});

function unitMilliKilo(unit, value) {
    return value < 1 ? 'm' + unit :
        value > 1000 ? 'k' + unit :
        unit ;
}

const transformUnit = overload(id, {
    pan: function(unit, value) {
        return '' ;
    },

    dB: id,

    Hz: function(unit, value) {
        return value > 1000 ? 'k' + unit :
            unit ;
    },

    step: id,

    s: unitMilliKilo,

    default: function(unit, value) {
        return unit || '';
    }
});

const evaluate = (string) => {
    const value  = parseFloat(string);
    const tokens = /(-?[\d.]+)(?:(dB)|(m|k)?(\w+))\s*$/.exec(string);

    if (!tokens) { return value };

    return tokens[2] === 'dB' ? toLevel(value) :
        tokens[3] === 'm' ? value / 1000 :
        tokens[3] === 'k' ? value * 1000 :
        value ;
}

const settings = {
    mount: function(node, options) {
        // Does the node have Sparkyfiable attributes?
        const attrFn      = node.getAttribute(options.attributeFn);
        const attrInclude = node.getAttribute(options.attributeInclude);

        if (!attrFn && !attrInclude) { return; }

        options.fn = attrFn;
        options.include = attrInclude;
        var sparky = Sparky(node, options);

        // This is just some help for logging
        sparky.label = 'Sparky (child)';

        // Return a writeable stream. A write stream
        // must have the methods .push() and .stop()
        // A sparky is a write stream.
        return sparky;
    },

    attributePrefix:  ':',
    attributeFn:      'fn',
    attributeInclude: 'include'
};

const setProperty = choose({
    min:   (node, value) => {
        node.min = evaluate(value);
    },

    max:   (node, value) => {
        node.max = evaluate(value)
    },

    value: (node, value) => {
        node.value = evaluate(value)
    },
});

customElements.define('fader-control',
  class extends HTMLElement {
      static get observedAttributes() {
          return attributes;
      }

      constructor() {
          super();

          const min       = evaluate(this.getAttribute('min'));
          const max       = evaluate(this.getAttribute('max'));
          const unit      = this.getAttribute('unit') || '';
          const transform = this.getAttribute('transform') || 'linear';

          const data      = {
              inputValue:  0,
              outputValue: '',
              unit:        unit,
              prefix:      this.getAttribute('prefix') || '',
              path:        './components/controls'
          };

          const ticks = this.getAttribute('ticks');

          data.ticks = ticks ?
              ticks
              .split(/\s+/)
              .map(evaluate)
              .map((value) => {
                  const outputValue = transformTick(unit, value);

                  // Freeze to tell mounter it's immutable, prevents
                  // unnecessary observing
                  return Object.freeze({
                      root:        data,
                      value:       value,
                      tickValue:   transforms[transform || 'linear'].ix(value, min, max),
                      outputValue: outputValue
                  });
              }) :
              nothing ;

          const scope = Observer(data);

          var value;

          // A flag to tell us what is currently in control of changes
          let changing = undefined;

          this.type = 'number';
          this.scope = scope;

          Object.defineProperty(this, 'value', {
              get: function() {
                  return value;
              },

              set: function(val) {
                  //val = limit(this.min, this.max, val);
                  if (val === value) { return; }
                  value = val;
                  changing = changing || 'value';
                  scope.outputValue = transformOutput(unit, value);
                  scope.unit        = transformUnit(unit, value);

                  if (changing !== 'inputValue') {
                      scope.inputValue = transforms[transform || 'linear'].ix(value, min, max);
                  }

                  changing = changing === 'value' ? undefined : changing ;
              }
          });

          // Value may be controlled be the input
          observe('inputValue', (inputValue) => {
              changing = changing || 'inputValue';

              if (changing !== 'value') {
                  const value = transforms[transform || 'linear'].tx(inputValue, min, max) ;
                  this.value = value;
              }

              changing = changing === 'inputValue' ? undefined : changing ;
          }, scope);

          const content = document
          .getElementById('fader-control-template')
          .content
          .cloneNode(true);

          const renderer = mount(content, settings);
          renderer.push(scope);

          const shadow = this
          .attachShadow({mode: 'open'})
          .appendChild(content);
      }

      attributeChangedCallback(attribute, old, value) {
          if (value === old) { return; }
          setProperty(attribute, this, value);
      }

      connectedCallback() {
          if (DEBUG) { console.log('<fader-control> added to document', this); }

          // Pick up input events and update scope - Sparky wont do this
          // currently as events are delegated to document, and these are in
          // a shadow DOM.
          this.shadowRoot.addEventListener('input', (e) => {
              this.scope.inputValue = parseFloat(e.target.value);

              if (e.target.checked) {
                  // Uncheck tick radio so that it may be chosen again
                  // Should not be necessary - target should become
                  // unchecked if value moves away
                  //e.target.checked = false;

                  // Focus the input
                  this.shadowRoot
                  .getElementById('input')
                  .focus();
              }

              // Input events are suppsed to traverse the shadow boundary
              // but they do not. At least not in Chrome 2019
              if (!e.composed) {
                  this.dispatchEvent(inputEvent);
              }
          });
      }

      disconnectedCallback() {
          console.log('Element removed from page.');
      }
});
