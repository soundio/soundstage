
//import "components/midi/sparky-functions.js";
//import "components/controls/sparky-functions.js";
//import "components/param/param.js";
//import "components/nodes/envelope.js";

/*
element(name, options)

Registers a custom element and returns its constructor. This function aims to
render the API for creating custom elements a little more... sane.

- name: 'name'     Custom element tag name
- options: {
       extends:    Name of tag to extend to make the element a custom built-in
       mode:       'open' or 'closed', defaults to 'closed'
       template:   String or template node or id used to create a shadow DOM
       attributes: An object of handler functions for attribute changes
       properties: An object of property definitions for the element prototype
       construct:  Lifecycle handler called during element construction
       connect:    Lifecycle handler called when element added to DOM
       load:       Lifecycle handler called when stylesheets load
       disconnect: Lifecycle handler called when element removed from DOM
       enable:     Lifecycle handler called when form element enabled
       disable:    Lifecycle handler called when form element disabled
       reset:      Lifecycle handler called when form element reset
       restore:    Lifecycle handler called when form element restored
  }
*/

import '../../bolt/elements/range-control.js';
import '../../bolt/elements/rotary-control.js';
import '../../bolt/elements/envelope-control.js';
import './sparky/param.js';

import Privates from '../../fn/modules/privates.js';
import element  from '../../dom/modules/element.js';
import Sparky, { config } from '../../sparky/module.js';

config.parse['range-control'] = {
    attributes: ["name", "min", "max", "step"],
    booleans: ["disabled", "required"]
};

export default element('soundstage-instrument', {
    template: '/soundstage/elements/soundstage-instrument.html#soundstage-instrument',
    mode: 'closed',

    properties: {
        audioNode: {
            set: function(node) {
                const privates = Privates(this);
                privates.scope = node;
                privates.sparky.push(node);
            },

            get: function() {
                const privates = Privates(this);
                return privates.scope;
            }
        }
    },

    construct: function(element, shadow) {
        const privates = Privates(element);
        privates.sparky = Sparky(shadow);
    },

    connect: function(element, shadow) {
        const privates = Privates(element);
        privates.sparky.push(privates.scope || null);
    },

    disconnect: function(element, shadow) {
        const privates = Privates(element);
        privates.sparky.push(null);
    }
});
