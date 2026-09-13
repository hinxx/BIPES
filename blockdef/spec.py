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

import yaml


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
PARAM_KINDS = frozenset({'input', 'dropdown', 'number', 'text', 'checkbox', 'variable'})


@dataclass(slots=True)
class Param:
    name: str                       # input/field name, and the {placeholder} in code
    label: str = ''                 # text shown before it
    kind: str = 'input'
    type: str | None = None         # setCheck() for inputs; also picks the shadow
    default: Any = None
    align: str | None = None
    pin: bool = False               # shadow is <pinout>, not <math_number>
    options: list[tuple[str, str]] = field(default_factory=list)   # dropdown
    min: Any = None                 # number field
    max: Any = None
    precision: Any = None
    shadow: bool = True             # False -> no shadow in the toolbox entry


@dataclass(slots=True)
class Image:
    src: str
    width: int
    height: int
    alt: str = '*'


@dataclass(slots=True)
class Block:
    type: str                       # Blockly block id -- never change one that shipped
    label: str
    tooltip: str = ''
    kind: str = 'statement'         # 'statement' | 'value'
    fn: str | None = None           # Python method called on the instance
    args: list[str] | None = None   # call arguments; defaults to the params
    code: str | None = None         # escape hatch: full Python template
    output: str | None = None       # setOutput type for value blocks
    params: list[Param] = field(default_factory=list)
    image: Image | None = None
    inline: bool | None = None
    constructor: bool = False
    i2c_bus: dict[str, str] | None = None   # -> Blockly.Python.i2cBus_()
    help_url: str | None = None


@dataclass(slots=True)
class Definition:
    path: Path
    name: str                       # file stem; names the toolbox markers
    module: str                     # Python module imported on the board
    cls: str | None                 # class instantiated by the constructor
    instance: str                   # variable the constructor assigns
    import_line: str
    import_key: str
    category: str
    colour: int | None              # setColour for every block in the family
    labels: list[str]
    library: list[str]              # "Install <name> library" buttons
    toolboxes: list[str]
    help_url: str | None
    blocks: list[Block]


def load(path: str | Path) -> Definition:
    path = Path(path)
    try:
        raw = yaml.safe_load(path.read_text(encoding='utf-8'))
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
    imports = raw.get('import')
    import_line, import_key = _import(imports, module, where)

    definition = Definition(
        path=path,
        name=path.name.split('.')[0],
        module=module,
        cls=raw.get('class'),
        instance=raw.get('instance') or '',
        import_line=import_line,
        import_key=import_key,
        category=_req_str(category, 'name', cat),
        colour=_opt_int(raw, 'colour', where),
        labels=[str(x) for x in category.get('labels', [])],
        library=[str(x) for x in _as_list(category.get('library'))],
        toolboxes=[str(x) for x in _as_list(category.get('toolboxes'))],
        help_url=raw.get('url'),
        blocks=[],
    )

    blocks = raw.get('blocks')
    if not isinstance(blocks, list) or not blocks:
        raise BlockdefError(f'{where}: `blocks` must be a non-empty list')

    seen: set[str] = set()
    for entry in blocks:
        block = _block(entry, definition, where)
        if block.type in seen:
            raise BlockdefError(f'{where}: two blocks both call themselves {block.type!r}')
        seen.add(block.type)
        definition.blocks.append(block)

    _check_unknown(raw, {'module', 'class', 'instance', 'import', 'url', 'colour',
                         'category', 'blocks'}, where)
    _check_unknown(category, {'name', 'labels', 'library', 'toolboxes'}, cat)
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


