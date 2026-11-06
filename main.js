/*
GENERATED FILE, built by esbuild from src/. Edit the TypeScript sources, not this file.
*/

"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => EditorOutlinerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");
var import_state3 = require("@codemirror/state");
var import_view2 = require("@codemirror/view");

// src/editor.ts
var import_state = require("@codemirror/state");
var import_language = require("@codemirror/language");
var import_obsidian = require("obsidian");

// src/parse.ts
var QUOTE = /^(?: {0,3}>[ \t]?)*/;
var ITEM = /^([-*+]|\d{1,9}[.)])(?:([ \t]+)(?:\[.\](?:[ \t]+|$))?|$)/;
var HR = /^([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
var HEADING = /^(#+)(?:[ \t]+|$)/;
function columns(ws, tabSize, start = 0) {
  let c = start;
  for (const ch of ws) c = ch === "	" ? c + tabSize - c % tabSize : c + 1;
  return c - start;
}
var count = (s, sub) => s.split(sub).length - 1;
function closes(f, c) {
  const ce = c.trimEnd();
  if (f.kind === "fence") return ce.length >= f.len && [...ce].every((x) => x === f.ch);
  if (f.kind === "math") return ce.includes("$$");
  if (f.kind === "comment") return ce.includes("%%");
  return ce.includes("-->");
}
function parseLines(texts, tabSize = 4) {
  const info = [];
  let bodyStart = 0;
  if (texts.length > 1 && texts[0].trimEnd() === "---") {
    for (let j = 1; j < texts.length; j++) {
      if (texts[j].trimEnd() === "---") {
        bodyStart = j + 1;
        break;
      }
    }
  }
  let fence = null;
  let fenceId = 0;
  const open = (kind, ch, len, col, qd) => ({
    id: ++fenceId,
    kind,
    ch,
    len,
    col,
    qd
  });
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    const base = {
      qd: 0,
      qcol: 0,
      pre: 0,
      ws: 0,
      col: 0,
      cc: 0,
      level: 0,
      text: 0,
      empty: false,
      fence: -1,
      fenceCol: 0
    };
    if (i < bodyStart) {
      info.push({ ...base, kind: "front" });
      continue;
    }
    const pm = QUOTE.exec(t)[0];
    const pre = pm.length;
    const qd = count(pm, ">");
    const qcol = qd ? /^ */.exec(t)[0].length : 0;
    const rest = t.slice(pre);
    const wsStr = /^[ \t]*/.exec(rest)[0];
    const ws = wsStr.length;
    const col = columns(wsStr, tabSize);
    const c = rest.slice(ws);
    const L = { ...base, kind: "text", qd, qcol, pre, ws, col, text: pre + ws, empty: c === "" };
    if (fence && qd < fence.qd) fence = null;
    if (fence) {
      L.kind = "code";
      L.fence = fence.id;
      L.fenceCol = fence.col;
      if (closes(fence, c)) fence = null;
      info.push(L);
      continue;
    }
    if (t.trim() === "") {
      L.kind = "blank";
      L.empty = true;
      info.push(L);
      continue;
    }
    const fm = /^(`{3,}|~{3,})(.*)$/.exec(c);
    let opened = null;
    if (fm && !(fm[1][0] === "`" && fm[2].includes("`"))) opened = open("fence", fm[1][0], fm[1].length, col, qd);
    else if (c.startsWith("$$") && count(c, "$$") % 2 === 1) opened = open("math", "$", 2, col, qd);
    else if (c.startsWith("%%") && count(c, "%%") % 2 === 1) opened = open("comment", "%", 2, col, qd);
    else if (c.startsWith("<!--") && !c.slice(4).includes("-->")) opened = open("html", "<", 4, col, qd);
    if (opened) {
      fence = opened;
      L.kind = "code";
      L.fence = opened.id;
      L.fenceCol = col;
      info.push(L);
      continue;
    }
    const hm = qd === 0 && col <= 3 ? HEADING.exec(c) : null;
    if (hm) {
      L.kind = "heading";
      L.level = hm[1].length;
      L.text = pre + ws + hm[0].length;
    } else if (HR.test(c)) {
      L.kind = "hr";
    } else {
      const im = ITEM.exec(c);
      if (im) {
        L.kind = "item";
        L.text = pre + ws + im[0].length;
        const sp = im[2] ? columns(im[2], tabSize, col + im[1].length) : 0;
        L.cc = col + im[1].length + (sp >= 1 && sp <= 4 ? sp : 1);
      }
    }
    if (count(c, "%%") % 2 === 1) fence = open("comment", "%", 2, col, qd);
    else if (count(c, "$$") % 2 === 1) fence = open("math", "$", 2, col, qd);
    else if (c.lastIndexOf("<!--") > c.lastIndexOf("-->")) fence = open("html", "<", 4, col, qd);
    info.push(L);
  }
  return { info, bodyStart };
}
function buildOutline(texts, tabSize = 4) {
  const { info, bodyStart } = parseLines(texts, tabSize);
  const n = texts.length;
  const root = { line: bodyStart - 1, level: 0, end: n, bodyEnd: n, parent: null, children: [] };
  const sections = [];
  const depth = new Array(n).fill(0);
  const stack = [root];
  for (let i = bodyStart; i < n; i++) {
    const L = info[i];
    if (L.kind === "heading") {
      while (stack[stack.length - 1].level >= L.level) stack.pop().end = i;
      const parent = stack[stack.length - 1];
      const s = { line: i, level: L.level, end: n, bodyEnd: n, parent, children: [] };
      parent.children.push(s);
      sections.push(s);
      depth[i] = stack.length - 1;
      stack.push(s);
    } else depth[i] = stack.length - 1;
  }
  for (const s of [root, ...sections]) s.bodyEnd = s.children[0]?.line ?? s.end;
  return {
    texts,
    info,
    bodyStart,
    root,
    sections,
    depth,
    tabSize,
    blockCache: /* @__PURE__ */ new Map(),
    innerCache: /* @__PURE__ */ new Map(),
    itemCache: /* @__PURE__ */ new Map()
  };
}
function isBlank(o, i, loose = false) {
  const L = o.info[i];
  return L.kind === "blank" || loose && L.empty && L.kind !== "code";
}
function trimEnd(o, start, end, loose = false) {
  while (end > start && isBlank(o, end - 1, loose)) end--;
  return end;
}
function sectionAt(o, i) {
  let s = o.root;
  for (; ; ) {
    const c = s.children.find((x) => x.line <= i && i < x.end);
    if (!c) return s;
    s = c;
  }
}
function bodyRange(o, s) {
  return [s === o.root ? o.bodyStart : s.line + 1, s.bodyEnd];
}
function blocksOf(o, s) {
  let bs = o.blockCache.get(s);
  if (!bs) {
    const [a, b] = bodyRange(o, s);
    bs = splitBlocks(o, a, b, 0);
    o.blockCache.set(s, bs);
  }
  return bs;
}
function innerBlocks(o, b) {
  let bs = o.innerCache.get(b);
  if (!bs) {
    bs = b.kind === "quote" ? splitBlocks(o, b.start, b.end, o.info[b.start].qd) : [];
    o.innerCache.set(b, bs);
  }
  return bs;
}
function listsOf(o, s) {
  const out = [];
  for (const b of blocksOf(o, s)) {
    if (b.kind === "list") out.push(b);
    else if (b.kind === "quote") out.push(...innerBlocks(o, b).filter((x) => x.kind === "list"));
  }
  return out;
}
function splitBlocks(o, s, e, q) {
  const { info, texts } = o;
  const loose = q > 0;
  const blank = (i2) => isBlank(o, i2, loose);
  const out = [];
  const isTable = (i2) => info[i2].kind === "text" && info[i2].qd === q && texts[i2].slice(info[i2].pre).trimStart().startsWith("|");
  const inItemQuote = (i2) => q === 0 && info[i2].qd > 0 && info[i2].qcol > 0;
  const indentOf = (i2) => {
    const L = info[i2];
    if (inItemQuote(i2)) return L.qcol;
    return L.kind === "code" ? L.fenceCol : L.col;
  };
  let i = s;
  while (i < e) {
    const L = info[i];
    if (blank(i)) {
      i++;
      continue;
    }
    let j = i + 1;
    let kind;
    if (L.qd > q) {
      kind = "quote";
      while (j < e && info[j].qd > q && info[j].kind !== "blank") j++;
    } else if (L.kind === "code") {
      kind = "code";
      while (j < e && info[j].fence === L.fence) j++;
    } else if (L.kind === "item") {
      kind = "list";
      while (j < e) {
        const M = info[j];
        if (blank(j)) {
          let k = j;
          while (k < e && blank(k)) k++;
          const continues = k < e && (info[k].qd === q || inItemQuote(k)) && info[k].kind !== "heading" && (info[k].kind === "item" || indentOf(k) > 0);
          if (!continues) break;
          j = k;
          continue;
        }
        if (M.kind === "heading" || M.qd !== q && !inItemQuote(j)) break;
        if (M.kind === "item" || indentOf(j) > 0) {
          j++;
          continue;
        }
        if (M.kind === "text" && !blank(j - 1)) {
          j++;
          continue;
        }
        break;
      }
    } else if (isTable(i)) {
      kind = "table";
      while (j < e && isTable(j)) j++;
    } else if (L.kind === "hr") {
      kind = "hr";
    } else {
      kind = "para";
      while (j < e && info[j].kind === "text" && info[j].qd === q && !blank(j) && !isTable(j)) j++;
      if (j < e && info[j].kind === "hr" && /^-+\s*$/.test(texts[j].slice(info[j].pre).trim())) j++;
    }
    out.push({ start: i, end: trimEnd(o, i, j, loose), kind, q });
    i = j;
  }
  return out;
}
function itemsOf(o, b) {
  let r = o.itemCache.get(b);
  if (r) return r;
  const { info } = o;
  const q = b.q;
  const root = {
    line: -1,
    col: -1,
    cc: 0,
    depth: -1,
    end: b.end,
    ownEnd: b.end,
    parent: null,
    children: []
  };
  const stack = [root];
  const all = [];
  const top = () => stack[stack.length - 1];
  let prevBlank = false;
  for (let i = b.start; i < b.end; i++) {
    const L = info[i];
    if (isBlank(o, i, true)) {
      prevBlank = true;
      continue;
    }
    if (L.kind === "item" && L.qd === q) {
      while (stack.length > 1 && top().cc > L.col) stack.pop().end = i;
      const parent = top();
      const it = {
        line: i,
        col: L.col,
        cc: L.cc,
        depth: stack.length - 1,
        end: b.end,
        ownEnd: b.end,
        parent,
        children: []
      };
      parent.children.push(it);
      all.push(it);
      stack.push(it);
    } else if (prevBlank && !(L.kind === "code" && info[i - 1]?.fence === L.fence)) {
      const col = L.qd > q ? L.qcol : L.kind === "code" ? L.fenceCol : L.col;
      while (stack.length > 1 && top().cc > col) stack.pop().end = i;
    }
    prevBlank = false;
  }
  for (const it of all) {
    it.end = trimEnd(o, it.line, it.end, true);
    it.ownEnd = trimEnd(o, it.line, it.children[0]?.line ?? it.end, true);
  }
  r = root;
  o.itemCache.set(b, r);
  return r;
}
function flatItems(root) {
  const out = [];
  const walk = (it) => {
    for (const c of it.children) {
      out.push(c);
      walk(c);
    }
  };
  walk(root);
  return out;
}
function locate(o, i) {
  if (i < o.bodyStart || i >= o.texts.length) return null;
  const section = sectionAt(o, i);
  if (section !== o.root && section.line === i)
    return { section, onHeading: true, block: null, list: null, item: null };
  const block = blocksOf(o, section).find((b) => b.start <= i && i < b.end) ?? null;
  let list = null;
  if (block?.kind === "list") list = block;
  else if (block?.kind === "quote")
    list = innerBlocks(o, block).find((b) => b.kind === "list" && b.start <= i && i < b.end) ?? null;
  let item = null;
  if (list) {
    let cur = itemsOf(o, list);
    for (; ; ) {
      const c = cur.children.find((x) => x.line <= i && i < x.end);
      if (!c) break;
      cur = c;
    }
    if (cur.line >= 0) item = cur;
  }
  return { section, onHeading: false, block, list, item };
}
function siblingRun(a, b) {
  const chainA = [];
  for (let x2 = a; x2; x2 = x2.parent) chainA.push(x2);
  let prevB = null;
  let x = b;
  while (x && !chainA.includes(x)) {
    prevB = x;
    x = x.parent;
  }
  if (!x || x === a || !prevB) return [x === b ? b : a];
  const prevA = chainA[chainA.indexOf(x) - 1];
  const sibs = x.children;
  return sibs.slice(sibs.indexOf(prevA), sibs.indexOf(prevB) + 1);
}

// src/ops.ts
var rowsOf = (o) => o.texts.map((t, i) => ({ t, o: i }));
var blankRow = () => ({ t: "", o: -1 });
var isBlankRow = (r) => !!r && r.t.trim() === "";
var unitCols = (ctx) => ctx.unit === "	" || ctx.unit === "" ? ctx.tabSize : ctx.unit.length;
function makeWs(col, ctx) {
  if (ctx.unit === "	") return "	".repeat(Math.floor(col / ctx.tabSize)) + " ".repeat(col % ctx.tabSize);
  return " ".repeat(col);
}
function listCtx(o, list, ctx) {
  for (let i = list.start; i < list.end; i++) {
    const L = o.info[i];
    if (L.kind !== "item" || L.ws === 0 || L.qd !== list.q) continue;
    const ws = o.texts[i].slice(L.pre, L.pre + L.ws);
    if (ws.includes("	")) return { ...ctx, unit: "	" };
    return { ...ctx, unit: ctx.unit === "	" ? " ".repeat(ctx.tabSize) : ctx.unit };
  }
  return ctx;
}
function dropCols(ws, cols, tabSize) {
  let c = 0;
  let k = 0;
  while (k < ws.length && c < cols) {
    const w = ws[k] === "	" ? tabSize - c % tabSize : 1;
    if (c + w > cols) return " ".repeat(c + w - cols) + ws.slice(k + 1);
    c += w;
    k++;
  }
  return ws.slice(k);
}
function shift(o, rows, s, e, delta, ctx, q = 0) {
  if (delta === 0) return;
  for (let i = s; i < e; i++) {
    const r = rows[i];
    if (r.o < 0) continue;
    const L = o.info[r.o];
    if (L.kind === "blank" || L.empty) continue;
    if (L.qd > q) {
      const lead = r.t.length - r.t.trimStart().length;
      r.t = makeWs(Math.max(0, L.qcol + delta), ctx) + r.t.slice(lead);
      continue;
    }
    const head = r.t.slice(0, L.pre);
    const ws = r.t.slice(L.pre, L.pre + L.ws);
    const tail = r.t.slice(L.pre + L.ws);
    if (L.kind === "code") {
      const add = ws.includes("	") ? makeWs(Math.max(0, delta), { ...ctx, unit: "	" }) : " ".repeat(Math.max(0, delta));
      r.t = head + (delta > 0 ? add + ws : dropCols(ws, -delta, ctx.tabSize)) + tail;
      continue;
    }
    r.t = head + makeWs(Math.max(0, L.col + delta), ctx) + tail;
  }
}
function relevel(o, rows, s, e, delta) {
  let deep = 0;
  for (let i = s; i < e; i++) {
    const r = rows[i];
    const L = r.o >= 0 ? o.info[r.o] : null;
    if (!L || L.kind !== "heading") continue;
    const level = Math.max(1, L.level + delta);
    if (level > 6 && L.level <= 6) deep++;
    r.t = r.t.slice(0, L.ws) + "#".repeat(level) + r.t.slice(L.ws + L.level);
  }
  return deep;
}
var deepNotice = (n) => n ? `${n} heading${n > 1 ? "s are" : " is"} now deeper than H6. Obsidian shows ${n > 1 ? "them" : "it"} as text: links to it, the Outline and folding won't see it.` : void 0;
function relocate(rows, s, e, at) {
  if (at >= e)
    return [[...rows.slice(0, s), ...rows.slice(e, at), ...rows.slice(s, e), ...rows.slice(at)], at - (e - s)];
  return [[...rows.slice(0, at), ...rows.slice(s, e), ...rows.slice(at, s), ...rows.slice(e)], at];
}
function padBlank(rows, s, e) {
  const out = [...rows];
  if (e < out.length && !isBlankRow(out[e - 1]) && !isBlankRow(out[e])) out.splice(e, 0, blankRow());
  if (s > 0 && !isBlankRow(out[s - 1])) out.splice(s, 0, blankRow());
  return out;
}
function swap(o, a0, a1, b0, b1, forceBlank) {
  const rows = rowsOf(o);
  const aE = trimEnd(o, a0, a1);
  const bE = trimEnd(o, b0, b1);
  let gap = rows.slice(aE, b0);
  if (forceBlank && gap.length === 0) gap = [blankRow()];
  return [...rows.slice(0, a0), ...rows.slice(b0, bE), ...gap, ...rows.slice(a0, aE), ...rows.slice(bE)];
}
function hasHeading(o, l0, l1) {
  for (let i = Math.max(l0, o.bodyStart); i <= l1 && i < o.texts.length; i++)
    if (o.info[i].kind === "heading") return true;
  return false;
}
function headingRun(o, l0, l1) {
  if (!hasHeading(o, l0, l1)) return null;
  let a = sectionAt(o, l0);
  if (a === o.root) a = o.sections.find((s) => s.line >= l0);
  return siblingRun(a, sectionAt(o, l1));
}
function itemRun(o, l0, l1) {
  const A = locate(o, l0);
  if (!A) return null;
  let a = A.item;
  const list = A.list;
  if (!list) return null;
  if (!a) {
    a = flatItems(itemsOf(o, list)).find((x) => x.line >= l0 && x.line <= l1) ?? null;
    if (!a) return null;
  }
  const B = l1 === l0 ? A : locate(o, l1);
  if (B?.list !== list) return null;
  let b = B.item;
  if (!b) {
    b = flatItems(itemsOf(o, list)).filter((x) => x.line <= l1).pop() ?? a;
  }
  if (b.line < a.line) b = a;
  return { run: siblingRun(a, b), list };
}
function blockRun(o, l0, l1) {
  const s = sectionAt(o, l0);
  if (l0 < o.bodyStart || s !== o.root && s.line === l0) return null;
  const all = blocksOf(o, s);
  const [, bEnd] = bodyRange(o, s);
  const hi = Math.min(l1, bEnd - 1);
  const i0 = all.findIndex((b) => b.end > l0);
  let i1 = -1;
  all.forEach((b, k) => {
    if (b.start <= hi) i1 = k;
  });
  if (i0 < 0 || i1 < i0 || all[i0].start > hi) return null;
  return { all, i0, i1 };
}
function childCol(prev, ctx, exclude) {
  const kid = prev.children.find((x) => !exclude?.(x));
  return kid?.col ?? Math.max(prev.col + unitCols(ctx), prev.cc);
}
function indent(o, l0, l1, ctx) {
  const hs = headingRun(o, l0, l1);
  if (hs) {
    const rows2 = rowsOf(o);
    const deep = relevel(o, rows2, hs[0].line, hs[hs.length - 1].end, 1);
    return { rows: rows2, notice: deepNotice(deep) };
  }
  const ir = itemRun(o, l0, l1);
  if (!ir) return null;
  const lc = listCtx(o, ir.list, ctx);
  const first = ir.run[0];
  const last = ir.run[ir.run.length - 1];
  const sibs = first.parent.children;
  const k = sibs.indexOf(first);
  if (k === 0) return "noop";
  const rows = rowsOf(o);
  shift(o, rows, first.line, last.end, childCol(sibs[k - 1], lc) - first.col, lc, ir.list.q);
  return finish(o, rows, ctx.tabSize);
}
function outdent(o, l0, l1, ctx) {
  const hs = headingRun(o, l0, l1);
  if (hs) {
    if (hs.some((s) => s.level <= 1)) return { error: "An H1 heading can't be outdented." };
    const first2 = hs[0];
    const end = hs[hs.length - 1].end;
    let rows2 = rowsOf(o);
    relevel(o, rows2, first2.line, end, -1);
    const P2 = first2.parent;
    if (ctx.logical && P2 !== o.root && P2.end > end) {
      const [moved, at] = relocate(rows2, first2.line, end, P2.end);
      rows2 = padBlank(moved, at, at + (end - first2.line));
    }
    return { rows: rows2 };
  }
  const ir = itemRun(o, l0, l1);
  if (!ir) return null;
  const lc = listCtx(o, ir.list, ctx);
  const first = ir.run[0];
  const last = ir.run[ir.run.length - 1];
  const P = first.parent;
  if (P.line < 0) return "noop";
  let rows = rowsOf(o);
  shift(o, rows, first.line, last.end, P.col - first.col, lc, ir.list.q);
  if (ctx.logical && P.end > last.end) [rows] = relocate(rows, first.line, last.end, P.end);
  return finish(o, rows, ctx.tabSize);
}
function move(o, l0, l1, dir, ctx) {
  const hs = headingRun(o, l0, l1);
  if (hs) {
    const first = hs[0];
    const last = hs[hs.length - 1];
    const sibs = first.parent.children;
    const k0 = sibs.indexOf(first);
    const other2 = dir < 0 ? sibs[k0 - 1] : sibs[k0 + hs.length];
    if (!other2) return "noop";
    const rows2 = dir < 0 ? swap(o, other2.line, other2.end, first.line, last.end, true) : swap(o, first.line, last.end, other2.line, other2.end, true);
    return { rows: rows2 };
  }
  const ir = itemRun(o, l0, l1);
  if (ir) {
    const lc = listCtx(o, ir.list, ctx);
    const first = ir.run[0];
    const last = ir.run[ir.run.length - 1];
    const P = first.parent;
    const sibs = P.children;
    const k0 = sibs.indexOf(first);
    const other2 = dir < 0 ? sibs[k0 - 1] : sibs[k0 + ir.run.length];
    if (other2) {
      const rows3 = dir < 0 ? swap(o, other2.line, other2.end, first.line, last.end, false) : swap(o, first.line, last.end, other2.line, other2.end, false);
      return finish(o, rows3, ctx.tabSize);
    }
    if (P.line < 0) return "noop";
    const flat = flatItems(itemsOf(o, ir.list));
    const target = dir < 0 ? flat.filter((x) => x.depth === P.depth && x.line < P.line).pop() : flat.find((x) => x.depth === P.depth && x.line >= P.end);
    if (!target) return "noop";
    let rows2 = rowsOf(o);
    shift(o, rows2, first.line, last.end, childCol(target, lc) - first.col, lc, ir.list.q);
    [rows2] = relocate(rows2, first.line, last.end, dir < 0 ? target.end : target.ownEnd);
    return finish(o, rows2, ctx.tabSize);
  }
  const br = blockRun(o, l0, l1);
  if (!br) return null;
  const { all, i0, i1 } = br;
  const other = dir < 0 ? all[i0 - 1] : all[i1 + 1];
  if (!other) return "noop";
  const a = all[i0];
  const b = all[i1];
  const rows = dir < 0 ? swap(o, other.start, other.end, a.start, b.end, true) : swap(o, a.start, b.end, other.start, other.end, true);
  return finish(o, rows, ctx.tabSize);
}
function finish(o, rows, tabSize = 4) {
  const touched = /* @__PURE__ */ new Set();
  rows.forEach((r, i) => {
    const follows = i === 0 ? r.o === 0 : rows[i - 1].o >= 0 && r.o === rows[i - 1].o + 1;
    if (r.o < 0 || r.t !== o.texts[r.o] || !follows) touched.add(i);
  });
  return { rows: renumber(rows, touched, tabSize) };
}
var ORDERED = /^(\d{1,9})([.)])/;
function renumber(rows, touched, tabSize = 4) {
  const o = buildOutline(
    rows.map((r) => r.t),
    tabSize
  );
  const out = rows.map((r) => ({ ...r }));
  const num = (it) => {
    const L = o.info[it.line];
    const m = ORDERED.exec(o.texts[it.line].slice(L.pre + L.ws));
    return m ? { n: Number(m[1]), len: m[1].length, at: L.pre + L.ws, delim: m[2] } : null;
  };
  const fix = (parent) => {
    let run2 = [];
    const flush = () => {
      const hit = (x) => {
        for (let i = x.line; i < Math.max(x.end, x.line + 1); i++) if (touched.has(i)) return true;
        return false;
      };
      if (run2.length && (!touched || run2.some(hit) || touched.has(parent.line))) {
        let n = run2.length === 1 && touched ? 1 : Math.min(...run2.map((x) => num(x).n));
        for (const it of run2) {
          const m = num(it);
          const r = out[it.line];
          r.t = r.t.slice(0, m.at) + String(n++) + r.t.slice(m.at + m.len);
        }
      }
      run2 = [];
    };
    for (const c of parent.children) {
      const m = num(c);
      if (!m || run2.length && num(run2[0]).delim !== m.delim) flush();
      if (m) run2.push(c);
      fix(c);
    }
    flush();
  };
  for (const s of [o.root, ...o.sections]) {
    for (const b of listsOf(o, s)) {
      if (touched) {
        let hit = false;
        for (let i = b.start; i < b.end && !hit; i++) hit = touched.has(i);
        if (!hit) continue;
      }
      fix(itemsOf(o, b));
    }
  }
  return out;
}

// src/select.ts
var WORD = /[\p{L}\p{M}\p{N}_]/u;
var INLINE = [
  [/!?\[\[[^\]\n]*\]\]/g, 2, 2],
  [/!?\[[^\]\n]*\]\([^)\n]*\)/g, 1, 0],
  [/`[^`\n]+`/g, 1, 1],
  [/\*\*[^*\n]+\*\*/g, 2, 2],
  [/__[^_\n]+__/g, 2, 2],
  [/==[^=\n]+==/g, 2, 2],
  [/~~[^~\n]+~~/g, 2, 2],
  [/(?<![*\w])\*[^*\s][^*\n]*\*(?!\*)/g, 1, 1],
  [/(?<![_\w])_[^_\s][^_\n]*_(?![_\w])/g, 1, 1],
  [/\$[^$\n]+\$/g, 1, 1]
];
function steps(o, line, ch) {
  const text = o.texts[line] ?? "";
  const out = [];
  const on = (a2, b2) => ({ from: { line, ch: a2 }, to: { line, ch: b2 } });
  const lines = (a2, b2) => ({
    from: { line: a2, ch: 0 },
    to: { line: b2 - 1, ch: o.texts[b2 - 1].length }
  });
  const before = (i) => i >= 2 && /[\uDC00-\uDFFF]/.test(text[i - 1]) ? 2 : 1;
  let a = ch;
  let b = ch;
  while (a > 0 && WORD.test(text.slice(a - before(a), a))) a -= before(a);
  while (b < text.length && WORD.test(String.fromCodePoint(text.codePointAt(b))))
    b += text.codePointAt(b) > 65535 ? 2 : 1;
  if (b > a) out.push(on(a, b));
  const inline = [];
  for (const [re, open, close] of INLINE) {
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      const s = m.index;
      const e = s + m[0].length;
      inline.push([s, e]);
      if (s > ch || e < ch) continue;
      const bang = m[0].startsWith("!") ? 1 : 0;
      let innerEnd = e - close;
      if (close === 0) innerEnd = s + m[0].indexOf("](");
      out.push(on(s + bang + open, innerEnd), on(s, e));
    }
  }
  const L = o.info[line];
  const cs = L && L.kind !== "front" && L.kind !== "code" ? L.text : (L?.pre ?? 0) + (L?.ws ?? 0);
  const ce = text.trimEnd().length;
  if (ch >= cs && ce > cs) {
    let masked = text;
    for (const [x, y] of inline) masked = masked.slice(0, x) + "x".repeat(y - x) + masked.slice(y);
    const body = masked.slice(cs, ce);
    const re = /[^.!?]+(?:[.!?]+["')\]]*|$)/g;
    for (let m = re.exec(body); m && m[0]; m = re.exec(body)) {
      const lead = m[0].length - m[0].trimStart().length;
      const s = cs + m.index + lead;
      const e = cs + m.index + m[0].trimEnd().length;
      if (s <= ch && ch <= e && e > s) out.push(on(s, e));
    }
    out.push(on(cs, ce));
  }
  out.push(on(0, text.length));
  const loc = locate(o, line);
  if (!loc) return out;
  const own = (s) => lines(s.line, Math.max(trimEnd(o, s.line, s.bodyEnd), s.line + 1));
  const whole = (s) => lines(s.line, trimEnd(o, s.line, s.end));
  if (!loc.onHeading && loc.block) {
    if (loc.item) {
      for (let it = loc.item; it && it.line >= 0; it = it.parent) {
        if (it === loc.item) out.push(lines(it.line, it.ownEnd));
        out.push(lines(it.line, it.end));
      }
    }
    out.push(lines(loc.block.start, loc.block.end));
  }
  for (let s = loc.section; s; s = s.parent) {
    if (s === o.root) {
      const [b0, be] = bodyRange(o, s);
      let bs = b0;
      while (bs < be && o.info[bs].kind === "blank") bs++;
      const e1 = trimEnd(o, bs, be);
      if (e1 > bs) out.push(lines(bs, e1));
      const e2 = trimEnd(o, bs, o.texts.length);
      if (e2 > bs) out.push(lines(bs, e2));
      break;
    }
    if (s === loc.section) out.push(own(s));
    out.push(whole(s));
  }
  return out;
}

// src/editor.ts
var outlines = /* @__PURE__ */ new WeakMap();
function outlineOf(state) {
  let o = outlines.get(state.doc);
  if (!o) {
    o = buildOutline(state.doc.toJSON(), state.tabSize);
    outlines.set(state.doc, o);
  }
  return o;
}
function ctxOf(state, logical) {
  return { tabSize: state.tabSize, unit: state.facet(import_language.indentUnit), logical };
}
function lineSpan(state) {
  const r = state.selection.main;
  const a = state.doc.lineAt(r.from).number - 1;
  const bl = state.doc.lineAt(r.to);
  let b = bl.number - 1;
  if (r.to > r.from && r.to === bl.from && b > a) b--;
  return [a, b];
}
function applyRows(view, o, rows, userEvent = "move.outliner") {
  const state = view.state;
  const oldS = state.doc.toString();
  const texts = rows.map((r2) => r2.t);
  const newS = texts.join("\n");
  if (oldS === newS) return;
  const max = Math.min(oldS.length, newS.length);
  let p = 0;
  while (p < max && oldS.charCodeAt(p) === newS.charCodeAt(p)) p++;
  let q = 0;
  while (q < max - p && oldS.charCodeAt(oldS.length - 1 - q) === newS.charCodeAt(newS.length - 1 - q)) q++;
  const changedTo = oldS.length - q;
  const newIdx = /* @__PURE__ */ new Map();
  rows.forEach((r2, i) => {
    if (r2.o >= 0) newIdx.set(r2.o, i);
  });
  const starts = [];
  let acc = 0;
  for (const t of texts) {
    starts.push(acc);
    acc += t.length + 1;
  }
  const mapPos = (pos) => {
    const l = state.doc.lineAt(pos);
    const ni = newIdx.get(l.number - 1);
    if (ni === void 0) return null;
    const d = texts[ni].length - o.texts[l.number - 1].length;
    const ch0 = pos - l.from;
    const ch = ch0 === 0 ? 0 : Math.max(0, Math.min(texts[ni].length, ch0 + d));
    return starts[ni] + ch;
  };
  const r = state.selection.main;
  const [, l1] = lineSpan(state);
  const mapEnd = (pos) => {
    const l = state.doc.lineAt(pos);
    if (r.empty || pos !== r.to || pos !== l.from || l.number - 1 !== l1 + 1) return mapPos(pos);
    const ni = newIdx.get(l1);
    if (ni === void 0) return mapPos(pos);
    return ni + 1 < texts.length ? starts[ni + 1] : newS.length;
  };
  const anchor = r.anchor === r.to ? mapEnd(r.anchor) : mapPos(r.anchor);
  const head = r.head === r.to ? mapEnd(r.head) : mapPos(r.head);
  const refold = [];
  (0, import_language.foldedRanges)(state).between(0, oldS.length, (from, to) => {
    if (from <= changedTo && to >= p) {
      const ni = newIdx.get(state.doc.lineAt(from).number - 1);
      if (ni !== void 0) refold.push(ni);
    }
  });
  view.dispatch({
    changes: { from: p, to: changedTo, insert: newS.slice(p, newS.length - q) },
    selection: anchor !== null && head !== null ? import_state.EditorSelection.single(anchor, head) : void 0,
    scrollIntoView: true,
    userEvent
  });
  if (refold.length) {
    const st = view.state;
    const effects = [];
    const newTo = newS.length - q;
    (0, import_language.foldedRanges)(st).between(p, newTo, (from, to) => {
      effects.push(import_language.unfoldEffect.of({ from, to }));
    });
    for (const ni of new Set(refold)) {
      const line = st.doc.line(ni + 1);
      const range = (0, import_language.foldable)(st, line.from, line.to);
      if (range) effects.push(import_language.foldEffect.of(range));
    }
    if (effects.length) view.dispatch({ effects });
  }
}
var suggestOpen = () => false;
function setSuggestCheck(fn) {
  suggestOpen = fn;
}
function usable(view) {
  return !view.state.readOnly && !nested(view);
}
var nested = (view) => !!view.dom.parentElement?.closest(".cm-editor");
function runOp(view, kind, logical, check = false) {
  const state = view.state;
  if (state.selection.ranges.length > 1 || !usable(view)) return false;
  const o = outlineOf(state);
  const [l0, l1] = lineSpan(state);
  const ctx = ctxOf(state, logical);
  let inList = false;
  for (let l = l0; l <= l1 && !inList; l++) inList = !!locate(o, l)?.list;
  const keep = kind === "outdent" && inList;
  if (suggestOpen()) return keep;
  const head = state.doc.lineAt(state.selection.main.head).number - 1;
  const L = o.info[head];
  if (L?.kind === "code" && kind === "indent") return false;
  if (L?.kind === "code" && kind === "outdent") {
    const item = locate(o, head)?.item;
    return item ? L.col - unitCols(ctx) < item.cc : false;
  }
  let res;
  if (kind === "indent") res = indent(o, l0, l1, ctx);
  else if (kind === "outdent") res = outdent(o, l0, l1, ctx);
  else res = move(o, l0, l1, kind === "up" ? -1 : 1, ctx);
  if (res === null) return keep;
  if (check || res === "noop") return true;
  if ("error" in res) {
    new import_obsidian.Notice(res.error);
    return true;
  }
  applyRows(view, o, res.rows, kind === "indent" || kind === "outdent" ? "indent.outliner" : "move.outliner");
  if (res.notice) new import_obsidian.Notice(res.notice, 8e3);
  return true;
}
var expansions = /* @__PURE__ */ new WeakMap();
function expandSelection(view) {
  if (nested(view)) return false;
  const state = view.state;
  const r = state.selection.main;
  const prev = expansions.get(view);
  const going = prev && prev.last.anchor === r.anchor && prev.last.head === r.head;
  const origin = going ? prev.origin : r.head;
  const o = outlineOf(state);
  const line = state.doc.lineAt(origin);
  const off = (p) => state.doc.line(p.line + 1).from + p.ch;
  let best = null;
  for (const s of steps(o, line.number - 1, origin - line.from)) {
    const a = off(s.from);
    const b = off(s.to);
    if (a > r.from || b < r.to || b - a <= r.to - r.from) continue;
    if (!best || b - a < best[1] - best[0]) best = [a, b];
  }
  if (!best) return true;
  const stack = going ? prev.stack : [];
  stack.push({ anchor: r.anchor, head: r.head });
  const last = { anchor: best[0], head: best[1] };
  expansions.set(view, { origin, stack, last });
  view.dispatch({ selection: import_state.EditorSelection.single(best[0], best[1]) });
  return true;
}
function shrinkSelection(view) {
  if (nested(view)) return false;
  const r = view.state.selection.main;
  const prev = expansions.get(view);
  if (!prev || prev.last.anchor !== r.anchor || prev.last.head !== r.head || !prev.stack.length) return true;
  const back = prev.stack.pop();
  prev.last = back;
  if (!prev.stack.length) expansions.delete(view);
  view.dispatch({ selection: import_state.EditorSelection.single(back.anchor, back.head) });
  return true;
}

// src/folding.ts
var import_language2 = require("@codemirror/language");
var import_obsidian2 = require("obsidian");
function nodeAt(view) {
  const o = outlineOf(view.state);
  const line = view.state.doc.lineAt(view.state.selection.main.head).number - 1;
  const loc = locate(o, line);
  if (!loc) return null;
  if (loc.item) return { line: loc.item.line, end: loc.item.end, children: loc.item.children.map((c) => c.line) };
  const s = loc.section;
  if (s === o.root) return null;
  return { line: s.line, end: s.end, children: s.children.map((c) => c.line) };
}
function foldLine(view, line) {
  const l = view.state.doc.line(line + 1);
  const r = (0, import_language2.foldable)(view.state, l.from, l.to);
  return r ? import_language2.foldEffect.of(r) : null;
}
function unfoldLines(view, from, to) {
  const doc = view.state.doc;
  const a = doc.line(from + 1).from;
  const b = doc.line(Math.min(to, doc.lines - 1) + 1).to;
  const out = [];
  (0, import_language2.foldedRanges)(view.state).between(a, b, (f, t) => {
    if (f >= a && f <= b) out.push(import_language2.unfoldEffect.of({ from: f, to: t }));
  });
  return out;
}
function run(view, effects, folding = false) {
  const e = effects.filter((x) => !!x);
  if (e.length) view.dispatch({ effects: e });
  else if (folding)
    new import_obsidian2.Notice(
      `Nothing to fold here. Folding needs "Fold heading" and "Fold indent" on in Settings \u2192 Editor; headings deeper than H6 can't fold.`
    );
}
function foldNode(view) {
  const n = nodeAt(view);
  if (n) run(view, [foldLine(view, n.line)], true);
}
function unfoldNode(view) {
  const n = nodeAt(view);
  if (n) run(view, unfoldLines(view, n.line, n.line));
}
function foldChildren(view) {
  const n = nodeAt(view);
  if (!n) return;
  const folds = n.children.map((c) => foldLine(view, c));
  if (!folds.some((f) => f)) return run(view, [], true);
  run(view, [...unfoldLines(view, n.line, n.line), ...folds]);
}
function unfoldSubtree(view) {
  const n = nodeAt(view);
  if (n) run(view, unfoldLines(view, n.line, n.end - 1));
}
function foldToLevel(view, level) {
  const o = outlineOf(view.state);
  const effects = [];
  for (const s of o.sections) effects.push(...unfoldLines(view, s.line, s.line));
  for (const s of o.sections)
    if (s.level >= level && (s.parent === o.root || s.parent.level < level)) effects.push(foldLine(view, s.line));
  run(view, effects);
}
function unfoldAll(view) {
  const doc = view.state.doc;
  run(view, unfoldLines(view, 0, doc.lines - 1));
}

