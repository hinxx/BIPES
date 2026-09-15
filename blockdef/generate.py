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
import re
from pathlib import Path
from xml.etree import ElementTree

from .emit import emit_blocks_js, emit_category_xml, emit_generators_js
from .spec import BlockdefError, Definition, load

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

    blocks_js = emit_blocks_js(definitions)
    generators_js = emit_generators_js(definitions)
    _check_no_unresolved_placeholders(blocks_js, definitions)
    _check_no_unresolved_placeholders(generators_js, definitions)

    written += _write(root / BLOCKS_JS, blocks_js)
    written += _write(root / GENERATORS_JS, generators_js)
    written += _stamp_page(root)

    for definition in definitions:
        for board in definition.toolboxes:
            path = root / TOOLBOX / f'{board}.xml'
            if not path.exists():
                raise BlockdefError(f'{definition.path}: no toolbox called {board!r} '
                                    f'({path} does not exist)')
            written += _splice(path, definition)

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


def _splice(path: Path, definition: Definition) -> list[Path]:
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
        body = emit_category_xml(definition, indent, board=board)
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
