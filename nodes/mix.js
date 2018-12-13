
const graph = {
    nodes: [
		{ id: 'pan', type: 'pan', data: { pan: 0 }},
	],

	connections: [
        { source: 'this', target: 'pan' }
    ],

	output: 'pan'
};

export default class Mix extends GainNode {
    constructor(context, options) {
        // Set up the node graph
    	NodeGraph.call(this, context, graph);

        // Init gain node
        super(context, constantOptions);
    }
}
