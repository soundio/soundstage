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
    import Soundstage from './soundstage/build/soundstage.js'
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
