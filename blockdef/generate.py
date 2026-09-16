"""Read every definition, write the two JS files, splice the toolbox categories.

The toolbox is the one artefact this tool does not own outright. Where a
category sits in a board's tree -- which parent it nests under, what comes
before it -- is a judgement about that board, so the file keeps it: a pair of
markers says where the category goes, and everything between them is replaced.

    <!-- blockdef:gy33_i2c -->
    ...generated...
    <!-- /blockdef:gy33_i2c -->

Adding a family to a board is therefore one manual edit, putting an empty
marker pair where it belongs. A board listed in `toolboxes:` without markers is
an error rather than an append, because guessing the position would put the
category somewhere nobody chose.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from xml.etree import ElementTree

from .emit import (_UNSET, _code_js, _shadow_xml, emit_blocks_js,
                   emit_category_xml, emit_generators_js)
from .spec import BlockdefError, Block, Definition, Param, load

DEFINITIONS = Path('blockdef/definitions')
TOOLBOX = Path('ui/toolbox')
BLOCKS_JS = Path('ui/core/blocks_generated.js')
GENERATORS_JS = Path('ui/core/generators_generated.js')


def generate(root: str | Path = '.', verbose: bool = True) -> list[Path]:
    root = Path(root)
    definitions = _load_all(root)
    written: list[Path] = []

    _check_block_types_are_unique(definitions)
    _check_no_clash_with_handwritten(root, definitions)
    _check_no_duplicate_handwritten(root)
    _check_variant_devices_exist(root, definitions)
    _check_pin_defaults_are_real_and_distinct(root, definitions)
    _check_generated_python_parses(definitions)

    blocks_js = emit_blocks_js(definitions)
    generators_js = emit_generators_js(definitions)
    _check_no_unresolved_placeholders(blocks_js, definitions)
    _check_no_unresolved_placeholders(generators_js, definitions)

    written += _write(root / BLOCKS_JS, blocks_js)
    written += _write(root / GENERATORS_JS, generators_js)
    written += _stamp_page(root)

    # A board with no pin list gets no `<field name="PIN">` at all: `default.xml`
    # is nobody's board and `stm32.xml`'s Nucleo ships no pinout, so every
    # `pinout` dropdown there offers "not defined" and nothing else. Writing a
    # number into one makes Blockly warn and fall back; leaving it out is the
    # same fallback, quietly. With no devinfo.json to read, nothing is known
    # about any board and every default is written as before.
    pins_of = _toolbox_pins(root)
    for definition in definitions:
        for board in definition.toolboxes:
            path = root / TOOLBOX / f'{board}.xml'
            if not path.exists():
                raise BlockdefError(f'{definition.path}: no toolbox called {board!r} '
                                    f'({path} does not exist)')
            written += _splice(path, definition,
                               pins_of.get(board, set()) if pins_of else None)
        written += _empty_orphaned_markers(root, definition)

    _check_toolbox_block_types_exist(root)
    _check_every_block_has_a_generator(root)
    _check_toolboxes_are_well_formed(root, written)

    if verbose:
        blocks = sum(len(d.blocks) for d in definitions)
        print(f'{len(definitions)} definition(s), {blocks} blocks')
        for path in dict.fromkeys(written):      # a toolbox can carry several
            print(f'  wrote {path}')
        if not written:
            print('  everything already up to date')
    return written


def _load_all(root: Path) -> list[Definition]:
    paths = sorted((root / DEFINITIONS).glob('*.blockdef.yaml'))
    if not paths:
        raise BlockdefError(f'{root / DEFINITIONS}: no *.blockdef.yaml files')
    return [load(p) for p in paths]


def _check_block_types_are_unique(definitions: list[Definition]) -> None:
    seen: dict[str, Path] = {}
    for definition in definitions:
        for block in definition.blocks:
            if block.type in seen:
                raise BlockdefError(f'{definition.path}: block {block.type!r} is also defined '
                                    f'in {seen[block.type]}')
            seen[block.type] = definition.path


def _check_no_clash_with_handwritten(root: Path, definitions: list[Definition]) -> None:
    """A block defined in both places is the drift this tool exists to stop.

    Whichever file loads last would win silently, so say so instead.
    """
    handwritten = root / 'ui/core/block_definitions.js'
    if not handwritten.exists():
        return
    source = handwritten.read_text(encoding='utf-8')
    defined = set(re.findall(r"""Blockly\.Blocks\s*\[\s*['"]([^'"]+)['"]\s*\]\s*=""", source))
    for definition in definitions:
        clashing = sorted(b.type for b in definition.blocks if b.type in defined)
        if clashing:
            raise BlockdefError(
                f'{definition.path}: {clashing} are still defined by hand in '
                f'{handwritten}. Delete them there -- a block belongs to one file.')


def _stamp_page(root: Path) -> list[Path]:
    """Put a content hash on the two generated `<script src>` in index.html.

    Every other script on that page carries a hand-bumped `?ver=`; these two
    carried nothing, so a browser that had loaded them once kept them --
    through a `make blocks`, through a deploy, through anything. A reader who
    updated BIPES went on running the blocks they had. The hash is of the file
    the tool just wrote, so the query changes exactly when the content does.
    """
    page = root / 'ui/index.html'
    if not page.exists():
        return []
    source = original = page.read_text(encoding='utf-8')
    for path in (root / BLOCKS_JS, root / GENERATORS_JS):
        if not path.exists():
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
        source = re.sub(r'(<script src="core/' + re.escape(path.name) + r')(\?v=[0-9a-f]+)?(")',
                        lambda m: f'{m.group(1)}?v={digest}{m.group(3)}', source)
    if source == original:
        return []
    page.write_text(source, encoding='utf-8', newline='\n')
    return [page]


def _check_variant_devices_exist(root: Path, definitions: list[Definition]) -> None:
    """A `device:` nobody can select is a branch that never runs.

    `net_ap_mode` compared the selector against "Raspberry Pi Pico W", which is
    the *label* on the `<option>`; its value is `RPI_Pico_W`, so the Pico W
    branch someone wrote for it had never executed. The option values are read
    out of the page, so the list cannot drift from the dropdown.
    """
    page = root / 'ui/index.html'
    if not page.exists():
        return
    known = set(re.findall(r'<option[^>]+value="([^"]+)"', page.read_text(encoding='utf-8')))
    if not known:
        return
    for definition in definitions:
        for block in definition.blocks:
            for variant in block.variants:
                if variant.device is not None and variant.device not in known:
                    raise BlockdefError(
                        f'{definition.path}: block {block.type!r} has a variant for device '
                        f'{variant.device!r}, which is not one of the board selector\'s '
                        f'values in ui/index.html. The value is what `<option value=>` '
                        f'says, not the label the dropdown shows.')


def _check_pin_defaults_are_real_and_distinct(root: Path, definitions: list[Definition]) -> None:
    """Every `pin: true` socket defaults to a pin the board has, and to its own.

    A `pinout` shadow with no default writes `<shadow type="pinout"></shadow>`,
    and an empty `pinout` dropdown falls back to the *first* entry in the
    board's `devinfo.json` pinout without saying so. A block for a two-wire
    device therefore arrives wired to one wire: `init_mpu6050` emitted
    `I2C(0, scl=Pin(2), sda=Pin(2))` on fifteen boards, `hcsr_init` put trigger
    and echo on the same GPIO. That is 143 flyout entries over 15 block types,
    fixed under B8; this is the check that stops it coming back.

    A default the board does not *have* is the same fault wearing a number:
    the dropdown falls back to the first pin exactly as an empty one does. So
    that is refused outright, collision or not -- it is how `st7789_init` was
    caught offering the esp32c3 five sockets numbered 11 to 15 on a chip whose
    pins stop at 10, and how a board added to `toolboxes:` without an entry in
    `defaults:` says so at build time instead of in somebody's wiring.

    A toolbox no device gives a pinout (`stm32`, `default`) is skipped: every
    socket there reads "not defined" whatever the default says, so no default
    can tell them apart. `_shadow_xml` writes no `PIN` field at all on those,
    which is the other half of the same decision. Devices that *share* a toolbox and disagree about
    their pins are not this check's business either -- one `defaults:` entry
    cannot satisfy both, and the ESP32-LoRa lacking GPIO16 is a fact about that
    board, not about the default. The union of the toolbox's pins is what
    counts as resolvable.
    """
    pins_of = _toolbox_pins(root)
    if not pins_of:
        return
    for definition in definitions:
        for block in definition.entries:
            if not isinstance(block, Block):
                continue        # a <label> or a button has no sockets
            if getattr(block, 'offered', True) is False:
                continue        # in no flyout, so there is no entry to get wrong
            sockets = [p for p in block.params
                       if p.kind == 'input' and p.pin and p.shadow and not p.plug]
            if not sockets:
                continue
            for board in (block.boards or definition.toolboxes):
                known = pins_of.get(board)
                if not known:
                    continue
                overrides = definition.defaults.get(board, {})
                landing: dict[str, list[str]] = {}
                for socket in sockets:
                    value = overrides.get(socket.name, socket.default)
                    if value is not None and str(value) not in known:
                        raise BlockdefError(
                            f'{definition.path}: block {block.type!r} defaults {socket.name} '
                            f'to pin {value}, which {board} does not have. Give it a '
                            f'`defaults: {{{board}: {{{socket.name}: ...}}}}` entry naming '
                            f'a pin from that board\'s devinfo.json -- a socket whose '
                            f'default the board does not offer falls back to the first '
                            f'pin, which is not the pin anybody chose.')
                    where = (str(value) if value is not None
                             else 'the board\'s first pin')
                    landing.setdefault(where, []).append(socket.name)
                if len(sockets) < 2:
                    continue        # one socket has nothing to collide with
                clash = {where: names for where, names in landing.items() if len(names) > 1}
                if clash:
                    raise BlockdefError(
                        f'{definition.path}: block {block.type!r} puts '
                        + '; '.join(f'{" and ".join(names)} on {where}'
                                    for where, names in clash.items())
                        + f' on {board}. Give each `pin: true` socket a `default:` the '
                        f'board has, or a `defaults: {{{board}: ...}}` entry for it -- '
                        f'a socket whose default the board does not offer falls back to '
                        f'the first pin, silently, which is how they end up together.')


def _toolbox_pins(root: Path) -> dict[str, set[str]]:
    """Every pin value each toolbox's boards offer, keyed by toolbox name.

    Several devices can share one toolbox (five selectable ones share
    `esp32.xml`) and `defaults:` is keyed by the toolbox, so the union is the
    most a default can be asked to land in.

    Only boards the selector actually offers count. `devinfo.json` describes
    three -- `wemos_d1_mini`, `ESP32-oled`, `ESP32-LoRa` -- that no `<option>`
    in `ui/index.html` names, so nobody can select them and their pinouts are
    never the ones a `pinout` dropdown reads. Their pin lists are also the only
    ones that disagree with the board they share a toolbox with, so counting
    them would ask `defaults:` for something one entry per toolbox cannot give.
    """
    devinfo = root / 'ui/devinfo/devinfo.json'
    if not devinfo.exists():
        return {}
    devices = json.loads(devinfo.read_text(encoding='utf-8')).get('devices', {})
    page = root / 'ui/index.html'
    selectable = set(re.findall(r'<option[^>]+value="([^"]+)"',
                                page.read_text(encoding='utf-8'))) if page.exists() else set()
    pins: dict[str, set[str]] = {}
    for name, device in devices.items():
        toolbox = (device.get('toolbox') or '').removesuffix('.xml')
        if not toolbox:
            continue
        pins.setdefault(toolbox, set())
        if selectable and name not in selectable:
            continue
        pins[toolbox].update(str(pin[1]) for pin in device.get('pinout') or [])
    return pins


def _check_no_unresolved_placeholders(js: str, definitions: list[Definition]) -> None:
    """A `{param}` that nothing interpolated, left in the emitted Python.

    `{name}` is a hole only for the block being emitted, so a *file-level*
    import naming one is filled in for the blocks that have that param and
    written out verbatim for the blocks that do not. The AmadoBoard's BLEUART
    class did that: `name={BLUETOOTH_NAME}` in a class every block in the
    family registers, where only the init block has the field. `definitions_`
    is a dict keyed by the entry's name, so whichever block generated last
    decided which of the two versions the program got.

    The `%{BKY_...}` in a category banner is Blockly's own message syntax and
    is not a hole.
    """
    owner = {block.type: definition.path
             for definition in definitions for block in definition.blocks}
    block_type = ''
    for line in js.split('\n'):
        named = re.search(r"""Blockly\.(?:Blocks|Python)\[\s*['"]([^'"]+)['"]\s*\]""", line)
        if named:
            block_type = named.group(1)
        for hole in re.findall(r'(?<!%)\{([A-Za-z_][A-Za-z0-9_]*)\}', line):
            raise BlockdefError(
                f'{owner.get(block_type, "?")}: block {block_type!r} emits {{{hole}}} '
                f'literally -- nothing interpolated it. A `{{name}}` is filled in from '
                f'the block being emitted, so a file-level `import:` naming one only '
                f'works for the blocks that have that param.')


def _check_generated_python_parses(definitions: list[Definition]) -> None:
    """The Python a block emits, with the toolbox's own sockets, has to parse.

    A generator that throws takes the whole program's code with it, and that is
    checked in a browser. This is the quieter half: the generator returns
    happily and what it returns is not Python. An empty socket generates
    nothing, so where the hole sits decides how bad it is -- `abs()` parses and
    raises at runtime, `filter(, )` and `spi.readinto(, 0)` do not parse at all,
    and a block that does not parse cannot be used, nor can any program holding
    one.

    So each block is rendered the way its flyout entry ships it: a socket with
    a shadow gets a name, a socket without one gets nothing, a field gets a
    value of its kind. An `offered: false` block is in no flyout, so every
    socket counts as filled -- a saved program had to have put something there.

    Everything is compiled inside an `async def`, which is what makes
    `uasyncio`'s `await` blocks legal here: they are correct inside one and a
    SyntaxError outside, which is the decision recorded in BACKLOG.md, not
    something this check should re-litigate.
    """
    for definition in definitions:
        for block in definition.blocks:
            if block.external:
                continue
            boards = [b for b in (block.boards or definition.toolboxes)] or ['']
            for board in boards:
                overrides = definition.defaults.get(board, {})
                for source in _python_of(definition, block, overrides):
                    try:
                        compile(source, '<blockdef>', 'exec')
                    except SyntaxError as error:
                        raise BlockdefError(
                            f'{definition.path}: block {block.type!r} emits Python that '
                            f'does not parse on {board or "every board"} -- '
                            f'{type(error).__name__}: {error.msg}. What it emits, with '
                            f'the sockets the toolbox gives it:\n'
                            + '\n'.join('    ' + line
                                         for line in source.split('\n'))) from None


def _python_of(definition: Definition, block: Block, overrides: dict) -> list[str]:
    """Each version of what this block emits, wrapped so it can be compiled."""
    filled = {p.name: (getattr(block, 'offered', True) is False
                       or _shadow_xml(p, overrides.get(p.name, _UNSET)) is not None)
              for p in block.params}
    sample = {p.name: _sample(p, filled[p.name]) for p in block.params}
    sample['bus'] = 'bus'
    instance = block.instance or definition.instance or 'obj'

    if block.variants:
        bodies = [_render(variant.code, sample, instance) for variant in block.variants]
    else:
        reads = {name: name + '_' for name in sample}
        bodies = [_unjs(_code_js(definition, block, reads), sample)]

    sources = []
    for body in bodies:
        if block.kind == 'value':
            body = '_x = ' + body
        # An `async def` so that `await` is in the place it belongs, and a
        # trailing `pass` so that a block emitting nothing but comments (or
        # nothing at all, like an init block whose whole job is registering
        # imports) still has a body. It cannot hide a missing one: a `pass` at
        # the function's own indentation is not a body for an `if` inside it.
        lines = body.split('\n') + ['pass']
        sources.append('async def _():\n'
                       + '\n'.join('    ' + line for line in lines) + '\n')
    return sources


def _sample(param: Param, filled: bool) -> str:
    """What this param contributes to the emitted Python in the flyout."""
    if param.kind == 'statements':
        return '  pass\n'          # Blockly.Python.PASS, one indented `pass`
    if param.kind == 'input':
        return '_v' if filled else ''
    if param.kind == 'dropdown':
        value = param.options[0][1] if param.options else 'X'
        return str(param.emit.get(value, value) if param.emit else value)
    if param.kind == 'checkbox':
        return 'True'
    if param.kind == 'text':
        return '"x"'                # JSON.stringify of whatever is typed
    if param.kind == 'variable':
        return 'v'
    if param.kind == 'colour':
        return '(0,0,0)'
    if param.kind in ('number', 'angle'):
        return str(param.default if param.default is not None else 0)
    return '_v'


def _render(template: str, sample: dict, instance: str) -> str:
    """`code:`/`variants[].code` with its holes filled, the way _template_js does."""
    out, i = '', 0
    while i < len(template):
        if template[i] == '{' and '}' in template[i:]:
            end = template.index('}', i)
            name = template[i + 1:end]
            if name in sample:
                out += sample[name]
            elif name == 'instance':
                out += instance
            else:
                out += template[i:end + 1]
            i = end + 1
        else:
            out += template[i]
            i += 1
    return out


def _unjs(expression: str, sample: dict) -> str:
    """Read back the JavaScript string expression the emitter just built.

    `_code_js` returns something like `"spi.readinto(" + buf_ + ", " + write_ +
    ")"`. Taking it apart rather than rebuilding the call keeps this check from
    drifting away from what is actually emitted.
    """
    out, i = '', 0
    while i < len(expression):
        c = expression[i]
        if c == '"':
            j = i + 1
            literal = ''
            while j < len(expression) and expression[j] != '"':
                if expression[j] == '\\':
                    literal += _UNESCAPE.get(expression[j + 1], expression[j + 1])
                    j += 2
                    continue
                literal += expression[j]
                j += 1
            out += literal
            i = j + 1
        elif c.isalnum() or c == '_':
            j = i
            while j < len(expression) and (expression[j].isalnum() or expression[j] == '_'):
                j += 1
            name = expression[i:j]
            out += sample.get(name[:-1], '_v') if name.endswith('_') else name
            i = j
        else:
            i += 1              # ` + ` and whitespace between the pieces
    return out


_UNESCAPE = {'n': '\n', 't': '\t', 'r': '\r', '"': '"', '\\': '\\'}


def _check_no_duplicate_handwritten(root: Path) -> None:
    """The same type assigned twice in one hand-written file.

    Whichever assignment comes last wins, silently, so the other one is a block
    someone wrote and nobody can drag. Four did that before anyone looked --
    the `uos` and `esp32.Partition` block-device methods, scraped twice from
    overlapping paragraphs of the same docs page.

    Comments are stripped first: both files park a superseded block behind
    `//~`, and a commented-out copy is not a definition.
    """
    for name in ('ui/core/block_definitions.js', 'ui/core/generator_stubs.js'):
        path = root / name
        if not path.exists():
            continue
        source = _without_comments(path.read_text(encoding='utf-8'))
        for table in ('Blockly.Blocks', 'Blockly.Python'):
            seen: set[str] = set()
            twice: list[str] = []
            for t in re.findall(re.escape(table) + r"""\[\s*['"]([^'"]+)['"]\s*\]\s*=""", source):
                (twice.append(t) if t in seen else seen.add(t))
            if twice:
                raise BlockdefError(
                    f'{path}: {sorted(set(twice))} assigned to {table} more than once. The '
                    f'last one wins and the rest are dead; delete all but one.')


def _without_comments(js: str) -> str:
    js = re.sub(r'/\*[\s\S]*?\*/', '', js)
    return '\n'.join('' if line.lstrip().startswith('//') else line
                     for line in js.split('\n'))


def _check_every_block_has_a_generator(root: Path) -> None:
    """A block the page defines and Python cannot generate.

    `_check_toolbox_block_types_exist` covers what a toolbox offers, which is
    not the same set: a block that no flyout lists can still be sitting in
    somebody's saved program, and `workspaceToCode` throws on the whole
    program when it meets one. `pico_stop_timer` was exactly that -- a real
    statement block, in no toolbox, with no generator anywhere.

    Mutator sub-blocks are the honest exception: they only ever exist inside a
    mutator's own mini-workspace and never generate code. They are recognised
    by the two ways a mutator names them, `new Blockly.Mutator([...])` and
    `newBlock("...")`.
    """
    scripts = list(_page_scripts(root))
    ours = list(_page_scripts(root, skip='_compressed.js'))
    if not ours:
        return
    # Only what this tree declares, and only by a real assignment: the two
    # Blockly bundles are minified and full of `type:"..."` strings that are
    # not block types, and both files park superseded blocks behind `//`.
    defined = _registered([_without_comments(js) for js in ours], 'Blockly.Blocks',
                          json_arrays=False)
    generators = _registered(scripts, 'Blockly.Python')
    sub_blocks: set[str] = set()
    for js in scripts:
        for names in re.findall(r'new Blockly\.Mutator\(\s*\[([^\]]*)\]', js):
            sub_blocks |= set(re.findall(r"""['"]([^'"]+)['"]""", names))
        sub_blocks |= set(re.findall(r"""newBlock\(\s*['"]([^'"]+)['"]""", js))
    missing = sorted(defined - generators - sub_blocks)
    if missing:
        raise BlockdefError(
            f'{missing} are defined as blocks but no file gives them a Blockly.Python '
            f'generator. A saved program holding one makes workspaceToCode throw, which '
            f'produces no code for the whole program.')


def _check_toolboxes_are_well_formed(root: Path, written: list[Path]) -> None:
    """A spliced toolbox that no longer parses, caught before anything reads it.

    The marker pair is found by text search, and `esp32.xml` keeps most of its
    `micropython` tree inside one long "blocks below need development" XML
    comment -- so a category listed in `toolboxes:` that only exists in there
    gets its generated copy written *inside* the comment, where the first
    `-->` ends it early and the rest of the file becomes markup. That is one
    `make blocks` away at any time; this is the check that says so.
    """
    for path in dict.fromkeys(p for p in written if p.suffix == '.xml'):
        try:
            ElementTree.parse(path)
        except ElementTree.ParseError as error:
            raise BlockdefError(
                f'{path}: splicing left XML that does not parse ({error}). If the marker '
                f'pair sits inside an XML comment, the category is commented out on that '
                f'board and does not belong in `toolboxes:`.') from None


def _check_toolbox_block_types_exist(root: Path) -> None:
    """A toolbox entry naming a block nobody defines breaks the whole category.

    Blockly does not skip the unknown block and carry on: building the flyout
    throws `Unknown block type`, so every block in that category -- and every
    category nested under it -- becomes unreachable. A block that exists but
    has no Python generator is worse: it drags out fine, and then
    `workspaceToCode` throws over it, so no code comes out of the program at
    all. Both are cheap to do by hand, easy to miss, and invisible until
    someone clicks that one category, which is why they are checked here rather
    than trusted to review.
    """
    scripts = list(_page_scripts(root))
    if not scripts:
        return                                    # no page to check against
    defined = _registered(scripts, 'Blockly.Blocks')
    generators = _registered(scripts, 'Blockly.Python')
    broken: dict[str, list[str]] = {}
    for path in sorted((root / TOOLBOX).glob('*.xml')):
        # Commented-out entries are not loaded, so they are not checked --
        # esp32's `micropython` tree is mostly one long "needs development"
        # comment, and it is a snapshot rather than a toolbox.
        xml = re.sub(r'<!--[\s\S]*?-->', '', path.read_text(encoding='utf-8'))
        types = set(re.findall(r'<(?:block|shadow)\s[^>]*type="([^"]+)"', xml))
        missing = sorted(f'{t} (no block)' for t in types - defined)
        missing += sorted(f'{t} (no generator)' for t in types & defined - generators)
        if missing:
            broken[path.name] = missing
    if broken:
        lines = [f'  {board}: {", ".join(types)}' for board, types in broken.items()]
        raise BlockdefError(
            'toolbox entries name blocks the page does not have. A missing block stops its '
            'whole category from opening; a missing generator stops any program that uses '
            'it from producing code at all:\n' + '\n'.join(lines))


def _page_scripts(root: Path, skip: str = '') -> list[str]:
    """The JavaScript index.html loads, in load order.

    `skip` drops any script whose filename ends with it.

    Taken from the page rather than written down here: block definitions live
    in five hand-written places besides this tool (the two
    `core/*_compressed.js` bundles, `block_definitions.js`, thirty strays in
    `generator_stubs.js`, and the OpenCV bindings under `jsCv/`), and a list
    kept by hand would go stale the first time one moved.
    """
    page = root / 'ui/index.html'
    if not page.exists():
        return []
    source = re.sub(r'<!--[\s\S]*?-->', '', page.read_text(encoding='utf-8'))
    scripts = []
    for src in re.findall(r'<script[^>]+src="([^"]+)"', source):
        path = root / 'ui' / src.split('?')[0]
        if skip and path.name.endswith(skip):
            continue
        if path.exists() and path.suffix == '.js':
            scripts.append(path.read_text(encoding='utf-8', errors='replace'))
    return scripts


def _registered(scripts: list[str], table: str, json_arrays: bool = True) -> set[str]:
    """Every key assigned into `Blockly.Blocks` / `Blockly.Python` by that JS."""
    escaped = re.escape(table)
    names: set[str] = set()
    for js in scripts:
        names |= set(re.findall(escaped + r"""\[\s*['"]([^'"]+)['"]\s*\]\s*=""", js))
        names |= set(re.findall(escaped + r'\.([A-Za-z0-9_$]+)\s*=', js))
        if json_arrays and table == 'Blockly.Blocks':
            # JSON block arrays, including the minified `type:"x"` spelling.
            # The `input_`/`field_` names inside args are not block types.
            names |= {t for t in re.findall(r"""["']?type["']?\s*:\s*['"]([^'"]+)['"]""", js)
                      if not t.startswith(('input_', 'field_'))}
    return names


