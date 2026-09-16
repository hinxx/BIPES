/**
 * Just enough of the Chrome DevTools protocol to open a page and ask it
 * questions.
 *
 * No npm dependencies on purpose: this repository builds with make and Python
 * and has no JavaScript toolchain, and two test scripts are not a reason to
 * start one. Needs node >= 22, for the global WebSocket, and a Chrome or
 * Chromium binary.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const {spawn} = require('child_process');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Where to look for a browser, in order. CHROME wins. */
function findChrome() {
  const candidates = [
    process.env.CHROME,
    '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
  ].filter(Boolean);
  for (const c of candidates) {
    try { fs.accessSync(c, fs.constants.X_OK); return c; } catch (e) {}
  }
  // Whatever the playwright cache happens to hold, newest first.
  const cache = path.join(os.homedir(), '.cache/ms-playwright');
  try {
    const dirs = fs.readdirSync(cache)
        .filter((d) => d.startsWith('chromium-'))
        .sort().reverse();
    for (const d of dirs) {
      const c = path.join(cache, d, 'chrome-linux64', 'chrome');
      try { fs.accessSync(c, fs.constants.X_OK); return c; } catch (e) {}
    }
  } catch (e) {}
  throw new Error('No Chrome binary found. Set CHROME=/path/to/chrome.');
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

/** Minimal CDP client over the browser WebSocket, flat sessions. */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const {resolve, reject} = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners) fn(msg);
      }
    });
  }

  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, {once: true});
      ws.addEventListener('error', () => reject(new Error('CDP connect failed')),
                          {once: true});
    });
    return new Cdp(ws);
  }

  on(fn) { this.listeners.push(fn); }

  send(method, params, sessionId) {
    const id = this.nextId++;
    const msg = {id, method, params: params || {}};
    if (sessionId) msg.sessionId = sessionId;
    this.ws.send(JSON.stringify(msg));
    return new Promise((resolve, reject) => {
      this.pending.set(id, {resolve, reject});
    });
  }
}

async function launch(chrome, viewport) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bipes-tests-'));
  const proc = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=0',
    '--user-data-dir=' + userDataDir,
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    // The pages under test are opened over file://, where the IDE takes its
    // offline path and reads the baked assets; without this those and the
    // media/ images count as cross-origin.
    '--allow-file-access-from-files',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=' + viewport.width + ',' + viewport.height,
    'about:blank',
  ], {stdio: ['ignore', 'ignore', 'pipe']});

  let stderr = '';
  proc.stderr.on('data', (c) => stderr += c);

  const portFile = path.join(userDataDir, 'DevToolsActivePort');
  for (let i = 0; i < 200; i++) {
    if (fs.existsSync(portFile)) {
      const lines = fs.readFileSync(portFile, 'utf8').split('\n');
      if (lines.length >= 2) {
        const version = await httpGetJson(
            'http://127.0.0.1:' + lines[0].trim() + '/json/version');
        return {proc, wsUrl: version.webSocketDebuggerUrl, userDataDir};
      }
    }
    if (proc.exitCode !== null) {
      throw new Error('Chrome exited (' + proc.exitCode + '):\n' + stderr);
    }
    await sleep(50);
  }
  throw new Error('Chrome did not report a debugging port:\n' + stderr);
}

/**
 * Open `url`, wait until `ready` evaluates true, hand a page handle to `body`,
 * and shut everything down afterwards however it ends.
 *
 * The handle carries `evaluate(expression)`, `screenshot(file)`, and the
 * `pageErrors`, `consoleErrors` and `dialogs` collected since navigation -- a
 * page that throws, or stops to complain at you, while loading is a result,
 * not a detail to go hunting for.
 */
async function withPage(url, options, body) {
  const opts = options || {};
  const viewport = opts.viewport || {width: 1400, height: 900};
  const chrome = findChrome();
  const {proc, wsUrl, userDataDir} = await launch(chrome, viewport);
  let cdp;
  try {
    cdp = await Cdp.connect(wsUrl);
    const {targetId} = await cdp.send('Target.createTarget', {url: 'about:blank'});
    const {sessionId} =
        await cdp.send('Target.attachToTarget', {targetId, flatten: true});

    const pageErrors = [];
    const consoleErrors = [];
    const dialogs = [];
    cdp.on((msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        pageErrors.push(
            String((d.exception && d.exception.description) || d.text)
                .split('\n')[0]);
      } else if (msg.method === 'Runtime.consoleAPICalled' &&
                 msg.params.type === 'error') {
        consoleErrors.push(msg.params.args
            .map((a) => String(a.value !== undefined ? a.value : (a.description || '')))
            .join(' ').split('\n')[0]);
      } else if (msg.method === 'Page.javascriptDialogOpening') {
        // A modal dialog wedges the renderer and every later evaluate with it,
        // so it is always dismissed -- but it is recorded, because a page that
        // greets you with an alert box is a page with something wrong with it.
        dialogs.push(msg.params.type + ': ' + msg.params.message);
        if (opts.onDialog) opts.onDialog(msg.params);
        cdp.send('Page.handleJavaScriptDialog', {accept: true}, sessionId);
      }
    });

    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Emulation.setDeviceMetricsOverride',
        {width: viewport.width, height: viewport.height,
         deviceScaleFactor: 1, mobile: false}, sessionId);
    await cdp.send('Page.navigate', {url}, sessionId);

    const evaluate = async (expression) => {
      const r = await cdp.send('Runtime.evaluate', {
        expression, returnByValue: true, awaitPromise: true, timeout: 600000,
      }, sessionId);
      if (r.exceptionDetails) {
        const d = r.exceptionDetails;
        throw new Error('page threw: ' +
            String((d.exception && d.exception.description) || d.text)
                .split('\n')[0]);
      }
      return r.result.value;
    };

    // Wait on a condition rather than a load event: the IDE pulls the toolbox
    // and the generated block files in with document.write.
    const ready = opts.ready || 'document.readyState === "complete"';
    let settled = false;
    for (let i = 0; i < (opts.readyTries || 300); i++) {
      let value;
      try { value = await evaluate(ready); } catch (e) { value = false; }
      if (value === true) { settled = true; break; }
      await sleep(100);
    }
    if (!settled) {
      throw new Error('page never became ready: ' + ready +
          (pageErrors.length ? '\npage errors:\n' + pageErrors.join('\n') : ''));
    }
    if (opts.settleMs) await sleep(opts.settleMs);

    const screenshot = async (file) => {
      const shot = await cdp.send('Page.captureScreenshot', {format: 'png'},
                                  sessionId);
      fs.mkdirSync(path.dirname(file), {recursive: true});
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      return file;
    };

    return await body(
        {evaluate, screenshot, pageErrors, consoleErrors, dialogs, chrome});
  } finally {
    try { if (cdp) cdp.ws.close(); } catch (e) {}
    proc.kill();
    try { fs.rmSync(userDataDir, {recursive: true, force: true}); } catch (e) {}
  }
}

module.exports = {findChrome, launch, Cdp, withPage, sleep};
