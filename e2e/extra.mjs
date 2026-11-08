// @ts-check
// The checks of TEST-CASES.md that aren't key cases (run.mjs): unloading, settings reaching every editor, a popout
// window, the settings tab, performance on a long note, and (with --mobile) mobile emulation. Same setup as run.mjs
// (a throwaway Obsidian with a debugging port and the test vault); run run.mjs once first so the plugin is
// deployed. Writes e2e/extra-results.md.
//   CDP_PORT=9314 node custom-plugins/editor-outliner/e2e/extra.mjs [--mobile] [--lines 20000]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "./cdp.mjs";

/** @typedef {import("./cdp.mjs").CdpJson} CdpJson */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ID = "editor-outliner";
const args = process.argv.slice(2);
const LINES = Number(args[args.indexOf("--lines") + 1] || 0) || 20000;
/** @param {number} ms */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isMain = (/** @type {{ url: string }} */ t) => t.url.startsWith("app://obsidian.md/index.html");

/** @type {{ id: string, title: string, pass: boolean, detail: string }[]} */
const results = [];
/**
 * @param {string} id
 * @param {string} title
 * @param {boolean} pass
 * @param {unknown} detail
 */
const record = (id, title, pass, detail) => {
  results.push({ id, title, pass, detail: JSON.stringify(detail) });
  console.log(`${pass ? "PASS" : "FAIL"} ${id} ${title} ${JSON.stringify(detail)}`);
};

const c = await connect(undefined, isMain);
/** @param {string} body an async function body run in the page */
const ev = body =>
  c.ev(`(async()=>{const ID=${JSON.stringify(ID)}; const sleep=ms=>new Promise(r=>setTimeout(r,ms)); ${body}})()`);

// every document an editor can live in: the window and the Canvas cards' iframes
const DOCS = `const docs = () => [document, ...[...document.querySelectorAll("iframe")].map(f => { try { return f.contentDocument } catch { return null } }).filter(Boolean)];
  const q = s => docs().reduce((n, d) => n + d.querySelectorAll(s).length, 0);`;
// a normal tab, a Canvas text card and a page preview popover, each editing a note with headings and a list
const OPEN = `
  const note = "# A\\n- a\\n\\t- b\\n## B\\nx";
  for (const p of ["_test/x-tab.md", "_test/x-pop.md"]) { const f = app.vault.getAbstractFileByPath(p); if (f) await app.vault.modify(f, note); else await app.vault.create(p, note); }
  const lp = app.plugins.plugins["editor-multiple-lanes"];
  if (lp && !/x-tab/.test(lp.settings.routeExceptions)) { lp.settings.routeExceptions = (lp.settings.routeExceptions ? lp.settings.routeExceptions + "\\n" : "") + "_test/x-tab.md\\n_test/x-perf.md"; await lp.settingsChanged("routing"); }
  const tab = app.workspace.getLeaf("tab"); await tab.openFile(app.vault.getAbstractFileByPath("_test/x-tab.md")); await sleep(800);
  const host = tab.view; const el = host.containerEl.querySelector(".cm-content"); const r = el.getBoundingClientRect();
  app.workspace.trigger("hover-link", { event: new MouseEvent("mouseover", { clientX: r.left + 40, clientY: r.top + 20, ctrlKey: true }), source: "editor", hoverParent: host, targetEl: el, linktext: "_test/x-pop", sourcePath: "" });
  for (let i = 0; i < 40 && !host.hoverPopover; i++) await sleep(100);
  const hp = host.hoverPopover; await sleep(400); hp.embed.showEditor(); hp.isFocused = true; await sleep(600);
  const cp = "_test/x.canvas"; const data = JSON.stringify({ nodes: [{ id: "t", type: "text", text: note, x: 0, y: 0, width: 400, height: 400 }], edges: [] });
  let cf = app.vault.getAbstractFileByPath(cp); if (cf) await app.vault.modify(cf, data); else cf = await app.vault.create(cp, data);
  const cl = app.workspace.getLeaf("tab"); await cl.openFile(cf); await sleep(1000);
  const node = cl.view.canvas.nodes.get("t"); cl.view.canvas.selectOnly(node); node.startEditing(); await sleep(800);
  window.__x = { tab, hp, cl };`;
const CLOSE = `const x = window.__x; x.hp?.hide?.(); x.tab?.detach(); x.cl?.detach(); return 1;`;