def _block(entry: Any, definition: Definition, where: _Where) -> Block:
    if not isinstance(entry, dict):
        raise BlockdefError(f'{where}: every entry under `blocks` must be a mapping')

    fn = entry.get('fn')
    type_ = entry.get('type') or (f'{definition.name}_{fn}' if fn else None)
    if not type_:
        raise BlockdefError(f'{where}: a block needs `type`, or `fn` to derive one from')
    at = where.at(f'block {type_!r}')

    kind = entry.get('kind', 'statement')
    if kind not in ('statement', 'value'):
        raise BlockdefError(f'{at}: `kind` is "statement" or "value", not {kind!r}')

    constructor = bool(entry.get('constructor'))
    if constructor and not definition.cls:
        raise BlockdefError(f'{at}: `constructor` needs a top-level `class` to instantiate')
    if constructor and not definition.instance:
        raise BlockdefError(f'{at}: `constructor` needs a top-level `instance` to assign')

    code = entry.get('code')
    if not code and not fn and not constructor:
        raise BlockdefError(f'{at}: needs `fn` (a method to call), `code`, or `constructor`')

    image = entry.get('image')
    if image is not None:
        if not isinstance(image, dict) or 'src' not in image:
            raise BlockdefError(f'{at}: `image` needs at least `src`')
        image = Image(src=str(image['src']),
                      width=int(image.get('width', 65)),
                      height=int(image.get('height', 65)),
                      alt=str(image.get('alt', '*')))

    params = [_param(p, at) for p in entry.get('params', [])]
    names = {p.name for p in params}

    i2c = entry.get('i2c_bus')
    if i2c is not None:
        if not isinstance(i2c, dict):
            raise BlockdefError(f'{at}: `i2c_bus` must be a mapping of scl/sda/id/freq to param names')
        unknown = set(i2c) - {'scl', 'sda', 'id', 'freq', 'soft'}
        if unknown:
            raise BlockdefError(f'{at}: `i2c_bus` does not take {sorted(unknown)}')
        for key, value in i2c.items():
            if key != 'soft' and value not in names:
                raise BlockdefError(f'{at}: `i2c_bus` {key} refers to {value!r}, which is not one of its params')

    args = entry.get('args')
    if args is not None:
        if not isinstance(args, list):
            raise BlockdefError(f'{at}: `args` must be a list of param names')
        allowed = names | ({'bus'} if i2c else set())
        for a in args:
            if a not in allowed:
                raise BlockdefError(f'{at}: `args` mentions {a!r}, which is neither a param nor "bus"')

    if kind == 'value' and constructor:
        raise BlockdefError(f'{at}: a constructor is a statement, not a value')

    block = Block(
        type=str(type_), label=str(entry.get('label') or _humanize(fn or type_)),
        tooltip=str(entry.get('tooltip', '')), kind=kind, fn=fn,
        args=args, code=code, output=entry.get('output'), params=params, image=image,
        inline=entry.get('inline'), constructor=constructor, i2c_bus=i2c,
        help_url=entry.get('url', definition.help_url),
    )
    _check_unknown(entry, {'type', 'fn', 'label', 'tooltip', 'kind', 'args', 'code', 'output',
                           'params', 'image', 'inline', 'constructor', 'i2c_bus', 'url'}, at)
    return block


def _param(entry: Any, where: _Where) -> Param:
    if not isinstance(entry, dict) or 'name' not in entry:
        raise BlockdefError(f'{where}: every entry under `params` must be a mapping with a `name`')
    at = where.at(f'param {entry["name"]!r}')

    kind = entry.get('kind', 'input')
    if kind not in PARAM_KINDS:
        raise BlockdefError(f'{at}: `kind` is one of {sorted(PARAM_KINDS)}, not {kind!r}')

    align = entry.get('align')
    if align is not None and align not in ALIGNS:
        raise BlockdefError(f'{at}: `align` is one of {sorted(ALIGNS)}, not {align!r}')

    options: list[tuple[str, str]] = []
    if kind == 'dropdown':
        raw_options = entry.get('options')
        if not isinstance(raw_options, list) or not raw_options:
            raise BlockdefError(f'{at}: a dropdown needs a non-empty `options` list')
        for opt in raw_options:
            if isinstance(opt, dict) and len(opt) == 1:
                label, value = next(iter(opt.items()))
            elif isinstance(opt, list) and len(opt) == 2:
                label, value = opt
            else:
                raise BlockdefError(f'{at}: an option is `label: value` or [label, value], not {opt!r}')
            options.append((str(label), str(value)))
    elif entry.get('options'):
        raise BlockdefError(f'{at}: `options` only means something on a dropdown')

    param = Param(
        name=str(entry['name']), label=str(entry.get('label', '')), kind=kind,
        type=entry.get('type'), default=entry.get('default'), align=align,
        pin=bool(entry.get('pin')), options=options,
        min=entry.get('min'), max=entry.get('max'), precision=entry.get('precision'),
        shadow=entry.get('shadow', True),
    )
    if param.pin and param.kind != 'input':
        raise BlockdefError(f'{at}: `pin` describes the shadow of an input, so `kind` must be "input"')
    _check_unknown(entry, {'name', 'label', 'kind', 'type', 'default', 'align', 'pin',
                           'options', 'min', 'max', 'precision', 'shadow'}, at)
    return param


def _import(spec: Any, module: str, where: _Where) -> tuple[str, str]:
    """The one import line every block in the file registers, and its key.

    `definitions_` is a dict, so the key is what decides whether two blocks
    share an import or emit it twice. Deriving it from the line itself means
    two files that import the same thing agree without being told to.
    """
    if spec is None:
        line = f'import {module}'
    elif isinstance(spec, str):
        line = spec
    elif isinstance(spec, dict):
        names = _as_list(spec.get('names'))
        if 'from' not in spec or not names:
            raise BlockdefError(f'{where}: `import` as a mapping needs `from` and `names`')
        line = f'from {spec["from"]} import {", ".join(str(n) for n in names)}'
    else:
        raise BlockdefError(f'{where}: `import` is a string or a from/names mapping')
    key = ''.join(c if c.isalnum() else '_' for c in line).strip('_')
    return line, key


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


def _opt_int(mapping: dict, key: str, where: _Where) -> int | None:
    value = mapping.get(key)
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        raise BlockdefError(f'{where}: `{key}` must be a number, not {value!r}') from None


def _check_unknown(mapping: dict, known: set[str], where: _Where) -> None:
    """Reject typos. A silently ignored key is a block that quietly lacks a field."""
    unknown = sorted(set(mapping) - known)
    if unknown:
        raise BlockdefError(f'{where}: unknown key(s) {unknown}; expected some of {sorted(known)}')
