#!/usr/bin/env node
/**
 * The parts of the editor a person operates, rather than the code it emits.
 *
 * tests/codegen_golden.js proves what every block generates and tests/smoke.js
 * proves the page comes up, and between them they never click anything. These
 * are the paths whose implementation changed underneath the Blockly 13 upgrade
 * and which nothing else here touches: the colour and angle field editors are
 * now separate plugins rather than Blockly core, mutators were rewritten around
 * an icon class in Blockly 11, and the clipboard and undo stack have both been
 * reworked since 6.
 *
 *   node tests/interact.js
 *   node tests/interact.js --shots DIR    screenshot each opened editor
 */

'use strict';

const path = require('path');
const {withPage} = require('./lib/chrome.js');

const REPO = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {shots: ''};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--shots') args.shots = path.resolve(argv[++i]);
    else throw new Error('Unknown argument: ' + argv[i]);
  }
  return args;
}

const failures = [];
function check(name, ok, detail) {
  console.log((ok ? '  ok   ' : '  FAIL ') + name + (detail ? ' -- ' + detail : ''));
  if (!ok) failures.push(name + (detail ? ' -- ' + detail : ''));
}

/**
 * Runs in the page. Everything is done through Blockly's own API rather than
 * synthetic pointer events -- the point is to exercise the plugin and mutator
 * code, not to re-test that Chrome dispatches clicks.
 */
