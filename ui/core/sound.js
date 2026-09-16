/*
 * The Music tab: a piano roll for writing a melody, and the store that the
 * "Play melody" block reads.
 *
 * From amadomaker/BIPES_Amado, ui/core/sound/{sound.js,sound.css}. The idea is
 * theirs -- a grid of cells you click to place notes, a play button that
 * previews it in the browser, a name you then pick from a block -- and so is
 * the localStorage key, so a melody written in that fork imports here. What
 * differs is written up beside each piece below; the short version is that a
 * melody belongs to the block that plays it, and that the browser's audio
 * clock is a better metronome than setTimeout.
 *
 * Nothing here runs until the tab is opened for the first time: init() is
 * called from Code.renderContent, the way the Files tab's editor is, so a
 * session that never opens Music builds no grid and creates no AudioContext.
 */

/**
 * Pitches, by MIDI note number.
 *
 * Numbers rather than a table of frequencies: 69 is A4 = 440 Hz by definition
 * and every other pitch is that, times the twelfth root of two, as many times
 * as it is semitones away. Rounded, because `PWM.freq()` on the board takes an
 * integer -- and rounding lands on the same numbers the `note` block's
 * dropdown has always used (C4 = 262).
 *
 * The grid spans two octaves of semitones, C4 to C6. The fork's is eight rows
 * of one diatonic octave, C4 to C5, which cannot play a sharp, and a melody
 * editor that cannot play a sharp cannot play most of what a class will try
 * first.
 */
class Pitch {
  /** @param {number} midi MIDI note number. @return {string} e.g. "F#4". */
  static name (midi) {
    return `${Pitch.NAMES [midi % 12]}${Math.floor (midi / 12) - 1}`;
  }
  /** @param {number} midi MIDI note number. @return {number} Hz, rounded. */
  static freq (midi) {
    return Math.round (440 * Math.pow (2, (midi - 69) / 12));
  }
  /**
   * @param {string} name e.g. "F#4".
   * @return {number} Hz, or 0 for a name no pitch answers to.
   */
  static freqOf (name) {
    if (Pitch.BY_NAME == undefined) {
      Pitch.BY_NAME = {};
      for (let midi = 0; midi < 128; midi++)
        Pitch.BY_NAME [Pitch.name (midi)] = Pitch.freq (midi);
    }
    return Pitch.BY_NAME [name] || 0;
  }
  /** Every row of the grid, top (highest) first. */
  static rows () {
    let rows_ = [];
    for (let midi = Pitch.HIGH; midi >= Pitch.LOW; midi--)
      rows_.push ({midi: midi, name: Pitch.name (midi),
                   black: Pitch.NAMES [midi % 12].length == 2});
    return rows_;
  }
}
Pitch.NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
Pitch.LOW = 60;         // C4
Pitch.HIGH = 84;        // C6


class music {
  /**
   * @param {string} roll Selector of the element the grid is built inside.
   */
  constructor (roll) {
    this.rollSelector = roll;
    this.COLS = 32;         // one beat each -- the fork's width, eight bars of 4/4
    this.STORE = 'bipes@melodies';
    this.rows = Pitch.rows ();
    //One row index per column, or null for a rest. A buzzer plays one note at
    //a time, so the grid is a function from column to pitch rather than a set
    //of cells -- which is what makes "one note per column" true by
    //construction, instead of true because every click clears the others.
    this.column = new Array (this.COLS).fill (null);
    //And whether each column *starts* a note or carries on the one before it.
    //Without this, two crotchets of the same pitch side by side are
    //indistinguishable from one minim -- and "C C G G A A G" is the first tune
    //anybody writes. A click starts a note; a drag holds it.
    this.starts = new Array (this.COLS).fill (false);
    this.ctx = undefined;       // AudioContext, built on the first sound
    this.voices = [];           // oscillators currently scheduled
    this.frame = undefined;     // requestAnimationFrame handle for the playhead
    this.painting = undefined;  // 'paint' | 'erase' while a drag is in progress
    this.inited = false;
  }

