/**
 * Blockly version compatibility layer.
 *
 * Loaded last, after every block and generator file. Everything here is
 * conditional on what the loaded Blockly actually provides, so the file is a
 * no-op on Blockly 6 and does the work on Blockly 13 -- which means it can be
 * landed, and proved not to change `make golden`, before the bundles move.
 *
 * What it papers over, and why the fix is here rather than in 2,900 call sites:
 *
 *   Blockly.ALIGN_*        gone; the values are unchanged, so alias them.
 *   generator registration Blockly 11 stopped reading generator functions off
 *                          the generator object and reads generator.forBlock
 *                          instead. Sweeping them across once beats editing
 *                          2,053 registrations, 737 of which are vendored
 *                          OpenCV bindings nobody wants to hand-edit.
 *   Blockly.Xml.textToDom  moved to Blockly.utils.xml.
 *   Blockly.alert          moved to Blockly.dialog.
 *   mutators               Blockly.Mutator became Blockly.icons.MutatorIcon,
 *                          which needs the source block, and the static
 *                          Mutator.reconnect became Connection.reconnect.
 */

'use strict';

(function() {
  if (typeof Blockly !== 'object') return;

  // ---- Globals the field plugins read -------------------------------------
  // The plugin bundles are webpack UMD: loaded from a <script> tag they look
  // for globals literally named "Blockly.Python", "Blockly.Dart" and so on.
  // We ship the Python and JavaScript generators; the colour plugin also asks
  // for Dart, Lua and PHP so it can register colour generators for them.
  // Rather than vendor three language bundles nothing here can reach, give it
  // somewhere harmless to register them.
  // What they want under those names is the generator *module* -- the object
  // carrying Order alongside the generator -- not the generator itself. Loaded
  // from a script tag, Blockly leaves that module at window.python /
  // window.javascript and puts only the generator on Blockly.Python. Handing
  // over the generator instead costs you Order, and the plugin's blocks then
  // fail at code generation with "cannot read properties of undefined".
  if (typeof window === 'object') {
    var pythonModule = window.python || Blockly.Python;
    var javascriptModule = window.javascript || Blockly.JavaScript;
    if (pythonModule) window['Blockly.Python'] = pythonModule;
    if (javascriptModule) window['Blockly.JavaScript'] = javascriptModule;
    var unusedLanguages = ['Blockly.Dart', 'Blockly.Lua', 'Blockly.PHP'];
    for (var u = 0; u < unusedLanguages.length; u++) {
      if (!window[unusedLanguages[u]]) window[unusedLanguages[u]] = {forBlock: {}};
    }
  }

  // ---- Input alignment ----------------------------------------------------
  // Blockly.inputs.Align has the same -1/0/1 values the constants had.
  if (Blockly.ALIGN_RIGHT === undefined && Blockly.inputs && Blockly.inputs.Align) {
    Blockly.ALIGN_LEFT = Blockly.inputs.Align.LEFT;
    Blockly.ALIGN_CENTRE = Blockly.inputs.Align.CENTRE;
    Blockly.ALIGN_RIGHT = Blockly.inputs.Align.RIGHT;
  }

  // ---- XML helpers --------------------------------------------------------
  if (Blockly.Xml && !Blockly.Xml.textToDom &&
      Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom) {
    Blockly.Xml.textToDom = Blockly.utils.xml.textToDom;
  }

  // ---- Dialogs ------------------------------------------------------------
  if (!Blockly.alert && Blockly.dialog) {
    Blockly.alert = Blockly.dialog.alert;
    Blockly.confirm = Blockly.dialog.confirm;
    Blockly.prompt = Blockly.dialog.prompt;
  }

  // ---- Mutators -----------------------------------------------------------
  // Called by the two blocks in block_definitions.js that have a mutator.
  // `this` is the block, as it is inside a block's init().
  Blockly.bipesMutator_ = function(block, flyoutBlockTypes) {
    if (Blockly.icons && Blockly.icons.MutatorIcon) {
      return new Blockly.icons.MutatorIcon(flyoutBlockTypes, block);
    }
    return new Blockly.Mutator(flyoutBlockTypes);
  };

  Blockly.bipesReconnect_ = function(connection, block, inputName) {
    if (!connection) return false;
    if (typeof connection.reconnect === 'function') {
      return connection.reconnect(block, inputName);
    }
    return Blockly.Mutator.reconnect(connection, block, inputName);
  };

  // ---- Generator registration --------------------------------------------
  /**
   * Move generator functions assigned as `Blockly.Python['block_type']` into
   * `Blockly.Python.forBlock`, which is the only place Blockly 11+ looks.
   *
   * Only keys that name a registered block type are moved, so the generator's
   * own API and the helpers BIPES hangs off it (variableName_, i2cBus_, the
   * blockdef* helpers) are left alone. Idempotent, and exposed so that anything
   * registering a generator after load can re-run it.
   */
  Blockly.bipesSyncForBlock_ = function(generator) {
    if (!generator || !generator.forBlock) return 0;
    var moved = 0;
    var keys = Object.keys(generator);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (typeof generator[key] !== 'function') continue;
      if (!Object.prototype.hasOwnProperty.call(Blockly.Blocks, key)) continue;
      if (generator.forBlock[key] === generator[key]) continue;
      generator.forBlock[key] = generator[key];
      moved++;
    }
    return moved;
  };

  // Runs here too, so the file is correct wherever it is loaded, but the call
  // that matters is the one in ui/index.html after the last generator file.
  if (Blockly.Python) Blockly.bipesSyncForBlock_(Blockly.Python);
  if (Blockly.JavaScript) Blockly.bipesSyncForBlock_(Blockly.JavaScript);
})();
