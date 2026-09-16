DIR=ui/core

# Files copied verbatim out of the blockly submodule. These bundles only exist
# in Blockly <= 9; the submodule is pinned to 6.20210701.0 to match what is
# already vendored in $(DIR). See .gitmodules before bumping it.
#
# python_compressed.js is deliberately NOT in this list. The vendored copy is
# patched for MicroPython: stock Blockly emits `from numbers import Number`,
# which does not exist on MicroPython, so BIPES rewrote math_change,
# math_on_list and math_number_property to use float instead. Overwriting it
# breaks code generation on devices. Same for appengine/storage.js, whose
# vendored copy was rewritten to talk to UI['workspace'] / UI['account'].
FILES_BLOCKLY_JS=blockly_compressed.js blocks_compressed.js javascript_compressed.js

# Files copied out of the webrepl submodule. term.js is deliberately NOT copied
# any more: ui/index.html loads core/xterm.js instead.
FILES_WEBREPL=FileSaver.js

.PHONY: help submodules submodules-dev copy copy-bipes-blocks blocks pylibs offline-assets offline doc clean-offline golden

help:
	@echo "BIPES make targets:"
	@echo "  submodules           init/update the submodules needed to run the IDE"
	@echo "                       (ui/freeboard, databoard)"
	@echo "  submodules-dev       additionally fetch the build-time submodules"
	@echo "                       (blockly, webrepl) needed by 'make copy'"
	@echo "  copy                 refresh the vendored blockly/webrepl files in ui/"
	@echo "  blocks               regenerate the blocks declared in blockdef/"
	@echo "  pylibs               regenerate ui/core/pylibs.js from ui/pylibs/*.py"
	@echo "  offline-assets       regenerate ui/core/offline_assets.js from the"
	@echo "                       toolboxes and devinfo.json"
	@echo "  offline              refresh every generated file and zip bipes_offline.zip"
	@echo "  golden               recapture tests/golden/python_codegen.txt --"
	@echo "                       the Python every block type generates"
	@echo "  doc                  build the sphinx documentation in docs/"

# --- submodules -------------------------------------------------------------

# Runtime dependencies: ui/index.html iframes ui/freeboard/index.html and
# ../databoard/index.html, so the IDE is broken without these two.
submodules:
	git submodule update --init ui/freeboard databoard

# Build-time only. blockly is a big repository, so fetch it without blobs.
submodules-dev: submodules
	git submodule update --init --filter=blob:none blockly
	git submodule update --init webrepl

# --- vendoring --------------------------------------------------------------

# Refresh the third-party files checked into the tree. Needs 'make submodules-dev'
# first. Note that blockly's media/ and msg/ are consumed relative to ui/, not
# ui/core/: ui/core/code.js injects with media:'media/' and loads 'b.msg/js/'.
copy: | blockly/blockly_compressed.js webrepl/FileSaver.js
	cd blockly && cp -pr $(FILES_BLOCKLY_JS) ../$(DIR)/
	cp -pr blockly/media/. ui/media/
	rm -rf ui/b.msg && cp -pr blockly/msg ui/b.msg
	cd webrepl && cp -pr $(FILES_WEBREPL) ../$(DIR)/
	@echo
	@echo "Not copied, because the vendored versions carry BIPES patches:"
	@echo "  $(DIR)/python_compressed.js  (MicroPython: no 'numbers' module)"
	@echo "  $(DIR)/storage.js            (BIPES project/account storage)"
	@echo "Diff them by hand against blockly/ if you bump the Blockly pin."

blockly/blockly_compressed.js webrepl/FileSaver.js:
	@echo "Missing submodule content. Run 'make submodules-dev' first." >&2
	@false

copy-bipes-blocks:
	cp bipes_blocks/block_definitions.js ui/
	echo "Please, add <>"

# --- generated blocks -------------------------------------------------------

# blockdef/definitions/*.blockdef.yaml is the single description of a family of
# blocks; this writes the three places each one has to appear -- the Blockly
# definition, the Python generator, and the <category> in every board toolbox
# that offers it. See blockdef/README.md. Generated files are committed, same
# as pylibs.js: `git status` after this target is how you notice one went stale.
blocks:
	python3 gen_blocks.py

# --- device libraries -------------------------------------------------------

# ui/pylibs/*.py is the only copy of these libraries; ui/core/pylibs.js is baked
# from it so the IDE can write one to a board with no network at all. Keep the
# generated file committed -- `git status` after this target is how you notice
# it went stale.
pylibs:
	python3 gen_pylibs.py

# --- offline build ----------------------------------------------------------

# ui/core/offline_assets.js carries the toolbox XML and devinfo.json that the
# IDE cannot fetch when it is opened from file://. Same deal as pylibs.js: keep
# the generated file committed, so a fresh clone opens offline without a build,
# and `git status` after this target is how you notice it went stale.
offline-assets: blocks
	python3 bake_offline.py

# There is no separate ui/index_offline.html any more -- ui/index.html itself
# loads the baked assets when, and only when, it is running from file://. The
# zip is just the tree, so anything that works from a clone works from the zip.
offline: pylibs offline-assets
	rm -f bipes_offline.zip
	zip -q -r bipes_offline.zip index.html ui databoard easymqtt \
		LICENSE README.md CHANGELOG.md \
		-x '*/.git/*' '*/.git' '.git/*' '*/.github/*' 'easymqtt/sync.ffs_db'
	@echo "bipes_offline.zip: open ui/index.html from the unpacked folder"

clean-offline:
	rm -f bipes_offline.zip

# --- tests ------------------------------------------------------------------

# Records the Python that all 2,123 block types generate, one block at a time,
# so that a change underneath them -- a Blockly version bump above all -- can be
# diffed instead of eyeballed. Committed, same as the other generated files:
# `git diff tests/` after this target is the list of blocks the change altered.
# Needs node >= 22 and a Chrome binary; see tests/README.md.
golden:
	node tests/codegen_golden.js

# --- documentation ----------------------------------------------------------

doc:
	cd docs && $(MAKE) html