  /**
   * Build the grid, once. Safe to call on every render of the tab.
   */
  init () {
    if (this.inited)
      return;
    this.roll = get (this.rollSelector);
    if (this.roll == undefined)
      return;

    this.roll.style.setProperty ('--music-cols', String (this.COLS));
    this.rows.forEach ((row_, index_) => {
      let key_ = new DOM ('div', {
        className: `musicKey${row_.black ? ' black' : ''}`, innerText: row_.name
      });
      this.roll.appendChild (key_._dom);
      for (let col_ = 0; col_ < this.COLS; col_++) {
        let cell_ = new DOM ('div', {
          className: `musicCell${row_.black ? ' black' : ''}`,
          title: `${row_.name}, beat ${col_ + 1}`
        });
        //Dataset rather than one closure per cell: 800 cells, one listener.
        cell_._dom.dataset.row = index_;
        cell_._dom.dataset.col = col_;
        this.roll.appendChild (cell_._dom);
      }
    });

    let cursor_ = new DOM ('div', {id: 'musicCursor'});
    this.roll.appendChild (cursor_._dom);
    this.cursor = cursor_._dom;

    //One delegated listener for the whole grid, and a drag paints: a held note
    //is several columns of one pitch, and clicking each of them separately is
    //the difference between writing a melody and filling in a form.
    this.roll.addEventListener ('pointerdown', (ev) => this.pointer (ev, true));
    this.roll.addEventListener ('pointerover', (ev) => this.pointer (ev, false));
    //On the window, not the grid: a drag that ends outside it still ends.
    window.addEventListener ('pointerup', () => {this.painting = undefined;});
    //A hidden tab stops getting animation frames but goes on getting audio, so
    //without this a melody plays on from a tab nobody is looking at, and the
    //playhead is wherever it froze when the tab comes back. Switching tabs
    //inside the IDE stops it too -- that is Code.deinitContent.
    document.addEventListener ('visibilitychange', () => {
      if (document.hidden)
        this.stop ();
    });

    this.renderMelodyList ();
    this.inited = true;
  }

  /**
   * A press, or a drag arriving over a cell.
   * @param {PointerEvent} ev
   * @param {boolean} down True for the press that starts a drag.
   */
  pointer (ev, down) {
    let cell_ = ev.target;
    if (cell_ == undefined || !cell_.classList.contains ('musicCell'))
      return;
    if (!down && this.painting == undefined)
      return;
    let row_ = parseInt (cell_.dataset.row), col_ = parseInt (cell_.dataset.col);
    if (down) {
      //Touch implicitly captures the pointer to the element it went down on,
      //so without this a drag on a touchscreen would report every move against
      //the first cell and paint nothing else.
      if (cell_.hasPointerCapture && cell_.hasPointerCapture (ev.pointerId))
        cell_.releasePointerCapture (ev.pointerId);
      //What the first cell of a drag does is what the whole drag does, so
      //dragging back across a run of notes erases it, rather than toggling
      //each cell and leaving a dotted line behind.
      this.painting = this.column [col_] == row_ ? 'erase' : 'paint';
      ev.preventDefault ();
      if (this.painting == 'paint')
        this.preview (this.rows [row_].midi);
    }
    //`down` is the whole difference between a repeat and a hold: the cell a
    //drag begins on starts a note, and every cell it then crosses continues it.
    this.set (row_, col_, this.painting == 'paint', down);
  }

  /**
   * Put a note in a column, or take it out.
   * @param {number} row Row index, 0 at the top.
   * @param {number} col Column index.
   * @param {boolean} on
   * @param {boolean} start True if this column begins a note rather than
   *     continuing the one in the column before it.
   */
  set (row, col, on, start) {
    let want_ = on ? row : null;
    if (this.column [col] === want_ && this.starts [col] == (on && !!start))
      return;
    this.column [col] = want_;
    this.starts [col] = on && !!start;
    this.paintColumn (col);
  }

