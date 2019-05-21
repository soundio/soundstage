
import { get, Privates }  from '../../fn/module.js';
import { print }  from '../modules/utilities/print.js';

const assign    = Object.assign;
const define    = Object.defineProperties;

function Entry(graph, type, node) {
    this.type = type;
    this.node = node;

    define(this, {
        graph: { value: graph }
    });
}

assign(Entry.prototype, {
    remove: function() {
        const nodes = this.graph.nodes;
        const i = nodes.indexOf(this);

        const prev = nodes[i - 1] ?
            nodes[i - 1].node :
            this.graph ;

        const next = nodes[i + 1] ?
            nodes[i + 1].node :
            this.graph.get('output') ;

        prev.disconnect();
        prev.connect(next);
        this.node.disconnect();
        nodes.splice(i, 1);

        return this;
    }
});

export default function Chain(context, data, transport, constructors) {
	const chain       = this;
	const privates    = Privates(this);
    const nodes       = [];

	privates.requests = constructors;
	privates.transport = transport;

	define(this, {
        nodes: { enumerable: true, value: nodes }
    });

    // Load nodes
	if (data.nodes) {
        data.nodes.reduce(function(graph, data) {
            const node = new constructors[data.type](graph.context, data.node, transport);
            nodes.push(new Entry(graph, data.type, node));
            return graph;
        }, this);
    }

    // Chain the connection of sources, reducing to the last one
    // and connecting that to output
    this.nodes
    .map(get('node'))
    .reduce((current, next) => {
        AudioNode.prototype.connect.call(current, next);
        return next;
    }, this)
    .connect(this.get('output'));

    print('chain', chain.nodes.length + ' nodes');

	//this.done = promise.then.bind(promise);
}

assign(Chain.prototype, {
	createNode: function(type, data) {
		const chain     = this;
		const privates  = Privates(this);
		const constructors  = privates.constructors;
		const transport = privates.transport;

        const node = new constructors[data.type](chain.context, data.node, transport);
        const last = chain.nodes.length ?
            chain.nodes[chain.nodes.length - 1] :
            chain ;

        AudioNode.prototype.connect.call(node, this.get('output'));
        AudioNode.prototype.disconnect.call(last);
        AudioNode.prototype.connect.call(last, node);

        const entry = new Entry(chain, type, node);
        this.nodes.push(entry);

        return node;
	}
});
