/*
 * Embedding blocks in someone else's page.
 *
 * Two halves, one file, because they have to agree about what a "chain" is:
 *
 *   * the static half -- picking top-level chains out of a workspace XML and
 *     dragging in the function definitions they call. `embed.html` uses it to
 *     honour `?block=`, and the picker in the IDE uses it to prune a workspace
 *     down to what the author ticked. One implementation, so a link that says
 *     `?block=2` and a link the picker built can never disagree.
 *   * `class embed` itself -- the picker dialog on the Blocks toolbar, which
 *     turns a selection into a URL and an <iframe> snippet to paste.
 *
 * The idea is Teknologiskolen/BIPES-Teknologiskolen @ `forth`,
 * `static/page/embed/embed.js`: `?block=1,2` selecting chains, and pulling in
 * the definitions of the functions those chains call so the snippet is
 * runnable on its own. Theirs is built on their server -- `/embed?uid=<share>`
 * fetches the project from their API -- and this tree has no server: the App
 * Engine backend `BlocklyStorage` posts to has been gone since before the fork
 * point, which is what `ui/shared.html` says out loud. So the blocks travel in
 * the link itself (`?xml=`), or in a file the lesson author hosts (`?src=`),
 * and everything works from `file://`.
 */

//`get` is core/ui.js's one-liner, and the only thing this file wanted from
//that 900-line module. The IDE has already defined it by the time this runs;
//ui/embed.html does not load ui.js at all, so define it there.
if (typeof get != 'function')
  var get = (selector) => document.querySelector (selector);

class embed {
  constructor () {
    this.dialog = get ('#embedDialog');
    this.list = get ('#embedList');
    this.output = get ('#embedOutput');
    this.count = get ('#embedCount');
  }

  // ---- the shared half: selecting chains ------------------------------------

  /**
   * The `<workspace>` chunk BIPES writes at the top of a saved XML, split off.
   *
   * It is not Blockly's -- `domToWorkspace` has no idea what to do with it --
   * so the IDE's own loader strips it before parsing, in
   * `workspace.readWorkspace`. This is the same split, kept to the one field
   * an embed needs: which board the program was written for, so that `pinout`
   * blocks name real pins instead of "not defined".
   *
   * @param {string} xml A saved BIPES workspace.
   * @return {Object} `{device, xml}`; `device` is '' when there is no chunk.
   */
  static splitWorkspace (xml) {
    let match_ = xml.match (/<workspace>[\s\S]*?<\/workspace>\n?/);
    if (match_ == null)
      return {device: '', xml: xml};
    let device_ = match_ [0].match (/<field name="DEVICE">(.+?)<\/field>/);
    return {device: device_ == null ? '' : device_ [1],
            xml: xml.replace (match_ [0], '')};
  }

  /** The top-level `<block>` elements of a workspace XML, in document order. */
  static chains (dom) {
    return Array.prototype.slice.call (dom.children).filter ((el_) =>
      el_.tagName != undefined && el_.tagName.toLowerCase () == 'block');
  }

