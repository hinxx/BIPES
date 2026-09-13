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

.PHONY: help submodules submodules-dev copy copy-bipes-blocks pylibs offline doc clean-offline

help:
	@echo "BIPES make targets:"
	@echo "  submodules           init/update the submodules needed to run the IDE"
	@echo "                       (ui/freeboard, databoard)"
	@echo "  submodules-dev       additionally fetch the build-time submodules"
	@echo "                       (blockly, webrepl) needed by 'make copy'"
	@echo "  copy                 refresh the vendored blockly/webrepl files in ui/"
	@echo "  pylibs               regenerate ui/core/pylibs.js from ui/pylibs/*.py"
	@echo "  offline              build ui/index_offline.html and bipes_offline.zip"
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

# --- device libraries -------------------------------------------------------

# ui/pylibs/*.py is the only copy of these libraries; ui/core/pylibs.js is baked
# from it so the IDE can write one to a board with no network at all. Keep the
# generated file committed -- `git status` after this target is how you notice
# it went stale.
pylibs:
	python3 gen_pylibs.py

# --- offline build ----------------------------------------------------------

# The document ids below must match what ui/core/ui.js:xhrGET() computes when it
# falls back to the baked copies: `toolbox/esp32.xml` -> `OFFLINE_toolbox_esp32_xml`.
# Build each id in one `echo`: `echo -n` is not POSIX, and on a /bin/sh that is
# bash in posix mode with xpg_echo (macOS) it prints a literal "-n ", which
# corrupts every id and leaves the offline build with no toolbox at all.
offline: pylibs
	echo "Generating offline version"
	: > ui/index_offline.html
	cat ui/index.html >> ui/index_offline.html
	for i in ui/toolbox/*.xml ; do \
		echo "Including file $$i" ; \
		id=$$(echo $$i | sed -e 's/[\/\.]/_/g' -e 's/^ui_//') ; \
		echo "<document style='display: none' id='OFFLINE_$$id'>" >> ui/index_offline.html ; \
		grep -v "<document>" $$i >> ui/index_offline.html ; \
	done
	echo "<script>" >> ui/index_offline.html
	echo "OFFLINE_devinfo_devinfo_json = \`" >> ui/index_offline.html
	cat ui/devinfo/devinfo.json >> ui/index_offline.html
	echo "\`;" >> ui/index_offline.html
	echo "</script>" >> ui/index_offline.html
	rm -f bipes_offline.zip
	zip -q -r bipes_offline.zip index.html ui databoard easymqtt \
		LICENSE README.md CHANGELOG.md \
		-x '*/.git/*' '*/.git' '.git/*' '*/.github/*' 'easymqtt/sync.ffs_db'

clean-offline:
	rm -f bipes_offline.zip ui/index_offline.html

# --- documentation ----------------------------------------------------------

doc:
	cd docs && $(MAKE) html
