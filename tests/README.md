# tests

## `codegen_golden.js` -- what Python every block generates

`tests/golden/python_codegen.txt` records the Python that each of the 2,123
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

Two categories are expected to error, and did before any Blockly work started:

* mutator-bubble blocks (`*_container`, `*_item`, `procedures_mutatorarg`),
  which only ever exist inside a mutator and have no generator by design;
* seven toolbox category placeholders (`colour`, `logic`, `loops`, `math`,
  `procedures`, `texts`, `variables`).

A block moving *into* those lists is the failure mode to watch for: "does not
know how to generate code for block type" is exactly what a generator that
failed to register looks like.

