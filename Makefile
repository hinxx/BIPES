DIR=ui/core

# The Blockly release the compiled bundles in $(DIR) come from.
BLOCKLY_VERSION=13.3.0

# Files copied verbatim out of the Blockly npm package -- not out of the
# blockly submodule. Since v10 these bundles are build output and are not
# committed to the Blockly repository at all; they exist only in the published
# package, where they are still plain UMD and still set the globals that
# ui/index.html's <script> tags expect. The submodule is kept as a readable
# reference for diffing, pinned to the same tag; it is not the source of these
# files. See .gitmodules.
#
# python_compressed.js used to be excluded here, because the vendored copy was
# hand-patched for MicroPython (stock Blockly emits `from numbers import
# Number`, which MicroPython does not have). That patch now lives in
# ui/core/micropython_patches.js, applied on top of whatever Blockly ships, so
# this file is refreshed like any other. appengine/storage.js is still not
# copied: its vendored copy was rewritten to talk to UI['workspace'] /
# UI['account'].
FILES_BLOCKLY_JS=blockly_compressed.js blocks_compressed.js \
                 javascript_compressed.js python_compressed.js

# Blockly 11 moved several fields and their blocks out of core and into
# plugins, versioned in lockstep with it. We need two: the colour field (and
# with it the colour_picker block, which ui/toolbox/linux.xml offers) and the
# angle field. The multiline-input plugin is deliberately not taken -- nothing
# in this tree uses FieldMultilineInput or the text_multiline block.
# Each publishes a browser bundle at dist/index.js; they are vendored beside
# the core bundles as field_<name>.js.
FILES_BLOCKLY_PLUGINS=field-colour field-angle

# Files copied out of the webrepl submodule. term.js is deliberately NOT copied
# any more: ui/index.html loads core/xterm.js instead.
FILES_WEBREPL=FileSaver.js

.PHONY: help submodules submodules-dev copy copy-blockly copy-webrepl copy-bipes-blocks blocks pylibs offline-assets offline doc clean-offline golden smoke test

help:
	@echo "BIPES make targets:"
	@echo "  submodules           init/update the submodules needed to run the IDE"
	@echo "                       (ui/freeboard, databoard)"
	@echo "  submodules-dev       additionally fetch the build-time submodules"
	@echo "                       (blockly, webrepl) needed by 'make copy'"
	@echo "  copy                 refresh the vendored blockly/webrepl files in ui/"
	@echo "                       (blockly from npm, so this one needs network)"
	@echo "  blocks               regenerate the blocks declared in blockdef/"
	@echo "  pylibs               regenerate ui/core/pylibs.js from ui/pylibs/*.py"
	@echo "  offline-assets       regenerate ui/core/offline_assets.js from the"
	@echo "                       toolboxes and devinfo.json"
	@echo "  offline              refresh every generated file and zip bipes_offline.zip"
	@echo "  golden               recapture tests/golden/python_codegen.txt --"
	@echo "                       the Python every block type generates"
	@echo "  smoke                load the IDE and the embed view and check"
	@echo "                       they work"
	@echo "  test                 smoke, then golden, then show what moved"
	@echo "  doc                  build the sphinx documentation in docs/"

# --- submodules -------------------------------------------------------------

# Runtime dependencies: ui/index.html iframes ui/freeboard/index.html and
# ../databoard/index.html, so the IDE is broken without these two.
submodules:
	git submodule update --init ui/freeboard databoard

# Build-time only. webrepl is needed by 'make copy'; blockly is only a
# reference for diffing what npm ships, so fetch it without blobs.
submodules-dev: submodules
	git submodule update --init --filter=blob:none blockly
	git submodule update --init webrepl

# --- vendoring --------------------------------------------------------------

# Refresh the third-party files checked into the tree. Blockly comes from npm
# (needs network); webrepl comes from its submodule, so 'make submodules-dev'
# first. Note that Blockly's media/ and msg/ are consumed relative to ui/, not
# ui/core/: ui/core/code.js injects with media:'media/' and loads 'b.msg/js/'.
# The package publishes its message files flat, as msg/<lang>.js, so they land
# in ui/b.msg/js/ where code.js already looks for them.
copy: copy-blockly copy-webrepl

copy-blockly:
	@tmp=$$(mktemp -d) && \
	  echo "Fetching blockly@$(BLOCKLY_VERSION) from npm ..." && \
	  (cd $$tmp && npm pack --silent blockly@$(BLOCKLY_VERSION) >/dev/null) && \
	  tar xzf $$tmp/blockly-$(BLOCKLY_VERSION).tgz -C $$tmp && \
	  for f in $(FILES_BLOCKLY_JS); do \
	    cp -p $$tmp/package/$$f $(DIR)/$$f || exit 1; \
	  done && \
	  cp -pr $$tmp/package/media/. ui/media/ && \
	  for p in $(FILES_BLOCKLY_PLUGINS); do \
	    (cd $$tmp && npm pack --silent @blockly/$$p@$(BLOCKLY_VERSION) >/dev/null) && \
	    tar xzf $$tmp/blockly-$$p-$(BLOCKLY_VERSION).tgz -C $$tmp package/dist/index.js && \
	    cp -p $$tmp/package/dist/index.js \
	      $(DIR)/field_$$(echo $$p | sed 's/field-//').js || exit 1; \
	  done && \
	  rm -rf ui/b.msg && mkdir -p ui/b.msg/js && \
	  cp -p $$tmp/package/msg/*.js ui/b.msg/js/ && \
	  rm -rf $$tmp && \
	  echo "Vendored blockly $(BLOCKLY_VERSION) into $(DIR), ui/media, ui/b.msg/js"

copy-webrepl: | webrepl/FileSaver.js
	cd webrepl && cp -pr $(FILES_WEBREPL) ../$(DIR)/
	@echo
	@echo "Not copied, because the vendored version carries BIPES patches:"
	@echo "  $(DIR)/storage.js            (BIPES project/account storage)"

webrepl/FileSaver.js:
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

# Records the Python that all 2,115 block types generate, one block at a time,
# so that a change underneath them -- a Blockly version bump above all -- can be
# diffed instead of eyeballed through the flyouts. Committed, same as the other
# generated files: `git diff tests/` after this target is the list of blocks the
# change altered. Needs node >= 22 and a Chrome binary; see tests/README.md.
golden:
	node tests/codegen_golden.js

# Does the editor actually come up? The golden file above proves what every
# block generates and nothing at all about whether the page works; both bugs
# the Blockly 13 upgrade shipped were of the second kind. See tests/README.md.
smoke:
	node tests/smoke.js

# What to run after touching Blockly, a block definition or a generator.
test: smoke golden
	@echo
	@git --no-pager diff --stat -- tests/golden || true
	@echo "Any diff above is the list of blocks this change altered."

# --- documentation ----------------------------------------------------------

doc:
	cd docs && $(MAKE) html
