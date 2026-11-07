// End-to-end tests of Editor Outliner's outline mode in a real Obsidian, driven over the Chrome DevTools
// Protocol. The cases are data (cases.mjs); CASES.md is the catalogue generated from them.
//
// Usage
//   1. Start an Obsidian you can throw away, on a test vault, with a debugging port, hidden if you like, e.g.
//        Xvfb :99 & DISPLAY=:99 obsidian --no-sandbox --user-data-dir=/tmp/obs-profile \
//          --remote-debugging-port=9224 --remote-allow-origins=http://localhost
//      and open the test vault in it (with Editor Outliner and Editor Lanes enabled). Never point it at a
//      vault or an Obsidian whose notes matter: the runner writes _test/e2e*.md and _test/e2e.canvas, changes
//      the outliner's settings and adds an Editor Lanes routing exception.
//   2. CDP_PORT=9224 node custom-plugins/editor-outliner/e2e/run.mjs [options]
//        --filter <regex>     only cases whose id, group or title match
//        --surfaces <list>    lanes,tab,canvas-text,canvas-file (default: all; a case says where it runs)
//        --views <list>       lp,source (default: both; canvas cards run in Live Preview only)
//        --no-deploy          don't copy main.js / manifest.json / styles.css into the vault and reload
//        --catalogue          only (re)write CASES.md from cases.mjs
//        --verbose            print every case
//   It prints PASS / FAIL per case and run (with a diff) and writes e2e/results.md.
//
// Not a vitest file: vitest.config.mts in custom-plugins/ only includes */src/**/*.test.ts.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "./cdp.mjs";
import { cases, groups } from "./cases.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.dirname(HERE);
const PLUGIN_ID = "obsidian-editor-outliner";

const args = process.argv.slice(2);
const opt = name => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const flag = name => args.includes(name);

const SURFACES = ["lanes", "tab", "canvas-text", "canvas-file"];
const VIEWS = ["lp", "source"];

// ---------- markers: `|` cursor (or the case's `cur`), ⟦ anchor … ⟧ head ----------

export function parseMarked(s, cur = "|") {
  let out = "";
  const ranges = [];
  let open = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === cur) ranges.push({ anchor: out.length, head: out.length });
    else if (ch === "⟦" || ch === "⟧") {
      const k = ch === "⟦" ? "anchor" : "head";
      if (!open) open = { [k]: out.length };
      else {
        open[k] = out.length;
        ranges.push(open);
        open = null;
      }
    } else out += ch;
  }
  if (open) throw new Error("unpaired selection marker in " + JSON.stringify(s));
  return { text: out, ranges };
}

export function renderMarked(text, ranges, cur = "|") {
  const ins = [];
  for (const r of ranges) {
    if (r.anchor === r.head) ins.push([r.head, cur, 0]);
    else {
      ins.push([r.anchor, "⟦", r.anchor < r.head ? 0 : 1]);
      ins.push([r.head, "⟧", r.anchor < r.head ? 1 : 0]);
    }
  }
  ins.sort((a, b) => b[0] - a[0] || b[2] - a[2]);
  let t = text;
  for (const [p, m] of ins) t = t.slice(0, p) + m + t.slice(p);
  return t;
}

// ---------- catalogue ----------

const fence = s => {
  let f = "````";
  while (s.includes(f)) f += "`";
  return f + "\n" + s + "\n" + f;
};
const showKeys = keys =>
  keys
    .map(k =>
      typeof k === "string"
        ? k
        : k.type !== undefined
          ? `type ${JSON.stringify(k.type)}`
          : k.paste
            ? `paste (${Object.keys(k.paste).join(" + ")})`
            : k.copy
              ? "copy"
              : k.cut
                ? "cut"
                : k.cmd
                  ? `command ${k.cmd}`
                  : k.ime !== undefined
                    ? `IME composition ${JSON.stringify(k.ime)}`
                    : k.eval
                      ? `(${k.label || "script"})`
                      : k.wait
                        ? `wait ${k.wait} ms`
                        : JSON.stringify(k),
    )
    .join(", ");

