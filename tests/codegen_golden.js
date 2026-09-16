#!/usr/bin/env node
/**
 * Capture the Python that every registered block type generates, so that a
 * change to Blockly itself can be diffed rather than eyeballed.
 *
 * For each type in Blockly.Blocks: put one block of that type alone on the
 * workspace, run Blockly.Python.workspaceToCode(), record the result. The
 * output is one text file, sections sorted by block type, which is committed.
 * `git diff` after a Blockly bump is then the list of blocks the bump changed.
 *
 * See tests/README.md. Needs node >= 22 and a Chrome binary; no npm packages.
 *
 * Usage:
 *   node tests/codegen_golden.js                 write tests/golden/python_codegen.txt
 *   node tests/codegen_golden.js --out FILE      write somewhere else
 *   node tests/codegen_golden.js --twice         capture twice and report any
 *                                                block that did not reproduce
 *   node tests/codegen_golden.js --page PATH     point at a different page
 *   node tests/codegen_golden.js --limit N       only the first N block types
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {withPage} = require('./lib/chrome.js');

const REPO = path.resolve(__dirname, '..');
const DEFAULT_PAGE = path.join(REPO, 'ui', 'index.html');
const DEFAULT_OUT = path.join(__dirname, 'golden', 'python_codegen.txt');

function parseArgs(argv) {
  const args = {out: DEFAULT_OUT, page: DEFAULT_PAGE, twice: false, limit: 0};
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--out': args.out = path.resolve(argv[++i]); break;
      case '--page': args.page = path.resolve(argv[++i]); break;
      case '--twice': args.twice = true; break;
      case '--limit': args.limit = parseInt(argv[++i], 10); break;
      default: throw new Error('Unknown argument: ' + argv[i]);
    }
  }
  return args;
}

const CAPTURE_FN = function captureAll(limit) {
  var ws = Code.workspace;
  var out = {};
  var types = Object.keys(Blockly.Blocks).sort();
  if (limit > 0) types = types.slice(0, limit);
  var eventsOff = false;

  /** Every named field on a block, by name. */
  function fieldValues(block) {
    var values = {};
    for (var i = 0; i < block.inputList.length; i++) {
      var row = block.inputList[i].fieldRow || [];
      for (var j = 0; j < row.length; j++) {
        if (!row[j].name) continue;
        try { values[row[j].name] = String(row[j].getValue()); } catch (e) {}
      }
    }
    return values;
  }

  /**
   * Fields whose value is different every time the block is built -- the
   * EasyMQTT session id, the utime.deadline id, both seeded from Math.random()
   * in the block's init. Build the block twice and see which fields disagree,
   * rather than naming the blocks here: a block added later that does the same
   * thing is then covered without anyone remembering to come back.
   *
   * Seeding Math.random instead would look simpler and is what this harness
   * did first, but it only holds within one Blockly version: Blockly draws
   * from the same stream for block ids, so a version that draws a different
   * number of times shifts every later value and the diff fills with blocks
   * nothing touched.
   */
  function unstableFields(type) {
    var first, second;
    try {
      ws.clear();
      first = fieldValues(ws.newBlock(type));
      ws.clear();
      second = fieldValues(ws.newBlock(type));
    } catch (e) {
      return [];
    }
    var names = [];
    for (var name in first) {
      if (first[name] !== second[name]) names.push(name);
    }
    return names.sort();
  }

  try { Blockly.Events.disable(); eventsOff = true; } catch (e) {}
  try {
    for (var i = 0; i < types.length; i++) {
      var type = types[i];
      var entry;
      var pinned = unstableFields(type);
      try {
        ws.clear();
        var block = ws.newBlock(type);
        for (var p = 0; p < pinned.length; p++) {
          // Always try the same word first and fall back the same way. Picking
          // the replacement from the value being replaced would make the pin
          // itself depend on the randomness it exists to remove -- a random id
          // that happens to start with a digit would pin differently from one
          // that does not.
          try { block.setFieldValue('pinned', pinned[p]); } catch (e) {}
          if (String(block.getFieldValue(pinned[p])) !== 'pinned') {
            // A number field rejected the word; it will take a number.
            try { block.setFieldValue(0, pinned[p]); } catch (e) {}
          }
        }
        if (block.initSvg) { block.initSvg(); block.render(); }
        entry = {code: Blockly.Python.workspaceToCode(ws)};
      } catch (e) {
        entry = {error: String((e && e.message) || e)};
      }
      if (pinned.length) entry.pinned = pinned;
      out[type] = entry;
    }
  } finally {
    try { ws.clear(); } catch (e) {}
    if (eventsOff) { try { Blockly.Events.enable(); } catch (e) {} }
  }
  return {
    types: out,
    meta: {
      blockTypes: types.length,
      generators: Object.keys(Blockly.Python).filter(function(k) {
        return typeof Blockly.Python[k] === 'function' && Blockly.Blocks[k];
      }).length,
      blocklyVersion: (typeof Blockly.VERSION === 'string') ? Blockly.VERSION : 'unknown',
    },
  };
};