const EXERCISE = async function exercise() {
  var ws = Code.workspace;
  var out = {};

  function sleep(ms) {
    return new Promise(function(r) { setTimeout(r, ms); });
  }

  function fresh(type) {
    ws.clear();
    var b = ws.newBlock(type);
    b.initSvg();
    b.render();
    return b;
  }

  function editorOpen() {
    var dd = Blockly.DropDownDiv && Blockly.DropDownDiv.getContentDiv &&
        Blockly.DropDownDiv.getContentDiv();
    var wd = Blockly.WidgetDiv && Blockly.WidgetDiv.getDiv &&
        Blockly.WidgetDiv.getDiv();
    var ddOpen = !!(dd && dd.childNodes.length &&
        Blockly.DropDownDiv.isVisible && Blockly.DropDownDiv.isVisible());
    var wdOpen = !!(wd && wd.childNodes.length &&
        Blockly.WidgetDiv.isVisible && Blockly.WidgetDiv.isVisible());
    return {
      open: ddOpen || wdOpen,
      html: ((ddOpen && dd.innerHTML) || (wdOpen && wd.innerHTML) || '').slice(0, 400),
    };
  }

  function closeEditor() {
    try { Blockly.DropDownDiv.hideIfOwner && Blockly.DropDownDiv.hideWithoutAnimation(); } catch (e) {}
    try { Blockly.WidgetDiv.hide(); } catch (e) {}
  }

  // ---- colour field: a plugin since Blockly 11 ----------------------------
  out.colour = (function() {
    var r = {};
    try {
      var block = fresh('neopixel_color_colors');
      var field = null;
      block.inputList.forEach(function(i) {
        (i.fieldRow || []).forEach(function(f) {
          if (f.constructor === Blockly.FieldColour) field = f;
        });
      });
      if (!field) return {error: 'no colour field on neopixel_color_colors'};
      r.fieldFound = true;
      r.before = Blockly.Python.workspaceToCode(ws).trim();
      field.showEditor_();
      var state = editorOpen();
      r.editorOpens = state.open;
      // The plugin's picker is a table of colour cells.
      r.editorHasSwatches = /background-color|colourSwatch|blocklyColourTable|<td/i
          .test(state.html);
      closeEditor();
      field.setValue('#00ff00');
      r.after = Blockly.Python.workspaceToCode(ws).trim();
      r.valueTook = String(field.getValue()).toLowerCase() === '#00ff00';
      r.codeChanged = r.before !== r.after;
    } catch (e) { r.error = String(e.message || e); }
    return r;
  })();

  // ---- angle field: also a plugin ----------------------------------------
  out.angle = (function() {
    var r = {};
    try {
      var block = fresh('robot_servo_angle');
      var field = null;
      block.inputList.forEach(function(i) {
        (i.fieldRow || []).forEach(function(f) {
          if (f.constructor === Blockly.FieldAngle) field = f;
        });
      });
      if (!field) return {error: 'no angle field on robot_servo_angle'};
      r.fieldFound = true;
      r.before = Blockly.Python.workspaceToCode(ws).trim();
      field.showEditor_();
      var state = editorOpen();
      r.editorOpens = state.open;
      // The angle editor draws a dial in SVG.
      r.editorHasDial = /svg|circle|path/i.test(state.html);
      closeEditor();
      field.setValue(135);
      r.valueTook = Number(field.getValue()) === 135;
      r.after = Blockly.Python.workspaceToCode(ws).trim();
      r.codeChanged = r.before !== r.after;
    } catch (e) { r.error = String(e.message || e); }
    return r;
  })();

  // ---- mutators: rewritten around an icon class in Blockly 11 -------------
  // Async because Blockly 11+ opens a mutator bubble asynchronously:
  // setBubbleVisible awaits finishQueuedRenders before it builds the mini
  // workspace, so a synchronous call returns a promise and leaves the bubble
  // shut. Recomposing the source block afterwards is deferred too.
  async function exerciseMutator(parentType, subType) {
    var r = {parent: parentType};
    try {
      var block = fresh(parentType);
      var icon = block.getIcon && block.getIcon('mutator');
      if (!icon) return {parent: parentType, error: 'no mutator icon'};
      r.hasIcon = true;
      r.inputsBefore = block.inputList.length;
      r.codeBefore = Blockly.Python.workspaceToCode(ws).trim();

      await icon.setBubbleVisible(true);
      r.bubbleOpens = icon.bubbleIsVisible();
      var mini = icon.getWorkspace ? icon.getWorkspace() : null;
      if (!mini) { r.error = 'no mutator workspace'; return r; }
      var container = mini.getTopBlocks(false)[0];
      r.containerBlock = container ? container.type : null;

      // Add one item to the container's stack, the way dragging one in does.
      var item = mini.newBlock(subType);
      item.initSvg();
      item.render();
      // Two shapes of container, so the connection is found by trying rather
      // than by name: BIPES's holds its items in a statement input, while
      // Blockly's controls_if_if has no input at all and the elseif blocks
      // stack underneath it on the container's own next connection.
      var candidates = [container.nextConnection].concat(
          container.inputList.map(function(i) { return i.connection; }));
      for (var k = 0; k < candidates.length && !r.itemAttached; k++) {
        var conn = candidates[k];
        if (!conn) continue;
        var target = conn;
        while (target && target.targetBlock()) {
          target = target.targetBlock().nextConnection;
        }
        if (!target || !item.previousConnection) continue;
        try {
          target.connect(item.previousConnection);
          r.itemAttached = true;
        } catch (e) { /* wrong input; try the next one */ }
      }
      if (!r.itemAttached) r.error = 'could not attach ' + subType;
      await sleep(100);            // the mini workspace recomposes on a timer
      await icon.setBubbleVisible(false);
      await sleep(100);

      r.inputsAfter = block.inputList.length;
      r.grewAnInput = r.inputsAfter > r.inputsBefore;
      r.codeAfter = Blockly.Python.workspaceToCode(ws).trim();
      r.codeChanged = r.codeBefore !== r.codeAfter;

      // And the shape has to survive a save/load round trip.
      var dom = Blockly.Xml.workspaceToDom(ws);
      ws.clear();
      Blockly.Xml.domToWorkspace(dom, ws);
      var again = ws.getTopBlocks(false)[0];
      r.inputsAfterReload = again ? again.inputList.length : -1;
      r.survivesReload = r.inputsAfterReload === r.inputsAfter;
    } catch (e) { r.error = String(e.message || e); }
    return r;
  }

  out.mutatorBipes =
      await exerciseMutator('localstorage_store', 'localstorage_store_item');
  out.mutatorBlockly = await exerciseMutator('controls_if', 'controls_if_elseif');

  // ---- undo and redo ------------------------------------------------------
  out.undo = await (async function() {
    var r = {};
    try {
      ws.clear();
      // newBlock() on its own fires no create event, so there would be nothing
      // on the undo stack to undo. domToBlock is the path a paste, a file load
      // and a drag out of the flyout all go through. The stack is cleared
      // first so this measures its own edit and not the ones above.
      ws.clearUndo();
      Blockly.Xml.domToBlock(
          Blockly.Xml.textToDom('<block type="math_number"></block>'), ws);
      // Blockly fires its events on a timer, so the undo stack is still empty
      // for a moment after the block exists. Undoing now would undo nothing.
      await sleep(80);
      r.after = ws.getAllBlocks(false).length;
      r.stackDepth = ws.getUndoStack().length;
      ws.undo(false);
      r.afterUndo = ws.getAllBlocks(false).length;
      ws.undo(true);
      r.afterRedo = ws.getAllBlocks(false).length;
      r.undoWorks = r.afterUndo < r.after;
      r.redoWorks = r.afterRedo === r.after;
    } catch (e) { r.error = String(e.message || e); }
    return r;
  })();

  // ---- copy and paste -----------------------------------------------------
  out.clipboard = (function() {
    var r = {};
    try {
      var block = fresh('neopixel_color_colors');
      r.before = ws.getAllBlocks(false).length;
      Blockly.clipboard.copy(block);
      var pasted = Blockly.clipboard.paste();
      r.after = ws.getAllBlocks(false).length;
      r.pasted = !!pasted;
      r.grew = r.after > r.before;
    } catch (e) { r.error = String(e.message || e); }
    return r;
  })();

  // ---- a flyout block reaching the workspace ------------------------------
  // What dragging one out amounts to: the flyout's block, reproduced on the
  // main workspace and asked to generate code.
  out.fromFlyout = (function() {
    var r = {};
    try {
      var tb = Code.workspace.getToolbox();
      var cat = tb.getToolboxItems().filter(function(i) {
        return i.isSelectable && i.isSelectable();
      })[0];
      tb.setSelectedItem(cat);
      var flyout = ws.getFlyout();
      var source = flyout.getWorkspace().getTopBlocks(false)[0];
      r.category = cat.getName ? cat.getName() : '?';
      r.sourceType = source ? source.type : null;
      if (!source) { r.error = 'flyout had no blocks'; return r; }
      ws.clear();
      var copy = Blockly.Xml.domToBlock(Blockly.Xml.blockToDom(source), ws);
      r.landed = !!copy && copy.type === source.type;
      r.code = Blockly.Python.workspaceToCode(ws).trim();
      r.generates = r.code.length > 0;
    } catch (e) { r.error = String(e.message || e); }
    return r;
  })();

  ws.clear();
  return out;
};

