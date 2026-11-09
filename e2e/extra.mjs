// @ts-check
// The checks of TEST-CASES.md that aren't key cases (run.mjs): settings reaching every editor, unloading, a popout
// window, the settings tab, performance on a long note (typing, a move or indent, outline mode's Enter and
// Backspace), Obsidian's renumbering against the fixture table (src/numbering.fixtures.json), and (with --mobile)
// mobile emulation. Same setup as run.mjs: a sandbox (e2e/sandbox.sh), which it refuses to run without; run.mjs
// (or sandbox.sh deploy) installs the current build. Writes e2e/extra-results.md; exits 1 when a check fails.
//   node e2e/extra.mjs [--mobile] [--lines 20000] [--only X9,X9b] (CDP_PORT, default e2e/cdp.mjs's: sandbox 4)
// A check that needs a core plugin that isn't enabled is skipped (E2E_REQUIRE turns that into a failure).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSandboxVault, connect } from "./cdp.mjs";
import { envLine, environment, lanesForSuite, lanesRestore, verdict } from "./env.mjs";

/** @typedef {import("./cdp.mjs").CdpJson} CdpJson */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ID = "editor-outliner";
const args = process.argv.slice(2);
const LINES = Number(args[args.indexOf("--lines") + 1] || 0) || 20000;
// --only <ids>: just these checks (the others aren't run, nor listed)
const only = args.includes("--only") ? new Set((args[args.indexOf("--only") + 1] || "").split(",")) : null;
/** @param {...string} ids */
const wanted = (...ids) => !only || ids.some(id => only.has(id));
/** @param {number} ms */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isMain = (/** @type {{ url: string }} */ t) => t.url.startsWith("app://obsidian.md/index.html");

/** @type {{ id: string, title: string, status: "PASS" | "FAIL" | "SKIP", detail: string }[]} */
const results = [];
/**
 * @param {string} id
 * @param {string} title
 * @param {boolean} pass
 * @param {unknown} detail
 */
const record = (id, title, pass, detail) => {
  results.push({ id, title, status: pass ? "PASS" : "FAIL", detail: JSON.stringify(detail) });
  console.log(`${pass ? "PASS" : "FAIL"} ${id} ${title} ${JSON.stringify(detail)}`);
};

const c = await connect(undefined, isMain);
const vault = await assertSandboxVault(c);
const { loaded, env } = await environment(c);
console.log(`${envLine(env)} Vault: ${vault}`);
/**
 * Whether a check that needs these ids runs; records it as skipped (or failed, with E2E_REQUIRE) when not.
 * @param {string} id
 * @param {string} title
 * @param {string[]} needs
 */
const runs = (id, title, needs) => {
  const v = verdict(loaded, needs);
  if (!v) return true;
  if ("fail" in v) record(id, title, false, { needs: v.fail, enabled: false, E2E_REQUIRE: true });
  else {
    results.push({ id, title, status: "SKIP", detail: JSON.stringify({ needs: v.skip }) });
    console.log(`SKIP ${id} (needs ${v.skip.join(", ")}: not enabled)`);
  }
  return false;
};

// page helpers every check starts with: the suite's folders and notes, and a new tab (with no tab group left,
// getLeaf("tab") throws: then the current leaf)
const HELPERS = `const ID=${JSON.stringify(ID)}; const sleep = ms => new Promise(r => setTimeout(r, ms));
  const folder = async p => { if (!app.vault.getAbstractFileByPath(p)) await app.vault.createFolder(p).catch(() => {}); };
  const put = async (p, t) => { await folder("_test"); await folder("_test/tab"); const f = app.vault.getAbstractFileByPath(p);
    if (f) { await app.vault.modify(f, t); return f; } return app.vault.create(p, t); };
  const newTab = () => { try { return app.workspace.getLeaf("tab"); } catch { return app.workspace.getLeaf(false); } };`;
/** @param {string} body an async function body run in the page */
const ev = body => c.ev(`(async()=>{${HELPERS} ${body}})()`);

