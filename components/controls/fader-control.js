
import { cache, id, Observer, Target, observe, set, overload, todB, toLevel, limit } from '../../../fn/fn.js';
import { isAudioParam, getValueAtTime, automate, transforms, parseValue } from '../../soundstage.js';
import Sparky, { mount } from '../../../sparky/sparky.js';

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

const transformOutput = overload(id, {
    lcr: function(unit, value) {
        return value === 0 ?
            '0' :
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

    semitones: function(unit, value) {
        // detune value is in cents
        return (value / 100).toFixed(2);
    },

    default: function(unit, value) {
        return value < 1 ? (value * 1000).toPrecision(3) :
            value > 1000 ? (value / 1000).toPrecision(3) :
            value.toPrecision(3) ;
    }
});

const transformTick = overload(id, {
    lcr: function(unit, value) {
        return value === 0 ?
            '0' :
            value.toFixed(1) ;
    },

    dB: function(unit, value) {
        const db = todB(value) ;
        return isFinite(db) ?
            db.toFixed(0) :
            db ;
    },

    Hz: function(unit, value) {
        return value < 1 ? value.toFixed(2) :
            value < 1000 ? value.toPrecision(3) :
            (value / 1000).toPrecision(3) ;
    },

    semitones: function(unit, value) {
        // detune value is in cents
        return (value / 100).toFixed(0);
    },

    default: function(unit, value) {
        return value < 1 ? (value * 1000).toPrecision(1) :
            value < 1000 ? value.toPrecision(1) :
            (value / 1000).toPrecision(1) ;
    }
});

const transformUnit = overload(id, {
    lcr: function(unit, value) {
        return value < 0 ? 'left' :
            value > 0 ? 'right' :
            'center' ;
    },

    dB: id,

    Hz: function(unit, value) {
        return value > 1000 ? 'k' + unit :
            unit ;
    },

    semitones: id,

    default: function(unit, value) {
        return value < 1 ? 'm' + unit :
            value > 1000 ? 'k' + unit :
            unit ;
    }
});

const evaluate = (string) => {
    const value  = parseFloat(string);
    const tokens = /(ms|dB|kHz)\s*$/.exec(string);
    if (!tokens) { return value };

    return tokens[1] === 'dB' ? toLevel(value) :
        tokens[1] === 'ms' ? value / 1000 :
        tokens[1] === 'kHz' ? value * 1000 :
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

        // This is just some help for logging mounted tags
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


customElements.define('fader-control',
  class extends HTMLElement {
      static get observedAttributes() {
          return attributes;
      }

      constructor() {
          super();

          const unit      = this.getAttribute('unit') || '';
          const transform = this.getAttribute('transform') || 'linear';
          const scope = Observer({
              inputValue:  0,
              outputValue: '',
              prefix: this.getAttribute('prefix') || '',
              unit:   '',
              path:   './components/controls'
          });

          this.type = 'number';
          const min = this.min = evaluate(this.getAttribute('min'));
          const max = this.max = evaluate(this.getAttribute('max'));
          var value;

          this.scope = scope;

          scope.ticks = (this.getAttribute('ticks') || '')
              .split(/\s+/)
              .map(Number)
              .map((value) => {
                  const outputValue = transformTick(unit, value);
                  console.log(transform)
                  return Object.freeze({
                      value:       value,
                      inputValue:  transforms[transform || 'linear'].ix(value, min, max),
                      outputValue: outputValue
                  });
              });

          // A flag to tell us what is currently in control of changes
          let changing = undefined;

          Object.defineProperty(this, 'value', {
              get: function() {
                  return value;
              },

              set: function(val) {
                  val = limit(min, max, val);
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
          if (value === this[attribute]) { return; }
          Observer(this)[attribute] = parseFloat(value);
      }

      connectedCallback() {
          console.log('Element added to page.');

          const inputEvent = new CustomEvent('input', eventOptions);

          // Pick up input events and update scope - Sparky wont do this
          // currently as events are delegated to document, and these are in
          // a shadow DOM.
          this.shadowRoot.addEventListener('input', (e) => {
              this.scope.inputValue = parseFloat(e.target.value);

              if (e.target.checked) {
                  // Uncheck tick radio so that it may be chosen again
                  e.target.checked = false;
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
