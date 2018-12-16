
const define = Object.defineProperties;
const seal   = Object.seal;

const properties = {
    graph: { writable: true }
};

export default function Node(graph, type, id, object) {
    define(this, properties);

    this.id    = id;
    this.type  = type;
    this.data  = object;

    seal(this);
}
