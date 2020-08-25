import { log, logGroup, logGroupEnd } from './print.js';
import { automato__, getAutomation } from './automate.js';

const DEBUG = false;

function assignSetting(node, key, value, notify) {
    // Are we trying to get a value from an AudioParam? No no no.
    if (value && value.setValueAtTime) {
        return;
        //throw new Error('Cannot set ' + key + ' from param on node ' + JSON.stringify(node));
    }

    // Does it quack like an AudioParam?
    if (node[key] && node[key].setValueAtTime) {
        if (DEBUG) { log('param', key + ':', value); }

        // If we are assigning settings we can assume we are in a state to
        // purge old automation events. Keep an eye, might be a bit aggressive
        getAutomation(node[key]).length = 0;

        // node, name, time, curve, value, duration, notify, context
        automato__(node, key, node.context.currentTime, 'step', value, null, notify);
    }

    // Or an AudioNode?
    else if (node[key] && node[key].connect) {
        assignSettings(node[key], value);
    }

    // Then set it as a property
    else {
        if (DEBUG) { log('prop', key + ' =', value); }
        node[key] = value;
    }
}

export function assignSettings(node, defaults, settings, ignored) {
    if (DEBUG) { logGroup('assign', node.constructor.name, (settings ? Object.keys(settings).join(', ') : '')); }

    const keys = {};

    if (settings) {
        for (let key in settings) {
            // Ignore ignored key
            if (ignored && ignored.indexOf(key) > -1) { continue; }

            // Ignore AudioParams coming from a parent node
            if (settings[key] && settings[key].setValueAtTime) { continue; }

            // We want to assign only when a property has been declared, as we may
            // pass composite options (options for more than one node) into this.
            if (node.hasOwnProperty(key) && settings[key] !== undefined) {
                assignSetting(node, key, settings[key]);
                keys[key] = true;
            }
        }
    }

    for (let key in defaults) {
        // Ignore ignored key
        if (ignored && ignored.indexOf(key) > -1) { continue; }

        // If we have already set this, or it's not settable, move on
        if (!keys[key]) {
            assignSetting(node, key, defaults[key]);
        }
    }

    if (DEBUG) { logGroupEnd(); }
}

export function assignSettingz__(node, settings, ignored) {
    if (DEBUG) { logGroup('assign', node.constructor.name, (settings ? Object.keys(settings).join(', ') : '')); }

    var key;

    for (key in settings) {
        // Ignore ignored key
        if (ignored && ignored.indexOf(key) > -1) { continue; }

        // Ignore AudioParams coming from a parent node
        if (settings[key] && settings[key].setValueAtTime) { continue; }

        // We want to assign only when a property has been declared, as we may
        // pass composite options (options for more than one node) into this.
        if (node.hasOwnProperty(key) && settings[key] !== undefined) {
            assignSetting(node, key, settings[key]);
        }
    }

    if (DEBUG) { logGroupEnd(); }
}