function catalogue() {
  const out = [];
  out.push("# Editor Outliner: outline mode end-to-end cases");
  out.push("");
  out.push(
    "Generated from `cases.mjs` by `node e2e/run.mjs --catalogue`; edit the cases there. `run.mjs` runs them in a real " +
      "Obsidian (see its header). Results of the last run: `results.md`.",
  );
  out.push("");
  out.push("Notation:");
  out.push(
    "- `|` is the cursor; `⟦` … `⟧` a selection from its anchor `⟦` to its head `⟧` (brackets would clash with " +
      "task boxes and links). A case with a table writes the cursor as `‸`. Several `|` are several cursors.",
  );
  out.push(
    "- Keys are CodeMirror-style names sent as real key events (`Shift-Tab`, `Alt-Shift-ArrowUp`, `Ctrl-z`); " +
      "paste / copy / cut are ClipboardEvents with a DataTransfer on the editor's content, unless the keys say `Ctrl-v` / `Ctrl-c`.",
  );
  out.push(
    "- Expected `= Obsidian` means: the same text and selection as the same keys with outline mode off " +
      "(the key steps aside). `unchanged` means the setup text and selection stay.",
  );
  out.push(
    "- Unless a case says otherwise: outline mode on, Live Preview and Source mode, in an Editor Lanes card, " +
      "Obsidian set to indent with tabs (tab size 4). Cases marked *everywhere* also run in a normal tab and in " +
      "Canvas text and file cards.",
  );
  out.push(
    "- After every case whose text changed (outline mode on, one key), one `Ctrl-z` must restore the setup text " +
      "(the `~undo` result).",
  );
  out.push(
    "- Source: the SPEC.md line (section 7) or the Logseq rule (editor.cljs / paste.cljs) the expectation comes from.",
  );
  out.push("");
  out.push("| Group | Cases |");
  out.push("|---|---|");
  for (const g of groups) out.push(`| ${g.title} | ${cases.filter(c => c.group === g.id).length} |`);
  out.push(`| **Total** | ${cases.length} |`);
  out.push("");
  for (const g of groups) {
    out.push(`## ${g.title}`);
    out.push("");
    if (g.note) {
      out.push(g.note);
      out.push("");
    }
    for (const c of cases.filter(x => x.group === g.id)) {
      out.push(`### ${c.id}. ${c.title}`);
      out.push("");
      const where = [];
      if (c.mode === "off") where.push("outline mode **off**");
      if (c.surfaces === "all") where.push("*everywhere*");
      else if (c.surfaces) where.push("in " + c.surfaces.join(", "));
      if (c.views) where.push(c.views.map(v => (v === "lp" ? "Live Preview" : "Source mode")).join(" and ") + " only");
      if (c.settings) where.push("settings " + JSON.stringify(c.settings));
      if (c.config) where.push("Obsidian config " + JSON.stringify(c.config));
      if (c.fold) where.push("folded lines (0-based) " + c.fold.join(", "));
      if (where.length) out.push("When: " + where.join("; ") + ".");
      out.push("");
      out.push("Setup:");
      out.push(fence(c.text));
      out.push("");
      out.push("Keys: " + showKeys(c.keys));
      if (c.clip) {
        out.push("");
        out.push("Clipboard:");
        for (const [k, v] of Object.entries(c.clip)) {
          out.push(`- ${k}:`);
          out.push(fence(v));
        }
      }
      out.push("");
      out.push(
        "Expected: " +
          (c.want === "@off"
            ? "= Obsidian"
            : c.want === "@same"
              ? "unchanged"
              : c.want === undefined
                ? "(see checks)"
                : ""),
      );
      if (typeof c.want === "string" && !c.want.startsWith("@")) out.push(fence(c.want));
      if (c.wantRe) out.push("Text matches `" + c.wantRe + "`.");
      if (c.wantFolds) out.push("Folded lines after: " + (c.wantFolds.length ? c.wantFolds.join(", ") : "none") + ".");
      if (c.wantClip !== undefined) {
        out.push("Clipboard text:");
        out.push(fence(c.wantClip));
      }
      if (c.wantStatus) out.push(`Status bar item: ${c.wantStatus}.`);
      if (c.wantHl)
        out.push("Node-selected (highlighted) lines: " + (c.wantHl.length ? c.wantHl.join(", ") : "none") + ".");
      if (c.wantEditing !== undefined) out.push(`The card is ${c.wantEditing ? "still" : "no longer"} being edited.`);
      if (c.checkLabel) out.push(c.checkLabel);
      out.push("");
      if (c.needsDecision) {
        out.push("**Needs decision:** " + c.needsDecision);
        out.push("");
      }
      if (c.note) {
        out.push(c.note);
        out.push("");
      }
      out.push("Source: " + (c.src || "SPEC.md section 7"));
      out.push("");
    }
  }
  fs.writeFileSync(path.join(HERE, "CASES.md"), out.join("\n"));
  console.log(`CASES.md: ${cases.length} cases in ${groups.length} groups`);
}