try {
  // ---- settings reach every editor; unloading leaves nothing behind ----
  const s = await ev(`${DOCS} ${OPEN}
    const p = app.plugins.plugins[ID];
    const before = { handles: q(".eo-drag-handle"), guides: q(".eo-guides"), labels: q(".eo-level-label") };
    p.settings.dragHandles = false; p.settings.headingGuides = false; p.settings.levelLabels = false; await p.saveSettings(); await sleep(300);
    const off = { handles: q(".eo-drag-handle"), guides: q(".eo-guides"), labels: q(".eo-level-label") };
    p.settings.dragHandles = true; p.settings.headingGuides = true; p.settings.levelLabels = true; await p.saveSettings(); await sleep(300);
    const on = { handles: q(".eo-drag-handle"), guides: q(".eo-guides"), labels: q(".eo-level-label") };
    await app.plugins.disablePlugin(ID); await sleep(800);
    const left = docs().flatMap(d => [...d.querySelectorAll("[class*=eo-], [data-eo-level]")].map(e => e.className));
    const status = !!document.querySelector(".eo-status");
    await app.plugins.enablePlugin(ID); await sleep(800);
    ${CLOSE.replace("return 1;", "")}
    return { before, off, on, left, status };`);
  record(
    "X1",
    "Settings changes reach a tab, a Canvas card and a popover editor",
    s.before.handles >= 3 &&
      s.off.handles + s.off.guides + s.off.labels === 0 &&
      s.on.handles === s.before.handles &&
      s.on.guides === s.before.guides,
    { before: s.before, off: s.off, on: s.on },
  );
  record(
    "X2",
    "Disabling the plugin leaves no class, element or status bar item in any editor",
    s.left.length === 0 && !s.status,
    { left: s.left.slice(0, 5), status: s.status },
  );

  // ---- a popout window: keys, the status bar, the hotkey, a drag with Escape and a real drag ----
  await ev(
    `const f = app.vault.getAbstractFileByPath("_test/x-tab.md"); const leaf = app.workspace.openPopoutLeaf(); await leaf.openFile(f); await sleep(2000); window.__pop = leaf; return 1`,
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

  // ---- the settings tab (its own window in Obsidian 1.15): real clicks on the toggles ----
  await ev(
    `const f = app.vault.getAbstractFileByPath("_test/x-tab.md"); await app.vault.modify(f, "# H\\nx\\n## S\\ny"); const leaf = app.workspace.getLeaf("tab"); await leaf.openFile(f); await sleep(800); window.__s = leaf; app.setting.open(); app.setting.openTabById(ID); await sleep(800); return 1`,
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
  await click("Heading guides");
  const gOff = await ev(
    `return [window.__s.view.editor.cm.dom.querySelectorAll(".eo-guide-line").length, JSON.parse(await app.vault.adapter.read(app.vault.configDir + "/plugins/" + ID + "/data.json")).headingGuides]`,
  );
  await click("Heading guides");
  const gOn = await ev(`return window.__s.view.editor.cm.dom.querySelectorAll(".eo-guide-line").length`);
  sw?.close();
  await ev(`app.setting.close(); window.__s.detach(); return 1`);
  record(
    "X8",
    "Settings tab: six toggles (no outline mode switch); clicking Heading guides hides and shows the guides and saves",
    names.length === 6 && !names.includes("Outline mode") && gOff[0] === 0 && gOff[1] === false && gOn > 0,
    { names, gOff, gOn },
  );

  // ---- performance on a long note ----
  const perf = await ev(`
    const lines = []; let h = 0;
    while (lines.length < ${LINES}) { h++; lines.push("#".repeat(1 + (h % 4)) + " Heading " + h, "Body text " + h + ". Another sentence.", "");
      for (let i = 0; i < 6; i++) lines.push("\\t".repeat(i % 3) + "- item " + h + "." + i + " with [[link]] text");
      lines.push("", "\`\`\`js", "const x = " + h + ";", "\`\`\`", ""); }
    const p = "_test/x-perf.md"; let f = app.vault.getAbstractFileByPath(p); if (f) await app.vault.modify(f, lines.join("\\n")); else f = await app.vault.create(p, lines.join("\\n"));
    const leaf = app.workspace.getLeaf("tab"); await leaf.openFile(f); await sleep(1500); const cm = leaf.view.editor.cm;
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
    const on = await typing(); const move = await op(["move-down", "move-up"]); const indent = await op(["indent", "outdent"]);
    await app.plugins.disablePlugin(ID); await sleep(500); const off = await typing(); await app.plugins.enablePlugin(ID); await sleep(500);
    leaf.detach(); return { lines: cm.state.doc.lines, typingOn: on, typingOff: off, move, indent };`);
  record(
    "X9",
    `Long note (${perf.lines} lines): typing costs no more than ~2 ms over Obsidian's own; a move or indent under 100 ms (median ms)`,
    perf.typingOn - perf.typingOff < 2 && perf.move < 100 && perf.indent < 100,
    perf,
  );

  // ---- mobile emulation (reloads the app twice) ----
  if (args.includes("--mobile")) {
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
    const mev = body => mc.ev(`(async()=>{const sleep=ms=>new Promise(r=>setTimeout(r,ms)); ${body}})()`);
    await mev(`const f = app.vault.getAbstractFileByPath("_test/x-tab.md"); await app.vault.modify(f, "# H\\n- a\\n- one two\\n\\t- c"); const leaf = app.workspace.getLeaf(false); await leaf.openFile(f); await sleep(1500);
      await leaf.view.setState({ ...leaf.view.getState(), mode: "source", source: false }, { history: false }); window.__m = leaf.view.editor.cm; const v = window.__m; v.focus(); v.dispatch({ selection: { anchor: v.state.doc.line(3).from + 5 } }); return 1`);
    const mob = await mev(
      `return { mobile: app.isMobile, statusShown: !!document.querySelector(".eo-status")?.offsetParent, handle: !!window.__m.dom.querySelector(".eo-drag-handle"), guides: !!window.__m.dom.querySelector(".eo-guide-line") }`,
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
      "Mobile emulation: no status bar item or drag handle; guides; Enter and Tab from a hardware keyboard",
      mob.mobile &&
        !mob.statusShown &&
        !mob.handle &&
        mob.guides &&
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
  c.close();
}

const out = [
  "# Editor Outliner extra checks",
  "",
  `Run ${new Date().toISOString()} by \`e2e/extra.mjs\`${args.includes("--mobile") ? " --mobile" : ""}: ${results.filter(r => r.pass).length} / ${results.length} pass.`,
  "",
  "| Id | Check | Result | Detail |",
  "|---|---|---|---|",
];
for (const r of results)
  out.push(
    `| ${r.id} | ${r.title} | ${r.pass ? "PASS" : "FAIL"} | \`${r.detail.replace(/\|/g, "\\|").slice(0, 400)}\` |`,
  );
fs.writeFileSync(path.join(HERE, "extra-results.md"), out.join("\n") + "\n");
console.log(`${results.filter(r => r.pass).length} / ${results.length} pass. Wrote e2e/extra-results.md`);
