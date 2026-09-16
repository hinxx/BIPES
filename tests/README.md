# tests

## `codegen_golden.js` -- what Python every block generates

`tests/golden/python_codegen.txt` records the Python that each of the 2,115
registered block types generates when it sits alone on the workspace. The file
is committed. After a change that could affect code generation -- a Blockly
bump above all -- re-run the capture and `git diff` the file: the diff is the
list of blocks the change altered, which is otherwise only discoverable by
opening flyouts by hand.

    make golden          # rewrite tests/golden/python_codegen.txt
    git diff tests/      # what changed, per block

Needs node >= 22 (for the global `WebSocket`) and a Chrome or Chromium binary.
It looks in the playwright cache and the usual system paths; otherwise set
`CHROME=/path/to/chrome`. There are no npm dependencies and no `package.json`:
the harness drives headless Chrome over the DevTools protocol itself, because
one test script is not a reason to grow a JavaScript toolchain in a repository
that builds with `make` and Python.

### What the capture does

Loads `ui/index.html` over `file://` -- so the offline code path, baked assets
and all -- waits for `Code.workspace`, then for each type in `Blockly.Blocks`:
clear the workspace, create one block of that type, run
`Blockly.Python.workspaceToCode()`, record the result. Running against the real
injected workspace rather than a headless one is deliberate: a number of
generators reach for page globals (`Tool` warnings, `UI` state) and take a
different path without them.

`Math.random` is replaced with a seeded generator for the duration. A few
blocks seed a field from it when constructed -- the EasyMQTT session id, the
`utime.deadline` id -- and the golden file would never settle otherwise.
`--twice` captures everything twice and names any block that did not reproduce;
use it after touching the harness.

### Reading the file

Sections are `==== block_type ====`, sorted, followed by the generated Python,
`(no output)`, or `!! error: ...`.

Thirteen blocks are expected to error, and did before any Blockly work started
-- the count was twenty on Blockly 6, before seven toolbox category
placeholders stopped existing:

* mutator-bubble blocks (`*_container`, `*_item`, `procedures_mutatorarg`),
  which only ever exist inside a mutator and have no generator by design;
* seven toolbox category placeholders (`colour`, `logic`, `loops`, `math`,
  `procedures`, `texts`, `variables`).

A block moving *into* those lists is the failure mode to watch for: "does not
know how to generate code for block type" is exactly what a generator that
failed to register looks like.


## `smoke.js` -- does the editor come up?

    make smoke                       # ui/index.html and ui/embed.html
    node tests/smoke.js --shots DIR  # and write a screenshot of each
    node tests/smoke.js --root DIR   # against an unpacked bipes_offline.zip

`make test` runs both: smoke first, then the capture, then prints what moved.

The golden capture proves what every block generates and nothing whatsoever
about whether the page works. Both bugs the Blockly 13 upgrade actually shipped
were of that second kind, and neither moved a byte of generated Python:

* an alert box on every load -- "the generator code for the following blocks
  not specified for Python: text, math_number" -- from a check that was reading
  `generator[type]` after Blockly had moved generators to `generator.forBlock`;
* `ui/embed.html` throwing before it drew anything, on a generator assignment
  that had been sitting in `block_definitions.js`, on a page that loads no
  generator bundle at all. That one predated the upgrade: it had been
  swallowing the last seven block definitions in the file for as long as embed
  mode has existed.

So the checks are about the page: it loads without an exception, a console
error or an alert box; the toolbox has categories and a flyout that opens with
blocks in it; a real saved program loads, generates Python **through
`Code.generateCode()`** rather than through Blockly directly -- that is the
path with BIPES's own checks on it -- and survives a round trip out to XML and
back with every block and the same code; and the embed view draws the same
program the editor did.

## `lib/chrome.js`

Enough of the DevTools protocol to open a page and ask it questions: find a
browser, launch it, `withPage(url, opts, fn)`. The page handle carries
`evaluate`, `screenshot`, and the `pageErrors`, `consoleErrors` and `dialogs`
seen since navigation.