  /** Redraw one column from `this.column`. */
  paintColumn (col) {
    if (this.roll == undefined)
      return;
    this.roll.querySelectorAll (`.musicCell[data-col="${col}"]`).forEach ((cell_) => {
      let on_ = parseInt (cell_.dataset.row) === this.column [col];
      cell_.classList.toggle ('on', on_);
      //A held beat loses the line down its left edge, so a two-beat note reads
      //as one bar and two one-beat notes read as two.
      cell_.classList.toggle ('held', on_ && !this.starts [col]);
    });
  }

  /** Redraw the whole grid from `this.column`. */
  paintAll () {
    for (let col_ = 0; col_ < this.COLS; col_++)
      this.paintColumn (col_);
  }

  /** Empty the grid. */
  clear () {
    this.stop ();
    this.column.fill (null);
    this.starts.fill (false);
    this.paintAll ();
  }

  /** The tempo box, clamped to what the input allows. */
  bpm () {
    let box_ = get ('#musicBpm');
    let n_ = box_ == undefined ? 120 : parseInt (box_.value);
    return isNaN (n_) ? 120 : Math.min (300, Math.max (30, n_));
  }

  /**
   * The grid as a melody: `[[note name or null, beats], ...]`.
   *
   * A column joins the note before it when it holds the same pitch *and* does
   * not start a note of its own; rests always join. That is what keeps
   * "C C G G A A G" -- seven attacks, and the first tune anybody writes -- from
   * coming out as four longer notes, which is what merging purely on pitch
   * gives you.
   *
   * Trailing rests are dropped: a melody ends when it stops sounding. The
   * fork's attempt at the same thing is an unconditional `activeNotes.pop()`,
   * which eats the last real note whenever there is no trailing rest to eat.
   */
  notes () {
    let out_ = [];
    for (let col_ = 0; col_ < this.COLS; col_++) {
      let name_ = this.column [col_] == null
        ? null : this.rows [this.column [col_]].name;
      let last_ = out_ [out_.length - 1];
      if (last_ != undefined && last_ [0] == name_ && !this.starts [col_])
        last_ [1] += 1;
      else
        out_.push ([name_, 1]);
    }
    while (out_.length > 0 && out_ [out_.length - 1] [0] == null)
      out_.pop ();
    return out_;
  }

  /** Put a melody's notes into the grid, replacing whatever is there. */
  show (notes) {
    this.stop ();
    this.column.fill (null);
    this.starts.fill (false);
    let col_ = 0;
    notes.forEach ((note_) => {
      let row_ = this.rows.findIndex ((r_) => r_.name == note_ [0]);
      for (let n_ = 0; n_ < note_ [1] && col_ < this.COLS; n_++, col_++)
        if (row_ >= 0) {
          this.column [col_] = row_;
          this.starts [col_] = n_ == 0;
        }
    });
    this.paintAll ();
  }

  // ---- playback ------------------------------------------------------------

  /**
   * The shared AudioContext, built on first use.
   *
   * One context for the life of the page, resumed rather than rebuilt: a
   * browser will not start one outside a user gesture, and the fork's
   * `new AudioContext()` on every play (with a `close()` on every stop) is one
   * more context per preview on any browser that is slow to collect them.
   */
  audio () {
    if (this.ctx == undefined)
      this.ctx = new (window.AudioContext || window.webkitAudioContext) ();
    if (this.ctx.state == 'suspended')
      this.ctx.resume ();
    return this.ctx;
  }

