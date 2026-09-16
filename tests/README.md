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

`make test` runs everything: smoke, interact, toolboxes, then the capture, and
prints what moved.

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


## `interact.js` -- the parts a person operates

    make interact
    node tests/interact.js --shots DIR

Everything above this proves what the page emits and that it comes up; nothing
clicks anything. These are the paths whose implementation changed underneath
the Blockly 13 upgrade: the colour and angle field editors are plugins now
rather than Blockly core, mutators were rewritten around an icon class in
Blockly 11, and the clipboard and undo stack have both been reworked.

So it opens the colour editor on a NeoPixel block and checks swatches are drawn
and that `#00ff00` reaches the Python as `(0,255,0)`; opens the angle editor
and checks the dial and `robot.servo(135)`; opens a mutator bubble on
`localstorage_store` (BIPES's own, through `Blockly.bipesMutator_`) and on
`controls_if` (Blockly's own), adds a clause to each, and checks the block
grows an input, the generated code follows, and the new shape survives a save
and load; then undo, redo, copy/paste, and a flyout block reaching the
workspace.

Two things to know if you extend it. `setBubbleVisible` is **async** in Blockly
11+ -- it awaits `finishQueuedRenders()` -- so a synchronous call leaves the
bubble shut and everything after it looks broken. And Blockly fires its events
on a timer, so a block created with `Blockly.Xml.domToBlock` is not on the undo
stack for another tick; undoing immediately undoes nothing.

The two mutator containers are different shapes, which is why the test attaches
by trying rather than by name: BIPES's holds its items in a statement input,
while Blockly's `controls_if_if` has no input at all and the clauses stack
underneath it on the container's own next connection.

## `toolboxes.js` -- every category of every board

    make toolboxes
    node tests/toolboxes.js --board ESP32 --verbose

28 selectable boards, 2,627 categories, including the nested ones that only
exist once their parent is expanded. A toolbox entry naming a block nobody
defines does not degrade gracefully: building the flyout throws `Unknown block
type`, and that category plus everything nested under it becomes unreachable.
`blockdef/generate.py` checks the same thing by scanning source files; this
asks the running editor, which is where the answer is authoritative.

Categories that are empty on purpose are not reported: a `custom` one, which
Blockly fills at runtime and which has nothing in it until the program does
(Variables, Functions), and a collapsible parent whose contents are other
categories.

It also checks the selector against `devinfo.json`: every device offered,
every option naming a real device, and no two options sharing a value. That
last one is invisible in the UI -- two entries with different labels, one
silently selecting the other's board -- and is how "Wemos D1 mini" came to hand
out a NodeMCU pin map. See the CHANGELOG entry about the device selector.