// src/settings.ts
var import_obsidian3 = require("obsidian");
var DEFAULTS = {
  logicalOutdent: false,
  keys: true,
  headingGuides: true,
  dragHandles: true,
  deepHeadings: true
};
var EditorOutlinerTab = class extends import_obsidian3.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  toggle(name, desc, key) {
    new import_obsidian3.Setting(this.containerEl).setName(name).setDesc(desc).addToggle(
      (t) => t.setValue(this.plugin.settings[key]).onChange(async (v) => {
        this.plugin.settings[key] = v;
        await this.plugin.saveSettings();
      })
    );
  }
  display() {
    this.containerEl.empty();
    this.toggle(
      "Logical outdenting",
      "Off: an outdented item or heading stays where it is, and the siblings after it become its children. On: it moves to just after its parent, and those siblings stay with the parent.",
      "logicalOutdent"
    );
    this.toggle(
      "Outliner keys",
      "Tab / Shift+Tab indent and outdent headings and list items; Alt+Shift+\u2191/\u2193 or Alt+Fn+\u2191/\u2193 (Option+Fn+\u2191/\u2193 on a Mac) move them with their children; Alt+\u2191/\u2193 expand and shrink the selection. Elsewhere (text, tables, code) these keys work as usual. Turn off to use only your own hotkeys for the commands (Settings \u2192 Hotkeys).",
      "keys"
    );
    this.toggle("Heading guides", "Vertical lines in the left margin showing each heading's section.", "headingGuides");
    this.toggle(
      "Drag handles",
      "A handle left of the heading, list item or block under the mouse; drag it to move the node. Desktop only.",
      "dragHandles"
    );
    this.toggle(
      "Style headings beyond H6",
      "Lines starting with 7 or more # are outline headings for this plugin; show them like small headings.",
      "deepHeadings"
    );
  }
};