async function main() {
  const args = parseArgs(process.argv);
  const page = path.join(REPO, 'ui', 'index.html');

  await withPage('file://' + page, {
    ready: 'typeof Code === "object" && !!Code.workspace',
    settleMs: 2000,
  }, async (p) => {
    const r = await p.evaluate('(' + EXERCISE.toString() + ')()');

    console.log('\ncolour field (plugin)');
    check('colour field is on the block', !r.colour.error && r.colour.fieldFound,
          r.colour.error);
    check('colour editor opens', r.colour.editorOpens === true);
    check('colour editor draws swatches', r.colour.editorHasSwatches === true);
    check('colour value can be set', r.colour.valueTook === true);
    check('generated python follows the colour', r.colour.codeChanged === true,
          (r.colour.after || '').split('\n').pop());

    console.log('\nangle field (plugin)');
    check('angle field is on the block', !r.angle.error && r.angle.fieldFound,
          r.angle.error);
    check('angle editor opens', r.angle.editorOpens === true);
    check('angle editor draws a dial', r.angle.editorHasDial === true);
    check('angle value can be set', r.angle.valueTook === true);
    check('generated python follows the angle', r.angle.codeChanged === true,
          (r.angle.after || '').split('\n').pop());

    for (const [label, m] of [["BIPES's own", r.mutatorBipes],
                              ["Blockly's own", r.mutatorBlockly]]) {
      console.log('\nmutator, ' + label + ' (' + m.parent + ')');
      check('has a mutator icon', !m.error && m.hasIcon === true, m.error);
      check('bubble opens', m.bubbleOpens === true);
      check('bubble holds the container block', !!m.containerBlock,
            m.containerBlock || '');
      check('adding an item attaches it', m.itemAttached === true);
      check('the block grows an input', m.grewAnInput === true,
            m.inputsBefore + ' -> ' + m.inputsAfter);
      check('generated python changes with it', m.codeChanged === true);
      check('the new shape survives save and load', m.survivesReload === true,
            m.inputsAfter + ' -> ' + m.inputsAfterReload);
    }

    console.log('\nundo, clipboard, flyout');
    check('undo removes the block', r.undo.undoWorks === true,
          r.undo.error ||
          (r.undo.after + ' -> ' + r.undo.afterUndo +
           ', undo stack ' + r.undo.stackDepth));
    check('redo puts it back', r.undo.redoWorks === true,
          r.undo.afterUndo + ' -> ' + r.undo.afterRedo);
    check('copy and paste adds a block', r.clipboard.grew === true,
          r.clipboard.error || (r.clipboard.before + ' -> ' + r.clipboard.after));
    check('a flyout block lands on the workspace', r.fromFlyout.landed === true,
          r.fromFlyout.error || (r.fromFlyout.category + '/' + r.fromFlyout.sourceType));
    check('and generates code there', r.fromFlyout.generates === true);

    check('no uncaught exceptions', p.pageErrors.length === 0, p.pageErrors[0]);
    check('no console errors', p.consoleErrors.length === 0, p.consoleErrors[0]);

    if (args.shots) await p.screenshot(path.join(args.shots, 'interact.png'));

    console.log('');
    if (failures.length) {
      console.log(failures.length + ' check(s) failed:');
      for (const f of failures) console.log('  ' + f);
      process.exit(1);
    }
    console.log('all checks passed');
  });
}

main().catch((e) => {
  console.error(String((e && e.stack) || e));
  process.exit(1);
});