def _empty_orphaned_markers(root: Path, definition: Definition) -> list[Path]:
    """Empty this family's marker pair on any board `toolboxes:` no longer lists.

    Removing a board from `toolboxes:` used to do nothing at all: the tool only
    opens the files a definition names, so the board it stopped naming kept the
    category it was last given, and `make blocks` said everything was up to
    date while the toolboxes contradicted the definitions. That is how
    `ubluetooth` could be taken off seven boards and stay on all seven.

    The marker pair itself stays. Where a category sits is the board's
    judgement and the tool does not own it -- an empty pair is the record that
    this board has a place for the family and is currently not offering it,
    which is what makes putting it back one line in the YAML.
    """
    written: list[Path] = []
    start = f'<!-- blockdef:{definition.name} -->'
    end = f'<!-- /blockdef:{definition.name} -->'
    pattern = re.compile(r'([ \t]*)' + re.escape(start) + r'[\s\S]*?' + re.escape(end))
    for path in sorted((root / TOOLBOX).glob('*.xml')):
        if path.name.split('.')[0] in definition.toolboxes:
            continue
        source = path.read_text(encoding='utf-8')
        if start not in source:
            continue
        emptied = pattern.sub(lambda m: f'{m.group(1)}{start}\n{m.group(1)}{end}', source)
        written += _write(path, emptied)
    return written


