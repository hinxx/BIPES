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

It also refuses to leave a toolbox naming a block the page does not have.
Blockly throws `Unknown block type` while building a flyout, so one bad entry
stops the whole category from opening, and everything nested under it with it;
a block with no Python generator is quieter and worse, dragging out fine and
then stopping `workspaceToCode` from producing any code at all. The check reads
the `<script src>` list out of `ui/index.html` and collects everything those
files register in `Blockly.Blocks` and `Blockly.Python` -- the two
`*_compressed.js` bundles, `block_definitions.js`, the thirty strays in
`generator_stubs.js`, the OpenCV bindings under `jsCv/`, and this tool's own
output -- so adding a script to the page is all it takes to have its blocks
counted.

It refuses one more thing: the same type assigned twice inside one
hand-written file. The last assignment wins silently, so the other is a block
somebody wrote and nobody can drag -- which is what had happened to the `uos`
and `esp32.Partition` block-device methods, scraped twice from overlapping
paragraphs of one docs page. Comments are stripped before the check, because
both files park a superseded block behind `//~`.

A generated category with no blocks on a board is not written at all, which
makes `toolboxes:` say where a category *may* appear: a family whose every
block is `boards:`-restricted away from a board simply does not appear there,
rather than opening on an empty flyout.

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
                         #   a whole class, not only an import. A line or key
                         #   naming a `{param}` is built from what is plugged
                         #   into the block, and is registered after the
                         #   inputs have been read.

category:
  name: GY33 I2C          # also the banner in the two generated JS files
  colour: 290             # colour="" on the <category> -- one category has one
  fragment: false         # true: no <category> of our own, see below
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

### A category that already exists

Some blocks are not a category of their own: BIPES adds four to Blockly's Math
category and two to its Text category, and `scikit-learn` on `linux` holds two
blocks *and* nests another category inside it. `fragment: true` writes the
entries with no `<category>` wrapper, so the marker pair goes inside the
category that is already there:

```xml
      <block type="math_random_float"></block>
      <!-- blockdef:math_extra -->
      <!-- /blockdef:math_extra -->
    </category>
```

`name:` is still required; for a fragment it only labels the banner in
`blocks_generated.js` and `generators_generated.js`.

### Keys on a block

| Key | Meaning |
| --- | --- |
| `type` | the Blockly id. Defaults to `<file>_<fn>`; pin it for anything that has shipped. |
| `fn` | Python method called on `instance`. With no `instance`, a function on the module. |
| `attr` | attribute read off `instance`, with no call -- `sensor.eCO2`. Instead of `fn`. |
| `instance` | overrides the family's object, for a category covering more than one part. |
| `colour` | overrides the family's colour for this block alone. |
| `label` | text on the block: a string, or a list of rows (see below). `[]` puts the text on the first param's row instead. Defaults to a humanised `fn`. |
| `footer` | the same, but after the params -- the aside `tone` ends on, "(0 for infinite duration)". |
| `tooltip`, `url` | `setTooltip()`, `setHelpUrl()`. Either takes `{msg: key}`. |
| `kind` | `statement` (default) or `value`. |
| `output` | `setOutput()` type for a value block. Omit for "anything". |
| `constructor` | `true` emits `instance = Class(...)` instead of a method call. |
| `args` | call arguments, if they are not just the params in order. `bus` is available when `i2c_bus` is set. |
| `code` | escape hatch: the Python itself, with `{param}` and `{instance}` holes. Newlines are kept, so a block can emit several lines. Beats `fn`. |
| `i2c_bus` | `{id, scl, sda, freq, soft}` → param names, or numbers for a fixed value; builds the shared bus. |
| `inline` | `setInputsInline()`. Left alone if omitted. |
| `import` | entries only this block needs, on top of the file's. |
| `external` | `true` means the block's JavaScript comes from somewhere else -- written by hand, an earlier entry in this file that the toolbox lists twice, or another file (`Info` places `BIPES`'s project header under the name four boards give that category). Only its toolbox entry is generated, so only `params`, `fields` and `boards` apply. A file whose entries are all external is fine: it places blocks, it just does not own any. |
| `boards` | the toolboxes that list this entry; all of `category.toolboxes` if absent. |
| `fields` | values its toolbox entry starts with, as `<field>` elements. |
| `params` | see below. |

An entry with nothing but `label:` is a `<label>` line in the toolbox, and one
naming `library:`, `example:` or `doc:` (with an optional `suffix:`) is that
button -- both in whatever position they appear among the blocks. Any entry can
carry `boards:`, which is how a category that is not the same everywhere says
so in one place:

```yaml
- {label: Single RGB LED with CircuitPython, boards: [esp32S2]}
- {type: neopixel_control_CPY, boards: [esp32S2], ...}
- {doc: neopixel,   boards: [esp32, esp8266, ...]}
- {example: Blink,  boards: [rpi_pico, makerpi, ...]}
```

The block itself is always defined and always gets a generator -- a saved
program can contain it whatever board is selected. `boards:` only decides which
toolboxes offer it.

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
when a saved program is loaded. Only name a label you actually need to read
back: a named label can be overwritten by a `<field>` preset in a toolbox,
which is how five boards ended up pinning English over `project_metadata`'s
translated text.

