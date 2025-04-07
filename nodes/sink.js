
/**
Sink

```
const sink = stage.objects.create('sink');
```

You can't automate params until their nodes are connected, via whatever
connections, to `context.destination`. That's just the way things work. A sink
allows you to attach to destination without outputting sound. There is one sink
node per context – all 'instances' of sink for a given context are actually the
same instance.
**/


const $sink = Symbol('sink');

export default function Sink(context) {
    if (!context[$sink]) {
        // SInk is a gain node with no gain
        const sink = context[$sink] = context.createGain();
        sink.gain.value = 0;
        sink.gain.setValueAtTime(0, 0);
        // Make it impossible to set gain
        delete sink.gain;
        sink.connect(context.destination);
    }

    return context[$sink];
}
