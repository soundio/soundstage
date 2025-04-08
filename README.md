# Soundstage

Soundstage is an object model for WebAudio processing. It provides an API for
creating, manipulating and observing audio graphs, event pipes and sequencing
for event recording and playback, and a JSONify-able structure for import and
export of sound designs.


## Setup

> **Note** Soundstage includes a number of workers and audio worklets, and uses
> SharedArrayBuffers. The document must be served with Cross Origin Isolation
> and the workers with Cross Origin Embedder Policy.

Install Rustup (Rust toolchain manager) and wasm-pack (for WebAssembly compilation):

```console
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install wasm-pack
```

Compile rust to WASM:

```console
make rust
```

The build process requires [Deno](https://deno.land/manual/getting_started/installation)
to be installed. Build modules to `build/`:

```console
make modules
```


## Use Soundstage

Import Soundstage:

```html
<script type="module">
    import Soundstage from './soundstage/build/stage.js'

    const stage = await Stage.load({
        nodes: [
            { id: 1, type: 'audio-in' },
            { id: 2, type: 'delay', data: { delayTime: 0.6 } },
            { id: 3, type: 'audio-out' },
        ],

        connections: [
            1, 0, 2, 0,
            2, 0, 3, 0
        ]
    });
</script>
```

<!--
## Build documentation

Build documentation found in code comments to markdown files in `docs/`:

```console
make docs
```

## Run tests

Tests run in a browser. Navigate to `soundstage/test.html`.

> **Note**<br/>
> Tests are run against unbuilt files. A server must be serving the
> dependency repos and the soundstage repo from the same location.

The `soundstage/test.html` page is also used to run tests in Chrome, FireFox and
Safari via Github Actions / Selenium. Test results can be seen at
[github.com/soundio/soundstage/actions/](https://github.com/soundio/soundstage/actions/).

### Add a test

To add a test:

- Create a JS module in `tests/`
- Import that module in `test.html`

Refer to existing tests for examples. Tests are currently run using a
minimal runner function with the signature `test(name, expectedValues, fn)`.
-->
