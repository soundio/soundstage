import { logGroup, logGroupEnd } from './print.js';
import { Privates } from '../../fn/module.js';
import NodeGraph from './node-graph.js';
import { assignSettings } from '../modules/assign-settings.js';
import { connect, disconnect } from '../modules/connect.js';

const DEBUG  = window.DEBUG;

const assign = Object.assign;
const define = Object.defineProperties;

// Declare the node graph
const graph = {
	nodes: [
		{ id: 'recorder',  type: 'recorder', data: { duration: 45 } },
        { id: 'dry',       type: 'gain',     data: { gain: 1 } },
        { id: 'output',    type: 'gain',     data: { gain: 1 } }
	],

	connections: [
        //{ source: 'this', target: 'dry' },
        //{ source: 'this', target: 'recorder' },
		{ source: 'dry',  target: 'output' }
	],

	output: 'output'
};

// Declare some useful defaults
var defaults = assign({
	gain: 1
}, voiceDefaults);

const properties = {
	"sources":         { enumerable: true, writable: true },
	"beatDuration":    { enumerable: true, writable: true },
    "recordStartTime": { enumerable: true, writable: true }
};

export default class Looper extends GainNode {
	constructor(context, settings, stage) {
		if (DEBUG) { logGroup(new.target === Looper ? 'Node' : 'mixin ', 'Looper'); }

		// Init gain node
        super(context, settings);

		// Privates
        const privates = Privates(this);

		// Set up the graph
        NodeGraph.call(this, context, graph);

		// Connect input (this) into graph
        GainNode.prototype.connect.call(this, this.get('recorder'));
        GainNode.prototype.connect.call(this, this.get('dry'));

		// Properties
		define(this, properties);









		// Update settings
		assignSettings(this, defaults, settings);

		if (DEBUG) { logGroupEnd(); }
	}
}

// Mix AudioObject prototype into MyObject prototype
assign(Looper.prototype, NodeGraph.prototype);

// Assign defaults
assign(Looper, {
	defaultControls: []
});
