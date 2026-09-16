/**
 * MicroPython fixes to Blockly's own Python generator.
 *
 * Stock Blockly writes `from numbers import Number` and tests `isinstance(x,
 * Number)` in four places. MicroPython has no `numbers` module, so a program
 * using any of them fails on its first line. BIPES has always fixed this, but
 * it did so by hand-editing the vendored `python_compressed.js`, which is why
 * that file could not be refreshed by `make copy` and why the fix was invisible
 * to review. The same four substitutions live here instead, against readable
 * code, applied on top of whatever generator Blockly ships.
 *
 * The substitutions are exactly the ones the vendored patch made, including its
 * inconsistency: the prime test falls back to `float`, the other three to
 * `int`. Preserved deliberately -- this file moves the patch, it does not
 * change what any block generates.
 *
 * Each substitution checks that it actually matched and complains if not, so
 * that a Blockly release which rewrites these generators is loud rather than
 * quietly emitting Python the board cannot run.
 */

'use strict';

(function() {
  if (typeof Blockly !== 'object' || !Blockly.Python) return;

  var P = Blockly.Python;

  function warn(what) {
    if (typeof console === 'object' && console.warn) {
      console.warn('micropython_patches: ' + what + ' -- the "numbers" module ' +
                   'does not exist on MicroPython, so generated code may not run. ' +
                   'Check this file against the Blockly version in ui/core.');
    }
  }

  function getGenerator(type) {
    return (P.forBlock && P.forBlock[type]) || P[type];
  }

  function setGenerator(type, fn) {
    if (P.forBlock) P.forBlock[type] = fn;
    P[type] = fn;
  }

  // ---- math_change --------------------------------------------------------
  // Emits `x = (x if isinstance(x, Number) else 0) + delta` inline.
  var mathChange = getGenerator('math_change');
  if (typeof mathChange === 'function') {
    setGenerator('math_change', function(block, generator) {
      var code = mathChange.call(this, block, generator || P);
      if (typeof code === 'string' && code.indexOf(', Number)') !== -1) {
        code = code.split(', Number)').join(', int)');
      }
      return code;
    });
  }

  // ---- provideFunction_ bodies and the import ----------------------------
  // math_number_property's PRIME branch and math_on_list's AVERAGE and MEDIAN
  // branches put their isinstance test inside a helper function registered in
  // definitions_, so they cannot be fixed from the code the generator returns.
  // Rewrite them where they are actually stored, on the way out.
  var BODY_FIXES = [
    {key: 'math_isPrime', from: 'isinstance(n, Number)', to: 'isinstance(n, float)'},
    {key: 'math_mean', from: 'isinstance(e, Number)', to: 'isinstance(e, int)'},
    {key: 'math_median', from: 'isinstance(e, Number)', to: 'isinstance(e, int)'},
  ];

  var finish = P.finish;
  if (typeof finish === 'function') {
    P.finish = function(code) {
      var defs = this.definitions_ || P.definitions_;
      if (defs) {
        delete defs['from_numbers_import_Number'];
        for (var i = 0; i < BODY_FIXES.length; i++) {
          var fix = BODY_FIXES[i];
          // provideFunction_ may have renamed the function around a collision;
          // the definitions_ key is still the name it was asked for.
          var body = defs[fix.key];
          if (typeof body !== 'string') continue;
          if (body.indexOf(fix.from) === -1) {
            if (body.indexOf('Number') !== -1) warn(fix.key + ' still mentions Number');
            continue;
          }
          defs[fix.key] = body.split(fix.from).join(fix.to);
        }
        // Anything left referring to Number would reach the board broken.
        for (var key in defs) {
          if (typeof defs[key] === 'string' &&
              defs[key].indexOf('from numbers import') !== -1) {
            warn('definitions_[' + key + '] imports numbers');
          }
        }
      }
      return finish.call(this, code);
    };
  }
})();
