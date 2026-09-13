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

import re
from pathlib import Path

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

    written += _write(root / BLOCKS_JS, emit_blocks_js(definitions))
    written += _write(root / GENERATORS_JS, emit_generators_js(definitions))

    for definition in definitions:
        for board in definition.toolboxes:
            path = root / TOOLBOX / f'{board}.xml'
            if not path.exists():
                raise BlockdefError(f'{definition.path}: no toolbox called {board!r} '
                                    f'({path} does not exist)')
            written += _splice(path, definition)

    if verbose:
        blocks = sum(len(d.blocks) for d in definitions)
        print(f'{len(definitions)} definition(s), {blocks} blocks')
        for path in written:
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


def _splice(path: Path, definition: Definition) -> list[Path]:
    source = path.read_text(encoding='utf-8')
    start = f'<!-- blockdef:{definition.name} -->'
    end = f'<!-- /blockdef:{definition.name} -->'
    if start not in source or end not in source:
        raise BlockdefError(
            f'{path}: no "{start}" ... "{end}" markers. Put an empty pair where the '
            f'{definition.category!r} category belongs in this board\'s tree.')

    indent = _indent_of(source, start)
    body = emit_category_xml(definition, indent)
    pattern = re.compile(re.escape(start) + r'[\s\S]*?' + re.escape(end))
    # A callable replacement: re.sub() would otherwise read backslash escapes
    # in the generated XML as its own template syntax.
    updated = pattern.sub(lambda _m: f'{start}\n{body}\n{indent}{end}', source, count=1)
    return _write(path, updated)


def _indent_of(source: str, marker: str) -> str:
    line_start = source.rfind('\n', 0, source.index(marker)) + 1
    return source[line_start:source.index(marker)]


def _write(path: Path, content: str) -> list[Path]:
    """Write only on a real change, so `make` stays quiet and mtimes stay honest."""
    if path.exists() and path.read_text(encoding='utf-8') == content:
        return []
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8', newline='\n')
    return [path]