  /**
   * Keep only the chosen chains, plus the function definitions they call.
   *
   * A selector is a block id or a 0-based index into the top-level chains, so
   * `?block=2` and `?block=4vT.uL,9qQ` both work -- an id survives editing the
   * project, an index is what somebody counting blocks on screen will write.
   *
   * The definitions matter because of how Blockly lays a program out: a call
   * block sits inside one chain while the `to <name>` definition is a
   * separate top-level chain of its own. Select the chain that calls and you
   * would get a snippet that cannot run. So after the explicit picks, every
   * definition a chosen chain calls is pulled in, and then every definition
   * *those* call, until nothing new appears -- a function that calls a helper
   * brings the helper.
   *
   * `<variables>` comes along whole: a chain that uses a variable needs its
   * declaration, and the declarations are not per-chain.
   *
   * @param {string} xmlText A workspace XML, with no `<workspace>` chunk.
   * @param {Array<string>} sels Ids and/or indices.
   * @return {string} The pruned XML, or `xmlText` unchanged if nothing matched.
   */
  static select (xmlText, sels) {
    let dom_ = Blockly.Xml.textToDom (xmlText);
    let chains_ = embed.chains (dom_);
    let chosen_ = [];
    sels.forEach ((sel_) => {
      let el_ = /^\d+$/.test (sel_)
        ? chains_ [parseInt (sel_, 10)]
        : chains_.filter ((b_) => b_.getAttribute ('id') == sel_) [0];
      if (el_ != undefined && chosen_.indexOf (el_) == -1)
        chosen_.push (el_);
    });
    //Nothing matched: show the whole project rather than an empty frame. A
    //typo in a lesson's URL should look wrong, not look like no blocks.
    if (chosen_.length == 0)
      return xmlText;

    let defs_ = {};
    chains_.forEach ((b_) => {
      if (embed.DEF_TYPES.indexOf (b_.getAttribute ('type')) == -1)
        return;
      let name_ = embed.fieldOf (b_, 'NAME');
      if (name_ != null)
        defs_ [name_] = b_;
    });
    let queue_ = chosen_.slice ();
    while (queue_.length > 0) {
      let blk_ = queue_.shift ();
      //The chain itself as well as everything nested in it: a call can be the
      //top block of the chain that was picked.
      let all_ = Array.prototype.slice.call (blk_.getElementsByTagName ('block'));
      all_.concat ([blk_]).forEach ((el_) => {
        if (embed.CALL_TYPES.indexOf (el_.getAttribute ('type')) == -1)
          return;
        let muts_ = embed.directChildren (el_, 'mutation');
        let def_ = muts_.length == 0 ? undefined : defs_ [muts_ [0].getAttribute ('name')];
        if (def_ != undefined && chosen_.indexOf (def_) == -1) {
          chosen_.push (def_);
          queue_.push (def_);
        }
      });
    }

    //Document order, so the XML reads the way the project does. Where each
    //chain lands on the canvas is its own x/y, which is kept.
    chosen_.sort ((a_, b_) => chains_.indexOf (a_) - chains_.indexOf (b_));
    //The source's own root, emptied: build a fresh `<xml>` instead and every
    //chain copied into it carries a redundant `xmlns=` of its own, because it
    //came from a document with a different default namespace. That is fifty
    //bytes per chain in a link that is already the long part of this feature.
    let out_ = dom_.cloneNode (false);
    Array.prototype.slice.call (dom_.children).forEach ((el_) => {
      if (el_.tagName != undefined && el_.tagName.toLowerCase () == 'variables')
        out_.appendChild (el_.cloneNode (true));
    });
    chosen_.forEach ((b_) => out_.appendChild (b_.cloneNode (true)));
    return Blockly.Xml.domToText (out_);
  }

  /**
   * Drop the `id` attribute from every block and shadow.
   *
   * Only from those two. Blockly also writes an id on each `<variable>`, and
   * every `<field name="VAR">` that uses it names that id -- take those away
   * and a program with a variable in it no longer loads. This is the same
   * distinction `workspaceToDom`'s own `opt_noId` makes; it cannot be used
   * here because the ids are what the picker selects chains *by*, so they have
   * to survive until after the pruning.
   *
   * @param {string} xmlText
   * @return {string} The same XML, a few hundred bytes shorter in a link.
   */
  static stripIds (xmlText) {
    let dom_ = Blockly.Xml.textToDom (xmlText);
    ['block', 'shadow'].forEach ((tag_) => {
      Array.prototype.slice.call (dom_.getElementsByTagName (tag_))
        .forEach ((el_) => el_.removeAttribute ('id'));
    });
    return Blockly.Xml.domToText (dom_);
  }

  /**
   * What a chain says, for a row in the picker.
   *
   * `toString()` is what Blockly's own search and context menus use, so a row
   * reads the way the blocks look -- "repeat 3 times do beep twice" -- rather
   * than naming a type nobody sees on screen.
   *
   * Guarded, because it walks the whole chain and a block it reaches can have
   * been disposed underneath it: loading a workspace makes
   * `Blockly.Procedures.mutateCallers` rebuild every call block of every
   * definition, and a walk that meets one mid-rebuild asks a disposed block
   * where it is. That is a caption. It must not be able to empty the dialog.
   */
  static describe (block, chars) {
    try {
      return block.toString (chars);
    } catch (e) {
      return block.type;
    }
  }

  /** Direct children of an element by tag name, ignoring anything nested. */
  static directChildren (el, tag) {
    return Array.prototype.slice.call (el.children || []).filter ((k_) =>
      k_.tagName != undefined && k_.tagName.toLowerCase () == tag);
  }

