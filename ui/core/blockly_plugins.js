/**
 * Wires the vendored Blockly field plugins into the shape this tree expects.
 *
 * Blockly 11 moved the colour and angle fields, and the four colour blocks,
 * out of core and into separate packages. The bundles in ui/core define their
 * exports as globals but install nothing: a plugin has to be asked. This file
 * does the asking, and puts the two field constructors back on the Blockly
 * namespace, because that is where 969 generated `new Blockly.FieldColour(...)`
 * and `new Blockly.FieldAngle(...)` call sites look for them.
 *
 * Loaded after core/field_colour.js and core/field_angle.js, and before any
 * file that defines a block.
 */

'use strict';

(function() {
  if (typeof Blockly !== 'object') return;

  // ---- Colour -------------------------------------------------------------
  // installAllBlocks brings in colour_picker, colour_rgb, colour_blend and
  // colour_random, their generators for the languages handed to it, and the
  // colour field they depend on. ui/toolbox/linux.xml offers colour_picker.
  if (typeof installAllBlocks === 'function') {
    var generators = {};
    if (Blockly.Python) generators.python = Blockly.Python;
    if (Blockly.JavaScript) generators.javascript = Blockly.JavaScript;
    installAllBlocks(generators);
  } else if (typeof registerFieldColour === 'function') {
    registerFieldColour();
  }
  if (typeof FieldColour === 'function' && !Blockly.FieldColour) {
    Blockly.FieldColour = FieldColour;
  }

  // ---- Angle --------------------------------------------------------------
  // No blocks to install, just the field.
  if (typeof registerFieldAngle === 'function') registerFieldAngle();
  if (typeof FieldAngle === 'function' && !Blockly.FieldAngle) {
    Blockly.FieldAngle = FieldAngle;
  }
})();