// src/view.ts
var import_state2 = require("@codemirror/state");
var import_view = require("@codemirror/view");
var import_obsidian4 = require("obsidian");

// src/drop.ts
function sourceAt(o, line) {
  const loc = locate(o, line);
  if (!loc) return null;
  if (loc.onHeading) return { kind: "heading", s: loc.section };
  if (loc.item && loc.list && loc.block)
    return { kind: "item", it: loc.item, list: loc.list, block: loc.block, section: loc.section };
  if (loc.block) return { kind: "block", b: loc.block, section: loc.section };
  return null;
}
var sourceLine = (src) => src.kind === "heading" ? src.s.line : src.kind === "item" ? src.it.line : src.b.start;
var sourceDepth = (src) => src.kind === "heading" ? src.s.level - 1 : src.kind === "item" ? src.it.depth : 0;
function targets(o, src, ctx) {
  if (src.kind === "heading") return headingTargets(o, src.s);
  if (src.kind === "item") return itemTargets(o, src, ctx);
  return blockTargets(o, src.b, src.section);
}
function headingTargets(o, s) {
  const n = o.texts.length;
  const out = [];
  const lines = [...o.sections.filter((x) => x.line < s.line || x.line >= s.end).map((x) => x.line), s.line, n];
  for (const p of [...new Set(lines)].sort((a, b) => a - b)) {
    if (p === s.end && p !== s.line) continue;
    const nextLine = p === s.line ? s.end : p;
    const lNext = nextLine < n ? o.info[nextLine].level : 1;
    const q = p === s.line ? s.line - 1 : p - 1;
    const prev = q >= o.bodyStart ? sectionAt(o, q) : o.root;
    const lPrev = prev === o.root ? 0 : prev.level;
    const options = [];
    const lo = Math.min(lNext, lPrev + 1);
    const hi = Math.max(lNext, lPrev + 1);
    for (let l = lo; l <= hi; l++) options.push({ value: l, depth: l - 1 });
    out.push({ line: p, options });
  }
  return out;
}
function itemTargets(o, src, ctx) {
  const { it } = src;
  const lc = listCtx(o, src.list, ctx);
  const lists = src.list.q > 0 ? innerBlocks(o, src.block).filter((b) => b.kind === "list") : listsOf(o, src.section).filter((b) => b.q === 0);
  const out = [];
  const inSrc = (x) => x.line >= it.line && x.line < it.end;
  const same = sameSpot(o, it, src.list);
  for (const b of lists) {
    const items = flatItems(itemsOf(o, b)).filter((x) => !inSrc(x));
    const deepest = new Array(b.end - b.start).fill(null);
    for (const x of items) for (let l = x.line; l < Math.max(x.end, x.line + 1); l++) deepest[l - b.start] = x;
    const lines = [...items.map((x) => x.line), b.end];
    if (b === src.list) lines.push(it.line);
    for (const p of [...new Set(lines)].sort((x, y) => x - y)) {
      if (b === src.list && p !== it.line && same(p)) continue;
      let q = b === src.list && same(p) ? it.line - 1 : p - 1;
      if (q >= it.line && q < it.end) q = it.line - 1;
      while (q >= b.start && isBlank(o, q, true)) q--;
      const prev = q >= b.start ? deepest[q - b.start] : null;
      const options = [];
      if (!prev) options.push({ value: items[0]?.col ?? it.col, depth: 0 });
      else {
        const chain = [];
        for (let x = prev; x && x.line >= 0; x = x.parent) chain.unshift(x);
        chain.forEach((x, d) => options.push({ value: x.col, depth: d }));
        options.push({ value: childCol(prev, lc, inSrc), depth: chain.length });
      }
      out.push({ line: p, options });
    }
  }
  return out;
}
function sameSpot(o, it, list) {
  let next = it.end;
  while (next < list.end && isBlank(o, next, true)) next++;
  return (p) => p >= it.line && p <= next;
}
function blockTargets(o, b, section) {
  const all = blocksOf(o, section);
  const lines = [...all.map((x) => x.start), all[all.length - 1].end];
  const k = all.indexOf(b);
  const after = all[k + 1]?.start ?? b.end;
  return lines.filter((p) => p !== after || p === b.start).map((line) => ({ line, options: [{ value: 0, depth: 0 }] }));
}
function drop(o, src, p, opt, ctx) {
  let rows = rowsOf(o);
  if (src.kind === "heading") {
    const { s: s2 } = src;
    const same = p === s2.line || p === s2.end;
    if (same && opt.value === s2.level) return null;
    relevel(o, rows, s2.line, s2.end, opt.value - s2.level);
    if (same) return rows;
    const [moved2, at2] = relocate(rows, s2.line, s2.end, p);
    const e = at2 + (s2.end - s2.line);
    return padBlank(moved2, at2, e);
  }
  if (src.kind === "item") {
    const { it } = src;
    const same = sameSpot(o, it, src.list)(p);
    if (same && opt.value === it.col) return null;
    shift(o, rows, it.line, it.end, opt.value - it.col, listCtx(o, src.list, ctx), src.list.q);
    if (!same) [rows] = relocate(rows, it.line, it.end, p);
    return finish(o, rows, ctx.tabSize).rows;
  }
  const { b } = src;
  if (p >= b.start && p <= b.end) return null;
  const [moved, at] = relocate(rows, b.start, b.end, p);
  rows = closeSeam(moved, p > b.start ? b.start : b.end);
  const shiftBack = p > b.start ? moved.length - rows.length : 0;
  const s = at - shiftBack;
  return finish(o, padBlank(rows, s, s + (b.end - b.start)), ctx.tabSize).rows;
}
function closeSeam(rows, seam) {
  const blank = (i) => (rows[i]?.t.trim() ?? "x") === "";
  let g1 = 0;
  while (blank(seam - 1 - g1)) g1++;
  let g2 = 0;
  while (blank(seam + g2)) g2++;
  if (seam === 0) return rows.slice(g2);
  if (seam + g2 === rows.length) return [...rows.slice(0, seam - g1), ...rows.slice(seam)];
  const cut = Math.min(g1, g2);
  return cut ? [...rows.slice(0, seam), ...rows.slice(seam + cut)] : rows;
}

