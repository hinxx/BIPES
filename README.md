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

Then serve the repository root over HTTP and open `ui/`. Opening `ui/index.html`
straight off the filesystem will not work, because the iframes and the XML
toolbox fetches are subject to [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).
Any static server does, for example:
```
python3 -m http.server 8000
```

To build/update the offline version with latest, run:
```
make offline
```
This version does not require a server since it has all core files concatenated at `ui/index_offline.html`, just open this file in a browser. It will also create a `bipes_offline.zip`. However, keep in mind that any tool that requires a server, like MQTT, won't work due to CORS.

That's it, enjoy BIPES 😄.

## Submodules

| Submodule | Needed for | Fetched by |
| --- | --- | --- |
| `ui/freeboard` | IoT dashboard tab (runtime) | `make submodules` |
| `databoard` | Databoard tab (runtime) | `make submodules` |
| `blockly` | Re-vendoring `ui/core/*_compressed.js` | `make submodules-dev` |
| `webrepl` | Re-vendoring `ui/core/FileSaver.js` | `make submodules-dev` |

Only the first two are required to run the IDE; everything else is already
vendored into the tree.

`blockly` is pinned to tag `6.20210701.0`, which is the exact version vendored
in `ui/core`. Blockly 10 dropped the `*_compressed.js` bundles that
`ui/index.html` loads, so bumping the pin means porting the UI, not just
re-running `make copy`. Two vendored files are patched by BIPES and are
therefore never overwritten by `make copy`:

* `ui/core/python_compressed.js` -- stock Blockly emits `from numbers import Number`, which MicroPython does not have.
* `ui/core/storage.js` -- rewritten to save into the BIPES project/account model instead of Blockly's demo cloud storage.


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