  /**
   * Schedule one note on the audio clock.
   *
   * On that clock, not on `setTimeout`: the fork queues one timeout per column
   * and one per note, and a timer that fires 15 ms late makes the tune limp.
   * The short ramps at each end are what keep a square edge in the gain from
   * clicking.
   */
  tone (freq, at, seconds) {
    let ctx_ = this.audio ();
    let osc_ = ctx_.createOscillator ();
    let gain_ = ctx_.createGain ();
    //Square, because that is what a PWM pin does to a buzzer: the preview
    //should sound like the board, not better than it.
    osc_.type = 'square';
    osc_.frequency.setValueAtTime (freq, at);
    gain_.gain.setValueAtTime (0, at);
    gain_.gain.linearRampToValueAtTime (0.2, at + 0.01);
    gain_.gain.setValueAtTime (0.2, at + Math.max (seconds - 0.02, 0.011));
    gain_.gain.linearRampToValueAtTime (0, at + Math.max (seconds, 0.02));
    osc_.connect (gain_).connect (ctx_.destination);
    osc_.start (at);
    osc_.stop (at + Math.max (seconds, 0.02));
    this.voices.push (osc_);
  }

  /** A single note, for the click that places one. */
  preview (midi) {
    this.tone (Pitch.freq (midi), this.audio ().currentTime, 0.15);
  }

  /** Play what is in the grid. */
  play () {
    this.stop ();
    let notes_ = this.notes ();
    if (!notes_.some ((note_) => note_ [0] != null)) {
      UI ['notify'].send ('Nothing to play: click some cells first.');
      return;
    }
    let ctx_ = this.audio ();
    let beat_ = 60 / this.bpm ();
    let start_ = ctx_.currentTime + 0.06;   // a little slack to schedule in
    let at_ = start_;
    notes_.forEach ((note_) => {
      //Nine tenths sounding and a tenth silent, which is what the generated
      //Python does on the board: the gap is what makes two of the same note in
      //a row audible as two. Keeping the same shape here is the point of
      //previewing at all -- what you hear is what the buzzer will do.
      if (note_ [0] != null)
        this.tone (Pitch.freqOf (note_ [0]), at_, beat_ * note_ [1] * 0.9);
      at_ += beat_ * note_ [1];
    });
    this.runCursor (start_, at_ - start_, beat_);
  }

  /**
   * Walk the playhead across the grid while the notes sound.
   *
   * Driven from the audio clock rather than from a timer of its own, so the
   * bar and the sound cannot drift apart however busy the page gets. The two
   * widths are measured once here rather than computed in CSS, because the
   * grid's columns are fractional and only the browser knows what they came
   * out as.
   */
  runCursor (start, seconds, beat) {
    if (this.cursor == undefined)
      return;
    let key_ = this.roll.querySelector ('.musicKey');
    let cell_ = this.roll.querySelector ('.musicCell');
    if (key_ == null || cell_ == null)
      return;
    let left_ = key_.offsetWidth, width_ = cell_.offsetWidth;

    this.roll.classList.add ('playing');
    this.cursor.style.display = 'block';
    let step_ = () => {
      let done_ = this.ctx.currentTime - start;
      if (done_ >= seconds) {
        this.stop ();
        return;
      }
      this.cursor.style.left = `${left_ + Math.max (done_, 0) / beat * width_}px`;
      this.frame = requestAnimationFrame (step_);
    };
    this.frame = requestAnimationFrame (step_);
  }

  /** Stop everything and put the playhead away. */
  stop () {
    if (this.frame != undefined) {
      cancelAnimationFrame (this.frame);
      this.frame = undefined;
    }
    this.voices.forEach ((osc_) => {
      //An oscillator that has already ended throws on stop(). There is nothing
      //to do about one that has finished, and nothing wrong with it either.
      try {osc_.stop ();} catch (e) {}
    });
    this.voices = [];
    if (this.cursor != undefined)
      this.cursor.style.display = 'none';
    if (this.roll != undefined)
      this.roll.classList.remove ('playing');
  }

  // ---- the melody store ----------------------------------------------------

