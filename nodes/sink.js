
/**
Sink

```
const sink = stage.createNode('sink');
```

You can't automate params until their nodes have a route to
context.destination. That's just the way things work. A sink
allows you to attach to destination without outputting any
sound. There is one sink node per context – all 'instances'
of sink in all graphs for a context are actually the same
instance.
**/


const $sink = Symbol('soundstage-sink');

export default function Sink(context) {
    if (!context[$sink]) {
        context[$sink] = context.createGain();
        context[$sink].gain.value = 0;
        context[$sink].gain.setValueAtTime(0, 0);
        context[$sink].connect(context.destination);
    }

    return context[$sink];
}
