# Soundstage

Soundstage is an object model for WebAudio processing. It provides an API for
creating, manipulating and observing audio graphs, event pipes and sequencing
for event recording and playback, and a JSONify-able structure for import and
export of sound designs.


## Setup

> **Note** Soundstage includes a number of workers and audio worklets. The
> document must be served with Cross Origin Isolation and the workers with
> Cross Origin Embedder Policy.


## Build Soundstage

The build process requires [Deno](https://deno.land/manual/getting_started/installation)
to be installed.

Compile rust to WASM and Build the Soundstage module to the `build/` directory:

```console
cd soundstage/
make rust
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