  /**
   * A field's text, read from an element's *direct* children.
   *
   * Direct, because a function definition's body is full of blocks with fields
   * of their own, and `getElementsByTagName('field')` would happily return the
   * first one of those as the function's name.
   */
  static fieldOf (el, name) {
    let hit_ = embed.directChildren (el, 'field').filter ((f_) =>
      f_.getAttribute ('name') == name) [0];
    return hit_ == undefined ? null : hit_.textContent;
  }

  // ---- links ---------------------------------------------------------------

  /**
   * base64url of a UTF-8 string: the `+/=` of ordinary base64 all mean
   * something else in a URL.
   *
   * TextEncoder rather than `unescape(encodeURIComponent(...))`: the workspace
   * carries block text the user typed, and a project named in Portuguese is
   * the common case here, not the exotic one.
   */
  static toBase64 (text) {
    let bytes_ = new TextEncoder ().encode (text);
    let bin_ = '';
    bytes_.forEach ((b_) => {bin_ += String.fromCharCode (b_);});
    return btoa (bin_).replace (/\+/g, '-').replace (/\//g, '_').replace (/=+$/, '');
  }

  /** The other direction. Throws on anything that is not base64url. */
  static fromBase64 (b64) {
    let bin_ = atob (b64.replace (/-/g, '+').replace (/_/g, '/'));
    let bytes_ = new Uint8Array (bin_.length);
    for (let i_ = 0; i_ < bin_.length; i_++)
      bytes_ [i_] = bin_.charCodeAt (i_);
    return new TextDecoder ().decode (bytes_);
  }

  /**
   * The embed URL for an XML, as an absolute link next to this page.
   *
   * @param {string} xml The blocks to show.
   * @param {Object} opts `{device, lock}`.
   * @return {string}
   */
  static link (xml, opts) {
    opts = opts || {};
    let params_ = ['xml=' + embed.toBase64 (xml)];
    if (opts.device)
      params_.push ('device=' + encodeURIComponent (opts.device));
    if (opts.lock)
      params_.push ('lock=1');
    let here_ = location.href.replace (/[^/]*(\?.*)?(#.*)?$/, '');
    return here_ + 'embed.html?' + params_.join ('&');
  }

  // ---- the picker ----------------------------------------------------------

  /**
   * Open or close the picker.
   *
   * A `<dialog>`, like the Files tab's library picker: closed, it costs the
   * Blocks tab nothing, and the workspace behind it is what the list is built
   * from, so it has to be rebuilt every time it opens.
   */
  toggle () {
    if (this.dialog == undefined)
      return;
    if (this.dialog.open) {
      this.dialog.close ();
      return;
    }
    this.dialog.showModal ();
    this.render ();
  }

  /**
   * One row per top-level chain, described the way Blockly describes a block.
   *
   * `toString()` is what the workspace search and the context menu use, so a
   * row reads like the blocks look -- "repeat 10 times do set led to ..." --
   * rather than naming a type nobody sees on screen. Chains are listed in the
   * order `getTopBlocks(true)` gives, which is top-to-bottom on the canvas.
   */
  render () {
    if (this.list == undefined)
      return;
    this.list.innerHTML = '';
    this.rows = [];
    let tops_ = Code.workspace.getTopBlocks (true);
    tops_.forEach ((block_, index_) => {
      let row_ = new DOM ('div', {className: 'embedRow'});
      let check_ = new DOM ('input', {type: 'checkbox', id: `embed_${block_.id}`,
                                      className: 'embedCheck'});
      //Bound here rather than in the markup: these rows are built from the
      //workspace every time the dialog opens, so there is no markup to put it in.
      check_._dom.onchange = () => this.update ();
      let text_ = embed.describe (block_, 60);
      let label_ = new DOM ('label', {innerText: text_, htmlFor: `embed_${block_.id}`,
                                      title: embed.describe (block_, 400)});
      row_.append ([check_, label_]);
      let size_ = block_.getDescendants (false).length;
      row_.append (new DOM ('span', {
        innerText: size_ == 1 ? '1 block' : `${size_} blocks`, className: 'embedFlag'}));
      if (embed.DEF_TYPES.indexOf (block_.type) != -1)
        //Worth saying: a definition does not have to be ticked. Tick the chain
        //that calls it and it comes along by itself.
        row_.append (new DOM ('span', {innerText: 'function', className: 'embedFlag'}));
      this.list.appendChild (row_._dom);
      this.rows.push ({block: block_, check: check_._dom});
    });
    if (tops_.length == 0)
      this.list.appendChild (
        new DOM ('div', {className: 'embedEmpty', innerText:
          'There are no blocks in the workspace to embed.'})._dom);
    this.update ();
  }

  /** Rebuild the link and the snippet from whatever is ticked. */
  update () {
    if (this.output == undefined)
      return;
    let picked_ = (this.rows || []).filter ((r_) => r_.check.checked);
    let lock_ = get ('#embedLock');
    //With ids, because they are what a chain is picked by -- and then without
    //them, because by that point they are a few hundred bytes of link that
    //nothing reads back.
    let whole_ = Blockly.Xml.domToText (Blockly.Xml.workspaceToDom (Code.workspace));
    let xml_ = embed.stripIds (picked_.length == 0
      ? whole_
      : embed.select (whole_, picked_.map ((r_) => r_.block.id)));

    let pulled_ = embed.chains (Blockly.Xml.textToDom (xml_)).length;
    let link_ = embed.link (xml_, {device: get ('#device_selector').value,
                                   lock: lock_ != undefined && lock_.checked});
    this.output.value =
      `<iframe src="${link_}" width="100%" height="400" frameborder="0"></iframe>`;
    this.link_ = link_;

    if (this.count != undefined) {
      let of_ = picked_.length == 0
        ? `whole workspace, ${pulled_} ${pulled_ == 1 ? 'chain' : 'chains'}`
        : `${picked_.length} ticked, ${pulled_} in the embed`;
      //The length is the thing that bites: the blocks travel in the link, and
      //a link past about 8 kB is one some browsers and most chat clients will
      //cut. Saying the number beats finding out from a broken lesson page --
      //and when it is too long, saying what to do about it beats saying the
      //number. There are only two answers: embed less, or stop putting the
      //blocks in the link and point `?src=` at the saved file instead.
      let kb_ = (link_.length / 1024).toFixed (1);
      let long_ = link_.length > 8000;
      this.count.innerText = `${of_} — link is ${kb_} kB`;
      this.count.className = long_ ? 'embedWarn' : '';
      this.count.title = long_
        ? 'Longer than some browsers and most chat apps will carry. Tick fewer '
          + 'chains, or save the project with the Save button, host the .xml, '
          + 'and use embed.html?src=<that file>&block=<chain> instead.'
        : '';
    }
  }

  /** Copy the snippet, and say so on the button. */
  copy () {
    if (this.output == undefined)
      return;
    let button_ = get ('#embedCopyButton');
    let done_ = () => {
      if (button_ == undefined)
        return;
      let was_ = button_.innerText;
      button_.innerText = 'Copied';
      setTimeout (() => {button_.innerText = was_;}, 1200);
    };
    if (navigator.clipboard != undefined && navigator.clipboard.writeText != undefined)
      navigator.clipboard.writeText (this.output.value).then (done_, () => {
        //Denied, or no permission on a file:// page. Selecting the text is
        //something the user can then finish with one keystroke.
        this.output.select ();
        UI ['notify'].send ('Could not reach the clipboard; the snippet is selected instead.');
      });
    else {
      this.output.select ();
      UI ['notify'].send ('This browser has no clipboard access; the snippet is selected instead.');
    }
  }

  /** Open the embed in a tab of its own, to see what a reader will see. */
  preview () {
    if (this.link_ != undefined)
      window.open (this.link_, '_blank');
  }
}

/* Blockly's own function blocks. A definition is a top-level chain; a call is
   a block somewhere inside one, naming its definition in a <mutation>. */
embed.DEF_TYPES = ['procedures_defnoreturn', 'procedures_defreturn'];
embed.CALL_TYPES = ['procedures_callnoreturn', 'procedures_callreturn'];


/*
 * The embed page itself (`ui/embed.html`).
 *
 * A read-only Blockly workspace and nothing else -- no toolbox, no channel, no
 * code generation. Everything it needs beyond Blockly is already in this tree
 * and is loaded as-is rather than stubbed: `core/code.js` for the language
 * (which is what writes the `msg/` and `b.msg/` script tags, so `?lang=pt-br`
 * works here exactly as it does in the IDE), `core/utils.js` for `Tool`, and
 * the two block files. The three things those expect and a bare page does not
 * have -- a device list, a `#device_selector` to read the target from, and a
 * `UI` object -- are built here, from the same `devinfo.json` the IDE reads.
 */

/** Where the blocks come from, in the order they are looked for. */
embed.SOURCES = ['xml', 'src'];

/**
 * Build the page from the query string. Called by `embed.html`.
 *
 * `?xml=<base64url>`  the blocks themselves -- what the picker writes, and
 *                     the only form that works with no server at all.
 * `?src=<url>`        a saved `.bipes.xml` to fetch. Pair it with `?block=`
 *                     and one file can power a page full of different
 *                     snippets.
 * `?block=1,2`        which top-level chains to show: ids or 0-based indices,
 *                     comma-separated and/or repeated. Function definitions
 *                     the chosen chains call come too, so a snippet runs.
 * `?device=ESP32`     which board's pins the `pinout` blocks should name.
 *                     Defaults to whatever the saved workspace was written
 *                     for, then to the first board in `devinfo.json`.
 * `?lock=1`           a fixed picture: no panning, no zooming.
 * `?lang=pt-br`       read by `core/code.js`, like the IDE's.
 */
embed.renderPage = function () {
  let params_ = new URLSearchParams (location.search);
  let sels_ = params_.getAll ('block')
    .reduce ((all_, v_) => all_.concat (String (v_).split (',')), [])
    .map ((s_) => s_.trim ())
    .filter ((s_) => s_.length > 0);
  //Locked when the author asked, and when they picked chains: a chosen
  //snippet is a picture in a lesson, not something to go exploring in.
  let locked_ = params_.get ('lock') == '1' || sels_.length > 0;

  embed.devices (params_.get ('device'), () => {
    let done_ = (xml_) => embed.show (xml_, sels_, locked_);
    let xml_ = params_.get ('xml');
    let src_ = params_.get ('src');
    if (xml_ != null) {
      try {
        done_ (embed.fromBase64 (xml_));
      } catch (e) {
        embed.fail ('The blocks in this link could not be decoded.', e);
      }
    } else if (src_ != null) {
      //Whatever the lesson author hosts. It is read as XML and drawn as
      //blocks; nothing in it is executed, and no generator runs here.
      fetch (src_, {cache: 'no-store'})
        .then ((r_) => {
          if (!r_.ok)
            throw new Error (`${r_.status} ${r_.statusText}`);
          return r_.text ();
        })
        .then (done_)
        .catch ((e) => embed.fail (`Could not load ${src_}.`, e));
    } else {
      embed.fail ('Nothing to show. Add ?xml= or ?src= to this link — the ' +
                  'Embed button on the BIPES toolbar writes one for you.');
    }
  });
};

/**
 * Read `devinfo.json` and stand up the two things `Blockly.Blocks['pinout']`
 * reads: `UI['workspace'].devices`, and a `#device_selector` holding the
 * target. Without them every pin dropdown on the page says "not defined".
 *
 * @param {?string} want The `?device=` override, if there was one.
 * @param {function} then Called once, whether or not the file could be read.
 */
embed.devices = function (want, then) {
  window.UI = window.UI || {};
  UI ['workspace'] = UI ['workspace'] || {devices: {}};
  embed.wantedDevice = want;

  let use_ = (json_) => {
    try {
      UI ['workspace'].devices = JSON.parse (json_).devices;
    } catch (e) {
      console.error ('embed: devinfo.json could not be read; pin names will be missing.', e);
    }
    then ();
  };
  //Same two sources, same order, as xhrGET in core/ui.js: the file when the
  //page can fetch one, the copy `make offline` baked in when it is on file://
  //and XMLHttpRequest is not allowed to.
  if (location.protocol == 'file:') {
    let baked_ = typeof OfflineAssets == 'undefined'
      ? undefined : OfflineAssets ['devinfo/devinfo.json'];
    if (baked_ == undefined) {
      console.error ('embed: no baked devinfo.json; run `make offline`.');
      then ();
    } else
      use_ (baked_);
  } else
    fetch ('devinfo/devinfo.json')
      .then ((r_) => r_.text ())
      .then (use_)
      .catch ((e) => {
        console.error ('embed: devinfo.json could not be fetched.', e);
        then ();
      });
};

/**
 * Point `#device_selector` at the board whose pins this program used.
 *
 * `?device=` wins, then the `<workspace>` chunk the saved XML carries, then
 * the first board in the file -- which is what the IDE falls back to as well.
 */
embed.setDevice = function (fromXml) {
  let select_ = get ('#device_selector');
  let devices_ = UI ['workspace'].devices || {};
  let device_ = embed.wantedDevice || fromXml || Object.keys (devices_) [0] || '';
  select_.innerHTML = '';
  let option_ = document.createElement ('option');
  option_.value = device_;
  option_.text = device_;
  select_.appendChild (option_);
  select_.value = device_;
  return device_;
};

/**
 * Draw the blocks.
 *
 * @param {string} raw The workspace XML, as saved.
 * @param {Array<string>} sels `?block=` selectors, possibly empty.
 * @param {boolean} locked No panning or zooming.
 */
embed.show = function (raw, sels, locked) {
  let split_;
  try {
    split_ = embed.splitWorkspace (raw);
  } catch (e) {
    embed.fail ('Those are not BIPES blocks.', e);
    return;
  }
  embed.setDevice (split_.device);

  let xml_;
  try {
    xml_ = sels.length > 0 ? embed.select (split_.xml, sels) : split_.xml;
  } catch (e) {
    embed.fail ('The blocks could not be read.', e);
    return;
  }

  //Anything this page has no definition for is an OpenCV block: those live
  //under jsCv/ and are the better part of a megabyte, which is not something
  //to make every lesson page carrying a Blink program download. Fetch them
  //only when the blocks in hand actually need them.
  let missing_ = embed.unknownTypes (xml_);
  if (missing_.length > 0)
    embed.loadScripts (embed.JSCV, () => embed.draw (xml_, locked));
  else
    embed.draw (xml_, locked);
};

/** Block types in this XML that nothing on the page has defined. */
embed.unknownTypes = function (xmlText) {
  let seen_ = {};
  let dom_ = Blockly.Xml.textToDom (xmlText);
  Array.prototype.slice.call (dom_.getElementsByTagName ('block'))
    .concat (Array.prototype.slice.call (dom_.getElementsByTagName ('shadow')))
    .forEach ((el_) => {
      let type_ = el_.getAttribute ('type');
      if (type_ && Blockly.Blocks [type_] == undefined)
        seen_ [type_] = true;
    });
  return Object.keys (seen_);
};

/** Add script tags in order, then call back. Failures are not fatal. */
embed.loadScripts = function (srcs, then) {
  let next_ = (i_) => {
    if (i_ >= srcs.length) {
      then ();
      return;
    }
    let el_ = document.createElement ('script');
    el_.src = srcs [i_];
    el_.onload = () => next_ (i_ + 1);
    el_.onerror = () => {
      //An embed missing one optional bundle should still draw the blocks it
      //does have, with the unknown ones reported by Blockly.
      console.error (`embed: could not load ${srcs [i_]}`);
      next_ (i_ + 1);
    };
    document.head.appendChild (el_);
  };
  next_ (0);
};

/** Inject the workspace and put the blocks in it. */
embed.draw = function (xmlText, locked) {
  let host_ = get ('#blocks');
  let workspace_;
  try {
    workspace_ = Blockly.inject (host_, {
      readOnly: true,
      trashcan: false,
      media: 'media/',
      // Match the editor: Blockly 13 would otherwise draw these blocks with
      // 'thrasos' here and 'geras' there, for the same program.
      renderer: 'geras',
      scrollbars: !locked,
      zoom: locked
        ? {controls: false, wheel: false}
        : {controls: true, wheel: true, startScale: 0.9, maxScale: 2, minScale: 0.3},
      move: locked
        ? {drag: false, wheel: false, scrollbars: false}
        : {drag: true, wheel: true, scrollbars: true}
    });
    Blockly.Xml.domToWorkspace (Blockly.Xml.textToDom (xmlText), workspace_);
  } catch (e) {
    embed.fail ('These blocks could not be drawn.', e);
    return;
  }
  embed.workspace = workspace_;
  embed.xml = xmlText;
  embed.fit ();
  embed.copyButton ();
  //Blockly measures every field's text during its first render pass. When the
  //page is an iframe that is still being laid out, or the fonts have not
  //settled, those widths come out short and the text spills past the block's
  //edge; resizing the SVG afterwards does not fix it, because it is the
  //measurement that was wrong. Rendering again once the frame really has a
  //size re-measures everything. (The symptom, and this remedy, are the fork's.)
  embed.whenSized (() => {
    try {
      workspace_.render ();
    } catch (e) {}
    embed.fit ();
  });
  window.addEventListener ('resize', () => embed.fit ());
};

/** Scale the blocks to the frame and put them in the middle of it. */
embed.fit = function () {
  let workspace_ = embed.workspace;
  if (workspace_ == undefined)
    return;
  try {
    Blockly.svgResize (workspace_);
    //zoomToFit and scrollCenter both refuse to move a workspace that says it
    //is not movable, which a locked one does -- and say so in the console on
    //every call. Claim movable for the one call that positions the content,
    //then give the lock back: the reader still cannot pan, the blocks are
    //still centred, and nothing is logged.
    let was_ = workspace_.isMovable;
    workspace_.isMovable = () => true;
    try {
      if (workspace_.zoomToFit)
        workspace_.zoomToFit ();
      //zoomToFit fills the frame in both directions, so a three-block snippet
      //in a wide iframe comes out at 170% -- blocks the size of a hand, which
      //is not what anybody embedding a three-block snippet meant. Shrink to
      //fit, never magnify. The reader can still zoom in when the embed is not
      //locked; maxScale is what governs that.
      if (workspace_.scale > 1 && workspace_.setScale)
        workspace_.setScale (1);
      if (workspace_.scrollCenter)
        workspace_.scrollCenter ();
    } finally {
      workspace_.isMovable = was_;
    }
  } catch (e) {}
};

/** Call back once `#blocks` has a real size and the fonts have settled. */
embed.whenSized = function (then) {
  let host_ = get ('#blocks');
  let done_ = false;
  let fire_ = () => {
    if (done_)
      return true;
    if (host_.clientWidth > 0 && host_.clientHeight > 0) {
      done_ = true;
      then ();
      return true;
    }
    return false;
  };
  let start_ = () => {
    if (fire_ ())
      return;
    if (window.ResizeObserver != undefined) {
      let ro_ = new ResizeObserver (() => {if (fire_ ()) ro_.disconnect ();});
      ro_.observe (host_);
    } else {
      let n_ = 0;
      let t_ = setInterval (() => {if (fire_ () || ++n_ > 40) clearInterval (t_);}, 50);
    }
  };
  if (document.fonts != undefined && document.fonts.ready != undefined)
    document.fonts.ready.then (start_, start_);
  else
    start_ ();
};

/**
 * The Copy button: hands the reader the XML of what they are looking at, which
 * is what BIPES' own Load reads. That is the point of embedding a chain in a
 * lesson -- the reader gets the blocks, not a picture of them.
 */
embed.copyButton = function () {
  let button_ = get ('#embedCopy');
  if (button_ == undefined || embed.xml == undefined)
    return;
  button_.hidden = false;
  button_.onclick = () => {
    let done_ = () => {
      let was_ = button_.innerText;
      button_.innerText = 'Copied';
      setTimeout (() => {button_.innerText = was_;}, 1200);
    };
    if (navigator.clipboard != undefined && navigator.clipboard.writeText != undefined)
      navigator.clipboard.writeText (embed.xml).then (done_, () => embed.fallbackCopy (embed.xml, done_));
    else
      embed.fallbackCopy (embed.xml, done_);
  };
};

/** Clipboard denied, or a file:// page: select the text in a scratch box. */
embed.fallbackCopy = function (text, then) {
  try {
    let box_ = document.createElement ('textarea');
    box_.value = text;
    box_.style.position = 'fixed';
    box_.style.opacity = '0';
    document.body.appendChild (box_);
    box_.select ();
    document.execCommand ('copy');
    document.body.removeChild (box_);
    then ();
  } catch (e) {
    console.error ('embed: could not copy the blocks.', e);
  }
};

/**
 * Say what went wrong, in the frame.
 *
 * textContent, never innerHTML: every string that reaches here has a query
 * parameter or an exception message in it, and this page is meant to be
 * framed by other people's sites.
 */
embed.fail = function (message, error) {
  if (error != undefined)
    console.error ('embed: ' + message, error);
  let box_ = get ('#embedMessage');
  if (box_ == undefined)
    return;
  box_.hidden = false;
  box_.textContent = message;
};

/* The OpenCV bindings, in the order ui/index.html loads them. Fetched only
   when a workspace actually contains one of their blocks. */
embed.JSCV = ['jsCv/en.js', 'jsCv/cv2.js', 'jsCv/v30.js',
              'jsCv/v30/python.js', 'jsCv/v30/blocks.js'];
