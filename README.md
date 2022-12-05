# Soundstage

Soundstage is a Graph Object Model for Web Audio processing graphs. It provides an API
for creating, manipulating and observing graphs, and a JSONify-able structure for
exporting and importing them.

## Developing Soundstage

Clone the Soundstage repo and its dependency repos into one location.

```cli
git clone git@github.com:soundio/soundstage.git
git clone git@github.com:stephband/fn.git
git clone git@github.com:stephband/midi.git
cd soundstage
```

Build the Soundstage module to the `build/` directory.

```cli
make docs
```

Build documentation found in code comments to markdown files in `docs/`.

```cli
make docs
```
