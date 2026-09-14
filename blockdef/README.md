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

   The tool fills every such pair in the file and errors if there are none —
   it will not guess where a category goes. (A family can legitimately appear
   twice: `uos` is offered both at the top level and inside `micropython`.)
3. `make blocks`, and commit the generated files with the definition.

## The format

```yaml
module: gy33I2C          # Python module imported on the board
class: GY33_I2C          # class the constructor instantiates      (optional)
instance: gy33_i2c       # variable the constructor assigns to      (optional)
colour: 135              # setColour() -- a hue number or a CSS colour name
url: https://...         # setHelpUrl() for every block             (optional)
import: ...              # overrides "import <module>"              (optional)
                         #   a line, {line, key}, or a list of either;
                         #   `[]` for none. Each becomes one entry in
                         #   Blockly.Python.definitions_, so a `line:` can be
                         #   a whole class, not only an import.

category:
  name: GY33 I2C
  labels: [...]          # <label> lines above the blocks
  library: gy33I2C       # "Install <name> library" button; a list works too
  examples: gy33I2C      # "Load example: <name>"
  docs: gy33I2C          # "Documentation and how to connect: <name>"
  toolboxes: [esp32, rpi_pico]        # ui/toolbox/<name>.xml
  defaults:                           # per-board shadow values    (optional)
    rpi_pico: {sda: 0, scl: 1}

blocks:
  - type: gy33_i2c_led_pwr   # the Blockly block id -- never change a shipped one
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
| `fn` | Python method called on `instance`. With no `instance`, a function on the module. |
| `attr` | attribute read off `instance`, with no call -- `sensor.eCO2`. Instead of `fn`. |
| `instance` | overrides the family's object, for a category covering more than one part. |
| `colour` | overrides the family's colour for this block alone. |
| `label` | text on the block: a string, or a list of rows (see below). `[]` puts the text on the first param's row instead. Defaults to a humanised `fn`. |
| `tooltip`, `url` | `setTooltip()`, `setHelpUrl()`. Either takes `{msg: key}`. |
| `kind` | `statement` (default) or `value`. |
| `output` | `setOutput()` type for a value block. Omit for "anything". |
| `constructor` | `true` emits `instance = Class(...)` instead of a method call. |
| `args` | call arguments, if they are not just the params in order. `bus` is available when `i2c_bus` is set. |
| `code` | escape hatch: the Python itself, with `{param}` and `{instance}` holes. Newlines are kept, so a block can emit several lines. Beats `fn`. |
| `i2c_bus` | `{id, scl, sda, freq, soft}` → param names, or numbers for a fixed value; builds the shared bus. |
| `inline` | `setInputsInline()`. Left alone if omitted. |
| `import` | entries only this block needs, on top of the file's. |
| `external` | `true` means the block is written by hand; only its toolbox entry is generated. Then only `params` and `fields` apply. |
| `fields` | values its toolbox entry starts with, as `<field>` elements. |
| `params` | see below. |

An entry with nothing but `label:` is a `<label>` line in the toolbox, and one
naming `library:`, `example:` or `doc:` (with an optional `suffix:`) is that
button -- both in whatever position they appear among the blocks.

### Label rows

`label:` is one row of text, or a list of rows. A row is a string, or a mapping
of `text` (or `msg`), `image` and `align`:

```yaml
label:
  - {image: {src: media/hcsr04.png, width: 55, height: 55}, msg: hcsr_init}
  - {text: with the PCF8574 Display Controller, align: right}
```

`msg:` is a key in `ui/msg/<lang>.js`, so the text is translated rather than
frozen in English. `field: SOME_NAME` on a row or a param label makes it a
`FieldLabelSerializable` under that name, which is how a label gets re-read
when a saved program is loaded.

### Keys on a param

| Key | Meaning |
| --- | --- |
| `name` | the input/field name, and what `{name}` means in `code`. |
| `label` | text before it -- a string, or `{msg: key}` / `{field: NAME}`. |
| `kind` | `input` (default, a socket) · `dropdown` · `number` · `text` · `checkbox` · `variable`. |
| `type` | `setCheck()` for an input; also picks the shadow block. |
| `default` | the shadow's value, or the field's initial value. |
| `pin` | `true` → the shadow is a `pinout` block rather than a number. |
| `keyword` | passed as `<keyword>=<value>` in the generated call. |
| `align` | `left` · `centre` · `right`. |
| `options` | dropdown only: bare values, `[{Label: VALUE}, ...]`, `[[Label, VALUE], ...]`, or `{label: {msg: key}, value: V}` when the label is translated. |
| `emit` | dropdown only: option value → the Python it stands for, when they differ. |
| `min`, `max`, `precision` | number field only. |
| `shadow` | `false` leaves the socket empty in the toolbox. |
| `unquote` | the value is pasted into the Python as code, so the quotes a text block adds come off. |
| `row` | `next` puts this field on the following socket's row instead of a row of its own. |

### A field on a socket's row

Each param normally gets a row to itself. `row: next` holds a field back so it
lands on the row of the param after it, between that row's labels -- which is
how `relay_switch` reads "turn `[off]` relay on pin `[ ]`" and `move_servo`
reads "Servo # `[0]` ANGLE `[ ]`":

```yaml
params:
  - {name: RELAY_STATUS, row: next, kind: dropdown, options: [...]}
  - {name: pin, label: {msg: relay_on}, type: Number, pin: true}
```

The fields come out in the order they are written, before the socket's own
label. Only a socket can be ridden: `row: next` in front of anything else is an
error, because a field's row has no socket to share.

A `type:` that is not one of Blockly's own (`Number`, `String`, `Boolean`,
`Array`, `Colour`) is a custom type: it still constrains what can plug in, but
gets no shadow, because nothing here knows what block would fit.

### A note on YAML booleans

Only lowercase `true` and `false` are booleans in a `.blockdef.yaml`. YAML
itself also reads `ON`, `OFF`, `YES`, `NO`, `TRUE` and `FALSE` that way, which
would quietly rewrite an option value of `ON` to `True` in the generated
JavaScript -- a different value from the one saved in every existing program.
The loader narrows the rule, so those six are ordinary strings here.
