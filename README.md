# Soundstage

Soundstage is an object model for Web Audio processing graphs. It provides an API
for creating, manipulating and observing graphs, a sequencing engine for event
record and playback, and a JSONify-able structure for import and export of
Soundstage projects.

> **Warning**<br/>
> Soundstage is currently undergoing a reworking after a bit of a hiatus. It
> likely will frustrate you. The aim on this pass is to write a full test suite
> and documentation, then it will be less frustrating.

## Developing Soundstage

Clone the Soundstage repo and its dependency repos into one location.

```console
git clone git@github.com:soundio/soundstage.git
git clone git@github.com:stephband/fn.git
git clone git@github.com:stephband/midi.git
```

That location may now be served. Soundstage can be imported unbuilt into an
html document for testing. Import it with DEBUG messages turned on:

```html
<script>
    window.DEBUG = true;
</script>

<script type="module">
    import Soundstage from './soundstage/module.js'
    // Do something with Soundstage ...
</script>
```

### Build Soundstage

The build process requires [Deno](https://deno.land/manual/getting_started/installation)
to be installed.

Build the Soundstage module to the `build/` directory:

```console
cd soundstage/
make modules
```

The built version includes dependencies and does not require dependency repos to
be served alongside the Soundstage repo. Also, DEBUG messages are disabled. It
can be imported into an html document:

```html
<script type="module">
    import Soundstage from './soundstage/build/stage.js'
    // Do something with Soundstage ...
</script>
```

### Build documentation

Build documentation found in code comments to markdown files in `docs/`:

```console
make docs
```

### Running tests

Tests run in a browser. Navigate to `soundstage/test.html`.

> **Note**<br/>
> Many tests are run against unbuilt files. A server must be serving the
> dependency repos and the soundstage repo from the same location.

The `soundstage/test.html` page is also used to run tests in Chrome, FireFox and
Safari via Github Actions / Selenium. Test results can be seen at
[github.com/soundio/soundstage/actions/](https://github.com/soundio/soundstage/actions/).

### Add a test

To add a test:

- Create a JS module in `tests/`
- Import that module in `test.html`

Please refer to existing tests for examples. Tests are currently run using a
minimal runner function with the signature `test(name, expectedValues, fn)`.

<!--
// ```
// import Soundstage from 'http://sound.io/soundstage/module.js';
//
// const stage = new Soundstage({
//     nodes: [
//         { id: '1', type: 'instrument', data: {...} },
//         { id: '2', type: 'output', data: {...} }
//     ],
//
//     connections: [
//         { source: '1', target: '2' }
//     ],
//
//     sequences: [...],
//     events: [...]
// });
// ```
//
// A stage is a graph of AudioNodes and connections, and a sequencer of events
// targeted at those nodes. A stage also quacks like an AudioNode, and can
// be connected to other nodes (although by default it is connected to
// `context.destination`). Finally, a stage can be stringified to JSON, and
// that JSON can be used to recreate the same node graph elsewhere.
//
// ```
// const json = JSON.stringify(stage);
//
// // '{
// //     "nodes": [...],
// //     "connections": [...],
// //     "sequences": [...],
// //     "events": [...]
// // }'
//
// // Elsewhere
// const stage = new Soundstage(JSON.parse(json));
// ```

//Options
//
//The Soundstage constructor also accepts an optional second object, options.
//
//`.context`
//
//By default an AudioContext is created and shared by all stages. Pass in an
//AudioContext to have the stage use a different context.
//
//`.destination`
//
//[Todo: rename as a boolean option.]
//By default the output of the stage graph is connected to `context.destination`.
//Pass in `null` to create a disconnected stage (and use `stage.connect()`
//to route it elsewhere).
//
//`.notify`
//
//```
//const stage = new Soundstage({...}, {
//    notify: function(node, property, value) {...}
//});
//```
//
//A function that is called when an AudioParam is scheduled to change. A
//fundamental problem when creating a UI for a WebAudio graph is the lack of
//observability. Everything happens on a seperate thread, and cannot be
//interrogated. Use notify to have Soundstage notify changes to AudioParam values.
-->
