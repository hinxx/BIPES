# BIPES: Block based Integrated Platform for Embedded Systems.

![BIPES](bipes.png)


> This is a fork of [BIPES/BIPES](https://github.com/BIPES/BIPES). The `master`
> branch tracks upstream unchanged; fork work lives on `fork-maintenance`.
> See [CHANGELOG.md](CHANGELOG.md) for what differs and why.

BIPES allows anyone to quickly and reliably design, program, build, deploy and test embedded systems and IOT devices and applications. It is fully based on a web environment, so absolutely no software install is needed on the client / developer machine. 

More information at the project website: [bipes.net.br](https://bipes.net.br/).

## Live version
Try it now at: [bipes.net.br/ide](https://bipes.net.br/ide).

## Usage

Run `make help` for the full target list.

To init the submodules the IDE needs at runtime -- [BIPES/freeboard](https://github.com/BIPES/freeboard)
and [BIPES/Databoard](https://github.com/BIPES/Databoard), both iframed by `ui/index.html` -- run:
```
make submodules
```

Then serve the repository root over HTTP and open `ui/`. Any static server does,
for example:
```
python3 -m http.server 8000
```

`ui/index.html` also opens straight off the filesystem, with no server at all:
the toolboxes and `devinfo.json` are baked into `ui/core/offline_assets.js`,
which the page loads only when its own URL is a `file:` one. Tools that need a
server -- the MQTT and dashboard iframes -- still do not work there, because of
[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).

The baked file is committed, so a fresh clone works offline as it stands. After
editing a toolbox or `devinfo.json`, refresh it (and build `bipes_offline.zip`,
a zip of the tree to hand someone on a USB stick) with:
```
make offline
```
A served page reads the real files, so this is only needed for the offline copy.

That's it, enjoy BIPES 😄.

## Adding blocks

A block has to exist in three places -- `ui/core/block_definitions.js` (how it
looks), `ui/core/generator_stubs.js` (the Python it emits) and every
`ui/toolbox/*.xml` that offers it. Most blocks here are still written out by
hand in all three; new families should instead be declared once in
`blockdef/definitions/*.blockdef.yaml` and generated with `make blocks`. See
[`blockdef/README.md`](blockdef/README.md).

## Tests

    make test

`make smoke` loads the IDE and the embed view in headless Chrome and checks
they come up, including all 14 bundled examples; `make interact` exercises the
field editors, both flavours of mutator, undo and the clipboard; `make
toolboxes` opens every category of every board, 2,302 of them; and `make
golden` records the Python that all 2,115 block types generate into
`tests/golden/python_codegen.txt`, which is committed, so `git diff tests/`
after a change is the list of blocks it altered. Needs
node >= 22 and a Chrome or Chromium binary (`CHROME=/path/to/chrome` if it is
somewhere unusual); no npm packages. See `tests/README.md`.


## Submodules

| Submodule | Needed for | Fetched by |
| --- | --- | --- |
| `ui/freeboard` | IoT dashboard tab (runtime) | `make submodules` |
| `databoard` | Databoard tab (runtime) | `make submodules` |
| `blockly` | Reading the source of the vendored Blockly | `make submodules-dev` |
| `webrepl` | Re-vendoring `ui/core/FileSaver.js` | `make submodules-dev` |

Only the first two are required to run the IDE; everything else is already
vendored into the tree.

Blockly is vendored from npm, not from the submodule: `make copy` runs
`npm pack blockly@$(BLOCKLY_VERSION)` and takes the compiled bundles, `media/`
and the message files out of the package. Since Blockly 10 those bundles are
build output and are not committed to the Blockly repository at all -- they
exist only in the published package, where they are still plain UMD and still
set the globals `ui/index.html`'s `<script>` tags expect. The submodule is kept
pinned to the same release so that `git -C blockly show <path>` is the readable
source for what is vendored; nothing is copied out of it.

To move to a newer Blockly, set `BLOCKLY_VERSION` in the `Makefile`, run
`make copy`, then `make test` and read the diff to `tests/golden/`.

One vendored file is patched by BIPES and is therefore never overwritten by
`make copy`:

* `ui/core/storage.js` -- rewritten to save into the BIPES project/account model instead of Blockly's demo cloud storage.

`ui/core/python_compressed.js` used to be a second such file: stock Blockly
emits `from numbers import Number`, which MicroPython does not have. Those
substitutions now live in `ui/core/micropython_patches.js`, applied on top of
whatever Blockly ships, so the bundle itself is refreshed like any other.


## Third-party assets

`easymqtt/lib/` holds Chart.js and its date adapter (both MIT, licence texts
alongside them), vendored so the EasyMQTT dashboard makes no third-party
requests. The IDE itself loads nothing from an external host.

Two vendored submodules still reach out on load and have not been changed:
`ui/freeboard` fetches the Google Maps JS API for its map widget, and
`databoard` loads chart.js, muuri and dash.js from CDNs.

## Documentation

The documentation is online at [bipes.net.br/docs](https://bipes.net.br/docs).

To build the documentation out of a fresh clone, do:
```
make doc
```
after having installed the theme, [sphinx](https://www.sphinx-doc.org/en/master/) and [sphinx-js](https://pypi.org/project/sphinx-js/).
```
pip install sphinx sphinx-js furo
```
## More information
Some functions of `ui/index.html` were based on Blopy project (https://github.com/mnoriaki/Blopy), by Noriaki Mitsunaga
 (https://github.com/mnoriaki).
 
 OpenCV blocks were automatically generated using berak's OpenCV to Blockly generator (https://github.com/berak/blockly-cv2/tree/master/gen).
 
We also use `xterm.js` (https://github.com/xtermjs/xterm.js/) and `codemirror.js` (https://github.com/codemirror/codemirror).
