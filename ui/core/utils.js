'use strict';

/*
 * Code from 
 * https://github.com/google/blockly/blob/096d1c46c5066cfa7e59db3b41405b7e854b95d0/tests/playgrounds/screenshot.js
 */

/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Download screenshot.
 * @author samelh@google.com (Sam El-Husseini)
 */

/**
 * Convert an SVG datauri into a PNG datauri.
 * @param {string} data SVG datauri.
 * @param {number} width Image width.
 * @param {number} height Image height.
 * @param {!Function} callback Callback.
 */
function svgToPng_(data, width, height, callback) {
  var canvas = document.createElement("canvas");
  var context = canvas.getContext("2d");
  var img = new Image();

  var pixelDensity = 10;
  canvas.width = width * pixelDensity;
  canvas.height = height * pixelDensity;
  img.onload = function() {
    context.drawImage(
        img, 0, 0, width, height, 0, 0, canvas.width, canvas.height);
    try {
      var dataUri = canvas.toDataURL('image/png');
      callback(dataUri);
    } catch (err) {
      console.warn('Error converting the workspace svg to a png');
      callback('');
    }
  };
  img.src = data;
}

/**
 * Create an SVG of the blocks on the workspace.
 * @param {!Blockly.WorkspaceSvg} workspace The workspace.
 * @param {!Function} callback Callback.
 * @param {string=} customCss Custom CSS to append to the SVG.
 */
function workspaceToSvg_(workspace, callback, customCss) {

  // Go through all text areas and set their value.
  var textAreas = document.getElementsByTagName("textarea");
  for (var i = 0; i < textAreas.length; i++) {
    textAreas[i].innerHTML = textAreas[i].value;
  }

  var bBox = workspace.getBlocksBoundingBox();
  var x = bBox.x || bBox.left;
  var y = bBox.y || bBox.top;
  var width = bBox.width || bBox.right - x;
  var height = bBox.height || bBox.bottom - y;

  var blockCanvas = workspace.getCanvas();
  var clone = blockCanvas.cloneNode(true);
  clone.removeAttribute('transform');

  var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.appendChild(clone);
  svg.setAttribute('viewBox',
      x + ' ' + y + ' ' + width + ' ' + height);

  svg.setAttribute('class', 'blocklySvg ' +
    (workspace.options.renderer || 'geras') + '-renderer ' +
    (workspace.getTheme ? workspace.getTheme().name + '-theme' : ''));
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute("style", 'background-color: transparent');

  var css = [].slice.call(document.head.querySelectorAll('style'))
      .filter(function(el) { return /\.blocklySvg/.test(el.innerText) ||
        (el.id.indexOf('blockly-') === 0); }).map(function(el) {
        return el.innerText; }).join('\n');
  var style = document.createElement('style');
  style.innerHTML = css + '\n' + customCss;
  svg.insertBefore(style, svg.firstChild);

  var svgAsXML = (new XMLSerializer).serializeToString(svg);
  svgAsXML = svgAsXML.replace(/&nbsp/g, '&#160');
  var data = 'data:image/svg+xml,' + encodeURIComponent(svgAsXML);

  svgToPng_(data, width, height, callback);
}

/**
 * Download a screenshot of the blocks on a Blockly workspace.
 * @param {!Blockly.WorkspaceSvg} workspace The Blockly workspace.
 */
Blockly.downloadScreenshot = function(workspace) {
  workspaceToSvg_(workspace, function(datauri) {
    var a = document.createElement('a');
    a.download = 'screenshot.png';
    a.target = '_self';
    a.href = datauri;
    document.body.appendChild(a);
    a.click();
    a.parentNode.removeChild(a);
  });
};

/* END Code from 
 * https://github.com/google/blockly/blob/096d1c46c5066cfa7e59db3b41405b7e854b95d0/tests/playgrounds/screenshot.js
 */


/**
 * All generic utilities are concetrated here.
 * Should not be inited, since all functions are static.
 */

class Tool {
  constructor () {

  }
  /**(DEPRECATED)
  * Alias for :js:func:`mux.bufferPush`.
  * @param {string} code_ - Code to be sent.
  */
  static runPython (code_) {
    // if (this.selector.value == "UNO") {
    //   alert("Generating code for Arduino Uno");
    //   var code = Blockly.Arduino.workspaceToCode(Code.workspace);

    //   return;
    // }
    let code = code_ == undefined ? Blockly.Python.workspaceToCode(Code.workspace) : code_;

    if (code) {
      code+='\r\r';//Snek workaround

      mux.bufferPush (`\x05${code}\x04`);
      UI ['progress'].start(Channel.websocket.buffer_.length);
    }
  }

  /**Send ``\x03\x03`` to stop running a program, see a `ASCII table
  * <https://www.ascii-code.com/>`_ to know more.*/
  static stopPython () {
    //Send Ctrl+C to stop program
    mux.bufferPush ('\x03\x03');
  }
  static softReset () {
    if (Channel ['websocket'].connected)
      setTimeout(() => {Channel ['websocket'].connect(UI ['workspace'].websocket.url.value, UI ['workspace'].websocket.pass.value)}, 2000);
    else if (Channel ['webbluetooth'].connected)
      setTimeout(() => {Channel ['webbluetooth'].connect()}, 1000);
    mux.bufferPush ('\x04');
  }

  /**(DEPRECATED)
  * New async sleep function, callend with async await(), which allows UI updates
  */
  static asleep (milliseconds) {
	  return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  /**(DEPRECATED)
  * Delay Javascript code execution.
  */
  static sleep (milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    }
    while (currentDate - date < milliseconds);
  }