def _splice(path: Path, definition: Definition, pins: set[str] | None = None) -> list[Path]:
    source = path.read_text(encoding='utf-8')
    start = f'<!-- blockdef:{definition.name} -->'
    end = f'<!-- /blockdef:{definition.name} -->'
    if start not in source or end not in source:
        raise BlockdefError(
            f'{path}: no "{start}" ... "{end}" markers. Put an empty pair where the '
            f'{definition.category!r} category belongs in this board\'s tree.')

    board = path.name.split('.')[0]
    pattern = re.compile(r'([ \t]*)' + re.escape(start) + r'[\s\S]*?' + re.escape(end))

    def fill(match):
        # A callable replacement, not a template: re.sub() would otherwise read
        # backslash escapes in the generated XML as its own syntax. Every
        # marker pair with this name is filled -- `uos` is offered both at the
        # top level and inside the `micropython` container.
        indent = match.group(1)
        body = emit_category_xml(definition, indent, board=board, pins=pins)
        if not body:                  # nothing this board can offer: no category
            return f'{indent}{start}\n{indent}{end}'
        return f'{indent}{start}\n{body}\n{indent}{end}'

    return _write(path, pattern.sub(fill, source))


def _write(path: Path, content: str) -> list[Path]:
    """Write only on a real change, so `make` stays quiet and mtimes stay honest."""
    if path.exists() and path.read_text(encoding='utf-8') == content:
        return []
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8', newline='\n')
    return [path]
