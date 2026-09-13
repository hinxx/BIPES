# Changelog

Changes made in this fork relative to upstream
[BIPES/BIPES](https://github.com/BIPES/BIPES).

The `master` branch is kept untouched at the upstream commit it was forked
from; all fork work lives on `fork-maintenance`.

Fork point: `4ddd6ca` -- *Merge pull request #241 from amadomaker/master*,
2024-11-04, which was also upstream `master` at the time of writing.

## Unreleased

### Fixed -- submodules

The repository could not be checked out. `git submodule` aborted outright with
`fatal: no submodule mapping found in .gitmodules for path
'ui/bipes-micropython-unicorn'`, because two of the five gitlinks recorded in
the index had no matching entry in `.gitmodules`. A single unmapped gitlink
fails the whole command, so even the correctly mapped submodules were never
fetched and every submodule directory sat empty.

* **`ui/freeboard`** -- remapped `git@github.com:joaodrj/freeboard.git` (account
  deleted, returns 404, and required an SSH key) to
  `https://github.com/BIPES/freeboard.git`. The pinned commit `f4d6ad5` exists
  there, so the pin is unchanged. Without this the IoT dashboard tab was a dead
  iframe.
* **`databoard`** -- remapped `git@github.com:joaodrj/databoard.git` (same
  problem) to `https://github.com/BIPES/Databoard.git`. Pinned commit
  `ad3a061` unchanged. Without this the Databoard tab was a dead iframe.
* **`webrepl`** -- added the missing `.gitmodules` entry, pointing at
  `https://github.com/micropython/webrepl.git`. Pinned commit `1e09d9a`
  unchanged.
* **`blockly`** -- re-pinned from `73416d4` (2024-09-16) to tag `6.20210701.0`
  (`64188ae`). The old pin was not merely stale but wrong: Blockly 10 removed
  the `blockly_compressed.js` / `blocks_compressed.js` /
  `javascript_compressed.js` / `python_compressed.js` bundles that
  `ui/index.html` loads and that `make copy` copies, so `make copy` against the
  old pin would have silently produced nothing. Tag `6.20210701.0` is the exact
  version already vendored in `ui/core` (see `VERSION` in
  `ui/core/blockly_compressed.js`); after re-pinning, `make copy` is a verified
  no-op against the checked-in files.
* **`ui/bipes-micropython-unicorn`** -- removed (see *Removed* below).

Verified end to end: `git submodule deinit` followed by `make submodules`
re-clones and checks out every submodule at its recorded commit, and the IDE
then loads with the IoT and Databoard tabs both working.

### Fixed -- `make copy` was destructive

`make copy` overwrote two vendored files that carry BIPES-specific patches.
Both are now excluded from the target, with the reason recorded in the
`Makefile` and `README.md`:

* **`ui/core/python_compressed.js`** -- BIPES rewrote `math_change`,
  `math_on_list` and `math_number_property` to avoid `from numbers import
  Number`, a module MicroPython does not ship. Restoring the stock Blockly
  bundle would have broken code generation for every target device.
* **`ui/core/storage.js`** -- rewritten to persist through the BIPES
  project/account model (`UI['workspace']`, `UI['account']`). The stock
  `blockly/appengine/storage.js` talks to Blockly's own demo cloud storage
  instead.

### Fixed -- Makefile

* Added the `submodules` target. `README.md` had documented `make submodules`
  for years, but no such target ever existed.
* Split submodule fetching by need: `submodules` for the two required at
  runtime, `submodules-dev` for the build-time ones (`blockly` is fetched with
  `--filter=blob:none`, as the full history is large).
* Fixed the copy destinations for Blockly's `media/` and `msg/`. They were
  copied into `ui/core/`, but are consumed relative to `ui/` -- `ui/core/code.js`
  injects with `media:'media/'` and loads `b.msg/js/<lang>.js`. The stale copies
  under `ui/core/` were never read.
* Dropped `term.js` from the files copied out of `webrepl`. The UI switched to
  `ui/core/xterm.js`; nothing loads `term.js` any more.
* Scoped the `make offline` zip to the files that belong in a release. It ran
  `zip -r bipes_offline.zip *`, which was harmless only while the submodule
  directories were empty -- the moment submodules worked it would have swept the
  entire `blockly` checkout and the submodule `.git` files into the archive.
  The archive carries `index.html`, `ui/`, `databoard/`, `easymqtt/` and the
  docs; `easymqtt/` matters because `ui/index.html` iframes
  `../easymqtt/index.html`, so omitting it would 404 the EasyMQTT tab.
* Removed the `git-clone` target, made redundant by `blockly` being a proper
  submodule again.
* Added `make help`, `.PHONY` declarations, a `clean-offline` target, and a
  guard that tells you to run `make submodules-dev` if `make copy` is invoked
  without the submodule content present.

### Removed -- dead third-party services

* **Google Analytics** (`ui/index.html`, `ui/ports.html`, and the generated
  `ui/index_offline.html`). Property `UA-162001686-1` is a Universal Analytics
  property; Universal Analytics stopped processing data on 2023-07-01, so the
  `googletagmanager.com` request and the inline `gtag` init were pure dead
  weight on every page load.
* **The BIPES App Engine iframe.** `https://bipes-271213.appspot.com/list`
  returns HTTP 503 -- the backend in `appengine/` is no longer running. The
  iframe in `ui/index.html` was already commented out and has been deleted.
  `ui/shared.html`, which the Shared tab actually loads and which was nothing
  but a link to that same dead URL, now explains that the service is offline and
  points at the Files tab instead. The `appengine/` sources are kept as a record
  of what the backend was.
* **`cdn.rawgit.com`.** `Code.importPrettify` in `ui/core/code.js` fetched
  google/code-prettify from RawGit, which was sunset in 2019. Its only consumer,
  `Code.toDOM`, is never called anywhere in the codebase -- syntax highlighting
  in the UI comes from CodeMirror. Both functions and the startup `setTimeout`
  that triggered the fetch have been removed.

### Removed -- outbound third-party requests ("phone home")

A load of the IDE contacted five external hosts before this change, with no user
interaction. Two of those came from BIPES' own code and are now gone; the main
document makes **zero** external requests.

* **`cdn.jsdelivr.net`** -- `ui/index.html` carried
  `import 'https://cdn.jsdelivr.net/npm/@pwabuilder/pwaupdate'` in a
  `<script type="module">`, fetched on every page load. Being an ES module
  import it does not show up in a devtools network capture the way a `<script
  src>` does; it was found via `performance.getEntriesByType('resource')`.
  Removed, together with **`ui/pwabuilder-sw.js`**, the service worker that
  component existed to register. That worker did
  `importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.0.0/workbox-sw.js')`
  and then registered a `StaleWhileRevalidate` route matching `/*` -- a Google
  CDN dependency plus a cache-everything strategy, on a Workbox pinned to
  5.0.0 (2020). It was not activating in practice, but the wiring was live.
  The local `manifest.json` and its icons are kept; nothing else referenced the
  worker.
* **`code.highcharts.com`** (3 requests) -- `easymqtt/index.html` loaded
  Highcharts Stock plus its exporting modules from the vendor CDN. Two problems
  beyond the request itself: the URLs were **unpinned**, so the page silently
  rode major version bumps (the CDN now serves v13, while the code was written
  against the v9-era API), and Highcharts is **proprietary** -- "(c) Highsoft
  AS, a commercial license may be required" -- which does not combine with this
  project's GPL-3.0 licence.

  Replaced with **Chart.js 4.4.7** and **chartjs-adapter-date-fns 3.0.0**, both
  MIT and both vendored under `easymqtt/lib/` with their upstream licence
  texts. `Highcharts.stockChart` was wrapped in a small `MqttChart` class that
  keeps the call sites unchanged in shape (`addPoint`, `redraw`, `reflow`,
  `destroy`, `lastX`), and the two features Highcharts Stock gave for free were
  reimplemented rather than dropped:

  * the 1M / 5M / 1H / 12H / All range selector, as a button row that pins the
    x-axis to `[last - range, last]`, defaulting to All as `selected: 4` did;
  * PNG export (`chart.toBase64Image()`) and CSV export, as two toolbar buttons.

  `lastX` also fixes a latent crash: the old code indexed
  `series[0].points[length-1]` unguarded, which would throw on a chart with no
  samples yet; the getter returns `null` instead.

Still outstanding, both inside vendored submodules and so left alone:
`maps.googleapis.com` (4 requests, from freeboard's Google Map widget at
`ui/freeboard/js/freeboard_plugins.js:4625`) and `cdn.jsdelivr.net` +
`cdn.dashjs.org` (4 requests, from `databoard/index.html:7-10`, which loads
chart.js, a date adapter, muuri and dash.js). Fixing these means patching
vendored code.

Not phone-home, checked and cleared: `manup.js` only XHRs the local
`manifest.json`; `BlocklyStorage.retrieveXml` POSTs to a same-origin `/storage`
and only when the URL has a `#hash`; the `docs.google.com` and
`docs.micropython.org` URLs are `window.open`/`helpUrl` targets, opened only on
a user click.

### Removed -- orphaned files

* **`ui/emulator.html`** and the **`ui/bipes-micropython-unicorn`** submodule.
  Nothing in the tree linked to `emulator.html`; it was a diverged copy of
  `ui/index.html` whose in-file changelog stops at July 2021, and it was the
  only consumer of that submodule. The submodule was also one of the two
  unmapped gitlinks that broke `git submodule` entirely, and it pulls
  `micropython` in as a nested submodule, making it by far the heaviest thing
  in the checkout.
* **`.gitmodules.save`** -- a stale partial copy of `.gitmodules`, listing only
  the two submodules whose URLs were already dead.
* **`ui/core/code.js.save`** -- a 703-line editor leftover, an older copy of
  `ui/core/code.js`, referenced by nothing.
* **`docs/sync.ffs_db`, `easymqtt/sync.ffs_db`** -- FreeFileSync database
  artifacts that should never have been committed.

### Fixed -- miscellaneous

* `ui/core/channel.js` -- corrected `http:///bipes.net.br/beta2/ui` to
  `http://bipes.net.br/beta2/ui`. The triple slash made the URL resolve to the
  wrong host in the "protocol unavailable" hint.
* `.github/workflows/bipes_offline.yml.bak` -- bumped `actions/checkout` from
  `v2` to `v4`. The file remains disabled (`.bak`); v2 runs on a Node runtime
  GitHub no longer supports, so it could not have run as-is.

### Added

* **`.gitignore`** -- the repository had none. Ignores `bipes_offline.zip` and
  `docs/_build/` (both build output) plus the editor and FreeFileSync leftovers
  removed above.
* **`README.md`** -- a Submodules section stating which submodules are needed at
  runtime versus build time, why `blockly` is pinned where it is, and which
  vendored files carry BIPES patches that `make copy` must not overwrite. Also
  documents that the IDE has to be served over HTTP rather than opened from the
  filesystem.
* **`CHANGELOG.md`** -- this file.

### Not changed -- known stale, left alone deliberately

* **`ui/b.msg`** -- the checked-in Blockly translations predate the pinned
  Blockly version; `make copy` refreshes 118 files. Left as-is to keep the
  change set focused. Run `make copy` to sync them.
* **`http://bipes.net.br/beta2/ui/pylibs/`** in `ui/core/code.js` -- the
  MicroPython library installer downloads over plain HTTP from a `beta2` path.
  The endpoint is live; the URL is worth revisiting.
* **`docs/`** -- builds with `sphinx-js`, which needs `jsdoc` on `PATH` in
  addition to the `pip` packages the README lists. `conf.py` still declares
  `release = 'v2.1'` and a 2021 copyright.
