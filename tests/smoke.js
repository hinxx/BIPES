#!/usr/bin/env node
/**
 * Does the IDE actually come up, and does a saved program survive a round
 * trip?
 *
 * tests/codegen_golden.js proves what every block generates, which is the
 * thing most likely to break quietly -- but it says nothing about whether the
 * editor works. Both bugs the Blockly 13 upgrade actually shipped were of that
 * second kind: a dialog on every load complaining that `text` and
 * `math_number` had no generator (they did; the check was looking in the wrong
 * place), and ui/embed.html throwing before it had drawn anything. Neither
 * moved a single byte of generated Python.
 *
 * So: load each page, fail on any uncaught exception or console error, and
 * check the things whose absence would make the page useless.
 *
 *   node tests/smoke.js                  check ui/index.html and ui/embed.html
 *   node tests/smoke.js --shots DIR      also write a screenshot of each page
 *   node tests/smoke.js --root DIR       check an unpacked bipes_offline.zip
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {withPage} = require('./lib/chrome.js');

const REPO = path.resolve(__dirname, '..');
const EXAMPLE = path.join(REPO, 'ui', 'examples', 'Blink.xml');

function parseArgs(argv) {
  const args = {root: REPO, shots: ''};
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--root': args.root = path.resolve(argv[++i]); break;
      case '--shots': args.shots = path.resolve(argv[++i]); break;
      default: throw new Error('Unknown argument: ' + argv[i]);
    }
  }
  return args;
}

const failures = [];
// What the editor made of the example, for the embed view to be held against.
const editor = {blocks: 0};
function check(page, name, ok, detail) {
  const line = (ok ? '  ok   ' : '  FAIL ') + name + (detail ? ' -- ' + detail : '');
  console.log(line);
  if (!ok) failures.push(page + ': ' + name + (detail ? ' -- ' + detail : ''));
}

/** Every bundled example, loaded, generated and round-tripped. */
function examples() {
  const dir = path.join(REPO, 'ui', 'examples');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.xml')).sort()
      .map((f) => ({name: f, xml: fs.readFileSync(path.join(dir, f), 'utf8')}));
}

/** The IDE: toolbox, flyout, and real saved programs through XML and back. */
async function checkEditor(args) {
  const page = path.join(args.root, 'ui', 'index.html');
  console.log('\nui/index.html');
  const xml = fs.readFileSync(EXAMPLE, 'utf8');
  await withPage('file://' + page, {
    ready: 'typeof Code === "object" && !!Code.workspace',
    settleMs: 2500,
  }, async (p) => {
    const r = await p.evaluate(`(function(){
      var ws = Code.workspace, out = {};
      out.version = Blockly.VERSION;
      out.renderer = ws.getRenderer ? ws.getRenderer().getClassName() : '';
      out.blockTypes = Object.keys(Blockly.Blocks).length;
      try {
        var tb = ws.getToolbox();
        var items = tb.getToolboxItems().filter(function(i){
          return i.isSelectable && i.isSelectable(); });
        out.categories = items.length;
        tb.setSelectedItem(items[0]);
        out.firstCategory = items[0].getName ? items[0].getName() : '';
        var f = ws.getFlyout();
        out.flyoutBlocks = f ? f.getWorkspace().getTopBlocks(false).length : 0;
      } catch (e) { out.toolboxError = String(e.message || e); }
      try {
        ws.clear();
        Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(${JSON.stringify(xml)}), ws);
        out.loaded = ws.getAllBlocks(false).length;
        // Through the IDE's own entry point, not Blockly's: Code.generateCode
        // is what the toolbar calls, and it runs BIPES's own "does every block
        // here have a generator" check on the way. Calling
        // workspaceToCode directly skips that check, and skipping it is how a
        // version bump can put an alert box on every load unnoticed.
        out.code = Code.generateCode();
        var back = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(ws));
        ws.clear();
        Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(back), ws);
        out.reloaded = ws.getAllBlocks(false).length;
        out.codeStable = Code.generateCode() === out.code;
      } catch (e) { out.xmlError = String(e.message || e); }
      var m = document.getElementById('myModal');
      if (m) m.style.display = 'none';
      return out;
    })()`);

    check('index', 'blockly loaded', !!r.version, r.version);
    check('index', 'renderer is geras', r.renderer === 'geras-renderer', r.renderer);
    check('index', 'blocks registered', r.blockTypes > 2000, String(r.blockTypes));
    check('index', 'toolbox has categories', r.categories > 10,
          r.toolboxError || String(r.categories));
    check('index', 'flyout opens with blocks', r.flyoutBlocks > 0,
          r.firstCategory + ': ' + r.flyoutBlocks);
    check('index', 'saved program loads', r.loaded > 0, r.xmlError || String(r.loaded));
    editor.blocks = r.loaded;
    check('index', 'program generates python', !!r.code && r.code.indexOf('import') !== -1);
    check('index', 'xml round trip keeps every block', r.loaded === r.reloaded,
          r.loaded + ' -> ' + r.reloaded);
    check('index', 'xml round trip keeps the code', r.codeStable === true);
    check('index', 'no uncaught exceptions', p.pageErrors.length === 0,
          p.pageErrors[0]);
    check('index', 'no console errors', p.consoleErrors.length === 0,
          p.consoleErrors[0]);
    // Blockly 13 arrived with one of these: "the generator code for the
    // following blocks not specified for Python: text, math_number", on every
    // single load, from a check that was looking somewhere the generators had
    // stopped living.
    check('index', 'no alert boxes on load', p.dialogs.length === 0, p.dialogs[0]);

    // Every bundled example, not just the one above. These are the programs
    // shipped as the answer to "show me what this looks like", so a block that
    // stopped loading or stopped generating shows up here first.
    const all = await p.evaluate(`(function(){
      var files = ${JSON.stringify(examples())};
      var ws = Code.workspace, out = [];
      files.forEach(function(f){
        var r = {name: f.name};
        try {
          ws.clear();
          Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(f.xml), ws);
          r.blocks = ws.getAllBlocks(false).length;
          r.code = Code.generateCode() || '';
          var back = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(ws));
          ws.clear();
          Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(back), ws);
          r.reloaded = ws.getAllBlocks(false).length;
          r.stable = (Code.generateCode() || '') === r.code;
        } catch (e) { r.error = String(e.message || e); }
        out.push(r);
      });
      ws.clear();
      return out;
    })()`);
    const bad = all.filter((r) => r.error || !r.blocks || !r.code ||
                                  r.blocks !== r.reloaded || !r.stable);
    check('index', 'all ' + all.length + ' bundled examples load, generate and ' +
          'round trip', bad.length === 0,
          bad.map((r) => r.name + ': ' +
              (r.error || (r.blocks !== r.reloaded
                  ? r.blocks + ' -> ' + r.reloaded
                  : (!r.code ? 'no code' : 'code changed')))).join('; '));

    if (args.shots) await p.screenshot(path.join(args.shots, 'index.png'));
  });
}

