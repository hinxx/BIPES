#!/usr/bin/env node
/**
 * Open every category of every board's toolbox.
 *
 * A toolbox entry naming a block nobody defines does not degrade gracefully:
 * building the flyout throws `Unknown block type`, and that category -- plus
 * everything nested under it -- becomes unreachable. blockdef/generate.py
 * checks the toolbox XML against the blocks the page declares, but that is a
 * text scan of source files; this is the same question asked of the running
 * editor, which is the only place the answer is authoritative.
 *
 * 28 boards, each with its own toolbox and its own pin substitutions, and the
 * nested categories that only exist once their parent is expanded. Nothing had
 * ever opened most of them.
 *
 *   node tests/toolboxes.js              every board
 *   node tests/toolboxes.js --board X    just that one
 *   node tests/toolboxes.js --verbose    list every category and its count
 */

'use strict';

const path = require('path');
const {withPage} = require('./lib/chrome.js');

const REPO = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {board: '', verbose: false};
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--board': args.board = argv[++i]; break;
      case '--verbose': args.verbose = true; break;
      default: throw new Error('Unknown argument: ' + argv[i]);
    }
  }
  return args;
}

/** Runs in the page; returns one entry per board. */
const SWEEP = function sweep(onlyBoard) {
  var ws = UI['workspace'];
  var boards = Object.keys(ws.devices);
  if (onlyBoard) boards = boards.filter(function(b) { return b === onlyBoard; });

  // Blockly reports an unbuildable flyout by logging rather than throwing, so
  // console.error has to be watched to attribute one to a category.
  var logged = [];
  var realError = console.error;
  console.error = function() {
    logged.push(Array.prototype.slice.call(arguments).join(' '));
    return realError.apply(console, arguments);
  };

  // reloadToolbox happens after an async fetch of the toolbox XML; count the
  // calls so the sweep can wait for the one it asked for.
  var reloads = 0;
  var realReload = Code.reloadToolbox;
  Code.reloadToolbox = function(xml) {
    reloads++;
    return realReload.call(Code, xml);
  };

  function waitForReload(was, tries) {
    return new Promise(function(resolve) {
      var n = 0;
      (function poll() {
        if (reloads > was || n++ > (tries || 100)) return resolve(reloads > was);
        setTimeout(poll, 50);
      })();
    });
  }

  /** Expand collapsible categories until nothing new appears. */
  function expandAll(tb) {
    for (var pass = 0; pass < 5; pass++) {
      var opened = 0;
      tb.getToolboxItems().forEach(function(item) {
        if (typeof item.setExpanded === 'function' &&
            typeof item.isExpanded === 'function' && !item.isExpanded()) {
          try { item.setExpanded(true); opened++; } catch (e) {}
        }
      });
      if (!opened) break;
    }
  }

  var results = [];

  function doBoard(i) {
    if (i >= boards.length) {
      console.error = realError;
      Code.reloadToolbox = realReload;
      return Promise.resolve(results);
    }
    var board = boards[i];
    var was = reloads;
    var entry = {board: board, toolbox: (ws.devices[board] || {}).toolbox || '',
                 categories: [], errors: []};
    try {
      ws.changeTo(board);
    } catch (e) {
      entry.errors.push('changeTo: ' + (e.message || e));
      results.push(entry);
      return doBoard(i + 1);
    }
    // changeTo assigns to a <select>, which silently refuses a value it has no
    // <option> for -- leaving the selector blank, the old toolbox up, and the
    // board unreachable. That is a real finding, not a slow reload.
    if (ws.selector.value !== board) {
      entry.unreachable = true;
      entry.errors.push('not in the device selector, so it cannot be chosen ' +
                        '(selector went to "' + ws.selector.value + '")');
      results.push(entry);
      return doBoard(i + 1);
    }
    return waitForReload(was).then(function(reloaded) {
      if (!reloaded) entry.errors.push('toolbox never reloaded');
      var tb = Code.workspace.getToolbox();
      if (!tb) {
        entry.errors.push('no toolbox');
        results.push(entry);
        return doBoard(i + 1);
      }
      expandAll(tb);
      var items = tb.getToolboxItems().filter(function(it) {
        return it.isSelectable && it.isSelectable();
      });
      items.forEach(function(item) {
        var name = (item.getName && item.getName()) || '?';
        var before = logged.length;
        var count = -1;
        try {
          tb.setSelectedItem(item);
          var flyout = Code.workspace.getFlyout();
          count = flyout ? flyout.getWorkspace().getTopBlocks(false).length : -1;
        } catch (e) {
          entry.errors.push(name + ': ' + (e.message || e));
        }
        for (var l = before; l < logged.length; l++) {
          entry.errors.push(name + ': ' + logged[l]);
        }
        // Two kinds of category are empty by design and should not be
        // reported: a `custom` one, which Blockly fills at runtime and which
        // has nothing in it until the program does (Variables, Functions), and
        // a collapsible parent whose contents are other categories.
        var def = item.toolboxItemDef_ || {};
        var children = (item.getContents && item.getContents()) || [];
        var expectedEmpty = !!def.custom ||
            (typeof item.setExpanded === 'function' && children.length > 0);
        entry.categories.push(
            {name: name, blocks: count, expectedEmpty: expectedEmpty});
      });
      results.push(entry);
      return doBoard(i + 1);
    });
  }

  return doBoard(0);
};

