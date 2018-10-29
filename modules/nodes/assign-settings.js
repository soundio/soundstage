import { log, logGroup, logGroupEnd } from '../utilities/print.js';
import { automate } from '../automate.js';

const DEBUG = true;

function assignSetting(node, key, value) {
    // Are we trying to get a value from an AudioParam? No no no.
    if (value && value.setValueAtTime) {
        return;
        //throw new Error('Cannot set ' + key + ' from param on node ' + JSON.stringify(node));
    }

    // Does it quack like an AudioParam?
    if (node[key] && node[key].setValueAtTime) {
        if (DEBUG) { log('param', key + ' =', value); }
        automate(node[key], node.context.currentTime, 'step', value, null, key);
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

export function assignSettings(node, defaults, settings) {
    if (DEBUG) { logGroup('assign', node.constructor.name, (settings ? Object.keys(settings).join(', ') : '')); }
    if (settings) {
        //if (DEBUG) { console.log('Assigning settings', settings) }
        for (let key in settings) {
            if (settings[key] && settings[key].setValueAtTime) { continue; }
    		// We want to assign only when a property has been declared, as we may
    		// pass composite options (options for more than one node) into this.
    		if (!node.hasOwnProperty(key)) { continue; }
            assignSetting(node, key, settings[key]);
    	}
    }

    //if (DEBUG) { console.log('Assigning defaults', defaults) }
    for (let key in defaults) {
		// If we have already set this, or it's not settable, move on
		if (
            (settings && key in settings && !(settings[key] && settings[key].setValueAtTime))
            || !node.hasOwnProperty(key)
        ) { continue; }

        assignSetting(node, key, defaults[key]);
	}
    if (DEBUG) { logGroupEnd(); }
}
