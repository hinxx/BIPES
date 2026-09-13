"""Declare a block once, generate the three places it has to appear.

Adding a block to BIPES by hand means editing `ui/core/block_definitions.js`
(what it looks like), `ui/core/generator_stubs.js` (what Python it emits) and
every `ui/toolbox/*.xml` that should offer it. Nothing ties the three together,
which is how upstream `master` and `offline` drifted into a 133-block
divergence that took a union merge to reconcile.

A `.blockdef.yaml` file under `definitions/` is the single description of a
family of blocks. `gen_blocks.py` turns it into:

  ui/core/blocks_generated.js      the Blockly.Blocks definitions
  ui/core/generators_generated.js  the Blockly.Python generators
  ui/toolbox/<board>.xml           the <category>, spliced between markers

The idea, the YAML shape and the emitter structure come from
Teknologiskolen/BIPES-Teknologiskolen @ `architecture`, `server/dsl/`. Their
app is otherwise unmergeable with ours, but the code their emitters produce
uses the same Blockly 6 API our hand-written files already do. See README.md
for what differs and why.
"""

from .generate import generate

__all__ = ['generate']