  /**
  * Add a file to the file editor
  * @param {string} code - Code.
  * @param {string} file_name - File name for the code.
  */
  static updateSourceCode (code, file_name) {
    const reader = new FileReader();

    // This fires after the blob has been read/loaded.
    reader.addEventListener('loadend', (e) => {
      let text = e.srcElement.result;
      Files.editor.getDoc().setValue(text);

      UI ['workspace'].content_file_name.value = file_name;
    });

    // Start reading the blob as text.
    reader.readAsText(code);
  }
  /**(DEPRECATED)
  *Generate code from blocks, appends to the file editor.
  */
  static blocksToPython() {
    let code = Blockly.Python.workspaceToCode(Code.workspace);
    Files.editor.getDoc().setValue(code);
  }
  /**Decode data to fetch status code.
  * @param {char} data - Response data.
  * @returns {number} Status code
  */
  static decode_resp (data) {
    if (data[0] == 'W'.charCodeAt(0) && data[1] == 'B'.charCodeAt(0)) {
      let code = data[2] | (data[3] << 8);
      return code;
    } else
      return -1;
  }
  /**Make a date with a unix time, if not passed, will make one.
  * @param {number} [timestamp] - `Unix time <https://en.wikipedia.org/wiki/Unix_time>`_.
  * @returns {string} Formatted time, e.g. 08:02:01.
  */
  static unix2date (timestamp) {
    let date;
    if (timestamp == undefined)
      date = new Date (+new Date);
    else
      date = new Date(timestamp);
    let hours = date.getHours();
    let minutes = "0" + date.getMinutes();
    let seconds = "0" + date.getSeconds();
    return hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
  }
  /**Checks the income data for useful chuncks, like ``$BIPES-DATA:`` for plotting*/
  static bipesVerify () {
    let re = /\r\n\$(.*):(.*)\r\n/;
    let match_;
    if (re.test(Files.received_string)) {
      match_ = Files.received_string.match(re);
      if (match_.length == 3) {
        let coordinates = match_ [2].split(',').map((item)=>item = parseFloat(item))
        window.frames[3].modules.DataStorage.push(match_[1],coordinates)


        /*STARTDEPRECATED*/
        //Compatibilty layer with the old BIPES-DATA:INDEX,DATA
        if (match_[1] == "BIPES-DATA") {
          coordinates [0] = parseInt(coordinates [0])
          coordinates [1] = parseFloat(coordinates [1])
          let q = new Queue(coordinates [0]);
          q.enqueue(coordinates[1]);
          if (UI ['workspace'].EasyMQTT_bridge.checked)
            this.EasyMQTTBridge(coordinates [0], coordinates[1])
        }
        /*ENDDEPRECATED*/
      }
    }
    Files.received_string = Files.received_string.replace(re, '\r\n') //purge received string out
  }
  /**Bridge incoming data to MQTT.
  * @param {number} id_ - ID for the MQTT message.
  * @param {number} value_ - Value for the MQTT message.
  */
  static EasyMQTTBridge (id_, value_) {
	  var easyMQTTsession = window.localStorage['bridgeSession'];
	  if (easyMQTTsession) {
		  xhrGET(`https://bipes.net.br/easymqtt/publish.php?session=${easyMQTTsession}&topic=Topic${id_}&value=${value_}`,'',(ev)=>{
		    UI ['notify'].log(ev);
		  });
		}
  }
  /**Clear 'core/queue.js queue*/
  static clearQueue () {
    for (var i=0; i<20; i++) {
      var t = localStorage.getItem("queue" + i);
      if (t) {
        window.localStorage.removeItem('queue' + i);
        UI ['notify'].log(`Cleaned queue ${i}`);
      }
    }
  }
  /**Get code for a  MicroPython library, must be available at `ui/pylibs`.
  * @param {string} pName - File name for a MicroPython library.
  */
  static getText (pName) {
    // Read from core/pylibs.js, which gen_pylibs.py bakes out of ui/pylibs/.
    // This used to fetch /beta2/ui/pylibs/, a path that exists only on
    // bipes.net.br: everywhere else -- a local server, an offline copy on a
    // stick -- the request 404d and the template silently never opened.
    let lib_ = PyLibs [pName.replace (/\.py$/i, '').toLowerCase ()];
    if (lib_ == undefined) {
      UI ['notify'].send (`No library named ${pName} ships with BIPES.`);
      return;
    }
    Files.editor.getDoc ().setValue (lib_.source);
    Files.file_save_as.className = 'py';
    UI ['workspace'].file.value = lib_.file;
  }
  /**Makes a name for a Blockly project.
  * @param {string} code - Blockly generated code.
  * @param {string} ext - File extension.
  */
  static makeAName (code, ext) {
    let desc = code.match(/#Description: '(.*)'/)
    let imp = [...code.matchAll(/import (.*)/g)]
    let filename = ''

    if (ext == '') {
      return desc ? `${desc [1].slice()}${ext}` : 'My BIPES Project';
    } else {
      if (desc == null) {
        desc = [];
        desc [1] = 'code';
      }
      desc [1] = desc [1].toLowerCase()
      if (desc [1] == 'main') {
        filename = 'main.py';
      } else {
        filename = desc ? `${desc [1].replaceAll(' ', '_').replaceAll('.', '').slice().substring(0,30)}.bipes.${ext}` : imp.length ? `my_${imp.slice(-1)[0][1]}_project.bipes.${ext}` : `my_project.bipes.${ext}`;
      }
//      return desc ? `${desc [1].replaceAll(' ', '_').replaceAll('.', '').slice().substring(0,30)}.bipes.${ext}` : imp.length ? `my_${imp.slice(-1)[0][1]}_project.bipes.${ext}` : `my_project.bipes.${ext}`;
      return filename;
    }
  }
  /**Converts RGB to HEX
  * @param {number} r - Red color, from 0 to 255.
  * @param {number} g - Green color, from 0 to 255.
  * @param {number} b - Blue color, from 0 to 255.
  * @returns {string} HEX code for the RGB color.
  */
  static RGB2HEX(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }
  /**Converts HEX to RGB
  * @param {string} hex - HEX code
  * @returns {(Object|null)} RGB code for the RGB color.
  */
  static HEX2RGB(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
      return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  /**Converts HUE to HEX
  * @param {number} h - Hue, from 0 to 360.
  * @param {number} s - Saturation, from 0 to 100.
  * @param {number} l - Lightness, from 0 to 100.
  * @returns {string} HEX code for the HUE color.
  */
  static HUE2HEX (h,s,l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  /**
   * throw a notification is the criteria is met.
   * @param {object} self - A object that contains a ``warning_`` array to keep track if the notification was already thrown.
   * @param {array} criteria - A array composed by subarrays.
   * @param {function} criteria.func - Function with the criteria.
   * @param {string} criteria.str - Message to show as notification if the criteira is met.
   */
  static warningIfTrue (self, criteria) {
    // Don't check state if:
    //   * It's at the start of a drag.
    //   * It's not a move event.
    if (!self.workspace.isDragging || self.workspace.isDragging())
      return

    let warnings = [];
    criteria.forEach ((item, index) => {
      if (item [0] ())
        warnings.push(item [1])
    })
    self.setWarningText(warnings.length > 0 ? warnings.join("\n") : null)
  }

  /** Return a random UID*/
  static uid () {
    return (+new Date).toString(36) + Math.random().toString(36).substr(2);
  }
  /** Return a empty XML with only project description set, used for new projects*/
  static emptyXML () {
    let account_user = localStorage ['account_user'];
    return `<xml xmlns="https://bipes.net.br"><workspace><databoard><![CDATA[{"currentWorkspace":"kvflqzky5js84d7x5pe","workspace:kvflqzky5js84d7x5pe":[]}]]></databoard></workspace><block type="project_metadata" id="" x="-212" y="-612"><value name="project_author"><shadow type="text" id=""><field name="TEXT">${account_user}</field></shadow></value><value name="project_iot_id"><shadow type="math_number" id=""><field name="NUM">0</field></shadow></value><value name="project_description"><shadow type="text" id=""><field name="TEXT">My project</field></shadow></value></block></xml>`
  }

  static exportScreenshot() {
	  Blockly.downloadScreenshot(Code.workspace);
  }


}
/**
 * Handle the Files tab.
 */
class files {
  constructor (fileList) {
    this.watcher;
    this.watcher_calledCount = 0;
    this.put_file_name = null;
    this.put_file_data = null;
    /**Files still waiting their turn on the WebREPL put state machine, which
       can only carry one at a time (see channel.js, binary_state 12).*/
    this.put_file_queue = [];
    /**Names the last :js:func:`files#listFiles` refresh saw on the board, kept
       so the library picker can mark what is already installed.*/
    this.deviceFiles = [];
    /**``{file: byte length}`` for a library send still waiting on its size
       readback.*/
    this.pylibExpectedSizes = {};
    this.get_file_name = null;
    this.get_file_data = null;
    this.binary_state = 0;
    this.received_string = "";
    this.viewOnly = false;
    /**Object that contains a ``codemirror`` editor*/
    this.editor = CodeMirror.fromTextArea(content_file_code, {
      mode: "python",
      lineNumbers: true
    });
    this.fileList = get('#fileList');
    this.file_save_as = get('#file_save_as');
    this.pylibsDialog = get('#pylibsDialog');
    this.pylibsList = get('#pylibsList');
    this.pylibsFilter = get('#pylibsFilter');
    this.pylibsCount = get('#pylibsCount');
    this.blocks2Code = {Python: get('#blocks2codePython'), XML: get('#blocks2codeXML')}
    this.blocks2Code.Python.onclick = () => {this.internalPython ()};
    this.blocks2Code.XML.onclick = () => {this.internalXML ()};
  }
  /**
   * Display text inside DOM `#file-status` as a operation progress
   * @param {string} s - The notification to be shown.
   */
  static update_file_status (s) {
    UI ['workspace'].file_status.innerHTML = s;
  }
  /**
   * Resize the ``codemirror`` editor, triggered by ``window.onresize`` event.
   */
  resize () {
    if (!Code.current.includes('files'))
      return
    if (Code.current[0] == 'files')
      this.editor.setSize(window.innerWidth - (18*$em),window.innerHeight - (6*$em))
    else
      this.editor.setSize((window.innerWidth/2) - (18*$em),window.innerHeight - (6*$em))
  }
  /**
   * Upload file to device.
   */
  put_file () {
    switch (Channel ['mux'].currentChannel) {
      case 'websocket':
        var dest_fname = this.put_file_name;
        var dest_fsize = this.put_file_data.length;
        // WEBREPL_FILE = "<2sBBQLH64s"
        var rec = new Uint8Array(2 + 1 + 1 + 8 + 4 + 2 + 64);
        rec[0] = 'W'.charCodeAt(0);
        rec[1] = 'A'.charCodeAt(0);
        rec[2] = 1; // put
        rec[3] = 0;
        rec[4] = 0; rec[5] = 0; rec[6] = 0; rec[7] = 0; rec[8] = 0; rec[9] = 0; rec[10] = 0; rec[11] = 0;
        rec[12] = dest_fsize & 0xff; rec[13] = (dest_fsize >> 8) & 0xff; rec[14] = (dest_fsize >> 16) & 0xff; rec[15] = (dest_fsize >> 24) & 0xff;
        rec[16] = dest_fname.length & 0xff; rec[17] = (dest_fname.length >> 8) & 0xff;
        for (var i = 0; i < 64; ++i) {
          rec[18 + i] = i < dest_fname.length ? rec[18 + i] = dest_fname.charCodeAt(i) : rec[18 + i] = 0;
        }

        // initiate put
        this.binary_state = 11;
        files.update_file_status ('Sending ' + this.put_file_name + '...');
        console.log(rec);
        mux.bufferPush (rec);
      break;
      case 'webserial':
      case 'webbluetooth':
        files.update_file_status(`Sending raw (USB) ${this.put_file_name}...`);
        this.put_file_stream ([{name: this.put_file_name, data: this.put_file_data}],
          undefined,
          () => {files.update_file_status(`Sent ${Files.put_file_data.length} bytes`)});
        files.update_file_status(`File ${this.put_file_name} sent.`);
      break;
    }
  }
  /**
   * Commands every REPL upload has to lead with, once per stream.
   * @return {Object[]} Array of commands.
   */
  put_file_preamble () {
    let cmds_ = ['import binascii\r'];

	//Workaround for ESP32S2 using CircuitPython
	//Needs to remount filesystem in write mode
	if (UI ['workspace'].selector.value == "ESP32S2") {
		cmds_.push ("import storage\r");
		cmds_.push ("storage.remount(\"/\", False)\r");
	} 

    return cmds_;
  }
  /**
   * The commands that write ONE file, factored out of :js:func:`files#put_file`
   * so that :js:func:`files#put_files` can write several through the very same
   * path.
   *
   * The file goes over as base64 in 384-byte pieces, one `f.write()` per
   * piece. It used to be a single `f.write('<the whole file>')`, which
   * has a ceiling: the REPL holds the whole line while it reads and
   * echoes it, and a file much past ~27 KB ends up on the board as a
   * 0-byte file -- open() truncated it before the write ever failed.
   * Each line here is about 540 characters whatever the file's size.
   *
   * Sending bytes rather than a Python string literal also means nothing
   * needs escaping: `'wb'` and `a2b_base64` carry backslashes, quotes,
   * tabs, CRLFs and non-ASCII through untouched. The escaping pass this
   * replaces got the backslashes right only after a bug that corrupted
   * every library containing one.
   * @param {string} name - File name to write on the board.
   * @param {Uint8Array} data - Its bytes.
   * @return {Object[]} Array of commands.
   */
  put_file_cmds (name, data) {
    let cmds_ = [`f=open('${name}', 'wb')\r`];
    for (let off_ = 0; off_ < data.length; off_ += 384) {
      let chunk_ = data.subarray (off_, off_ + 384);
      let bin_ = '';
      for (let i = 0; i < chunk_.length; i++)
        bin_ += String.fromCharCode (chunk_[i]);
      cmds_.push (`f.write(binascii.a2b_base64('${btoa (bin_)}'))\r`);
    }
    cmds_.push ("f.close()\r");
    return cmds_;
  }
  /**
   * Write files to the board as ONE ordered command stream, over the channels
   * that type at the REPL. Every write starts with ``mux.clearBuffer()``, so
   * two back-to-back :js:func:`files#put_file` calls would throw away the
   * first file's still-queued commands: anything writing more than one file
   * goes through here instead.
   * @param {Object[]} items - ``{name, data}`` pairs, written in order.
   * @param {Object[]} tail - Commands appended to the same stream, e.g. a
   *   readback that only makes sense once the files are all there.
   * @param {function} done - Called once the last command has run.
   */
  put_file_stream (items, tail, done) {
    let cmds_ = this.put_file_preamble ();
    items.forEach ((item_) => {
      cmds_ = cmds_.concat (this.put_file_cmds (item_.name, item_.data));
    });
    if (tail != undefined)
      cmds_ = cmds_.concat (tail);

    let total_ = cmds_.reduce ((sum, line) => sum + line.length, 0);
    UI ['progress'].start(parseInt(total_/Channel ['webserial'].packetSize) + 1);

    //ctrl-C twice: interrupt any running program
    mux.clearBuffer ();
    mux.bufferUnshift ('\r\x03\x03');

    for (let i = 0; i < cmds_.length; i++)
      mux.bufferPush (cmds_[i], i == cmds_.length - 1 ? done : undefined);

    mux.bufferPush ('\r\r\r');
  }
  /**
   * Upload several files, whatever the channel.
   * @param {Object[]} items - ``{name, data}`` pairs, written in order.
   */
  put_files (items) {
    if (items.length == 0)
      return;
    switch (Channel ['mux'].currentChannel) {
      case 'webserial':
      case 'webbluetooth': {
        let names_ = items.map ((item_) => item_.name).join (', ');
        files.update_file_status (`Sending ${names_}...`);
        this.put_file_stream (items, undefined,
          () => {files.update_file_status (`Sent ${names_}.`)});
        break;
      }
      default:
        // WebREPL's put is a binary sub-protocol, not text typed at the REPL,
        // so it cannot be folded into one stream: queue the rest and send the
        // next one when the state machine reports the previous one finished.
        this.put_file_queue = items.slice (1);
        this.put_file_name = items [0].name;
        this.put_file_data = items [0].data;
        this.put_file ();
    }
  }
  /**
   * Send the next queued file, if any. WebREPL only; called by the
   * put-complete branch of the binary state machine.
   * @return {boolean} True if another file was started.
   */
  put_file_next () {
    if (this.put_file_queue == undefined || this.put_file_queue.length == 0)
      return false;
    let item_ = this.put_file_queue.shift ();
    this.put_file_name = item_.name;
    this.put_file_data = item_.data;
    this.put_file ();
    return true;
  }
  /**
   * Get version.
   */
  get_ver () {
    // WEBREPL_REQ_S = "<2sBBQLH64s"
    var rec = new Uint8Array(2 + 1 + 1 + 8 + 4 + 2 + 64);
    rec[0] = 'W'.charCodeAt(0);
    rec[1] = 'A'.charCodeAt(0);
    rec[2] = 3; // GET_VER
    // rest of "rec" is zero

    // initiate GET_VER
    this.binary_state = 31;
    mux.bufferPush(rec);
  }
  /**
   * Get file from DOM `#putFileButton` and calls :js:func:`Files.put_file` to upload
   */
  handle_put_file_select() {

    // The event holds a FileList object which is a list of File objects,
    // but we only support single file selection at the moment.
    let file_ = UI ['workspace'].put_file_select.files;
    // Get the file info and load its data.
    let f = file_[0];
    this.put_file_name = f.name;
    var reader = new FileReader();
    reader.onload = (e) => {
        this.put_file_data = new Uint8Array(e.target.result);
        this.put_file ();
    };
    reader.readAsArrayBuffer(f);
  }
  /**
   * Get file from ``codemirror``editor and calls :js:func:`Files.put_file` to upload.
   */
  files_save_as () {

    //For codemirror
    var codeStr = Files.editor.getDoc().getValue("\n");

    // UTF-8, not charCodeAt: put_file decodes these bytes with TextDecoder, and
    // the WebREPL header needs the byte length, not the character count.
    var bufCode = new TextEncoder().encode(codeStr);

    this.put_file_name = UI ['workspace'].file.value;
    this.put_file_data = bufCode;

    this.put_file ();
  }
  /**
   * List files from device, on success, calls :js:func:`files.updateTable` to display it.
   */
  listFiles () {
    mux.bufferPush ('import os; os.listdir(\'.\')\r', files.updateTable.bind(this)); //Using ; to trigger only one ">>>"
  }
   /**
   * Execute a program.
   * @param {string} file - File name of the script to be executed.
   */
  run (file) {
    files.update_file_status('Executing  ' + file);

    //import only works once
    //In case module already loaded, unloaded it
    //to allow it to work all the time
    //fileS = file.split('.')[0];
    //mux.bufferPush('import sys \r');
    //mux.bufferPush('sys.modules.pop(\'' + fileS + '\')\r');
    //mux.bufferPush('import ' + fileS + '\r');
    //Filename without .py
    mux.bufferPush (`exec(open(\'./${file}\').read(),globals())\r`);
  }
  /**
   * Delete a file.
   * @param {string} file - File name of the file to be deleted.
   */
  delete (file) {
    let msg = "Are you sure you want to delete " + file + "?";

    if (confirm(msg)) {
      let txt = "Will delete file " + file;
      mux.bufferPush(`os.remove(\'${file}\')\r`, this.listFiles.bind(this));
      files.update_file_status('Deleted  ' + file);
    } else {
      let txt = "Delete aborted";
      files.update_file_status('Delete aborted for ' + file);
    }
  }
  /**
   * Request a file to show in the ``codemirror`` editor.
   * @param {string} file - File name of the file to be viewed.
   */
  files_view (file) {
    this.viewOnly=true;
    this.get_file(file);
    files.update_file_status('Downloading ' + file);
  }
  /**
   * Request a file to download.
   * @param {string} file - File name of the file to be downloaded.
   */
  files_download (file) {
    this.viewOnly=false;
    this.get_file(file);
  }
  /**
   * Get file from device
   * @param {string} src_fname - File name of the file to be fetched.
   */
  get_file (src_fname) {
    this.file_save_as.className = 'py';
    switch (Channel ['mux'].currentChannel) {
      case 'websocket':
        let rec = new Uint8Array(2 + 1 + 1 + 8 + 4 + 2 + 64);
        rec[0] = 'W'.charCodeAt(0);
        rec[1] = 'A'.charCodeAt(0);
        rec[2] = 2; // get
        rec[3] = 0;
        rec[4] = 0; rec[5] = 0; rec[6] = 0; rec[7] = 0; rec[8] = 0; rec[9] = 0; rec[10] = 0; rec[11] = 0;
        rec[12] = 0; rec[13] = 0; rec[14] = 0; rec[15] = 0;
        rec[16] = src_fname.length & 0xff; rec[17] = (src_fname.length >> 8) & 0xff;
        for (let i = 0; i < 64; ++i) {
            if (i < src_fname.length) {
                rec[18 + i] = src_fname.charCodeAt(i);
            } else {
                rec[18 + i] = 0;
            }
        }

        // initiate get
        this.binary_state = 21;
        this.get_file_name = src_fname;
        this.get_file_data = new Uint8Array(0);
        files.update_file_status(`Getting ${this.get_file_name}...`);
        mux.bufferPush (rec);
      break;
      case 'webserial':
      case 'webbluetooth':
        // initiate get
        this.binary_state = 91;
        files.update_file_status(`Getting ${src_fname}...`);

        //ctrl-C twice: interrupt any running program
        mux.clearBuffer ();
        mux.bufferUnshift ('\r\x03\x03');

        this.get_file_name = src_fname;
        this.received_string = "";
        this.watcher_calledCount = 0;
        mux.bufferPush (`import os, sys; os.stat('${src_fname}')\r`);
        //mux.bufferPush (`import uos, sys; uos.stat('${src_fname}')\r`);
        mux.bufferPush (`with open('${src_fname}', 'rb') as infile:\rwhile True:\rresult = infile.read(32)\rif result == b'':\rbreak\r\b_bytes_written = sys.stdout.write(result)\r`, () => {}); //Includes dummy callback due to '>>> '
        mux.bufferPush ("\r\r\r", () => {
          this.watcher = setInterval ( () => {
            if (Files.get_file_webserial_ ()) {
              Files.watcher_calledCount = 0;
              clearInterval (Files.watcher);
            } else {
              Files.watcher_calledCount += 1;
              if (Files.watcher_calledCount >= 10) {
                UI ['notify'].send(MSG['ErrorGET']);
                clearInterval (Files.watcher);
                Files.watcher = undefined;
              }
            }
          }, 250);
        });
      break;
    }
  }
  /**
   * Subfuction to get file from device with webserial or webbluetooth.
   */
  get_file_webserial_ () {
      let re = /sys\.stdout\.write\(result\)\r\n...         \r\n...         \r\n... \r\n(.*)>>> /s;
      let get_file_data_;
      if (re.test(Files.received_string)) {
        get_file_data_ = Files.received_string.match(re);
        if (get_file_data_.length == 2)
          Files.get_file_data = get_file_data_ [1]


        files.update_file_status('Got ' + Files.get_file_name + ', ' + Files.get_file_data.length + ' bytes');
        if (!Files.viewOnly)
          saveAs(new Blob([Files.get_file_data], {type: "application/octet-stream"}), Files.get_file_name);
        else
          Tool.updateSourceCode(new Blob([Files.get_file_data], {type: "text/plain"}), Files.get_file_name);
        Files.received_string = Files.received_string.replace(re, '\r\n') //purge received string out
        return true
      } else {
        return false;
      }
  }
  /**
   * Display fetched from device file list in DOM `#fileList`.
   */
  static updateTable () {
    let re = /\[(.+)?\]/g;
    if (re.test(this.received_string)) {
      let match_ = this.received_string.match((/\[(.+)?\]/g));
      let treat_ = match_ [match_.length - 1].replace(/[\[\]]/g, '');
      let split_ = treat_.split('"'[0]);
      let files_ = eval("[" + split_ + "]");
      this.deviceFiles = files_;   //so the library picker can mark what is already there

      UI ['notify'].send("File list updated at " + Tool.unix2date() + ".");


      this.fileList.innerHTML = '';

      files_.forEach (file => {
        let wrapper2_ = new DOM ('div');
        let openButton_ = new DOM ('div', {innerText:file, className: 'runText'});
        if (!(/\./.test(file))) {
          openButton_.flag('is directory');
          wrapper2_.append(openButton_)
          wrapper2_._dom.style.cursor = 'default';
        } else {
          openButton_._dom.title = `Open file ${file}`;
          openButton_.onclick (this, Files.files_view, [file]);
          if(file == 'boot.py' || file == 'main.py')
            openButton_.flag('run at boot');
          let deleteButton_ = new DOM ('span', {className:'icon', id:'trashIcon', title:`Delete file ${file}`})
            .onclick (this, Files.delete, [file]);
          let runButton_ = new DOM ('span', {className:'icon', id:'runIcon', title:`Run file ${file}`})
            .onclick (this, Files.run, [file]);
          let downloadButton_ = new DOM ('span', {className:'icon', id:'downloadIcon', title:`Download file ${file}`})
            .onclick (this, Files.files_download, [file]);

          let wrapper_ = new DOM ('div')
            .append([runButton_, downloadButton_, deleteButton_]);
          wrapper2_.append([openButton_, wrapper_]);
        }

        this.fileList.appendChild(wrapper2_._dom)
      })

      Files.received_string = Files.received_string.replace(re, '\r\n') //purge received string out
      this.renderPylibs ();   //refresh the "on board" marks, if the picker is open
    }
  }
  /**
   * The libraries the picker offers, sorted by the name they land on the board
   * with. core/pylibs.js is keyed by the lowercased name the "Install <name>
   * library" toolbox buttons ask for, which is not always how the file is
   * spelled (CCS811.py, mini_micropyGPS.py).
   * @return {Object[]} Array of ``{file, source}``.
   */
  pylibs () {
    return Object.keys (PyLibs).map ((key_) => PyLibs [key_])
      .sort ((a, b) => a.file.toLowerCase () < b.file.toLowerCase () ? -1 : 1);
  }
  /**
   * Open or close the "Library files" picker. A real ``<dialog>``: closed, it
   * takes no space and draws nothing, so the Files tab looks exactly as it did
   * before this existed. Refreshes the device file list on open, if connected,
   * so the "on board" marks say what is on the board right now rather than
   * whatever the last unrelated refresh happened to see.
   */
  togglePylibs () {
    if (this.pylibsDialog == undefined)
      return;
    if (this.pylibsDialog.open) {
      this.pylibsDialog.close ();
      return;
    }
    this.pylibsDialog.showModal ();
    this.renderPylibs ();
    if (mux.connected ())
      this.listFiles ();
  }
  /**
   * (Re)draw the library list as checkboxes, marking the ones already on the
   * board. Ticks and the filter survive a redraw: the device file list comes
   * back asynchronously, so this runs again while the user is midway through
   * choosing.
   */
  renderPylibs () {
    //listFiles() calls this on every refresh, most of which have nothing to do
    //with the picker: there is nothing to draw while the dialog is closed.
    if (this.pylibsList == undefined || this.pylibsDialog == undefined
        || !this.pylibsDialog.open)
      return;
    let checked_ = this.pylibsChecked ().map ((lib_) => lib_.file);

    this.pylibsList.innerHTML = '';
    this.pylibs ().forEach ((lib_) => {
      let row_ = new DOM ('div', {className: 'pylibRow'});
      let check_ = new DOM ('input', {
        type: 'checkbox', id: `pylib_${lib_.file}`, className: 'pylibCheck'
      });
      let label_ = new DOM ('label', {innerText: lib_.file, htmlFor: `pylib_${lib_.file}`});
      row_.append ([check_, label_]);
      if (this.deviceFiles.includes (lib_.file))
        row_.append (new DOM ('span', {innerText: 'on board', className: 'pylibFlag'}));
      if (lib_.file == 'boot.py' || lib_.file == 'main.py')
        row_.append (new DOM ('span', {innerText: 'runs at boot', className: 'pylibFlag'}));
      if (checked_.includes (lib_.file))
        check_._dom.checked = true;
      this.pylibsList.appendChild (row_._dom);
    });

    this.filterPylibs ();
  }
  /**
   * Show only the libraries whose name contains what is typed in the filter,
   * and say how many that is. 100+ files is too many to scroll through to find
   * the one driver you came for.
   */
  filterPylibs () {
    if (this.pylibsList == undefined)
      return;
    let needle_ = this.pylibsFilter == undefined
      ? '' : this.pylibsFilter.value.trim ().toLowerCase ();
    let rows_ = this.pylibsList.querySelectorAll ('.pylibRow');
    let shown_ = 0;
    rows_.forEach ((row_) => {
      //The name only: the flags are not something to search by, and hiding a
      //row on "board" because it says "on board" would be nonsense.
      let hit_ = getIn (row_, 'label').innerText.toLowerCase ().includes (needle_);
      row_.hidden = !hit_;
      if (hit_)
        shown_ += 1;
    });
    if (this.pylibsCount != undefined)
      this.pylibsCount.innerText = shown_ == rows_.length
        ? `${rows_.length} libraries`
        : `${shown_} of ${rows_.length} libraries`;
  }
  /**
   * The libraries currently ticked in the picker.
   * @return {Object[]} Array of ``{file, source}``.
   */
  pylibsChecked () {
    return this.pylibs ().filter ((lib_) => {
      //getElementById, not get()/querySelector: every one of these ids ends in
      //a literal ".py", and querySelector('#pylib_ssd1306.py') reads that dot
      //as a class selector, so it would never match anything.
      let check_ = document.getElementById (`pylib_${lib_.file}`);
      return check_ != null && check_.checked;
    });
  }
  /**
   * Write every ticked library to the board. The sources are baked into
   * core/pylibs.js by gen_pylibs.py, so nothing is fetched: this works from
   * file://, with no network, over every channel put_file() supports.
   *
   * Closes the dialog as soon as the selection is known to be valid; the write
   * itself reports through the Files tab's own status line, like every other
   * operation there.
   */
  sendPylibs () {
    if (!mux.connected ()) {
      UI ['notify'].send ('Connect to a device first, then try again.');
      return;
    }
    let checked_ = this.pylibsChecked ();
    if (checked_.length == 0) {
      UI ['notify'].send ('Tick at least one library file first.');
      return;
    }

    let items_ = checked_.map ((lib_) => ({
      name: lib_.file,
      //TextEncoder, not charCodeAt: the sources are UTF-8 and a handful carry
      //accents and degree signs in their comments. Truncating those to one
      //byte each would still agree with itself on the size check below while
      //quietly writing a corrupted file.
      data: new TextEncoder ().encode (lib_.source)
    }));
    let names_ = items_.map ((item_) => item_.name).join (', ');

    //The selection has been acted on: leaving it ticked invites a second,
    //unintended send the next time the dialog is opened.
    checked_.forEach ((lib_) => {
      document.getElementById (`pylib_${lib_.file}`).checked = false;
    });
    if (this.pylibsDialog != undefined)
      this.pylibsDialog.close ();

    switch (Channel ['mux'].currentChannel) {
      case 'webserial':
      case 'webbluetooth':
        this.pylibExpectedSizes = {};
        items_.forEach ((item_) => {this.pylibExpectedSizes [item_.name] = item_.data.length});
        files.update_file_status (`Sending ${names_}...`);
        this.put_file_stream (items_,
          this.pylib_size_check_cmds (items_.map ((item_) => item_.name)),
          this.checkPylibSizes.bind (this));
      break;
      default:
        // WebREPL answers with its own success/failure per file and cannot be
        // asked for the sizes in the same breath, so say plainly that nothing
        // was verified rather than implying it was.
        this.put_files (items_);
        UI ['notify'].send (`Sending ${names_}. This channel cannot check the sizes back: use List Files to confirm they arrived.`);
    }
  }
  /**
   * Commands that print ``{file: byte length}`` for the given names, -1 for a
   * file that is not there at all. Deliberately one statement and no ``def``:
   * a multi-line function typed at the REPL needs the backspace-dedent dance
   * :js:func:`files#get_file` does, which a size check has no reason to risk.
   * @param {Object[]} names - File names to stat.
   * @return {Object[]} Array of commands.
   */
  pylib_size_check_cmds (names) {
    let list_ = '[' + names.map ((name_) => `'${name_}'`).join (', ') + ']';
    return [
      'import os\r',
      `print({n: (os.stat(n)[6] if n in os.listdir() else -1) for n in ${list_}})\r`
    ];
  }
  /**
   * Compare the sizes read back against what was sent. A short write is
   * otherwise silent -- the file is there, just truncated -- and only turns up
   * much later as a SyntaxError on import, which is the one failure this whole
   * check exists to catch early.
   */
  checkPylibSizes () {
    let re = /\{(.+)?\}/g;
    let expected_ = this.pylibExpectedSizes;
    let names_ = Object.keys (expected_);

    if (!re.test (this.received_string)) {
      files.update_file_status (`Sent ${names_.join (', ')} (no size check came back, use List Files).`);
      return;
    }
    //The last one: the echo of the print() command itself matches too.
    let match_ = this.received_string.match (/\{(.+)?\}/g);
    this.received_string = this.received_string.replace (re, '\r\n'); //purge received string out

    let got_;
    try {
      //Parenthesised, or a leading '{' parses as a block instead of an object.
      got_ = eval (`(${match_ [match_.length - 1]})`);
    } catch (e) {
      files.update_file_status (`Sent ${names_.join (', ')} (could not read the size check back).`);
      return;
    }

    let bad_ = names_.filter ((name_) => got_ [name_] !== expected_ [name_]);
    if (bad_.length != 0) {
      UI ['notify'].send (`Incomplete write: ${bad_.join (', ')}. Send them again.`);
      files.update_file_status (`Incomplete write: ${bad_.join (', ')}.`);
    } else {
      UI ['notify'].send (`Sent and verified: ${names_.join (', ')}.`);
      files.update_file_status (`Sent and verified: ${names_.join (', ')}.`);
    }
    if (mux.connected ())
      this.listFiles ();   //refresh the "on board" marks
  }
  /**
   * Push edited XML to the workspace.
   */
  editedXML2Workspace () {
    var result = window.confirm('Changes will be applied directly to the workspace and might break everything, continue?');
    if (result === true) {
      let content = UI ['workspace'].readWorkspace (this.editor.getDoc().getValue("\n"), true);
      let xmlDom = '';
      try {
        xmlDom = Blockly.Xml.textToDom(content);
      } catch (e) {
        var q =
            window.confirm(MSG['badXml'].replace('%1', e));
        if (!q) {
          //Leave the user on the XML tab.
          return;
        }
      }
      if (xmlDom) {
        Code.workspace.clear();
        Blockly.Xml.domToWorkspace(xmlDom, Code.workspace);
  	    Code.renderContent();
      }
    }
  }
  /**
   * "Open" MicroPython code generated from Blockly in the ``codemirror``editor.
   */
  internalPython () {
    this.file_save_as.className = 'bipes-py';
    let code = Code.generateCode();
    Tool.updateSourceCode(new Blob([code], {type: "text/plain"}), Tool.makeAName(code, 'py'));
  }
  /**
   * "Open" XML code generated from Blockly and BIPES in the ``codemirror``editor.
   */
  internalXML () {
    this.file_save_as.className = 'bipes-xml';
    Tool.updateSourceCode(new Blob([Code.generateXML()], {type: "text/plain"}), 'workspace.bipes.xml');
  }
  /**
   * Update the displayed name and automatic opened code when switching tabs or projects.
   */
  handleCurrentProject () {
    this.blocks2Code.Python.innerHTML = Tool.makeAName(Code.generateCode(), 'py') + '<span>automatic</span>'
    if (this.file_save_as.className == 'bipes-py')
      this.internalPython ();
    else if(Files.file_save_as.className == 'bipes-xml')
      this.internalXML ();
  }
}
/** Make DOM Node element*/
class DOM {
  constructor (dom, tags){
    this._dom ;
    switch (dom) {
	  case 'button':
	  case 'h2':
	  case 'h3':
      case 'span':
      case 'div':
      case 'label':
        this._dom = document.createElement (dom);
        if (typeof tags == 'object') for (const tag in tags) {
          if (['innerText', 'className', 'id', 'title', 'innerText', 'htmlFor'].includes(tag))
            this._dom [tag] = tags [tag]
        }
        break;
      case 'input':
        this._dom = document.createElement (dom);
        if (typeof tags == 'object') for (const tag in tags) {
          if (['type', 'id', 'className', 'title', 'value', 'checked'].includes(tag))
            this._dom [tag] = tags [tag]
        }
        break;
	  case 'video':
        this._dom = document.createElement (dom);
        if (typeof tags == 'object') for (const tag in tags) {
          if (['preload', 'controls', 'autoplay'].includes(tag))
            this._dom [tag] = tags [tag]
        }
        break;
    }
	  return this;
  }
  /**
  * Append a ``onclick`` event.
  * @param {Object[]} self - Object to bind to the call.
  * @param {function} ev - Function to call on click.
  * @param {Object[]} args - Arguments to pass to the function.
  */
  onclick (self, ev, args){
    this._dom.onclick = () => {
			if (typeof args == 'undefined')
				ev.bind(self)()
			else if (args.constructor == Array)
				ev.apply(self, args)
		};
	  return this
  }
  /**
  * Appends others :js:func:`DOM`.
  * @param {Object[]} DOMS - Array of :js:func:`DOM` or/and direct DOM Nodes.
  */
  append (DOMS){
	  if (DOMS.constructor != Array)
	    DOMS = [DOMS]

	    DOMS.forEach ((item) => {
	      if (/HTML(.*)Element/.test(item.constructor.name))
		      this._dom.appendChild(item)
	      else if (item.constructor.name == 'DOM' && (/HTML(.*)Element/.test(item._dom)))
		      this._dom.appendChild(item._dom)
	    })

	    return this
  }
  /**
  * Adds a label to the :js:func:`DOM`.
  * @param {string} str - Message inside the label.
  */
  flag (str) {
    this._dom.innerHTML = `${this._dom.innerHTML} <span>${str}</span>`;
  }
}


/** Enables basic css3 animations in the DOM Node element*/
class Animate {
  constructor (){}
  static off (dom, callback){
    dom.classList.remove('on')
    setTimeout(()=>{
      dom.classList.remove('ani', 'on')
      if (callback != undefined)
        callback ()
      }, 250)
  }
  static on (dom){
    dom.classList.add('ani')
    setTimeout(()=>{dom.classList.add('ani', 'on')}, 250)
  }
}

/** Handle ``xterm.js`` terminal*/
class term {
  constructor () {
  }
  static init (dom) {
    terminal.open(get(dom));
    terminal.setOption('fontSize',12);
    this.resize();
    terminal.onData((data) => {
      switch (Channel ['mux'].currentChannel) {
        case 'websocket':
          data = data.replace(/\n/g, "\r");
          Channel ['websocket'].ws.send(data);
        break;
        case 'webserial':
          Channel ['webserial'].serialWrite(data);
        break;
        case 'webbluetooth':
          mux.bufferPush (data);
          Channel ['webbluetooth'].watch ();
        break;
      }
    });
  }
  /** Enable the terminal. */
  static on () {
    terminal.setOption('disableStdin', false);
    terminal.focus();
  }
  /** Disable the terminal. */
  static off () {
    terminal.setOption('disableStdin', true);
    terminal.blur();
  }
  /** Write data in the terminal. */
  static write (data) {
    terminal.write(data);
  }
  /**
   * Resize the ``xterm.js`` terminal, triggered by ``window.onresize`` event.
   */
  static resize () {
    if(!Code.current.includes('console'))
      return

    let cols
    if (Code.current[0] == 'console')
      cols = Math.max(50, Math.min(200, (window.innerWidth - 4*$em) / 7)) | 0
    else
      cols = Math.max(50, Math.min(200, ((window.innerWidth)/2 - 4*$em) / 7)) | 0

    let rows = Math.max(15, Math.min(40, (window.innerHeight - 20*$em) / 12)) | 0

    terminal.resize(cols, rows);
  }
}