  /**
   * Every saved melody, as `[{name, bpm, notes}]`.
   *
   * Read fresh every time rather than cached: the Play melody block's dropdown
   * asks for this while its menu is opening, and a second tab of the same IDE
   * may have saved something since.
   */
  melodies () {
    try {
      let raw_ = localStorage.getItem (this.STORE);
      if (raw_ == null)
        return [];
      let list_ = JSON.parse (raw_);
      return Array.isArray (list_) ? list_.filter ((m_) => m_ && m_.name) : [];
    } catch (e) {
      //Two different failures, one answer. Unreadable JSON is not worth an
      //error the user can act on, and `localStorage` itself throws rather than
      //returning null where a browser has switched it off -- a private window,
      //or a `file://` page on a browser that treats it as an opaque origin.
      //An empty list is what they see either way, and the console says why.
      console.error (`${this.STORE} could not be read; treating it as empty.`, e);
      return [];
    }
  }

  /** One saved melody by name, or undefined. */
  melody (name) {
    return this.melodies ().filter ((m_) => m_.name == name) [0];
  }

  /** Write the list back and refresh the picker. */
  store (list) {
    try {
      localStorage.setItem (this.STORE, JSON.stringify (list));
    } catch (e) {
      //Switched off, or full. Saying so is the whole of what can be done: the
      //grid still plays, and a melody can still be exported to a file.
      UI ['notify'].send ('This browser will not let BIPES store melodies. ' +
                          'Export the melody to a file instead.');
      console.error (`${this.STORE} could not be written.`, e);
      return;
    }
    this.renderMelodyList ();
  }

  /** Refill the saved-melody picker, keeping the current choice if it survived. */
  renderMelodyList () {
    let select_ = get ('#musicSaved');
    if (select_ == undefined)
      return;
    let was_ = select_.value;
    let names_ = this.melodies ().map ((m_) => m_.name).sort ();
    select_.innerHTML = '';
    select_.disabled = names_.length == 0;
    (names_.length == 0 ? ['no melodies saved'] : names_).forEach ((name_) => {
      let option_ = document.createElement ('option');
      option_.text = name_;
      option_.value = names_.length == 0 ? '' : name_;
      select_.appendChild (option_);
    });
    if (names_.includes (was_))
      select_.value = was_;
  }

  /** Load the melody chosen in the picker into the grid. */
  load () {
    let select_ = get ('#musicSaved');
    let melody_ = select_ == undefined ? undefined : this.melody (select_.value);
    if (melody_ == undefined)
      return;
    get ('#musicBpm').value = melody_.bpm;
    get ('#musicName').value = melody_.name;
    this.show (melody_.notes);
  }

  /**
   * Save the grid under the name in the box, replacing a melody of that name.
   *
   * Replacing rather than refusing, which is what the fork does: having
   * written a melody, fixed one note and pressed Save, being told the name is
   * taken and that the remedy is to invent a second name is not a useful
   * answer. Deleting is its own button, right beside it.
   */
  save () {
    let box_ = get ('#musicName');
    let name_ = box_ == undefined ? '' : (box_.value || '').trim ();
    if (name_ == '') {
      UI ['notify'].send ('Give the melody a name first.');
      return;
    }
    let notes_ = this.notes ();
    if (!notes_.some ((note_) => note_ [0] != null)) {
      UI ['notify'].send ('Nothing to save: click some cells first.');
      return;
    }
    let list_ = this.melodies ().filter ((m_) => m_.name != name_);
    list_.push ({name: name_, bpm: this.bpm (), notes: notes_});
    this.store (list_);
    get ('#musicSaved').value = name_;
    UI ['notify'].send (`Melody "${name_}" saved. Pick it in a Play melody block.`);
  }

  /** Forget the melody chosen in the picker. */
  remove () {
    let select_ = get ('#musicSaved');
    let name_ = select_ == undefined ? '' : select_.value;
    if (this.melody (name_) == undefined)
      return;
    this.store (this.melodies ().filter ((m_) => m_.name != name_));
    //Blocks are deliberately left alone: each one carries the notes it plays,
    //so a program that already uses this melody goes on playing it.
    UI ['notify'].send (`Melody "${name_}" deleted. Blocks already using it keep their copy.`);
  }