// every document an editor can live in: the window and the Canvas cards' iframes
const DOCS = `const docs = () => [document, ...[...document.querySelectorAll("iframe")].map(f => { try { return f.contentDocument } catch { return null } }).filter(Boolean)];
  const q = s => docs().reduce((n, d) => n + d.querySelectorAll(s).length, 0);`;
// a normal tab, a Canvas text card and a page preview popover, each editing a note with headings and a list
const OPEN = `
  const note = "# A\\n- a\\n\\t- b\\n## B\\nx";
  const tf = await put("_test/tab/x-tab.md", note); await put("_test/x-pop.md", note);
  const tab = newTab(); await tab.openFile(tf); await sleep(800);
  const host = tab.view; const el = host.containerEl.querySelector(".cm-content"); const r = el.getBoundingClientRect();
  app.workspace.trigger("hover-link", { event: new MouseEvent("mouseover", { clientX: r.left + 40, clientY: r.top + 20, ctrlKey: true }), source: "editor", hoverParent: host, targetEl: el, linktext: "_test/x-pop", sourcePath: "" });
  for (let i = 0; i < 40 && !host.hoverPopover; i++) await sleep(100);
  const hp = host.hoverPopover; await sleep(400); hp.embed.showEditor(); hp.isFocused = true; await sleep(600);
  const data = JSON.stringify({ nodes: [{ id: "t", type: "text", text: note, x: 0, y: 0, width: 400, height: 400 }], edges: [] });
  const cf = await put("_test/x.canvas", data);
  const cl = newTab(); await cl.openFile(cf); await sleep(1000);
  const node = cl.view.canvas.nodes.get("t"); cl.view.canvas.selectOnly(node); node.startEditing(); await sleep(800);
  window.__x = { tab, hp, cl };`;
const CLOSE = `const x = window.__x; x.hp?.hide?.(); x.tab?.detach(); x.cl?.detach();`;