// ---------- the page side ----------

const PAGE = String.raw`
(() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const S = {
    views: {}, cm: null, surface: null, canvasLeaf: null,
    async open(surface, view) {
      S.surface = surface;
      S.view = view;
      if (!surface.startsWith("canvas")) S.node = null;
      if (surface === "lanes" || surface === "tab") {
        const p = surface === "lanes" ? "_test/e2e.md" : "_test/e2e-tab.md";
        const f = app.vault.getAbstractFileByPath(p) || (await app.vault.create(p, ""));
        const inLane = v => !!v.containerEl.closest(".lane-split");
        let v = S.views[surface];
        if (!v || !v.containerEl.isConnected || v.file?.path !== p || inLane(v) !== (surface === "lanes")) {
          if (surface === "lanes") {
            const lanes = app.workspace.getLeavesOfType("editor-lanes")[0];
            if (lanes) app.workspace.setActiveLeaf(lanes, { focus: true });
            await app.workspace.getLeaf(false).openFile(f);
          } else await app.workspace.getLeaf("tab").openFile(f);
          await sleep(600);
          v = app.workspace.getLeavesOfType("markdown").map(l => l.view).find(x => x.file?.path === p && inLane(x) === (surface === "lanes"));
          if (!v) throw new Error("couldn't open " + p + " as " + surface);
          S.views[surface] = v;
        }
        const src = view === "source";
        const st = v.getState();
        if (st.mode !== "source" || !!st.source !== src) {
          await v.setState({ ...st, mode: "source", source: src }, { history: false });
          await sleep(250);
        }
        app.workspace.setActiveLeaf(v.leaf, { focus: true });
        S.cm = v.editor.cm;
        return { surface, src: !!v.getState().source, lp: S.cm.dom.closest(".markdown-source-view")?.classList.contains("is-live-preview") };
      }
      // canvas: one canvas with a text card and a file card
      const cp = "_test/e2e.canvas", fp = "_test/e2e-card.md";
      if (!app.vault.getAbstractFileByPath(fp)) await app.vault.create(fp, "");
      let leaf = S.canvasLeaf;
      if (!leaf || !leaf.view?.canvas || !leaf.view.containerEl.isConnected) {
        const data = { nodes: [
          { id: "t1", type: "text", text: "- a", x: 0, y: 0, width: 520, height: 520 },
          { id: "f1", type: "file", file: fp, x: 600, y: 0, width: 520, height: 520 } ], edges: [] };
        let f = app.vault.getAbstractFileByPath(cp);
        if (f) await app.vault.modify(f, JSON.stringify(data)); else f = await app.vault.create(cp, JSON.stringify(data));
        leaf = app.workspace.getLeaf("tab");
        await leaf.openFile(f);
        await sleep(1000);
        S.canvasLeaf = leaf;
        leaf.view.canvas.zoomToFit();
        await sleep(300);
      }
      app.workspace.setActiveLeaf(leaf, { focus: true });
      const canvas = leaf.view.canvas;
      const node = canvas.nodes.get(surface === "canvas-text" ? "t1" : "f1");
      S.node = node;
      if (!node.isEditing || !node.child?.editor?.cm?.dom.isConnected) {
        canvas.deselectAll();
        canvas.selectOnly(node);
        node.startEditing();
        await sleep(700);
      }
      const cm = node.child?.editor?.cm;
      if (!cm) throw new Error("no editor in the canvas card");
      // a file card follows the vault's default mode; Live Preview only
      S.cm = cm;
      return { surface, inIframe: cm.dom.ownerDocument !== document };
    },
    async ensure() {
      if (!S.cm || !S.cm.dom.isConnected || S.cm.state.readOnly) {
        // a read-only case's editor (or a lost one): open a fresh view
        if (S.cm?.state.readOnly && S.views[S.surface]) S.views[S.surface].leaf.detach();
        if (S.surface === "lanes" || S.surface === "tab") S.views[S.surface] = null;
        await S.open(S.surface, S.view);
        return;
      }
      if (!S.node || !S.surface.startsWith("canvas")) return;
      if (!S.node.isEditing || !S.node.child?.editor?.cm?.dom.isConnected) {
        S.canvasLeaf.view.canvas.selectOnly(S.node);
        S.node.startEditing();
        await sleep(700);
        S.cm = S.node.child.editor.cm;
      }
    },
    async setup(text, ranges, folds) {
      const cm = S.cm;
      // a case that left an IME composition open (CDP has no commit): end it, or every key steps aside
      if (cm.composing) {
        const W = cm.dom.ownerDocument.defaultView;
        cm.contentDOM.dispatchEvent(new W.CompositionEvent("compositionend", { data: "", bubbles: true }));
        await sleep(30);
      }
      if (app.workspace.editorSuggest?.isShowingSuggestion?.()) app.workspace.editorSuggest.close?.();
      cm.focus();
      cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: text } });
      const ES = cm.state.selection.constructor;
      const sel = (ranges, main = 0) => ES.create(ranges.map(r => ES.range(r.anchor, r.head)), main);
      for (const l of folds || []) {
        const line = cm.state.doc.line(l + 1);
        cm.dispatch({ selection: sel([{ anchor: line.to, head: line.to }]) });
        app.commands.executeCommandById("${PLUGIN_ID}:fold");
      }
      if (ranges.length) cm.dispatch({ selection: sel(ranges, ranges.length - 1), scrollIntoView: true });
      cm.focus();
      await sleep(30);
      return S.state();
    },
    state() {
      const cm = S.cm, st = cm.state;
      const lineOf = el => { try { return st.doc.lineAt(cm.posAtDOM(el)).number - 1 } catch { return -1 } };
      const sb = document.querySelector(".eo-status");
      return {
        text: st.doc.toString(),
        ranges: st.selection.ranges.map(r => ({ anchor: r.anchor, head: r.head })),
        folds: [...new Set([...cm.dom.querySelectorAll(".cm-foldPlaceholder")].map(lineOf))].sort((a, b) => a - b),
        hl: [...new Set([...cm.dom.querySelectorAll(".eo-node-selected")].map(lineOf))].sort((a, b) => a - b),
        status: !sb ? "none" : sb.classList.contains("is-active") ? "active" : sb.classList.contains("is-on") ? "on" : "off",
        focus: cm.hasFocus,
        // Escape leaving a card blurs its editor; the canvas keeps isEditing until another click
        editing: S.node ? !!S.node.isEditing && cm.hasFocus : undefined,
        suggest: !!app.workspace.editorSuggest?.isShowingSuggestion?.(),
        mode: app.plugins.plugins["${PLUGIN_ID}"].settings.outlineMode,
      };
    },
    clipEvent(kind, data) {
      const cm = S.cm, W = cm.dom.ownerDocument.defaultView;
      const dt = new W.DataTransfer();
      for (const [k, v] of Object.entries(data || {})) dt.setData(k, v);
      const e = new W.ClipboardEvent(kind, { clipboardData: dt, bubbles: true, cancelable: true });
      cm.contentDOM.dispatchEvent(e);
      return { plain: dt.getData("text/plain"), html: dt.getData("text/html"), prevented: e.defaultPrevented };
    },
    async mode(on) {
      const p = app.plugins.plugins["${PLUGIN_ID}"];
      if (p.settings.outlineMode !== on) await p.setOutlineMode(on);
    },
    async settings(obj) {
      const p = app.plugins.plugins["${PLUGIN_ID}"];
      const old = {};
      for (const k of Object.keys(obj)) old[k] = p.settings[k];
      Object.assign(p.settings, obj);
      await p.saveSettings();
      await sleep(50);
      return old;
    },
    async config(obj) {
      const old = {};
      for (const [k, v] of Object.entries(obj)) { old[k] = app.vault.getConfig(k); app.vault.setConfig(k, v); }
      await sleep(150);
      return old;
    },
  };
  window.__e2e = S;
  return true;
})()`;

