#!/usr/bin/env python3
"""Generate the block definitions, Python generators and toolbox entries
declared in blockdef/definitions/*.blockdef.yaml.

Run it with `make blocks` from the repository root. See blockdef/README.md for
the file format, and blockdef/__init__.py for why the tool exists.
"""

import sys

from blockdef import generate
from blockdef.spec import BlockdefError

if __name__ == '__main__':
    try:
        generate('.')
    except BlockdefError as e:
        sys.exit(f'gen_blocks.py: {e}')