// src/view.ts
var STRUCTURAL = /^[\s>]*(?:#|```|~~~|---)|\$\$|%%|<!--|-->/;
function plainEdit(u) {
  if (u.startState.doc.lines !== u.state.doc.lines) return false;
  let plain = true;
  u.changes.iterChangedRanges((fa, ta, fb) => {
    if (!plain) return;
    const a = u.startState.doc.lineAt(fa);
    if (u.startState.doc.lineAt(ta).number !== a.number) plain = false;
    else if (STRUCTURAL.test(a.text) || STRUCTURAL.test(u.state.doc.lineAt(fb).text)) plain = false;
  });
  return plain;
}
function lineDecorations(settings) {
  return import_view.ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = this.build(view);
      }
      update(u) {
        if (u.docChanged && !u.viewportChanged && plainEdit(u)) this.decorations = this.decorations.map(u.changes);
        else if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view);
      }
      build(view) {
        const s = settings();
        if (!s.deepHeadings || nested(view)) return import_view.Decoration.none;
        const o = outlineOf(view.state);
        const b = new import_state2.RangeSetBuilder();
        const doc = view.state.doc;
        let last = -1;
        for (const { from, to } of view.visibleRanges) {
          for (let pos = from; pos <= to; ) {
            const line = doc.lineAt(pos);
            const i = line.number - 1;
            pos = line.to + 1;
            if (i <= last) continue;
            last = i;
            const cls = [];
            const attrs = {};
            const L = o.info[i];
            if (s.deepHeadings && L?.kind === "heading" && L.level >= 7) {
              cls.push("eo-deep-heading");
              attrs["data-eo-level"] = String(L.level);
            }
            if (cls.length) b.add(line.from, line.from, import_view.Decoration.line({ class: cls.join(" "), attributes: attrs }));
          }
        }
        return b.finish();
      }
    },
    { decorations: (v) => v.decorations }
  );
}
var GUIDE_STEP = 10;
function headingGuides() {
  return (0, import_view.layer)({
    above: false,
    class: "eo-guides",
    update: (u) => u.docChanged || u.viewportChanged || u.geometryChanged,
    markers(view) {
      if (nested(view)) return [];
      const o = outlineOf(view.state);
      if (!o.sections.length) return [];
      const doc = view.state.doc;
      const { from: vFrom, to: vTo } = view.viewport;
      const first = doc.lineAt(vFrom).number - 1;
      const last = doc.lineAt(vTo).number - 1;
      const sc = view.scrollDOM.getBoundingClientRect();
      const baseLeft = sc.left - view.scrollDOM.scrollLeft;
      const baseTop = sc.top - view.scrollDOM.scrollTop;
      const content = view.contentDOM.getBoundingClientRect();
      const textLeft = content.left - baseLeft;
      let deepest = 0;
      const depthOf = /* @__PURE__ */ new Map();
      for (const s of o.sections) {
        const d = s.parent && s.parent !== o.root ? depthOf.get(s.parent) + 1 : 1;
        depthOf.set(s, d);
        deepest = Math.max(deepest, d);
      }
      const room = Math.max(0, textLeft - 10);
      const step = deepest > 1 ? Math.max(3, Math.min(GUIDE_STEP, room / (deepest - 1))) : GUIDE_STEP;
      const out = [];
      for (const s of o.sections) {
        const endLine = trimEnd(o, s.line, s.end) - 1;
        if (endLine <= s.line || endLine < first || s.line > last) continue;
        const top = view.lineBlockAt(doc.line(Math.max(s.line, first) + 1).from);
        const bottom = view.lineBlockAt(doc.line(Math.min(endLine, last) + 1).from);
        const y0 = (s.line >= first ? top.bottom : top.top) + view.documentTop - baseTop;
        const y1 = bottom.bottom + view.documentTop - baseTop;
        if (y1 - y0 < 1) continue;
        const x = textLeft - 6 - (deepest - depthOf.get(s)) * step;
        out.push(new import_view.RectangleMarker("eo-guide-line", x, y0, null, y1 - y0));
      }
      return out;
    }
  });
}
var HEADING_STEP = 24;
var DRAG_START = 4;
function dragHandles(logical) {
  return import_view.ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.view = view;
        this.hoverLine = -1;
        /** The press on the handle, until it moves far enough to be a drag. */
        this.press = null;
        this.drag = null;
        this.scrollTimer = 0;
        this.lastPointer = { x: 0, y: 0 };
        this.onScroll = () => {
          if (!this.drag && !this.press) this.hide();
        };
        this.onLeave = (e) => {
          const to = e.relatedTarget;
          if (!this.drag && !this.press && to !== this.handle && !this.handle.contains(to)) this.hide();
        };
        this.onHover = (e) => {
          if (this.drag || this.press) return;
          const view = this.view;
          const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
          if (pos === null) return this.hide();
          const o = outlineOf(view.state);
          const src = sourceAt(o, view.state.doc.lineAt(pos).number - 1);
          if (!src) return this.hide();
          const first = sourceLine(src);
          if (first === this.hoverLine) return;
          const line = view.state.doc.line(first + 1);
          const L = o.info[first];
          const at = Math.min(line.to, line.from + (src.kind === "item" ? L.pre + L.ws : 0));
          const c = view.coordsAtPos(at);
          if (!c) return this.hide();
          const box = view.dom.getBoundingClientRect();
          this.hoverLine = first;
          this.handle.style.display = "";
          this.handle.style.top = `${c.top - box.top}px`;
          this.handle.style.height = `${Math.max(16, c.bottom - c.top)}px`;
          this.handle.style.left = `${c.left - box.left}px`;
        };
        this.onDown = (e) => {
          if (e.button !== 0 || this.hoverLine < 0) return;
          e.preventDefault();
          e.stopPropagation();
          this.press = { x: e.clientX, y: e.clientY, pointerId: e.pointerId, line: this.hoverLine };
          this.handle.setPointerCapture(e.pointerId);
          this.handle.addEventListener("pointermove", this.onMove);
          this.handle.addEventListener("pointerup", this.onUp);
          this.handle.addEventListener("pointercancel", this.onCancel);
          this.handle.addEventListener("lostpointercapture", this.onCancel);
          this.win.addEventListener("keydown", this.onKey, true);
        };
        this.onMove = (e) => {
          const p = this.press;
          if (!p) return;
          if (!this.drag) {
            if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_START) return;
            if (!this.begin()) return this.end();
          }
          this.lastPointer = { x: e.clientX, y: e.clientY };
          this.autoScroll();
          this.pick(e.clientX, e.clientY);
        };
        this.onUp = () => {
          const d = this.drag;
          this.end();
          if (!d?.target || !d.opt || this.view.state.doc.toString() !== d.o.texts.join("\n")) return;
          const rows = drop(d.o, d.src, d.target.line, d.opt, ctxOf(this.view.state, logical()));
          if (rows) applyRows(this.view, d.o, rows);
        };
        this.onCancel = () => this.end();
        this.onKey = (e) => {
          if (e.key !== "Escape") return;
          e.preventDefault();
          e.stopPropagation();
          this.end();
        };
        this.doc = view.dom.ownerDocument;
        this.win = this.doc.defaultView ?? window;
        this.handle = this.doc.createElement("div");
        this.handle.className = "eo-drag-handle";
        this.handle.setAttribute("aria-label", "Drag to move");
        (0, import_obsidian4.setIcon)(this.handle, "grip-vertical");
        this.indicator = this.doc.createElement("div");
        this.indicator.className = "eo-drop-indicator";
        this.off = nested(view);
        if (this.off) return;
        view.dom.appendChild(this.handle);
        view.dom.appendChild(this.indicator);
        this.hide();
        this.indicator.style.display = "none";
        view.contentDOM.addEventListener("mousemove", this.onHover);
        view.dom.addEventListener("mouseleave", this.onLeave);
        view.scrollDOM.addEventListener("scroll", this.onScroll, { passive: true });
        this.handle.addEventListener("pointerdown", this.onDown);
      }
      update(u) {
        if (!this.drag && (u.docChanged || u.viewportChanged || u.geometryChanged)) this.hide();
      }
      destroy() {
        if (this.off) return;
        this.end();
        this.view.contentDOM.removeEventListener("mousemove", this.onHover);
        this.view.dom.removeEventListener("mouseleave", this.onLeave);
        this.view.scrollDOM.removeEventListener("scroll", this.onScroll);
        this.handle.remove();
        this.indicator.remove();
      }
      hide() {
        this.handle.style.display = "none";
        this.hoverLine = -1;
      }
      /** Turns the press into a drag: works out the source, its targets and their positions once. */
      begin() {
        const p = this.press;
        const view = this.view;
        const o = outlineOf(view.state);
        const src = sourceAt(o, p.line);
        if (!src) return false;
        const ctx = ctxOf(view.state, logical());
        const ts = targets(o, src, ctx).sort((a, b) => a.line - b.line);
        const doc = view.state.doc;
        const tops = ts.map(
          (t) => t.line < doc.lines ? view.lineBlockAt(doc.line(t.line + 1).from).top : view.lineBlockAt(doc.length).bottom
        );
        const content = view.contentDOM.getBoundingClientRect();
        const pad = parseFloat(this.win.getComputedStyle(view.contentDOM).paddingLeft) || 0;
        const sc = view.scrollDOM;
        this.drag = {
          o,
          src,
          targets: ts,
          tops,
          target: null,
          opt: null,
          startX: p.x,
          step: src.kind === "item" ? view.defaultCharacterWidth * unitCols(ctx) : HEADING_STEP,
          base: content.left + pad,
          right: content.right,
          // Editor Lanes cards scroll their lane, not the editor
          scroller: sc.scrollHeight > sc.clientHeight ? sc : scrollParent(sc)
        };
        view.dom.classList.add("eo-dragging");
        return true;
      }
      autoScroll() {
        const d = this.drag;
        if (!d?.scroller) return;
        const r = d.scroller.getBoundingClientRect();
        const y = this.lastPointer.y;
        const dy = y < r.top + 40 ? -12 : y > r.bottom - 40 ? 12 : 0;
        if (!dy) return;
        d.scroller.scrollBy(0, dy);
        if (!this.scrollTimer)
          this.scrollTimer = this.win.setTimeout(() => {
            this.scrollTimer = 0;
            if (this.drag) {
              this.autoScroll();
              this.pick(this.lastPointer.x, this.lastPointer.y);
            }
          }, 30);
      }
      pick(x, y) {
        const d = this.drag;
        const view = this.view;
        if (!d.targets.length) return;
        const dy = y - view.documentTop;
        let lo = 0;
        let hi = d.tops.length - 1;
        while (lo < hi) {
          const mid = lo + hi >> 1;
          if (d.tops[mid] < dy) lo = mid + 1;
          else hi = mid;
        }
        if (lo > 0 && Math.abs(d.tops[lo - 1] - dy) <= Math.abs(d.tops[lo] - dy)) lo--;
        const best = d.targets[lo];
        const want = sourceDepth(d.src) + Math.round((x - d.startX) / d.step);
        let opt = best.options[0];
        for (const op of best.options) if (Math.abs(op.depth - want) < Math.abs(opt.depth - want)) opt = op;
        d.target = best;
        d.opt = opt;
        const box = view.dom.getBoundingClientRect();
        const left = d.base + (d.src.kind === "block" ? 0 : opt.depth * d.step);
        this.indicator.style.display = "";
        this.indicator.style.top = `${d.tops[lo] + view.documentTop - box.top - 1}px`;
        this.indicator.style.left = `${left - box.left}px`;
        this.indicator.style.width = `${Math.max(40, d.right - left)}px`;
        this.indicator.textContent = d.src.kind === "heading" ? `H${opt.value}` : "";
      }
      end() {
        const p = this.press;
        this.press = null;
        this.drag = null;
        this.handle.removeEventListener("pointermove", this.onMove);
        this.handle.removeEventListener("pointerup", this.onUp);
        this.handle.removeEventListener("pointercancel", this.onCancel);
        this.handle.removeEventListener("lostpointercapture", this.onCancel);
        this.win.removeEventListener("keydown", this.onKey, true);
        if (p) {
          try {
            this.handle.releasePointerCapture(p.pointerId);
          } catch {
          }
        }
        this.view.dom.classList.remove("eo-dragging");
        this.indicator.style.display = "none";
        this.hide();
      }
    }
  );
}
function scrollParent(el) {
  const win = el.ownerDocument.defaultView ?? window;
  for (let p = el.parentElement; p; p = p.parentElement) {
    const oy = win.getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

// src/main.ts
function focusedView() {
  const el = activeDocument.activeElement?.closest(".cm-editor");
  return el ? import_view2.EditorView.findFromDOM(el) : null;
}
var lastFocused = null;
var rememberFocus = import_view2.EditorView.domEventHandlers({
  focus: (_e, view) => {
    lastFocused = view;
  }
});
var EditorOutlinerPlugin = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULTS };
    this.extensions = [];
  }
  async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.addSettingTab(new EditorOutlinerTab(this.app, this));
    setSuggestCheck(() => !!this.app.workspace.editorSuggest?.isShowingSuggestion?.());
    this.buildExtensions();
    this.registerEditorExtension(this.extensions);
    this.addCommands();
  }
  onunload() {
    setSuggestCheck(() => false);
    lastFocused = null;
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.buildExtensions();
    this.app.workspace.updateOptions();
  }
  buildExtensions() {
    const logical = () => this.settings.logicalOutdent;
    const op = (kind) => (v) => runOp(v, kind, logical());
    this.extensions.length = 0;
    if (this.settings.keys) {
      const move2 = import_obsidian5.Platform.isMacOS ? [] : [
        { key: "Alt-Shift-ArrowUp", run: op("up") },
        { key: "Alt-Shift-ArrowDown", run: op("down") }
      ];
      this.extensions.push(
        import_state3.Prec.highest(
          import_view2.keymap.of([
            { key: "Tab", run: op("indent") },
            { key: "Shift-Tab", run: op("outdent") },
            ...move2,
            { key: "Alt-PageUp", run: op("up") },
            { key: "Alt-PageDown", run: op("down") },
            { key: "Alt-ArrowUp", run: expandSelection },
            { key: "Alt-ArrowDown", run: shrinkSelection }
          ])
        )
      );
    }
    this.extensions.push(rememberFocus);
    this.extensions.push(lineDecorations(() => this.settings));
    if (this.settings.headingGuides) this.extensions.push(headingGuides());
    if (this.settings.dragHandles && !import_obsidian5.Platform.isMobile) this.extensions.push(dragHandles(logical));
  }
  /** The editor a command acts on: the focused one, else the last one focused, else Obsidian's active one. */
  targetView() {
    const shown = (v) => v && v.dom.isConnected && v.dom.offsetParent !== null ? v : null;
    return focusedView() ?? shown(lastFocused) ?? shown(this.app.workspace.activeEditor?.editor?.cm ?? null);
  }
  addCommands() {
    const logical = () => this.settings.logicalOutdent;
    const cmd = (id, name, icon, run2, opts = {}) => this.addCommand({
      id,
      name,
      icon,
      repeatable: true,
      checkCallback: (checking) => {
        const view = this.targetView();
        if (!view || nested(view)) return false;
        if (checking) return opts.applies ? opts.applies(view) : true;
        run2(view);
        return true;
      }
    });
    const op = (kind) => ({
      run: (v) => runOp(v, kind, logical()),
      applies: (v) => runOp(v, kind, logical(), true)
    });
    for (const [id, name, icon, kind] of [
      ["indent", "Indent heading or list item", "indent", "indent"],
      ["outdent", "Outdent heading or list item", "outdent", "outdent"],
      ["move-up", "Move up with children", "arrow-up", "up"],
      ["move-down", "Move down with children", "arrow-down", "down"]
    ]) {
      const o = op(kind);
      cmd(id, name, icon, o.run, { applies: o.applies });
    }
    cmd("expand-selection", "Expand selection", "text-select", expandSelection);
    cmd("shrink-selection", "Shrink selection", "text-cursor", shrinkSelection);
    cmd("fold", "Fold heading or list item", "fold-vertical", foldNode);
    cmd("unfold", "Unfold heading or list item", "unfold-vertical", unfoldNode);
    cmd("fold-children", "Fold children", "chevrons-down-up", foldChildren);
    cmd("unfold-subtree", "Unfold heading or list item and everything under it", "chevrons-up-down", unfoldSubtree);
    for (let n = 1; n <= 6; n++)
      cmd(`fold-to-level-${n}`, `Fold headings to level ${n}`, "list-collapse", (v) => foldToLevel(v, n));
    cmd("unfold-all", "Unfold all", "list-tree", unfoldAll);
  }
};