/** Serialise the capture into the committed text format. */
function render(capture, pageRelative) {
  const types = Object.keys(capture.types).sort();
  const lines = [];
  lines.push('# Python generated by every registered block type, one block at a time.');
  lines.push('# Generated by tests/codegen_golden.js -- DO NOT EDIT. Run `make golden`.');
  lines.push('#');
  lines.push('# page          ' + pageRelative);
  lines.push('# block types   ' + capture.meta.blockTypes);
  lines.push('# generators    ' + capture.meta.generators);
  lines.push('# blockly       ' + capture.meta.blocklyVersion);
  lines.push('');
  for (const type of types) {
    const entry = capture.types[type];
    lines.push('==== ' + type + ' ====');
    if (entry.pinned) {
      lines.push('# field pinned by the harness (random on every build): ' +
                 entry.pinned.join(', '));
    }
    if (entry.error !== undefined) {
      lines.push('!! error: ' + entry.error);
    } else if (entry.code === '') {
      lines.push('(no output)');
    } else {
      lines.push(entry.code.replace(/\n+$/, ''));
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv);
  console.error('page:   ' + path.relative(REPO, args.page));

  await withPage('file://' + args.page, {
    ready: 'typeof Blockly === "object" && typeof Blockly.Python === "object"' +
           ' && typeof Code === "object" && !!Code.workspace',
    onDialog: (d) => console.error('dismissed ' + d.type + ': ' + d.message),
  }, async (page) => {
    const capture = () =>
        page.evaluate('(' + CAPTURE_FN.toString() + ')(' + args.limit + ')');

    const started = Date.now();
    const first = await capture();
    console.error('captured ' + first.meta.blockTypes + ' block types in ' +
                  ((Date.now() - started) / 1000).toFixed(1) + 's');

    if (args.twice) {
      const second = await capture();
      const unstable = Object.keys(first.types).filter((t) =>
          JSON.stringify(first.types[t]) !== JSON.stringify(second.types[t]));
      if (unstable.length) {
        console.error('NOT REPRODUCIBLE (' + unstable.length + '): ' +
                      unstable.slice(0, 20).join(', ') +
                      (unstable.length > 20 ? ' ...' : ''));
        process.exitCode = 2;
      } else {
        console.error('reproducible: two captures identical');
      }
    }

    const text = render(first, path.relative(REPO, args.page));
    fs.mkdirSync(path.dirname(args.out), {recursive: true});
    fs.writeFileSync(args.out, text);
    console.error('wrote ' + path.relative(REPO, args.out) + ' (' +
                  (text.length / 1024).toFixed(0) + ' KB)');

    const errored = Object.keys(first.types)
        .filter((t) => first.types[t].error !== undefined);
    const empty = Object.keys(first.types)
        .filter((t) => first.types[t].code === '');
    console.error('blocks that threw: ' + errored.length +
                  ' \u00b7 blocks with no output: ' + empty.length);
    if (page.pageErrors.length) {
      console.error('page errors during run: ' + page.pageErrors.length);
      for (const e of page.pageErrors.slice(0, 5)) console.error('  ' + e);
    }
  });
}

main().catch((e) => {
  console.error(String((e && e.stack) || e));
  process.exit(1);
});
