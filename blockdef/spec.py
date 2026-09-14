"""Read a .blockdef.yaml file into the model the emitters consume.

Validation is hand-written rather than a JSON Schema: PyYAML already ships
with every Python we care about, `jsonschema` does not, and this tree has been
kept free of build-time dependencies on purpose. The cost is that this file is
the format's only contract -- README.md documents it, and every rejection here
names the file, the block and what was wrong, because a schema error message
would not have been better.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import re

import yaml


class _Loader(yaml.SafeLoader):
    """YAML, with only lowercase `true` and `false` read as booleans.

    ON, OFF, YES, NO, TRUE and FALSE are block field *values* here -- an option
    list of [ON, OFF], a checkbox preset of FALSE. YAML 1.1 turns all of them
    into Python booleans, which reach the generated JavaScript as "True" and
    "False": a different value from the one saved in every existing program,
    with nothing to notice it. Booleans are only ever written lowercase in this
    format, so nothing is lost by narrowing the rule.
    """


_Loader.add_implicit_resolver('tag:yaml.org,2002:bool', re.compile(r'^(?:true|false)$'), 'tf')
for _ch in 'yYnNoOTF':
    _Loader.yaml_implicit_resolvers[_ch] = [
        (tag, regexp) for tag, regexp in _Loader.yaml_implicit_resolvers.get(_ch, [])
        if tag != 'tag:yaml.org,2002:bool']


class BlockdefError(ValueError):
    """A .blockdef.yaml file that cannot be turned into blocks."""


# Blockly's own input checks. Anything else is a custom type: it still works
# (blocks with the same setOutput type can be plugged in), but it gets no
# shadow block, because we would not know what to put in it.
BUILTIN_TYPES = frozenset({'Number', 'String', 'Boolean', 'Array', 'Colour'})

ALIGNS = {'left': 'Blockly.ALIGN_LEFT',
          'centre': 'Blockly.ALIGN_CENTRE',
          'right': 'Blockly.ALIGN_RIGHT'}

# A param is rendered as one of these. `input` is a socket another block plugs
# into; the rest are fields on the block itself.
PARAM_KINDS = frozenset({'input', 'dropdown', 'number', 'text', 'checkbox', 'variable',
                         'angle', 'statements'})

# The two kinds that are sockets rather than fields: `input` takes one block that
# returns a value, `statements` takes a stack of blocks that do something.
SOCKET_KINDS = frozenset({'input', 'statements'})


@dataclass(slots=True)
class Text:
    """A piece of block text: literal, or a key into the translation table."""
    text: str = ''
    msg: str | None = None          # -> MSG["<msg>"]
    field: str | None = None        # -> a named FieldLabelSerializable
    given: bool = False             # the key was there, even if the text is empty

    @property
    def empty(self) -> bool:
        return not self.text and not self.msg


@dataclass(slots=True)
class Image:
    src: str
    width: int = 65
    height: int = 65
    alt: str = '*'


@dataclass(slots=True)
class Row:
    """One `appendDummyInput()` of label: an image, some text, or both."""
    label: Text = field(default_factory=Text)
    image: Image | None = None
    align: str | None = None


@dataclass(slots=True)
class Param:
    name: str                       # input/field name, and the {placeholder} in code
    label: Text = field(default_factory=Text)
    kind: str = 'input'
    type: str | None = None         # setCheck() for inputs; also picks the shadow
    default: Any = None
    align: str | None = None
    pin: bool = False               # shadow is <pinout>, not <math_number>
    keyword: str | None = None      # passed as `<keyword>=<value>` in the call
    options: list[tuple['Text', str]] = field(default_factory=list)   # dropdown
    emit: dict[str, str] | None = None    # dropdown value -> Python fragment
    min: Any = None                 # number field
    max: Any = None
    precision: Any = None
    shadow: bool = True             # False -> no shadow in the toolbox entry
    unquote: bool = False           # strip the quotes a text block puts around it
    row: str | None = None          # 'next': ride on the next param's row
    suffix: Text = field(default_factory=Text)   # label after the field
    plug: dict[str, Any] | None = None   # a real block in the socket, not a shadow


@dataclass(slots=True)
class Block:
    type: str                       # Blockly block id -- never change one that shipped
    rows: list[Row] = field(default_factory=list)
    footer: list[Row] = field(default_factory=list)   # label rows after the params
    tooltip: Text = field(default_factory=Text)
    kind: str = 'statement'         # 'statement' | 'value'
    fn: str | None = None           # Python method called on the instance
    attr: str | None = None         # attribute read off the instance, with no call
    instance: str | None = None     # overrides the family's object for this block
    colour: int | str | None = None # overrides the family's colour
    args: list[str] | None = None   # call arguments; defaults to the params
    code: str | None = None         # escape hatch: the Python, with {param} holes
    output: str | None = None       # setOutput type for value blocks
    params: list[Param] = field(default_factory=list)
    inline: bool | None = None
    constructor: bool = False
    i2c_bus: dict[str, Any] | None = None   # -> Blockly.Python.i2cBus_()
    external: bool = False          # defined by hand; only the toolbox entry is ours
    imports: list['Import'] = field(default_factory=list)   # on top of the file's
    fields: dict[str, str] = field(default_factory=dict)    # toolbox <field> presets
    help_url: str | None = None
    boards: list[str] = field(default_factory=list)   # toolboxes that list it; all if empty
    variants: list['Variant'] = field(default_factory=list)  # per-board code, if it differs


@dataclass(slots=True)
class Label:
    """A `<label>` between blocks in the toolbox category."""
    text: str
    boards: list[str] = field(default_factory=list)


@dataclass(slots=True)
class Button:
    """A `<button>` between blocks, for a category covering more than one part."""
    text: str
    key: str
    boards: list[str] = field(default_factory=list)


@dataclass(slots=True)
class Import:
    line: str
    key: str


@dataclass(slots=True)
class Variant:
    """One board's version of what a block emits.

    A handful of blocks emit different Python depending on which board is
    selected -- the Franzininho runs CircuitPython, where a pin is
    `DigitalInOut(board.IO4)` and Wi-Fi is the `wifi` module rather than
    `network`. The board is a runtime choice (the dropdown above the
    workspace), not a build-time one, so this becomes a branch in the
    generated generator rather than two generated files.

    `device` is the *selector value* -- the `<option value>` in index.html,
    `ESP32S2`, not `esp32S2` and not "Franzininho Wifi". `device: None` is the
    fallback branch, and every block with variants has exactly one, last.
    """
    code: str
    device: str | None = None
    imports: list[Import] = field(default_factory=list)


@dataclass(slots=True)
class Definition:
    path: Path
    name: str                       # file stem; names the toolbox markers
    module: str                     # Python module imported on the board
    cls: str | None                 # class instantiated by the constructor
    instance: str                   # variable the constructor assigns
    imports: list[Import]
    colour: int | str | None        # setColour for every block in the family
    category: str
    category_colour: str | None     # colour="" on the <category> itself
    fragment: bool                  # entries go *inside* an existing category
    labels: list[str]
    library: list[str]              # "Install <name> library" buttons
    examples: list[str]             # "Load example: <name>" buttons
    docs: list[str]                 # "Documentation and how to connect: <name>" buttons
    toolboxes: list[str]
    defaults: dict[str, dict[str, Any]]   # board -> param -> shadow value
    help_url: str | None
    entries: list['Block | Label | Button']   # in the order the toolbox shows them

    @property
    def blocks(self) -> list[Block]:
        """The blocks this file owns -- what the two JS files are written from."""
        return [e for e in self.entries if isinstance(e, Block) and not e.external]


def load(path: str | Path) -> Definition:
    path = Path(path)
    try:
        raw = yaml.load(path.read_text(encoding='utf-8'), Loader=_Loader)
    except yaml.YAMLError as e:
        raise BlockdefError(f'{path}: {e}') from None
    if not isinstance(raw, dict):
        raise BlockdefError(f'{path}: expected a mapping at the top level')

    where = _Where(path)
    module = _req_str(raw, 'module', where)
    category = raw.get('category')
    if not isinstance(category, dict):
        raise BlockdefError(f'{where}: `category` must be a mapping')
    cat = _Where(path, f'category {category.get("name")!r}')

    colour = raw.get('colour')
    if colour is not None and not isinstance(colour, (int, str)):
        raise BlockdefError(f'{where}: `colour` is a hue number or a CSS colour name, '
                            f'not {colour!r}')

    definition = Definition(
        path=path,
        name=path.name.split('.')[0],
        module=module,
        cls=raw.get('class'),
        instance=raw.get('instance') or '',
        imports=_imports(raw.get('import'), module, where),
        colour=colour,
        category=_req_str(category, 'name', cat),
        # A `colour` on the category rather than the blocks. Only one leaf
        # category in the tree has one -- AmadoBoard's Bluetooth -- and
        # dropping it would recolour that board's tree.
        category_colour=(str(category['colour']) if category.get('colour') is not None
                         else None),
        # `fragment: true` -- the entries go *inside* a category that already
        # exists in the toolbox (BIPES adds four blocks to Blockly's own Math
        # category, and two to Text), so no <category> of our own is written
        # and `name:` only labels the banner in the generated files.
        fragment=bool(category.get('fragment')),
        labels=[str(x) for x in category.get('labels', [])],
        library=[str(x) for x in _as_list(category.get('library'))],
        examples=[str(x) for x in _as_list(category.get('examples'))],
        docs=[str(x) for x in _as_list(category.get('docs'))],
        toolboxes=[str(x) for x in _as_list(category.get('toolboxes'))],
        defaults={},
        help_url=raw.get('url'),
        entries=[],
    )

    blocks = raw.get('blocks')
    if not isinstance(blocks, list) or not blocks:
        raise BlockdefError(f'{where}: `blocks` must be a non-empty list')

    seen: set[str] = set()
    for entry in blocks:
        parsed = _entry(entry, definition, where)
        if isinstance(parsed, Block) and not parsed.external:
            if parsed.type in seen:
                raise BlockdefError(f'{where}: two blocks both call themselves {parsed.type!r}')
            seen.add(parsed.type)
        definition.entries.append(parsed)

    # `external:` counts: a file whose entries are all external still places
    # blocks, it just does not own them. `Info` is `BIPES`'s project header
    # under the name four boards give that category, and declaring the block
    # twice is exactly what this tool exists to prevent. A file of nothing but
    # labels and buttons is still a mistake.
    if not any(isinstance(e, Block) for e in definition.entries):
        raise BlockdefError(f'{where}: nothing here is a block')

    definition.defaults = _defaults(category.get('defaults'), definition, cat)

    for entry in definition.entries:
        unknown = [b for b in entry.boards if b not in definition.toolboxes]
        if unknown:
            raise BlockdefError(f'{where}: {unknown} in a `boards:` list, but the category is '
                                f'not offered there -- `toolboxes:` says {definition.toolboxes}')

    _check_unknown(raw, {'module', 'class', 'instance', 'import', 'url', 'colour',
                         'category', 'blocks'}, where)
    _check_unknown(category, {'name', 'colour', 'fragment', 'labels', 'library',
                             'examples', 'docs', 'toolboxes', 'defaults'}, cat)
    return definition


# ---------------------------------------------------------------------------


class _Where:
    """Where an error is, in the words the author used."""

    def __init__(self, path: Path, *parts: str) -> None:
        self.path, self.parts = path, [p for p in parts if p]

    def at(self, part: str) -> '_Where':
        return _Where(self.path, *self.parts, part)

    def __str__(self) -> str:
        return ': '.join([str(self.path), *self.parts])


BUTTONS = {'library': ('Install {} library', 'installPyLib'),
           'example': ('Load example: {}', 'loadExample'),
           'doc': ('Documentation and how to connect: {}', 'loadDoc')}


def _entry(entry: Any, definition: Definition, where: _Where) -> 'Block | Label | Button':
    if not isinstance(entry, dict):
        raise BlockdefError(f'{where}: every entry under `blocks` must be a mapping')

    # An entry with nothing but a label is a <label> line in the toolbox, and
    # one naming a library/example/doc is that button, in that position.
    boards = [str(b) for b in _as_list(entry.get('boards'))]
    if set(entry) - {'boards'} == {'label'} and isinstance(entry['label'], str):
        return Label(text=entry['label'], boards=boards)
    for key, (template, callback) in BUTTONS.items():
        if key in entry and not set(entry) - {key, 'suffix', 'boards'}:
            text = template.format(entry[key])
            if entry.get('suffix'):
                text += f' {entry["suffix"]}'
            return Button(text=text, key=callback, boards=boards)

    fn = entry.get('fn')
    type_ = entry.get('type') or (f'{definition.name}_{fn}' if fn else None)
    if not type_:
        raise BlockdefError(f'{where}: a block needs `type`, or `fn` to derive one from')
    at = where.at(f'block {type_!r}')

    external = bool(entry.get('external'))
    if external:
        extra = set(entry) - {'type', 'external', 'params', 'fields', 'boards'}
        if extra:
            raise BlockdefError(f'{at}: an `external` block is defined by hand, so only '
                                f'`params` and `fields` (its toolbox entry) mean anything '
                                f'here, not {sorted(extra)}')
        return Block(type=str(type_), external=True, boards=boards,
                     params=[_param(p, at) for p in entry.get('params', [])],
                     fields=_fields(entry.get('fields'), at))

    kind = entry.get('kind', 'statement')
    if kind not in ('statement', 'value'):
        raise BlockdefError(f'{at}: `kind` is "statement" or "value", not {kind!r}')

    constructor = bool(entry.get('constructor'))
    if constructor and not definition.cls:
        raise BlockdefError(f'{at}: `constructor` needs a top-level `class` to instantiate')
    if constructor and not (entry.get('instance') or definition.instance):
        raise BlockdefError(f'{at}: `constructor` needs an `instance` to assign')
    if constructor and kind == 'value':
        raise BlockdefError(f'{at}: a constructor is a statement, not a value')

    attr = entry.get('attr')
    if fn and attr:
        raise BlockdefError(f'{at}: `fn` calls a method and `attr` reads a value; '
                            f'a block does one or the other')
    code = entry.get('code')
    variants = _variants(entry.get('variants'), at)
    if variants and (code is not None or fn or attr or constructor):
        raise BlockdefError(f'{at}: `variants` is the code, one branch per board, so the '
                            f'block cannot also have `code`, `fn`, `attr` or `constructor`')
    if code is None and not variants and not fn and not attr and not constructor:
        raise BlockdefError(f'{at}: needs `fn` (a method to call), `attr` (a value to '
                            f'read), `code`, `variants`, or `constructor`')
    instance = entry.get('instance', definition.instance) or ''
    if attr and not instance:
        raise BlockdefError(f'{at}: `attr` reads off the object, so it needs an `instance`')

    colour = entry.get('colour')
    if colour is not None and not isinstance(colour, (int, str)):
        raise BlockdefError(f'{at}: `colour` is a hue number or a CSS colour name, '
                            f'not {colour!r}')

    params = [_param(p, at) for p in entry.get('params', [])]
    for index, param in enumerate(params):
        if param.row != 'next':
            continue
        rest = [p for p in params[index + 1:] if p.row != 'next']
        if not rest:
            raise BlockdefError(f'{at}: param {param.name!r} says `row: next`, but nothing '
                                f'follows it to share a row with')
    names = {p.name for p in params}
    i2c = _i2c_bus(entry.get('i2c_bus'), names, at)

    args = entry.get('args')
    if args is not None:
        if not isinstance(args, list):
            raise BlockdefError(f'{at}: `args` must be a list of param names')
        allowed = names | ({'bus'} if i2c else set())
        for a in args:
            if a not in allowed:
                raise BlockdefError(f'{at}: `args` mentions {a!r}, which is neither a param '
                                    f'nor "bus"')

    rows = _rows(entry.get('label'), fn or attr or type_, at)
    # `footer:` is the same thing on the other side of the params -- the aside
    # `tone` and `note` end on, "(0 for infinite duration)".
    footer = _rows(entry['footer'], '', at.at('footer')) if entry.get('footer') else []

    block = Block(
        type=str(type_), rows=rows, footer=footer,
        tooltip=_text(entry.get('tooltip'), at.at('tooltip')),
        kind=kind, fn=fn, attr=attr, instance=instance, colour=colour, args=args, code=code,
        output=entry.get('output'), params=params,
        inline=entry.get('inline'), constructor=constructor, i2c_bus=i2c,
        imports=_imports(entry.get('import'), None, at) if 'import' in entry else [],
        fields=_fields(entry.get('fields'), at),
        help_url=entry.get('url', definition.help_url),
        boards=boards, variants=variants,
    )
    _check_unknown(entry, {'type', 'fn', 'attr', 'instance', 'colour', 'label', 'footer',
                           'tooltip',
                           'kind', 'args', 'code', 'output', 'params', 'inline',
                           'constructor', 'i2c_bus', 'url', 'external', 'import',
                           'fields', 'boards', 'variants'}, at)
    return block


def _rows(value: Any, fallback: str, where: _Where) -> list[Row]:
    """`label:` -- one row of text, or a list of rows carrying text and images."""
    if value is None:
        return [Row(label=Text(text=_humanize(fallback)))]
    if value == []:
        # No row of its own: the block's text belongs to its first param, on the
        # same line as the field.
        return []
    entries = value if isinstance(value, list) else [value]
    rows: list[Row] = []
    for index, entry in enumerate(entries):
        at = where.at(f'label row {index + 1}')
        if isinstance(entry, str):
            rows.append(Row(label=Text(text=entry)))
            continue
        if not isinstance(entry, dict):
            raise BlockdefError(f'{at}: a label row is a string or a mapping, not {entry!r}')
        image = entry.get('image')
        if image is not None:
            if not isinstance(image, dict) or 'src' not in image:
                raise BlockdefError(f'{at}: `image` needs at least `src`')
            _check_unknown(image, {'src', 'width', 'height', 'alt'}, at.at('image'))
            image = Image(src=str(image['src']), width=int(image.get('width', 65)),
                          height=int(image.get('height', 65)), alt=str(image.get('alt', '*')))
        align = entry.get('align')
        if align is not None and align not in ALIGNS:
            raise BlockdefError(f'{at}: `align` is one of {sorted(ALIGNS)}, not {align!r}')
        row = Row(label=_text(entry, at), image=image, align=align)
        if row.label.empty and row.image is None:
            raise BlockdefError(f'{at}: a label row needs `text`, `msg` or `image`')
        _check_unknown(entry, {'text', 'msg', 'field', 'image', 'align'}, at)
        rows.append(row)
    return rows


def _text(value: Any, where: _Where) -> Text:
    """Literal text, or `{msg: key}` for something the translations carry."""
    if value is None:
        return Text()
    if isinstance(value, str):
        return Text(text=value, given=True)
    if not isinstance(value, dict):
        raise BlockdefError(f'{where}: expected text or a mapping, not {value!r}')
    if 'text' in value and 'msg' in value:
        raise BlockdefError(f'{where}: `text` and `msg` are two ways to say the same thing; '
                            f'use one')
    return Text(text=str(value.get('text', '')), msg=value.get('msg'),
                field=value.get('field'), given=True)


def _param(entry: Any, where: _Where) -> Param:
    if not isinstance(entry, dict) or 'name' not in entry:
        raise BlockdefError(f'{where}: every entry under `params` must be a mapping with '
                            f'a `name`')
    at = where.at(f'param {entry["name"]!r}')

    kind = entry.get('kind', 'input')
    if kind not in PARAM_KINDS:
        raise BlockdefError(f'{at}: `kind` is one of {sorted(PARAM_KINDS)}, not {kind!r}')

    align = entry.get('align')
    if align is not None and align not in ALIGNS:
        raise BlockdefError(f'{at}: `align` is one of {sorted(ALIGNS)}, not {align!r}')

    options: list[tuple[str, str]] = []
    if kind == 'dropdown':
        options = _options(entry.get('options'), at)
    elif entry.get('options'):
        raise BlockdefError(f'{at}: `options` only means something on a dropdown')

    emit = entry.get('emit')
    if emit is not None:
        if kind != 'dropdown':
            raise BlockdefError(f'{at}: `emit` maps dropdown values to Python, so `kind` '
                                f'must be "dropdown"')
        if not isinstance(emit, dict):
            raise BlockdefError(f'{at}: `emit` must be a mapping of option value to Python')
        chosen = {value for _label, value in options}
        unknown = sorted(str(k) for k in emit if str(k) not in chosen)
        if unknown:
            raise BlockdefError(f'{at}: `emit` mentions {unknown}, which are not option values')
        missing = sorted(chosen - {str(k) for k in emit})
        if missing:
            raise BlockdefError(f'{at}: `emit` has nothing for option value(s) {missing}')
        emit = {str(k): str(v) for k, v in emit.items()}

    param = Param(
        name=str(entry['name']), label=_text(entry.get('label'), at.at('label')), kind=kind,
        type=entry.get('type'), default=entry.get('default'), align=align,
        pin=bool(entry.get('pin')), keyword=entry.get('keyword'), options=options, emit=emit,
        min=entry.get('min'), max=entry.get('max'), precision=entry.get('precision'),
        shadow=entry.get('shadow', True), unquote=bool(entry.get('unquote')),
        row=entry.get('row'), suffix=_text(entry.get('suffix'), at.at('suffix')),
        plug=_plug(entry.get('plug'), at),
    )
    # The emitter reads each param into `var <name>_`, so a name that is not an
    # identifier would produce JavaScript that does not parse. Every shipped
    # input name is one already (`Função` included -- Unicode letters are fine).
    if not re.fullmatch(r'[^\W\d][\w$]*', param.name):
        raise BlockdefError(f'{at}: {param.name!r} cannot be a variable name, and the '
                            f'generator reads every param into one')
    if param.pin and param.kind != 'input':
        raise BlockdefError(f'{at}: `pin` describes the shadow of an input, so `kind` '
                            f'must be "input"')
    if param.unquote and param.kind != 'input':
        raise BlockdefError(f'{at}: `unquote` is about the text a value block produces, '
                            f'so `kind` must be "input"')
    if param.plug and param.kind != 'input':
        raise BlockdefError(f'{at}: `plug` fills a socket, so `kind` must be "input"')
    if not param.suffix.empty and param.kind in SOCKET_KINDS:
        raise BlockdefError(f'{at}: `suffix` is the label after a field; a socket\'s label '
                            f'already comes last on its row')
    if param.kind == 'statements' and (param.type or param.default is not None):
        raise BlockdefError(f'{at}: a `statements` socket holds blocks, not a value, so it '
                            f'has no `type` and no `default`')
    if param.row is not None:
        if param.row != 'next':
            raise BlockdefError(f'{at}: the only `row` there is is "next" -- the field '
                                f'rides on the row of the param after it -- not {param.row!r}')
        if param.kind == 'input':
            raise BlockdefError(f'{at}: `row: next` moves a field onto the row after it, '
                                f'and a socket already brings a row of its own')
    _check_unknown(entry, {'name', 'label', 'kind', 'type', 'default', 'align', 'pin',
                           'keyword', 'options', 'emit', 'min', 'max', 'precision',
                           'shadow', 'unquote', 'row', 'suffix', 'plug'}, at)
    return param


def _variants(raw: Any, where: _Where) -> list[Variant]:
    """`variants:` -- the block emits different Python on different boards.

    Each entry is a `device:` (the board selector's value) with its own `code:`
    and, because the two ports rarely import the same things, its own
    `import:`. The last entry carries no `device:` and is the fallback, which
    is how the hand-written versions of these blocks are written too: one
    `if (UI['workspace'].selector.value == "ESP32S2")` and an `else`.
    """
    if raw is None:
        return []
    if not isinstance(raw, list) or not raw:
        raise BlockdefError(f'{where}: `variants` is a list, one entry per board')
    out: list[Variant] = []
    for index, entry in enumerate(raw):
        at = where.at(f'variants[{index}]')
        if not isinstance(entry, dict):
            raise BlockdefError(f'{at}: each variant is a mapping with `code`')
        _check_unknown(entry, {'device', 'code', 'import'}, at)
        if 'code' not in entry:
            raise BlockdefError(f'{at}: a variant needs `code` -- what this board emits')
        device = entry.get('device')
        if device is not None and not isinstance(device, str):
            raise BlockdefError(f'{at}: `device` is the board selector\'s value, a string')
        if device is None and index != len(raw) - 1:
            raise BlockdefError(f'{at}: the variant with no `device` is the fallback, so '
                                f'nothing can come after it')
        out.append(Variant(code=str(entry['code']), device=device,
                           imports=_imports(entry.get('import'), None, at)
                           if 'import' in entry else []))
    if out[-1].device is not None:
        raise BlockdefError(f'{where}: the last variant is the fallback and carries no '
                            f'`device` -- a board nobody listed still has to generate '
                            f'something')
    devices = [v.device for v in out[:-1]]
    if len(set(devices)) != len(devices):
        raise BlockdefError(f'{where}: two variants name the same `device`')
    return out


def _plug(raw: Any, where: _Where) -> dict[str, Any] | None:
    """`plug:` -- the toolbox entry comes with a real block already in the socket.

    A shadow is a placeholder the user types over; a plugged block is a block,
    and several categories are only usable because one is already there (every
    TFT drawing block arrives with its colour block attached).
    """
    if raw is None:
        return None
    if not isinstance(raw, dict) or 'type' not in raw:
        raise BlockdefError(f'{where}: `plug` needs at least a `type` -- the block to put '
                            f'in the socket')
    _check_unknown(raw, {'type', 'values', 'fields', 'shadow'}, where.at('plug'))
    values = raw.get('values') or {}
    fields = raw.get('fields') or {}
    for name, mapping in (('values', values), ('fields', fields)):
        if not isinstance(mapping, dict):
            raise BlockdefError(f'{where}: `plug.{name}` must be a mapping')
    return {'type': str(raw['type']),
            'shadow': bool(raw.get('shadow')),
            'values': {str(k): v for k, v in values.items()},
            'fields': {str(k): str(v) for k, v in fields.items()}}


def _options(raw: Any, where: _Where) -> list[tuple[Text, str]]:
    if not isinstance(raw, list) or not raw:
        raise BlockdefError(f'{where}: a dropdown needs a non-empty `options` list')
    options: list[tuple[Text, str]] = []
    for opt in raw:
        if isinstance(opt, dict) and 'value' in opt:
            # The long form, for when the label is translated: {label: {msg: k},
            # value: "0"}. The value is what a saved program stores.
            _check_unknown(opt, {'label', 'value'}, where.at('option'))
            label, value = _text(opt.get('label'), where.at('option')), opt['value']
        elif isinstance(opt, dict) and len(opt) == 1:
            key, value = next(iter(opt.items()))
            label = Text(text=str(key), given=True)
        elif isinstance(opt, list) and len(opt) == 2:
            label, value = Text(text=str(opt[0]), given=True), opt[1]
        elif isinstance(opt, (str, int, float)):
            label, value = Text(text=str(opt), given=True), opt
        else:
            raise BlockdefError(f'{where}: an option is `label: value`, [label, value], a '
                                f'bare value, or `{{label, value}}`, not {opt!r}')
        options.append((label, str(value)))
    return options


def _i2c_bus(raw: Any, names: set[str], where: _Where) -> dict[str, Any] | None:
    """`i2c_bus:` -- a string names one of the params, a number is a literal."""
    if raw is None:
        return None
    if not isinstance(raw, dict):
        raise BlockdefError(f'{where}: `i2c_bus` must be a mapping of scl/sda/id/freq to '
                            f'param names or literal values')
    unknown = set(raw) - {'scl', 'sda', 'id', 'freq', 'soft'}
    if unknown:
        raise BlockdefError(f'{where}: `i2c_bus` does not take {sorted(unknown)}')
    for key, value in raw.items():
        if key == 'soft' or isinstance(value, (int, float)):
            continue
        if value not in names:
            raise BlockdefError(f'{where}: `i2c_bus` {key} is {value!r}, which is neither one '
                                f'of its params nor a number')
    return dict(raw)


def _defaults(raw: Any, definition: Definition, where: _Where) -> dict[str, dict[str, Any]]:
    """Per-board shadow values, for the pins that genuinely differ per board.

    Everything else about a category is the same everywhere, and saying so once
    is the point; this is the one axis on which boards legitimately disagree.
    """
    if raw is None:
        return {}
    if not isinstance(raw, dict):
        raise BlockdefError(f'{where}: `defaults` must be a mapping of board to '
                            f'param overrides')
    params = {p.name for block in definition.blocks for p in block.params}
    out: dict[str, dict[str, Any]] = {}
    for board, overrides in raw.items():
        if board not in definition.toolboxes:
            raise BlockdefError(f'{where}: `defaults` has {board!r}, which is not one of '
                                f'`toolboxes`')
        if not isinstance(overrides, dict):
            raise BlockdefError(f'{where}: `defaults` for {board!r} must be a mapping of '
                                f'param name to value')
        unknown = sorted(str(k) for k in overrides if str(k) not in params)
        if unknown:
            raise BlockdefError(f'{where}: `defaults` for {board!r} mentions {unknown}, '
                                f'which no block here has as a param')
        out[str(board)] = {str(k): v for k, v in overrides.items()}
    return out


def _fields(raw: Any, where: _Where) -> dict[str, str]:
    """`fields:` -- values the toolbox entry starts with, as <field> elements."""
    if raw is None:
        return {}
    if not isinstance(raw, dict):
        raise BlockdefError(f'{where}: `fields` must be a mapping of field name to value')
    return {str(k): str(v) for k, v in raw.items()}


def _imports(spec: Any, module: str | None, where: _Where) -> list[Import]:
    """The import lines every block in the file registers, and their keys.

    `definitions_` is a dict, so the key decides whether two blocks share an
    import or emit it twice. Deriving it from the line means two families that
    import the same thing agree without being told to -- but a hand-written
    generator elsewhere may already use a key of its own for that same line, so
    `key:` exists to match it and keep the output free of duplicates.
    """
    if spec is None:
        spec = [f'import {module}'] if module else []
    for entry in _as_list(spec):
        if isinstance(entry, dict):
            _check_unknown(entry, {'line', 'key'}, where.at('import'))
    imports: list[Import] = []
    for entry in _as_list(spec):
        if isinstance(entry, str):
            line, key = entry, None
        elif isinstance(entry, dict) and 'line' in entry:
            line, key = str(entry['line']), entry.get('key')
        else:
            raise BlockdefError(f'{where}: `import` is a line, a `{{line, key}}` mapping, '
                                f'or a list of either')
        imports.append(Import(line=line, key=str(key) if key else _derive_key(line)))
    return imports


def _derive_key(line: str) -> str:
    return ''.join(c if c.isalnum() else '_' for c in line).strip('_')


def _humanize(name: str) -> str:
    return ' '.join(w.capitalize() for w in str(name).replace('__', '_').split('_') if w)


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def _req_str(mapping: dict, key: str, where: _Where) -> str:
    value = mapping.get(key)
    if not isinstance(value, str) or not value.strip():
        raise BlockdefError(f'{where}: `{key}` is required and must be a non-empty string')
    return value.strip()


def _check_unknown(mapping: dict, known: set[str], where: _Where) -> None:
    """Reject typos. A silently ignored key is a block that quietly lacks a field."""
    unknown = sorted(set(mapping) - known)
    if unknown:
        raise BlockdefError(f'{where}: unknown key(s) {unknown}; expected some of {sorted(known)}')