`footer:` takes the same shapes and lands after the params, for the line a
block ends on rather than starts with:

```yaml
label: Tone (Hz)
footer: "(0 for infinite duration)"
```

### Keys on a param

| Key | Meaning |
| --- | --- |
| `name` | the input/field name, and what `{name}` means in `code`. |
| `label` | text before it -- a string, or `{msg: key}` / `{field: NAME}`. |
| `kind` | `input` (default, a socket for one value) · `statements` (a socket for a stack of blocks) · `dropdown` · `number` · `text` · `checkbox` · `variable` · `angle`. |
| `type` | `setCheck()` for an input; also picks the shadow block. |
| `default` | the shadow's value, or the field's initial value. |
| `pin` | `true` → the shadow is a `pinout` block rather than a number. |
| `keyword` | passed as `<keyword>=<value>` in the generated call. |
| `align` | `left` · `centre` · `right`. |
| `options` | dropdown only: bare values, `[{Label: VALUE}, ...]`, `[[Label, VALUE], ...]`, or `{label: {msg: key}, value: V}` when the label is translated. |
| `emit` | dropdown only: option value → the Python it stands for, when they differ. |
| `min`, `max`, `precision` | number field only. |
| `shadow` | `false` leaves the socket empty in the toolbox. |
| `plug` | a real block in the socket in the toolbox, instead of a shadow. |
| `unquote` | the value is pasted into the Python as code, so the quotes a text block adds come off -- either kind, and the escaping with them. Anything that is not a quoted literal is left alone. |
| `row` | `next` puts this field on the following param's row instead of a row of its own. |
| `suffix` | label after the field, for a row that ends in text. |

### Statement sockets

`kind: statements` is `appendStatementInput()` -- the socket a stack of blocks
goes inside, as the body of a `try` or a loop. `{name}` in `code:` is the code
of that stack, already indented one level and ending in a newline, so the
template supplies the header line above it and nothing else:

```yaml
code: |-
  try:
  {main_code}except:
  {catch_code}
params:
  - {name: main_code,  kind: statements, label: {msg: try1}}
  - {name: catch_code, kind: statements, label: {msg: exp1}}
```

An empty socket reads as `Blockly.Python.PASS`, one indented `pass`, because
Python needs a body where a stack of blocks is missing. A `statements` param
has no `type` and no `default` -- it holds blocks, not a value -- and gets no
shadow in the toolbox.

A statement socket is not enough on its own for a block whose stack becomes a
*callback*: `timer`, `gpio_interrupt` and `easymqtt_subscribe` also walk the
workspace for the variables the callback has to declare `global`, which is
computation and stays hand-written.

### Several things on one row

Each param normally gets a row to itself. `row: next` holds a field back so it
lands on the row of the param after it -- a socket, as in `relay_switch`'s
"turn `[off]` relay on pin `[ ]`" and `move_servo`'s "Servo # `[0]` ANGLE
`[ ]`", or another field, as in `control_pid.vars`' "get PID # `[0]` .
`[setpoint]`":

```yaml
params:
  - {name: RELAY_STATUS, row: next, kind: dropdown, options: [...]}
  - {name: pin, label: {msg: relay_on}, type: Number, pin: true}
```

A row comes out as label, field, label, field... in the order the params are
written, and a socket's own label comes last, after everything riding on it.
When the row *ends* in text rather than a field, that is the last field's
`suffix:`:

```yaml
params:
  - {name: ID, label: "PID #", suffix: output limits, kind: number}
```

`align:` for such a row is taken from the param that carries it -- the one
without `row: next`.

A `type:` that is not one of Blockly's own (`Number`, `String`, `Boolean`,
`Array`, `Colour`) is a custom type: it still constrains what can plug in, but
gets no shadow, because nothing here knows what block would fit.

### A block already in the socket

A shadow is a placeholder the user types over. `plug:` puts a real block there
instead, which is what makes some categories usable at all -- every TFT drawing
block arrives with its colour block attached:

```yaml
- {name: fg_color, label: Color, type: Number,
   plug: {type: rh_st7789_fg_color_numbers,
          values: {fg_red: 255, fg_green: 0, fg_blue: 0}}}
```

`values:` fills the plugged block's own sockets with shadows, by the same rules
as `default:`; `fields:` sets its fields (`{VAR: data}` for a `variables_get`).
A plugged block replaces the shadow rather than sitting beside it.

`shadow: true` inside `plug:` makes it a *shadow* of that type instead of a
block -- a placeholder of some other block's shape, which is how every NeoPixel
colour socket arrives:

```yaml
- {name: color, label: Color, plug: {type: neopixel_color_colors, shadow: true}}
```

### A note on YAML booleans

Only lowercase `true` and `false` are booleans in a `.blockdef.yaml`. YAML
itself also reads `ON`, `OFF`, `YES`, `NO`, `TRUE` and `FALSE` that way, which
would quietly rewrite an option value of `ON` to `True` in the generated
JavaScript -- a different value from the one saved in every existing program.
The loader narrows the rule, so those six are ordinary strings here.