async function main() {
  const args = parseArgs(process.argv);
  const page = path.join(REPO, 'ui', 'index.html');

  await withPage('file://' + page, {
    ready: 'typeof Code === "object" && !!Code.workspace' +
           ' && typeof UI === "object" && !!UI["workspace"]' +
           ' && Object.keys(UI["workspace"].devices).length > 0',
    settleMs: 2000,
  }, async (p) => {
    const started = Date.now();
    const boards = await p.evaluate(
        '(' + SWEEP.toString() + ')(' + JSON.stringify(args.board) + ')');

    let categories = 0, empty = 0, broken = 0;
    const failures = [];
    const stale = [];
    for (const b of boards) {
      categories += b.categories.length;
      const blanks = b.categories.filter((c) => c.blocks === 0 && !c.expectedEmpty);
      empty += blanks.length;
      if (b.unreachable) {
        // Not a failure: devinfo.json carries three device keys that upstream
        // renamed out of the selector (362391d9 turned the `wemos_d1_mini`
        // option into `ESP8266`, keeping the label) without removing the old
        // entries. They are dead data rather than broken toolboxes. Reported
        // every run so they stay visible, but they do not fail the build.
        stale.push(b.board + ' (' + b.toolbox + ')');
      } else if (b.errors.length) {
        broken++;
        failures.push(b.board + ' (' + b.toolbox + '):');
        for (const e of b.errors.slice(0, 8)) failures.push('    ' + e);
      }
      const shape = b.categories.length + ' categories, ' +
          b.categories.reduce((n, c) => n + Math.max(c.blocks, 0), 0) + ' blocks' +
          (blanks.length ? ', ' + blanks.length + ' empty' : '');
      console.log((b.unreachable ? '  --   ' : b.errors.length ? '  FAIL ' : '  ok   ') +
                  b.board.padEnd(16) +
                  (b.unreachable ? 'not offered in the device selector' : shape));
      if (args.verbose) {
        for (const c of b.categories) {
          console.log('           ' + String(c.blocks).padStart(4) + '  ' + c.name);
        }
      }
      if (blanks.length && !args.verbose) {
        console.log('           empty and not meant to be: ' +
                    blanks.map((c) => c.name).join(', '));
      }
    }

    console.log('');
    console.log((boards.length - stale.length) + ' boards, ' + categories +
                ' categories opened in ' +
                ((Date.now() - started) / 1000).toFixed(1) + 's' +
                (empty ? ', ' + empty + ' unexpectedly empty' : ''));
    if (stale.length) {
      console.log('');
      console.log(stale.length + ' device(s) in devinfo.json that the selector ' +
                  'does not offer, so nothing can choose them:');
      for (const t of stale) console.log('    ' + t);
      console.log('    Upstream renamed these options and left the entries ' +
                  'behind; a project saved');
      console.log('    against one of them lands on the wrong board with an ' +
                  '"invalid device" notice.');
    }
    if (p.pageErrors.length) {
      console.log('uncaught page exceptions: ' + p.pageErrors.length);
      for (const e of p.pageErrors.slice(0, 5)) console.log('    ' + e);
    }
    if (failures.length) {
      console.log('');
      console.log(broken + ' board(s) with problems:');
      for (const f of failures) console.log('  ' + f);
      process.exitCode = 1;
    } else if (p.pageErrors.length) {
      process.exitCode = 1;
    } else {
      console.log('every category on every board opened');
    }
  });
}

main().catch((e) => {
  console.error(String((e && e.stack) || e));
  process.exit(1);
});
