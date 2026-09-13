# `.blockdef.yaml` — declaring a block once

A block in BIPES has to exist in three places that nothing ties together:

| Place | What it decides |
| --- | --- |
| `ui/core/block_definitions.js` | what the block looks like and what plugs into it |
| `ui/core/generator_stubs.js` | what Python it emits |
| `ui/toolbox/<board>.xml` | which boards offer it, and what sits in its sockets |

Keeping three files in step by hand is how upstream `master` and `offline`
drifted into a 133-block divergence. A file in `definitions/` replaces all
three: `make blocks` writes `ui/core/blocks_generated.js`,
`ui/core/generators_generated.js` and the `<category>` in each listed toolbox.

A block belongs to exactly one world. `gen_blocks.py` refuses to run if a
generated block type is also defined by hand, so converting a family means
deleting the hand-written copies in the same commit.

## Where it came from

The design is Teknologiskolen/BIPES-Teknologiskolen @ `architecture`,
`server/dsl/` — YAML source, a parse-to-model-to-emitter pipeline, and emitters
that write the same Blockly 6 API our hand-written files already use. What
differs here:

* **No `jsonschema`.** Theirs validates against a 374-line JSON Schema. This
  tree has no build-time dependencies beyond PyYAML, and a schema error is not
  more useful than one that names the block, so validation is in `spec.py`.
* **Block ids are pinned, not derived.** Theirs names a block
  `<class>__<method>`. Ours already shipped, and a saved program refers to
  blocks by id, so `type:` is what a block is called and `fn:` is only the
  Python method to call. Renaming a `type:` breaks every saved program that
  uses it.
* **Toolbox placement stays with the board.** Theirs emits a category into a
  file of its own. Ours splices between markers, because where a category nests
  in a board's tree is a decision about that board.
* **Our conventions, not theirs.** `pin: true` emits a `pinout` shadow;
  `i2c_bus:` goes through `Blockly.Python.i2cBus_()` so devices on the same
  pins share one bus object; there are fields theirs has no need for
  (checkbox, number, image).

## Adding a family

1. Write `definitions/<name>.blockdef.yaml`.
2. In each board toolbox that should offer it, put an empty marker pair where
   the category belongs:

   ```xml
   <!-- blockdef:<name> -->
   <!-- /blockdef:<name> -->
   ```

   The tool fills the space between them and errors if the markers are absent —
   it will not guess where a category goes.
3. `make blocks`, and commit the generated files with the definition.

## The format

```yaml
module: gy33I2C          # Python module imported on the board
class: GY33_I2C          # class the constructor instantiates      (optional)
instance: gy33_i2c       # variable the constructor assigns to      (optional)
colour: 135              # setColour() for every block in the family
url: https://...         # setHelpUrl() for every block             (optional)
import: ...              # overrides "import <module>"              (optional)

category:
  name: GY33 I2C
  labels: [...]          # <label> lines above the blocks
  library: gy33I2C       # "Install <name> library" button; a list works too
  toolboxes: [esp32, rpi_pico]        # ui/toolbox/<name>.xml

blocks:
  - type: gy33_i2c_led_pwr   # the Blockly block id — never change a shipped one
    fn: set_led              # method called on `instance`
    label: Set LED Power     # text on the block
    tooltip: ...
    kind: statement          # or `value`, for a block that returns something
    params:
      - {name: led_pwr, label: Power, type: Number, default: 10, align: right}
```

### Keys on a block

| Key | Meaning |
| --- | --- |
| `type` | the Blockly id. Defaults to `<file>_<fn>`; pin it for anything that has shipped. |
| `fn` | Python method called on `instance` (or a bare function if there is no `instance`). |
| `label` | text on the block. Defaults to a humanised `fn`. |
| `tooltip`, `url` | `setTooltip()`, `setHelpUrl()`. |
| `kind` | `statement` (default) or `value`. |
| `output` | `setOutput()` type for a value block. Omit for "anything". |
| `constructor` | `true` emits `instance = Class(...)` instead of a method call. |
| `args` | call arguments, if they are not just the params in order. `bus` is available when `i2c_bus` is set. |
| `code` | escape hatch: the whole Python line, with `{param}` interpolation. Beats `fn`. |
| `i2c_bus` | `{id, scl, sda, freq, soft}` → param names; builds the shared bus. |
| `image` | `{src, width, height, alt}` — a `FieldImage` under the label. |
| `inline` | `setInputsInline()`. Left alone if omitted. |
| `params` | see below. |

### Keys on a param

| Key | Meaning |
| --- | --- |
| `name` | the input/field name, and what `{name}` means in `code`. |
| `label` | text before it. |
| `kind` | `input` (default, a socket) · `dropdown` · `number` · `text` · `checkbox` · `variable`. |
| `type` | `setCheck()` for an input; also picks the shadow block. |
| `default` | the shadow's value, or the field's initial value. |
| `pin` | `true` → the shadow is a `pinout` block rather than a number. |
| `align` | `left` · `centre` · `right`. |
| `options` | dropdown only: `[{Label: VALUE}, ...]` or `[[Label, VALUE], ...]`. |
| `min`, `max`, `precision` | number field only. |
| `shadow` | `false` leaves the socket empty in the toolbox. |

A `type:` that is not one of Blockly's own (`Number`, `String`, `Boolean`,
`Array`, `Colour`) is a custom type: it still constrains what can plug in, but
gets no shadow, because nothing here knows what block would fit.