  /** Download the melody chosen in the picker as JSON. */
  export () {
    let select_ = get ('#musicSaved');
    let melody_ = select_ == undefined ? undefined : this.melody (select_.value);
    if (melody_ == undefined) {
      UI ['notify'].send ('Save a melody first, then export it.');
      return;
    }
    let url_ = URL.createObjectURL (
      new Blob ([JSON.stringify (melody_, null, 2)], {type: 'application/json'}));
    let a_ = document.createElement ('a');
    a_.href = url_;
    a_.download = `${melody_.name}.json`;
    a_.click ();
    URL.revokeObjectURL (url_);
  }

  /** Read the melody file the user picked, save it, and show it. */
  import () {
    let input_ = get ('#musicFile');
    let file_ = input_ == undefined ? undefined : input_.files [0];
    if (file_ == undefined)
      return;
    let reader_ = new FileReader ();
    reader_.onload = (ev) => {
      let melody_;
      try {
        melody_ = music.readMelody (JSON.parse (ev.target.result));
      } catch (e) {
        UI ['notify'].send (`${file_.name} is not a melody file this can read: ${e.message}.`);
        input_.value = '';
        return;
      }
      let list_ = this.melodies ().filter ((m_) => m_.name != melody_.name);
      list_.push (melody_);
      this.store (list_);
      get ('#musicSaved').value = melody_.name;
      this.load ();
      UI ['notify'].send (`Melody "${melody_.name}" imported.`);
      input_.value = '';
    };
    reader_.readAsText (file_);
  }

  /**
   * Validate a parsed melody file, accepting the shape amadomaker's fork
   * writes as well as this one's.
   *
   * Theirs is one object per note carrying `note`, `frequency`, `duration`,
   * `startCol` and sometimes `isSilence`, four of which are derivable from the
   * fifth -- which is why the shape here is a pair. Reading theirs as well
   * costs three lines, and it is the only melody file that has ever existed
   * outside this tree.
   *
   * @param {Object} data Parsed JSON.
   * @return {Object} `{name, bpm, notes}`.
   */
  static readMelody (data) {
    //Array.isArray, not `instanceof Array`: the latter answers false for an
    //array made in another realm, and JSON that arrived from a file reader in
    //one frame and is read in another is exactly that case.
    if (data == null || typeof data != 'object' || !Array.isArray (data.notes))
      throw new Error ('there is no "notes" array in it');
    let name_ = typeof data.name == 'string' && data.name.trim () != ''
      ? data.name.trim () : 'Imported melody';
    let bpm_ = Math.min (300, Math.max (30, parseInt (data.bpm) || 120));
    let notes_ = data.notes.map ((note_) => {
      if (Array.isArray (note_))
        return [note_ [0] == null ? null : String (note_ [0]), parseInt (note_ [1]) || 1];
      if (note_ != null && typeof note_ == 'object')
        return [note_.note == null ? null : String (note_.note),
                parseInt (note_.duration) || 1];
      throw new Error ('a note is neither a [name, beats] pair nor an object');
    });
    //A name this grid has no row for would vanish silently in show(). Saying so
    //here is the difference between "imported, and half of it is missing" and a
    //file the user can go and fix.
    let bad_ = notes_.filter ((note_) => note_ [0] != null && Pitch.freqOf (note_ [0]) == 0);
    if (bad_.length > 0)
      throw new Error (`"${bad_ [0] [0]}" is not a note name`);
    return {name: name_, bpm: bpm_, notes: notes_};
  }

  /**
   * A melody as the (frequency, beats) pairs the board plays, ready to paste
   * into generated Python. A rest is frequency 0.
   *
   * @param {Object[]} notes `[[name or null, beats], ...]`.
   * @return {string} A Python list literal.
   */
  static python (notes) {
    return '[' + notes.map ((note_) =>
      `(${note_ [0] == null ? 0 : Pitch.freqOf (note_ [0])}, ${note_ [1]})`).join (', ') + ']';
  }
}