/** The embed view: same blocks, no generators loaded, read-only. */
async function checkEmbed(args) {
  const page = path.join(args.root, 'ui', 'embed.html');
  console.log('\nui/embed.html');
  const exampleXml = fs.readFileSync(EXAMPLE, 'utf8');
  const b64 = Buffer.from(exampleXml, 'utf8').toString('base64');
  const url = 'file://' + page + '?xml=' + encodeURIComponent(b64);
  // The embed view has to draw the same program the editor just loaded. A
  // count is the check that matters here: a block definition missing from this
  // page does not throw, it just quietly does not draw -- which is exactly how
  // seven definitions went missing from embed mode without anyone noticing.
  // Held against the editor rather than against a tag count in the file,
  // because a shadow with a real block plugged over it is in the XML twice and
  // on screen once.
  const expected = editor.blocks;
  await withPage(url, {
    ready: '!!document.querySelector(".blocklySvg")',
    settleMs: 1000,
  }, async (p) => {
    const r = await p.evaluate(`(function(){
      var svg = document.querySelector('.blocklySvg');
      return {
        drawn: !!svg,
        // Read-only blocks are not .blocklyDraggable; every rendered block is
        // a <g> carrying the block id.
        blocks: document.querySelectorAll('.blocklyBlockCanvas g[data-id]').length,
        failed: !!document.querySelector('.embedError, #embedError'),
      };
    })()`);
    check('embed', 'workspace drawn', r.drawn === true);
    check('embed', 'draws the same program as the editor', r.blocks === expected,
          r.blocks + ' blocks, editor had ' + expected);
    check('embed', 'no failure message', r.failed === false);
    check('embed', 'no uncaught exceptions', p.pageErrors.length === 0,
          p.pageErrors[0]);
    check('embed', 'no console errors', p.consoleErrors.length === 0,
          p.consoleErrors[0]);
    check('embed', 'no alert boxes on load', p.dialogs.length === 0, p.dialogs[0]);
    if (args.shots) await p.screenshot(path.join(args.shots, 'embed.png'));
  });
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.root !== REPO) console.log('root: ' + args.root);
  await checkEditor(args);
  await checkEmbed(args);
  console.log('');
  if (failures.length) {
    console.log(failures.length + ' check(s) failed:');
    for (const f of failures) console.log('  ' + f);
    process.exit(1);
  }
  console.log('all checks passed');
}

main().catch((e) => {
  console.error(String((e && e.stack) || e));
  process.exit(1);
});