// ---------- running ----------

const sleep = ms => new Promise(r => setTimeout(r, ms));

function parseKey(k) {
  const parts = k.split("-");
  const name = parts.pop() || "-";
  const mods = {};
  for (const p of parts) {
    if (p === "Ctrl" || p === "Mod") mods.ctrl = true;
    else if (p === "Shift") mods.shift = true;
    else if (p === "Alt") mods.alt = true;
    else if (p === "Meta" || p === "Super") mods.meta = true;
    else throw new Error("bad key " + k);
  }
  return [name, mods];
}

async function doKeys(c, keys, ctx) {
  for (const k of keys) {
    if (typeof k === "string") {
      const [name, mods] = parseKey(k);
      await c.key(name, mods);
      await sleep(25);
    } else if (k.type !== undefined) {
      await c.type(k.type);
      await sleep(60);
    } else if (k.paste) {
      await c.ev(`JSON.stringify(window.__e2e.clipEvent("paste", ${JSON.stringify(k.paste)}))`);
      await sleep(40);
    } else if (k.copy || k.cut) {
      ctx.clip = JSON.parse(
        await c.ev(`JSON.stringify(window.__e2e.clipEvent(${JSON.stringify(k.copy ? "copy" : "cut")}))`),
      ).plain;
      await sleep(30);
    } else if (k.cmd) {
      await c.ev(`app.commands.executeCommandById(${JSON.stringify(k.cmd)})`);
      await sleep(60);
    } else if (k.ime !== undefined) {
      await c.send("Input.imeSetComposition", {
        text: k.ime,
        selectionStart: k.ime.length,
        selectionEnd: k.ime.length,
      });
      await sleep(40);
    } else if (k.eval) {
      await c.ev(`(async()=>{const S=window.__e2e, cm=S.cm; ${k.eval}})()`);
      await sleep(k.wait || 40);
    } else if (k.click) {
      const [x, y] = await c.ev(`(async()=>{const S=window.__e2e, cm=S.cm; ${k.click}})()`);
      for (const type of ["mousePressed", "mouseReleased"])
        await c.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
      await sleep(300);
    } else if (k.wait) await sleep(k.wait);
    else if (k.writeClip !== undefined) {
      await c.ev(`require("electron").clipboard.writeText(${JSON.stringify(k.writeClip)})`);
    } else if (k.readClip) {
      ctx.clip = await c.ev(`require("electron").clipboard.readText()`);
    } else throw new Error("bad key " + JSON.stringify(k));
  }
  await sleep(60);
  await c.ev(`new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
}

/** One run of a case's keys from its setup; returns the end state. */
async function runOnce(c, cs, on, ctx) {
  await c.ev(`window.__e2e.mode(${on})`);
  await c.ev(`window.__e2e.ensure()`);
  const { text, ranges } = parseMarked(cs.text, cs.cur);
  const before = await c.ev(
    `window.__e2e.setup(${JSON.stringify(text)}, ${JSON.stringify(ranges)}, ${JSON.stringify(cs.fold || [])})`,
  );
  if (cs.fold) {
    const got = before.folds.join(",");
    if (got !== [...cs.fold].sort((a, b) => a - b).join(","))
      throw new Error(`harness: setup folds ${got} instead of ${cs.fold}`);
  }
  if (cs.setupEval) {
    await c.ev(`(async()=>{const S=window.__e2e, cm=S.cm; ${cs.setupEval}})()`);
    await sleep(50);
  }
  await doKeys(c, cs.keys, ctx);
  const st = await c.ev(`window.__e2e.state()`);
  if (cs.check) st.check = await c.ev(`(async()=>{const S=window.__e2e, cm=S.cm; ${cs.check}})()`);
  return st;
}

function compare(cs, st, ref, ctx) {
  const problems = [];
  const cur = cs.cur;
  const got = renderMarked(st.text, st.ranges, cur);
  if (cs.want !== undefined) {
    let want;
    if (cs.want === "@off") want = renderMarked(ref.text, ref.ranges, cur);
    else if (cs.want === "@same") want = cs.text;
    else want = cs.want;
    const w = parseMarked(want, cur);
    const withSel = w.ranges.length > 0;
    const gotCmp = withSel ? got : st.text;
    const wantCmp = withSel ? want : w.text;
    if (gotCmp !== wantCmp) problems.push({ what: "text", want: wantCmp, got: gotCmp });
  }
  if (cs.wantRe && !new RegExp(cs.wantRe).test(st.text))
    problems.push({ what: "text ~ /" + cs.wantRe + "/", want: cs.wantRe, got });
  if (cs.wantFolds && st.folds.join(",") !== cs.wantFolds.join(","))
    problems.push({ what: "folds", want: cs.wantFolds.join(",") || "none", got: st.folds.join(",") || "none" });
  if (cs.wantHl && st.hl.join(",") !== cs.wantHl.join(","))
    problems.push({ what: "highlighted lines", want: cs.wantHl.join(",") || "none", got: st.hl.join(",") || "none" });
  if (cs.wantStatus && st.status !== cs.wantStatus)
    problems.push({ what: "status", want: cs.wantStatus, got: st.status });
  if (cs.wantClip !== undefined && ctx.clip !== cs.wantClip)
    problems.push({ what: "clipboard", want: cs.wantClip, got: ctx.clip });
  if (cs.wantEditing !== undefined && st.editing !== undefined && st.editing !== cs.wantEditing)
    problems.push({ what: "card editing", want: String(cs.wantEditing), got: String(st.editing) });
  if (cs.wantMode !== undefined && st.mode !== cs.wantMode)
    problems.push({ what: "outline mode", want: String(cs.wantMode), got: String(st.mode) });
  if (cs.check && st.check !== true)
    problems.push({ what: cs.checkLabel || "check", want: "true", got: JSON.stringify(st.check) });
  return problems;
}

function lineDiff(want, got) {
  const a = want.split("\n");
  const b = got.split("\n");
  const out = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) out.push("    " + JSON.stringify(a[i]).slice(1, -1));
    else {
      if (a[i] !== undefined) out.push("  - " + JSON.stringify(a[i]).slice(1, -1));
      if (b[i] !== undefined) out.push("  + " + JSON.stringify(b[i]).slice(1, -1));
    }
  }
  return out.join("\n");
}

async function main() {
  if (flag("--catalogue")) return catalogue();
  const filter = opt("--filter") ? new RegExp(opt("--filter"), "i") : null;
  const surfaces = (opt("--surfaces") || SURFACES.join(",")).split(",");
  const views = (opt("--views") || VIEWS.join(",")).split(",");
  const verbose = flag("--verbose");
  const c = await connect();
  const results = [];
  try {
    if (!flag("--no-deploy")) {
      const base = await c.ev(`app.vault.adapter.basePath`);
      const dir = path.join(base, ".obsidian", "plugins", PLUGIN_ID);
      for (const f of ["main.js", "manifest.json", "styles.css"])
        fs.copyFileSync(path.join(PLUGIN, f), path.join(dir, f));
      await c.ev(
        `(async()=>{await app.plugins.disablePlugin("${PLUGIN_ID}"); await app.plugins.enablePlugin("${PLUGIN_ID}"); return 1})()`,
      );
      await sleep(500);
      console.log("deployed the build to " + dir);
    }
    // a normal tab needs an Editor Lanes routing exception
    await c.ev(
      `(async()=>{const lp=app.plugins.plugins["obsidian-editor-lanes"]; if (lp && !/e2e-tab/.test(lp.settings.routeExceptions)) { lp.settings.routeExceptions = (lp.settings.routeExceptions ? lp.settings.routeExceptions + "\\n" : "") + "_test/e2e-tab.md"; await lp.settingsChanged("routing"); } return 1})()`,
    );
    await c
      .send("Browser.grantPermissions", { permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] })
      .catch(() => {});
    await c.ev(PAGE);
    const sel = cases.filter(cs => !filter || filter.test(cs.id) || filter.test(cs.group) || filter.test(cs.title));
    const runs = [];
    for (const s of surfaces) for (const v of s.startsWith("canvas") ? ["lp"] : views) runs.push([s, v]);
    for (const [surface, view] of runs) {
      const mine = sel.filter(cs => {
        const sf = cs.surfaces === "all" ? SURFACES : cs.surfaces || ["lanes"];
        const vw = cs.views || VIEWS;
        return sf.includes(surface) && (surface.startsWith("canvas") || vw.includes(view));
      });
      if (!mine.length) continue;
      const info = await c.ev(`window.__e2e.open(${JSON.stringify(surface)}, ${JSON.stringify(view)})`);
      console.log(`\n== ${surface} / ${view} (${mine.length} cases) ${JSON.stringify(info)}`);
      for (const cs of mine) {
        const tag = `${cs.id} [${surface}/${view}]`;
        const r = { id: cs.id, group: cs.group, title: cs.title, surface, view, status: "PASS", problems: [] };
        let ur = null;
        let restoreSettings = null;
        let restoreConfig = null;
        try {
          if (cs.settings) restoreSettings = await c.ev(`window.__e2e.settings(${JSON.stringify(cs.settings)})`);
          if (cs.config) restoreConfig = await c.ev(`window.__e2e.config(${JSON.stringify(cs.config)})`);
          if (cs.surfaceSetup) await c.ev(`(async()=>{const S=window.__e2e; ${cs.surfaceSetup}})()`);
          const on = cs.mode !== "off";
          let ref = null;
          if (cs.want === "@off") ref = await runOnce(c, cs, false, {});
          const ctx = {};
          const st = await runOnce(c, cs, on, ctx);
          r.problems = compare(cs, st, ref, ctx);
          r.status = r.problems.length ? (cs.needsDecision ? "DECIDE" : "FAIL") : "PASS";
          // one Ctrl+Z undoes it
          const setupText = parseMarked(cs.text, cs.cur).text;
          const actions = cs.keys.filter(k => !(k.wait || k.copy || k.readClip || k.writeClip)).length;
          const undo = cs.undo ?? (on && actions === 1 && st.text !== setupText && cs.want !== "@off");
          if (undo && r.status === "PASS") {
            await c.key("z", { ctrl: true });
            await sleep(80);
            const u = await c.ev(`window.__e2e.state()`);
            ur = {
              id: cs.id + "~undo",
              group: cs.group,
              title: cs.title + " (one Ctrl+Z)",
              surface,
              view,
              status: "PASS",
              problems: [],
            };
            if (u.text !== setupText) {
              ur.status = "FAIL";
              ur.problems.push({ what: "text after one Ctrl+Z", want: setupText, got: u.text });
            }
          }
        } catch (e) {
          r.status = "ERROR";
          r.problems.push({ what: "error", want: "", got: String(e.message || e).split("\n")[0] });
          // a lost editor: reopen
          await c.ev(`window.__e2e.open(${JSON.stringify(surface)}, ${JSON.stringify(view)})`).catch(() => {});
        } finally {
          if (restoreSettings) await c.ev(`window.__e2e.settings(${JSON.stringify(restoreSettings)})`).catch(() => {});
          if (restoreConfig) await c.ev(`window.__e2e.config(${JSON.stringify(restoreConfig)})`).catch(() => {});
          if (cs.surfaceTeardown)
            await c.ev(`(async()=>{const S=window.__e2e; ${cs.surfaceTeardown}})()`).catch(() => {});
        }
        results.push(r);
        if (r.status !== "PASS" || verbose) report(r, tag);
        if (ur) {
          results.push(ur);
          if (ur.status === "FAIL" || verbose) report(ur, cs.id + "~undo" + ` [${surface}/${view}]`);
        }
      }
    }
    await c.ev(`window.__e2e.mode(true)`);
  } finally {
    c.close();
  }
  writeResults(results);
}

function report(r, tag) {
  console.log(`${r.status} ${tag} ${r.title}`);
  for (const p of r.problems) {
    if (p.what === "text" || p.what.startsWith("text after") || p.what === "clipboard")
      console.log(`  ${p.what}:\n${lineDiff(String(p.want), String(p.got))}`);
    else console.log(`  ${p.what}: want ${p.want}, got ${p.got}`);
  }
}

function writeResults(results) {
  const pass = results.filter(r => r.status === "PASS").length;
  const fail = results.filter(r => r.status === "FAIL").length;
  const err = results.filter(r => r.status === "ERROR").length;
  const decide = results.filter(r => r.status === "DECIDE").length;
  const out = [];
  out.push("# Editor Outliner e2e results");
  out.push("");
  out.push(
    `Run ${new Date().toISOString()}: ${results.length} checks, ${pass} pass, ${fail} fail, ${err} error, ` +
      `${decide} needing a decision (DECIDE: the case waits for the user's choice; see CASES.md).`,
  );
  out.push("");
  const byGroup = new Map();
  for (const r of results) {
    const g = byGroup.get(r.group) || { pass: 0, fail: 0, error: 0, decide: 0 };
    g[r.status.toLowerCase()]++;
    byGroup.set(r.group, g);
  }
  out.push("| Group | Pass | Fail | Error | Decide |");
  out.push("|---|---|---|---|---|");
  for (const g of groups) {
    const x = byGroup.get(g.id);
    if (x) out.push(`| ${g.title} | ${x.pass} | ${x.fail} | ${x.error} | ${x.decide} |`);
  }
  out.push("");
  const bad = results.filter(r => r.status !== "PASS");
  if (bad.length) {
    out.push("## Failures");
    out.push("");
    for (const r of bad) {
      out.push(`### ${r.status} ${r.id} [${r.surface} / ${r.view}]: ${r.title}`);
      out.push("");
      for (const p of r.problems) {
        if (p.what === "text" || p.what.startsWith("text after") || p.what === "clipboard") {
          out.push(`${p.what} (- expected, + actual):`);
          out.push(fence(lineDiff(String(p.want), String(p.got))));
        } else out.push(`- ${p.what}: expected ${p.want}, got ${p.got}`);
      }
      out.push("");
    }
  }
  fs.writeFileSync(path.join(HERE, "results.md"), out.join("\n"));
  console.log(
    `\n${results.length} checks: ${pass} pass, ${fail} fail, ${err} error, ${decide} decide. Wrote e2e/results.md`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