/** @type {CdpJson} */
let lanesOld = null;
try {
  lanesOld = await lanesForSuite(c);

  // ---- settings reach every editor; unloading leaves nothing behind ----
  const editors = ["core:canvas", "core:page-preview"];
  const t1 = "Settings changes reach a tab, a Canvas card and a popover editor";
  const t2 = "Disabling the plugin leaves no class or element in any editor";
  if (wanted("X1", "X2") && runs("X1", t1, editors) && runs("X2", t2, editors)) {
    const s = await ev(`${DOCS} ${OPEN}
      const p = app.plugins.plugins[ID];
      const before = { handles: q(".eo-drag-handle"), labels: q(".eo-level-label"), guides: q(".eo-guides") };
      p.settings.dragHandles = false; p.settings.levelLabels = false; await p.saveSettings(); await sleep(300);
      const off = { handles: q(".eo-drag-handle"), labels: q(".eo-level-label") };
      p.settings.dragHandles = true; p.settings.levelLabels = true; await p.saveSettings(); await sleep(300);
      const on = { handles: q(".eo-drag-handle"), labels: q(".eo-level-label") };
      await app.plugins.disablePlugin(ID); await sleep(800);
      const left = docs().flatMap(d => [...d.querySelectorAll("[class*=eo-], [data-eo-level]")].map(e => e.className));
      await app.plugins.enablePlugin(ID); await sleep(800);
      ${CLOSE}
      return { before, off, on, left };`);
    record(
      "X1",
      t1,
      s.before.handles >= 3 &&
        s.before.guides === 0 &&
        s.off.handles + s.off.labels === 0 &&
        s.on.handles === s.before.handles &&
        s.on.labels === s.before.labels,
      { before: s.before, off: s.off, on: s.on },
    );
    record("X2", t2, s.left.length === 0, { left: s.left.slice(0, 5) });
  }

  // ---- a popout window: keys, a drag with Escape and a real drag ----
  if (wanted("X3", "X4", "X6", "X7")) {
    await ev(
      `const f = await put("_test/tab/x-tab.md", "x"); const leaf = app.workspace.openPopoutLeaf(); await leaf.openFile(f); await sleep(2000); window.__pop = leaf; return 1`,
    );
    const pop = await connect(undefined, t => t.url === "about:blank" && !/^Settings/.test(t.title));
    /** @param {string} text @param {number} line @param {number} [ch] */
    const set = (text, line, ch) =>
      ev(
        `const v = window.__pop.view.editor.cm; v.focus(); v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: ${JSON.stringify(text)} } }); const l = v.state.doc.line(${line} + 1); v.dispatch({ selection: { anchor: ${ch === undefined ? "l.to" : `l.from + ${ch}`} } }); v.focus(); await sleep(100); return 1`,
      );
    const text = () => ev(`return window.__pop.view.editor.cm.state.doc.toString()`);
    await set("# H\n- a\n- b\n\t- c\n- d", 2);
    await pop.key("Tab");
    await sleep(150);
    const tabText = await text();
    record("X3", "Popout: Tab indents an item with its children", tabText === "# H\n- a\n\t- b\n\t\t- c\n- d", tabText);
    await set("- one two", 0, 5);
    await pop.key("Enter");
    await sleep(400);
    const enter = await text();
    record("X4", "Popout: Enter splits (outline mode, always on)", enter === "- one\n- two", { enter });
    /** @param {number} line @param {number} to @param {boolean} escape */
    const drag = async (line, to, escape) => {
      const xy =
        await ev(`const v = window.__pop.view.editor.cm; const l = v.state.doc.line(${line} + 1); const c = v.coordsAtPos(l.from + 2);
      const t = (${to} < v.state.doc.lines ? v.lineBlockAt(v.state.doc.line(${to} + 1).from).top : v.lineBlockAt(v.state.doc.length).bottom) + v.documentTop;
      return [c.left + 2, (c.top + c.bottom) / 2, t]`);
      /** @param {string} type @param {number} x @param {number} y */
      const m = (type, x, y, extra = {}) =>
        pop.send("Input.dispatchMouseEvent", { type, x, y, button: "left", ...extra });
      await m("mouseMoved", xy[0] + 30, xy[1], { button: "none" });
      await m("mouseMoved", xy[0], xy[1], { button: "none" });
      await sleep(150);
      const h = await ev(
        `const h = window.__pop.view.editor.cm.dom.querySelector(".eo-drag-handle"); if (!h || h.style.display === "none") return null; const r = h.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]`,
      );
      if (!h) return { error: "no handle" };
      await m("mouseMoved", h[0], h[1], { button: "none" });
      await m("mousePressed", h[0], h[1], { clickCount: 1, buttons: 1 });
      for (let i = 1; i <= 8; i++) {
        await m("mouseMoved", h[0], h[1] + ((xy[2] - h[1]) * i) / 8, { buttons: 1 });
        await sleep(25);
      }
      if (escape) {
        await pop.key("Escape");
        await sleep(50);
      }
      await m("mouseReleased", h[0], xy[2], { clickCount: 1 });
      await sleep(200);
      return { text: await text() };
    };
    await set("- a\n- b\n- c", 0);
    const d1 = await drag(0, 3, true);
    record("X6", "Popout: Escape cancels a drag", d1.text === "- a\n- b\n- c", d1);
    await set("- a\n- b\n- c", 0);
    const d2 = await drag(0, 2, false);
    await pop.key("z", { ctrl: true });
    await sleep(150);
    const undone = await text();
    record(
      "X7",
      "Popout: a drag moves the item; one Ctrl+Z undoes it",
      d2.text === "- b\n- a\n- c" && undone === "- a\n- b\n- c",
      { ...d2, undone },
    );
    pop.close();
    await ev(`window.__pop.detach(); return 1`);
  }

  // ---- the settings tab (its own window in Obsidian 1.15): real clicks on the toggles ----
  if (wanted("X8")) {
    await ev(
      `const f = await put("_test/tab/x-tab.md", "# H\\nx\\n## S\\ny"); const leaf = newTab(); await leaf.openFile(f); await sleep(800); window.__s = leaf; app.setting.open(); app.setting.openTabById(ID); await sleep(800); return 1`,
    );
    const names = await ev(
      `return [...app.setting.activeTab.containerEl.querySelectorAll(".setting-item-name")].map(e => e.textContent)`,
    );
    const sw = await connect(undefined, t => /^Settings/.test(t.title)).catch(() => null);
    /** @param {string} name */
    const click = async name => {
      const target = sw ?? c;
      const r = await target.ev(
        `(() => { const it = [...document.querySelectorAll(".setting-item")].find(e => e.querySelector(".setting-item-name")?.textContent === ${JSON.stringify(name)}); const r = it.querySelector(".checkbox-container").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] })()`,
      );
      for (const type of ["mousePressed", "mouseReleased"])
        await target.send("Input.dispatchMouseEvent", { type, x: r[0], y: r[1], button: "left", clickCount: 1 });
      await sleep(400);
    };
    await click("Heading level labels");
    const gOff = await ev(
      `return [window.__s.view.editor.cm.dom.querySelectorAll(".cm-line.eo-level-label").length, JSON.parse(await app.vault.adapter.read(app.vault.configDir + "/plugins/" + ID + "/data.json")).levelLabels]`,
    );
    await click("Heading level labels");
    const gOn = await ev(`return window.__s.view.editor.cm.dom.querySelectorAll(".cm-line.eo-level-label").length`);
    sw?.close();
    await ev(`app.setting.close(); window.__s.detach(); return 1`);
    record(
      "X8",
      "Settings tab: five toggles (no outline mode or heading guides switch); clicking Heading level labels hides and shows the labels and saves",
      names.length === 5 &&
        !names.includes("Outline mode") &&
        !names.includes("Heading guides") &&
        gOff[0] === 0 &&
        gOff[1] === false &&
        gOn > 0,
      { names, gOff, gOn },
    );
  }

  // ---- performance on a long note ----
  // a note of LINES lines: headings, body text, nested lists and code blocks, opened in a tab
  const LONG = `const lines = []; let h = 0;
    while (lines.length < ${LINES}) { h++; lines.push("#".repeat(1 + (h % 4)) + " Heading " + h, "Body text " + h + ". Another sentence.", "");
      for (let i = 0; i < 6; i++) lines.push("\\t".repeat(i % 3) + "- item " + h + "." + i + " with [[link]] text");
      lines.push("", "\`\`\`js", "const x = " + h + ";", "\`\`\`", ""); }
    const f = await put("_test/tab/x-perf.md", lines.join("\\n"));
    const leaf = newTab(); await leaf.openFile(f); await sleep(1500); const cm = leaf.view.editor.cm;`;
  if (wanted("X9")) {
    const perf = await ev(`${LONG}
    const typing = async () => { let ln = Math.floor(cm.state.doc.lines / 2); while (!/^\\s*- item/.test(cm.state.doc.line(ln).text)) ln++;
      cm.dispatch({ selection: { anchor: cm.state.doc.line(ln).to }, scrollIntoView: true }); cm.focus(); await sleep(300);
      const d = []; for (let i = 0; i < 30; i++) { const p = cm.state.selection.main.head; const t0 = performance.now();
        cm.dispatch({ changes: { from: p, insert: "x" }, selection: { anchor: p + 1 }, userEvent: "input.type" }); cm.measure(); d.push(performance.now() - t0);
        await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); }
      d.sort((a, b) => a - b); return +d[15].toFixed(1); };
    const op = async id => { let ln = Math.floor(cm.state.doc.lines / 2) + 40; while (!/^\\t- item/.test(cm.state.doc.line(ln).text)) ln++;
      cm.dispatch({ selection: { anchor: cm.state.doc.line(ln).to } }); cm.focus(); const d = [];
      for (let i = 0; i < 10; i++) { const t0 = performance.now(); app.commands.executeCommandById(ID + ":" + (i % 2 ? id[1] : id[0])); cm.measure(); d.push(performance.now() - t0); await sleep(20); }
      d.sort((a, b) => a - b); return +d[5].toFixed(1); };
    // the palette asks every command whether it applies: the outliner's answer must be cheap
    const check = () => { let ln = Math.floor(cm.state.doc.lines / 2) + 40; while (!/^\\t- item/.test(cm.state.doc.line(ln).text)) ln++;
      cm.dispatch({ selection: { anchor: cm.state.doc.line(ln).to } }); cm.focus(); const d = [];
      for (let i = 0; i < 10; i++) { const t0 = performance.now();
        for (const id of ["indent", "outdent", "move-up", "move-down", "insert-code-block"]) app.commands.findCommand(ID + ":" + id).checkCallback(true);
        d.push(performance.now() - t0); }
      d.sort((a, b) => a - b); return +d[5].toFixed(1); };
    const on = await typing(); const move = await op(["move-down", "move-up"]); const indent = await op(["indent", "outdent"]); const palette = check();
    await app.plugins.disablePlugin(ID); await sleep(500); const off = await typing(); await app.plugins.enablePlugin(ID); await sleep(500);
    leaf.detach(); return { lines: cm.state.doc.lines, typingOn: on, typingOff: off, move, indent, palette };`);
    record(
      "X9",
      `Long note (${perf.lines} lines): typing costs no more than ~2 ms over Obsidian's own; a move or indent under 100 ms; ` +
        "the palette's availability checks of five commands under 10 ms (median ms)",
      perf.typingOn - perf.typingOff < 2 && perf.move < 100 && perf.indent < 100 && perf.palette < 10,
      perf,
    );
  }
  // outline mode's Enter (split) and Backspace (merge) in the middle of the long note, right after typing a character
  // (plain typing leaves the note unparsed): their cost over Obsidian's own Enter and Backspace there
  if (wanted("X9b")) {
    const keys = await ev(`${LONG}
    const p = app.plugins.plugins[ID]; const ed = leaf.view.editor; const original = cm.state.doc.toString();
    const key = k => cm.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: k, bubbles: true, cancelable: true }));
    const restore = () => { for (let i = 0; i < 4 && cm.state.doc.toString() !== original; i++) ed.undo(); return cm.state.doc.toString() === original; };
    const item = () => { let ln = Math.floor(cm.state.doc.lines / 2); while (!/^\\t- item/.test(cm.state.doc.line(ln).text)) ln++; return ln; };
    const measure = async (k, at) => {
      const d = [];
      for (let i = 0; i < 12; i++) {
        const ln = item(); const l0 = cm.state.doc.line(ln);
        cm.dispatch({ changes: { from: l0.to, insert: "x" }, selection: { anchor: l0.to + 1 }, userEvent: "input.type" });
        const l = cm.state.doc.line(ln); cm.dispatch({ selection: { anchor: at(l) }, scrollIntoView: true }); cm.focus();
        await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
        const before = cm.state.doc; const t0 = performance.now(); key(k); cm.measure(); d.push(performance.now() - t0);
        if (cm.state.doc === before) return { error: k + " changed nothing" };
        await sleep(30);
        if (!restore()) return { error: "undo didn't restore the note" };
      }
      d.sort((a, b) => a - b); return +d[6].toFixed(1);
    };
    const run = async () => ({ enter: await measure("Enter", l => l.to), backspace: await measure("Backspace", l => l.from + l.text.indexOf("- ") + 2) });
    const on = await run(); p.outlineOffForTests = true;
    let off; try { off = await run(); } finally { p.outlineOffForTests = false; }
    leaf.detach(); return { lines: cm.state.doc.lines, on, off };`);
    const ok = (/** @type {unknown} */ n) => typeof n === "number";
    record(
      "X9b",
      `Long note (${keys.lines} lines): outline mode's Enter (split) and Backspace (merge) cost at most 15 ms over ` +
        "Obsidian's own Enter and Backspace there (median ms, after typing a character)",
      ok(keys.on?.enter) &&
        ok(keys.on?.backspace) &&
        ok(keys.off?.enter) &&
        ok(keys.off?.backspace) &&
        keys.on.enter - keys.off.enter <= 15 &&
        keys.on.backspace - keys.off.backspace <= 15,
      keys,
    );
  }

  // ---- Obsidian's renumbering against the fixture table numbering.ts is checked with ----
  if (wanted("X12")) {
    const table = path.join(HERE, "..", "src", "numbering.fixtures.json");
    const fixtures = fs.existsSync(table) ? JSON.parse(fs.readFileSync(table, "utf8")).cases : [];
    const num = await ev(`const fx = ${JSON.stringify(fixtures)};
    const f = await put("_test/tab/x-num.md", ""); const leaf = newTab(); await leaf.openFile(f); await sleep(800); const cm = leaf.view.editor.cm;
    const bad = [];
    for (const x of fx) {
      const a = x.old.join("\\n"), b = x.next.join("\\n");
      cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: a }, userEvent: "set" });
      // the change as one edit (what the plugin dispatches): Obsidian's renumbering acts on it
      const max = Math.min(a.length, b.length); let p = 0; while (p < max && a[p] === b[p]) p++;
      let q = 0; while (q < max - p && a[a.length - 1 - q] === b[b.length - 1 - q]) q++;
      cm.dispatch({ changes: { from: p, to: a.length - q, insert: b.slice(p, b.length - q) }, userEvent: "input" });
      const got = cm.state.doc.toString();
      if (got !== x.obsidian.join("\\n")) bad.push({ name: x.name, want: x.obsidian.join("\\n"), got });
    }
    leaf.detach(); return { cases: fx.length, bad };`);
    record(
      "X12",
      "Obsidian renumbers every change of the fixture table as recorded (numbering.ts is checked against the table)",
      num.cases > 0 && num.bad.length === 0,
      num.bad.length ? num : { cases: num.cases },
    );
  }

  // ---- mobile emulation (reloads the app twice) ----
  if (args.includes("--mobile") && wanted("X10", "X11")) {
    await ev(`setTimeout(() => app.emulateMobile(true), 50); return 1`);
    await sleep(4000);
    /** @type {Awaited<ReturnType<typeof connect>> | null} */
    let mc = null;
    for (let i = 0; i < 30 && !mc; i++) {
      await sleep(1000);
      mc = await connect(undefined, isMain).catch(() => null);
      if (
        mc &&
        !(await mc.ev(`!!(window.app?.workspace?.layoutReady && app.plugins.plugins["${ID}"])`).catch(() => false))
      ) {
        mc.close();
        mc = null;
      }
    }
    if (!mc) throw new Error("no Obsidian after the mobile reload");
    /** @param {string} body */
    const mev = body => mc.ev(`(async()=>{${HELPERS} ${body}})()`);
    await mev(`const f = await put("_test/tab/x-tab.md", "# H\\n- a\\n- one two\\n\\t- c"); const leaf = app.workspace.getLeaf(false); await leaf.openFile(f); await sleep(1500);
      await leaf.view.setState({ ...leaf.view.getState(), mode: "source", source: false }, { history: false }); window.__m = leaf.view.editor.cm; const v = window.__m; v.focus(); v.dispatch({ selection: { anchor: v.state.doc.line(3).from + 5 } }); return 1`);
    const mob = await mev(
      `return { mobile: app.isMobile, handle: !!window.__m.dom.querySelector(".eo-drag-handle"), guides: !!window.__m.dom.querySelector(".eo-guide-line"), labels: !!window.__m.dom.querySelector(".cm-line.eo-level-label") }`,
    );
    await mc.key("Enter");
    await sleep(200);
    const menter = await mev(`return window.__m.state.doc.toString()`);
    await mc.key("z", { ctrl: true });
    await sleep(150);
    await mev(
      `const v = window.__m; v.focus(); v.dispatch({ selection: { anchor: v.state.doc.line(3).to } }); return 1`,
    );
    await mc.key("Tab");
    await sleep(200);
    const mtab = await mev(`return window.__m.state.doc.toString()`);
    record(
      "X10",
      "Mobile emulation: no drag handle, no heading guides, level labels; Enter and Tab from a hardware keyboard",
      mob.mobile &&
        !mob.handle &&
        !mob.guides &&
        mob.labels &&
        menter === "# H\n- a\n- one\n\t- two\n\t- c" &&
        mtab === "# H\n- a\n\t- one two\n\t\t- c",
      { ...mob, menter, mtab },
    );
    // the editor toolbar's indent / outdent buttons (Obsidian's editor:indent-list / editor:unindent-list), real taps
    /** @param {string} id */
    const tap = async id => {
      const xy =
        await mev(`const ids = app.vault.getConfig("mobileToolbarCommands"); const i = ids.indexOf(${JSON.stringify(id)});
        const b = [...document.querySelectorAll(".mobile-toolbar-option")][i]; if (!b) return null; b.scrollIntoView({ inline: "center" }); await sleep(200);
        const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]`);
      if (!xy) throw new Error("no toolbar button for " + id);
      for (const type of ["mousePressed", "mouseReleased"])
        await mc.send("Input.dispatchMouseEvent", { type, x: xy[0], y: xy[1], button: "left", clickCount: 1 });
      await sleep(300);
      return mev(`return window.__m.state.doc.toString()`);
    };
    /** @param {string} t @param {number} line @param {number} [ch] */
    const mset = (t, line, ch) =>
      mev(`const v = window.__m; v.focus(); v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: ${JSON.stringify(t)} } });
        const l = v.state.doc.line(${line} + 1); v.dispatch({ selection: { anchor: ${ch === undefined ? "l.to" : `l.from + ${ch}`} } }); v.focus(); await sleep(200); return 1`);
    const tb = {};
    await mset("# H\n- a\n- b\n\t- c", 2);
    tb.indentItem = await tap("editor:indent-list");
    await mset("# H\n- a\n\t- b\n\t\t- c\n\t- d", 2);
    tb.outdentItem = await tap("editor:unindent-list");
    await mset("# H\n## S\nx", 1);
    tb.indentHeading = await tap("editor:indent-list");
    await mset("# H\n## S\nx", 1);
    tb.outdentHeading = await tap("editor:unindent-list");
    await mset("# H\n\npara", 2, 2);
    tb.para = await tap("editor:indent-list");
    tb.paraObsidian = "# H\n\n\tpara";
    record(
      "X11",
      "Mobile toolbar: indent / outdent buttons move a list item or heading with its subtree; in body text Obsidian's indent",
      tb.indentItem === "# H\n- a\n\t- b\n\t\t- c" &&
        tb.outdentItem === "# H\n- a\n- b\n\t- c\n\t- d" &&
        tb.indentHeading === "# H\n### S\nx" &&
        tb.outdentHeading === "# H\n# S\nx" &&
        tb.para === tb.paraObsidian,
      tb,
    );
    await mev(`setTimeout(() => app.emulateMobile(false), 50); return 1`);
    mc.close();
    await sleep(6000);
  }
} finally {
  await lanesRestore(c, lanesOld).catch(e => console.log("couldn't restore Editor Multiple Lanes' settings: " + e));
  c.close();
}

const count = (/** @type {string} */ s) => results.filter(r => r.status === s).length;
const out = [
  "# Editor Outliner extra checks",
  "",
  `Run ${new Date().toISOString()} by \`e2e/extra.mjs\`${args.includes("--mobile") ? " --mobile" : ""}: ` +
    `${count("PASS")} pass, ${count("FAIL")} fail, ${count("SKIP")} skipped of ${results.length}.`,
  "",
  `${envLine(env)} Vault: a sandbox (\`${path.basename(path.dirname(path.dirname(vault)))}/${path.basename(path.dirname(vault))}\`).`,
  "",
  "| Id | Check | Result | Detail |",
  "|---|---|---|---|",
];
for (const r of results)
  out.push(`| ${r.id} | ${r.title} | ${r.status} | \`${r.detail.replace(/\|/g, "\\|").slice(0, 400)}\` |`);
fs.writeFileSync(path.join(HERE, "extra-results.md"), out.join("\n") + "\n");
console.log(
  `${count("PASS")} pass, ${count("FAIL")} fail, ${count("SKIP")} skipped of ${results.length}. Wrote e2e/extra-results.md`,
);
process.exitCode = count("FAIL") ? 1 : 0;
