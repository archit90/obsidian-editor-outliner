/*
GENERATED FILE, built by esbuild from src/. Edit the TypeScript sources, not this file.
*/

"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target2, all) => {
  for (var name in all)
    __defProp(target2, name, { get: all[name], enumerable: true });
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

// ../node_modules/monkey-around/dist/index.mjs
function around(obj, factories) {
  const removers = Object.keys(factories).map((key) => around1(obj, key, factories[key]));
  return removers.length === 1 ? removers[0] : function() {
    removers.forEach((r) => r());
  };
}
function around1(obj, method, createWrapper) {
  const inherited = obj[method], hadOwn = obj.hasOwnProperty(method), original = hadOwn ? inherited : function() {
    return Object.getPrototypeOf(obj)[method].apply(this, arguments);
  };
  let current = createWrapper(original);
  if (inherited)
    Object.setPrototypeOf(current, inherited);
  Object.setPrototypeOf(wrapper, current);
  obj[method] = wrapper;
  return remove2;
  function wrapper(...args) {
    if (current === original && obj[method] === wrapper)
      remove2();
    return current.apply(this, args);
  }
  function remove2() {
    if (obj[method] === wrapper) {
      if (hadOwn)
        obj[method] = original;
      else
        delete obj[method];
    }
    if (current === original)
      return;
    current = original;
    Object.setPrototypeOf(wrapper, inherited || Function);
  }
}

// src/main.ts
var import_state5 = require("@codemirror/state");
var import_view5 = require("@codemirror/view");

// src/editor.ts
var import_state = require("@codemirror/state");
var import_view = require("@codemirror/view");
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
function prefixLen(t, q) {
  let p = 0;
  for (let k = 0; k < q; k++) {
    const m = /^ {0,3}>[ \t]?/.exec(t.slice(p));
    if (!m) break;
    p += m[0].length;
  }
  return p;
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

// src/numbering.ts
var MARK = /^([>\s]*)(([*+-] |(\d+)([.)] ))(?:\[(.)\] )?)?/;
var BREAK = /^\s*(?:> |#{1,6} |([-_*])(\s*\1){2,}\s*$|~~~|```)/;
var quoteDepth = (prefix) => (prefix.match(/>/g) || []).length;
function level(prefix) {
  let n = 0;
  let s = prefix;
  const units = () => {
    for (; ; ) {
      if (s.startsWith("	")) s = s.substring(1);
      else if (s.startsWith("    ")) s = s.substring(4);
      else break;
      n++;
    }
  };
  const q = s.lastIndexOf(">");
  if (q !== -1) {
    s = s.substring(q + 1);
    units();
    if (s.startsWith(" ")) s = s.substring(1);
  }
  units();
  return n;
}
var mark = (t) => MARK.exec(t);
function prevNumber(lines, t, lvl, depth) {
  let seenText = false;
  for (let s = t - 1; s >= 1; s--) {
    const text = lines[s - 1];
    const c = mark(text);
    const d = quoteDepth(c[1]);
    if (!text || text === c[1]) {
      if (depth > d || seenText) break;
      continue;
    }
    if (!c[0]) {
      if (depth || BREAK.test(text)) break;
      seenText = true;
      continue;
    }
    if (!c[2]) {
      seenText = true;
      continue;
    }
    const h = level(c[1]);
    if (h === lvl && d === depth) return c[4] ? parseInt(c[4], 10) : null;
    if (h < lvl || d < depth) break;
  }
  return null;
}
function listStart(lines, t, lvl, depth) {
  let n = 1;
  let seenText = false;
  for (let s = t; s >= 1; s--) {
    const text = lines[s - 1];
    if (!text) {
      if (depth || seenText) break;
      continue;
    }
    const c = mark(text);
    if (!c[0]) {
      if (depth || BREAK.test(text)) break;
      seenText = true;
      continue;
    }
    if (!c[2]) {
      seenText = true;
      continue;
    }
    const d = level(c[1]);
    const h = quoteDepth(c[1]);
    if (d === lvl && h === depth && c[4]) n = parseInt(c[4], 10);
    if (d < lvl || h < depth) break;
  }
  return n;
}
function renumberLikeObsidian(oldLines, newLines) {
  const A = oldLines.join("\n");
  const B = newLines.join("\n");
  if (A === B) return { lines: newLines, edits: [] };
  const max = Math.min(A.length, B.length);
  let p = 0;
  while (p < max && A.charCodeAt(p) === B.charCodeAt(p)) p++;
  let q = 0;
  while (q < max - p && A.charCodeAt(A.length - 1 - q) === B.charCodeAt(B.length - 1 - q)) q++;
  const fromA = p;
  const toA = A.length - q;
  const fromB = p;
  const toB = B.length - q;
  const back = (pos) => pos < fromB ? pos : pos < toB ? fromA : pos === toB && toB === fromB ? fromA : pos - toB + toA;
  const startsOf = (lines) => {
    const st = [];
    let acc = 0;
    for (const t of lines) {
      st.push(acc);
      acc += t.length + 1;
    }
    return st;
  };
  const startB = startsOf(newLines);
  const startA = startsOf(oldLines);
  const lineAt = (starts, pos) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = lo + hi + 1 >> 1;
      if (starts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  const out = [...newLines];
  const edits = [];
  const setNumber = (ln, at, len, insert) => {
    const t = out[ln - 1];
    out[ln - 1] = t.slice(0, at) + insert + t.slice(at + len);
    edits.push({ line: ln - 1, at, delta: insert.length - len });
  };
  const done = /* @__PURE__ */ new Set();
  const visit = (hn) => {
    if (done.has(hn)) return;
    done.add(hn);
    const ht = newLines[hn - 1];
    const u = mark(ht);
    if (!u[0] || !u[4]) return;
    const prefix = u[1];
    const lvl = level(prefix);
    const depth = quoteDepth(prefix);
    let b = prevNumber(newLines, hn, lvl, depth);
    if (b === null) {
      b = 1;
      const hFrom = startB[hn - 1];
      const hTo = hFrom + ht.length;
      const old = oldLines[lineAt(startA, back(hTo)) - 1];
      const E = mark(old);
      if (fromB <= hTo && toB >= hFrom && E[2] !== u[2]) b = parseInt(u[4], 10);
      else if (level(E[1]) === lvl) b = listStart(oldLines, lineAt(startA, back(hTo)), lvl, quoteDepth(E[1]));
    } else b++;
    if (String(b) !== u[4]) setNumber(hn, prefix.length, u[3].length, b + u[5]);
    let blank = false;
    for (let w = hn + 1; w <= newLines.length && !done.has(w); w++) {
      const kt = newLines[w - 1];
      if (!kt) {
        blank = true;
        continue;
      }
      const x = mark(kt);
      if (!x[0]) {
        if (blank || BREAK.test(kt)) break;
        continue;
      }
      const E = level(x[1]);
      const C = quoteDepth(x[1]);
      if (x[1] && !x[2]) continue;
      if (E === lvl && C === depth) {
        if (!x[4]) break;
        b++;
        if (String(b) === x[4]) {
          done.add(w);
          break;
        }
        setNumber(w, x[1].length, x[3].length, b + x[5]);
        done.add(w);
      }
      if (E < lvl) break;
    }
  };
  const first = lineAt(startB, fromB);
  const last = lineAt(startB, toB) + 1;
  for (let l = first; l <= last && l <= newLines.length; l++) visit(l);
  return { lines: out, edits };
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
    if (L.kind === "blank") continue;
    if (L.kind === "code") {
      const p = prefixLen(r.t, q);
      const ws = /^[ \t]*/.exec(r.t.slice(p))[0];
      if (p + ws.length === r.t.length && ws === "") continue;
      const lead = Math.min(columns(ws, ctx.tabSize), locate(o, r.o)?.item?.cc ?? Infinity);
      r.t = r.t.slice(0, p) + makeWs(Math.max(0, lead + delta), ctx) + dropCols(ws, lead, ctx.tabSize) + r.t.slice(p + ws.length);
      continue;
    }
    if (L.empty) continue;
    if (L.qd > q) {
      const lead = r.t.length - r.t.trimStart().length;
      r.t = makeWs(Math.max(0, L.qcol + delta), ctx) + r.t.slice(lead);
      continue;
    }
    const head = r.t.slice(0, L.pre);
    const tail = r.t.slice(L.pre + L.ws);
    r.t = head + makeWs(Math.max(0, L.col + delta), ctx) + tail;
  }
}
function relevel(o, rows, s, e, delta) {
  let deep = 0;
  for (let i = s; i < e; i++) {
    const r = rows[i];
    const L = r.o >= 0 ? o.info[r.o] : null;
    if (!L || L.kind !== "heading") continue;
    const level2 = Math.max(1, L.level + delta);
    if (level2 > 6 && L.level <= 6) deep++;
    r.t = r.t.slice(0, L.ws) + "#".repeat(level2) + r.t.slice(L.ws + L.level);
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
    const ps = P.parent.children;
    const target2 = ps[ps.indexOf(P) + dir];
    if (!target2) return "noop";
    let rows2 = rowsOf(o);
    shift(o, rows2, first.line, last.end, childCol(target2, lc) - first.col, lc, ir.list.q);
    [rows2] = relocate(rows2, first.line, last.end, dir < 0 ? target2.end : target2.ownEnd);
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
  const ours = renumber(rows, touched, tabSize);
  const { lines } = renumberLikeObsidian(
    o.texts,
    ours.map((r) => r.t)
  );
  return { rows: ours.map((r, i) => lines[i] === r.t ? r : { t: lines[i], o: r.o }) };
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

// src/content.ts
function ownerAt(o, i) {
  const loc = locate(o, i);
  if (!loc?.item || !loc.list) return null;
  const it = loc.item;
  return i >= it.line && i < it.ownEnd ? { item: it, list: loc.list } : null;
}
function quotePrefix(o, w) {
  const t = o.texts[w.item.line];
  return t.slice(0, prefixLen(t, w.list.q));
}
var quoteBlank = (o, w) => quotePrefix(o, w).trimEnd();
function itemIndent(o, w, ctx) {
  return quotePrefix(o, w) + makeWs(w.item.cc, listCtx(o, w.list, ctx));
}
var MARKER = /^([-*+]|\d{1,9}[.)])([ \t]*)(\[.\][ \t]*)?/;
function markerOf(o, line) {
  const L = o.info[line];
  const m = MARKER.exec(o.texts[line].slice(L.pre + L.ws, L.text));
  return { bullet: m[1], gap: m[2] || " ", task: !!m[3] };
}
var itemText = (o, it) => o.texts[it.line].slice(o.info[it.line].text);
var emptyItem = (o, it) => itemText(o, it).trim() === "" && it.ownEnd === it.line + 1;
function textStart(o, w, line) {
  if (line === w.item.line) return o.info[line].text;
  return indentEnd(o.texts[line], w.list.q, w.item.cc, o.tabSize);
}
function indentEnd(t, q, cc, tabSize) {
  let k = prefixLen(t, q);
  let c = 0;
  while (k < t.length && c < cc && (t[k] === " " || t[k] === "	")) {
    c += t[k] === "	" ? tabSize - c % tabSize : 1;
    k++;
  }
  return k;
}
function stripItemIndent(t, q, cc, tabSize) {
  const p = prefixLen(t, q);
  const ws = /^[ \t]*/.exec(t.slice(p))[0];
  return dropCols(ws, cc, tabSize) + t.slice(p + ws.length);
}
var FENCE = /^(`{3,}|~{3,})/;
function codeBlockAt(o, i) {
  const L = o.info[i];
  if (!L || L.kind !== "code") return null;
  let s = i;
  while (s > o.bodyStart && o.info[s - 1].fence === L.fence) s--;
  let e = i + 1;
  while (e < o.texts.length && o.info[e].fence === L.fence) e++;
  const S = o.info[s];
  const open = FENCE.exec(o.texts[s].slice(S.pre + S.ws));
  if (!open) return null;
  const owner2 = ownerAt(o, s);
  if (!owner2 || S.qd !== owner2.list.q) return null;
  const last = o.texts[e - 1];
  const lc = last.slice(prefixLen(last, owner2.list.q)).trim();
  const closed = e - 1 > s && lc.length >= open[1].length && [...lc].every((x) => x === open[1][0]);
  return { start: s, end: e, innerStart: s + 1, innerEnd: closed ? e - 1 : e, owner: owner2 };
}
function partsOf(o, w) {
  const out = [];
  const { item } = w;
  const q = w.list.q;
  let i = item.line;
  while (i < item.ownEnd) {
    if (isBlank(o, i, true)) {
      i++;
      continue;
    }
    const L = o.info[i];
    let j = i + 1;
    if (L.kind === "code") {
      while (j < item.ownEnd && o.info[j].fence === L.fence) j++;
      out.push({ start: i, end: j, code: codeBlockAt(o, i) });
    } else {
      const quoted = L.qd > q;
      while (j < item.ownEnd && !isBlank(o, j, true) && o.info[j].kind !== "code" && o.info[j].qd > q === quoted) j++;
      out.push({ start: i, end: j, code: null });
    }
    i = j;
  }
  return out;
}
function partAt(o, i) {
  const w = ownerAt(o, i);
  return w ? partsOf(o, w).find((p) => p.start <= i && i < p.end) ?? null : null;
}
function insertCodeBlock(o, line, lang, ctx) {
  const w = ownerAt(o, line);
  if (!w) return null;
  const ind = itemIndent(o, w, ctx);
  const at = w.item.ownEnd;
  const rows = rowsOf(o);
  rows.splice(at, 0, { t: ind + "```" + lang, o: -1 }, { t: ind, o: -1 }, { t: ind + "```", o: -1 });
  return { rows, cursor: { line: at + 1, ch: ind.length } };
}
function codeNewline(o, i, ctx) {
  const cb = codeBlockAt(o, i);
  if (!cb) return null;
  const t = o.texts[i];
  const p = prefixLen(t, cb.owner.list.q);
  const ws = /^[ \t]*/.exec(t.slice(p))[0];
  if (columns(ws, o.tabSize) >= cb.owner.item.cc) return t.slice(0, p + ws.length);
  return itemIndent(o, cb.owner, ctx);
}
function codeCopyText(o, from, to) {
  if (from.line === to.line) return null;
  const cb = codeBlockAt(o, from.line);
  if (!cb || to.line < cb.start || to.line >= cb.end) return null;
  const q = cb.owner.list.q;
  const cc = cb.owner.item.cc;
  const out = [];
  for (let l = from.line; l <= to.line; l++) {
    const t = o.texts[l];
    const a = l === from.line ? from.ch : 0;
    const b = l === to.line ? to.ch : t.length;
    out.push(a >= indentEnd(t, q, cc, o.tabSize) ? t.slice(a, b) : stripItemIndent(t.slice(0, b), q, cc, o.tabSize));
  }
  return out.join("\n");
}
function codePasteText(o, from, to, text, ctx) {
  const ls = text.split(/\r\n?|\n/);
  if (ls.length < 2) return null;
  const cb = codeBlockAt(o, from.line);
  if (!cb) return null;
  const inner = (l) => l >= cb.innerStart && l < cb.innerEnd;
  if (!inner(from.line) || !inner(to.line)) return null;
  const ind = itemIndent(o, cb.owner, ctx);
  const q = cb.owner.list.q;
  const pre = ind.slice(0, prefixLen(ind, q)).trimEnd();
  const tt = o.texts[to.line];
  const restIndented = to.ch < indentEnd(tt, q, cb.owner.item.cc, o.tabSize);
  return ls.map((l, k) => {
    if (k === 0) return l;
    if (k === ls.length - 1 && restIndented) return l;
    return l === "" && k < ls.length - 1 ? pre : ind + l;
  }).join("\n");
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
  if (loc.onHeading) {
    const s = loc.section;
    out.push(lines(s.line, Math.max(trimEnd(o, s.line, s.bodyEnd), s.line + 1)));
  } else if (loc.item) {
    const part = partAt(o, line);
    if (part?.code && part.code.innerEnd > part.code.innerStart)
      out.push(lines(part.code.innerStart, part.code.innerEnd));
    if (part) out.push(lines(part.start, part.end));
    out.push(lines(loc.item.line, loc.item.ownEnd));
  } else if (loc.block) {
    const code = loc.block.kind === "code" ? loc.block : null;
    const inner = innerBlocks(o, loc.block).find((b2) => b2.start <= line && line < b2.end) ?? null;
    const c = codeLines(o, code ?? (inner?.kind === "code" ? inner : null));
    if (c) out.push(lines(c[0], c[1]));
  }
  return out;
}
var blockNode = (o, b) => ({
  from: b.start,
  to: b.end,
  kids: () => b.kind === "list" ? itemsOf(o, b).children.map((it) => itemNode(it)) : b.kind === "quote" ? innerBlocks(o, b).map((x) => blockNode(o, x)) : []
});
var itemNode = (it) => ({ from: it.line, to: it.end, kids: () => it.children.map(itemNode) });
var sectionKids = (o, s) => [
  ...blocksOf(o, s).map((b) => blockNode(o, b)),
  ...s.children.map((c) => ({ from: c.line, to: trimEnd(o, c.line, c.end), kids: () => sectionKids(o, c) }))
];
function chainAt(o, line, ch) {
  const levels = [];
  if (line >= o.bodyStart && line < o.texts.length) {
    let sibs = sectionKids(o, o.root);
    for (; ; ) {
      const k = sibs.findIndex((n) => n.from <= line && (line < n.to || isSection(o, n, line)));
      if (k < 0) break;
      levels.unshift({ sibs, k });
      sibs = sibs[k].kids();
    }
  }
  const top = levels[0] ? levels[0].sibs[levels[0].k] : null;
  const len = lengths(o);
  const size = (s) => off(len, s.to) - off(len, s.from);
  const inside = (a, b) => cmp(a.from, b.from) >= 0 && cmp(a.to, b.to) <= 0;
  const nodeSpan2 = top ? lineSpan(o, top.from, top.to) : null;
  const pre = [];
  for (const s of steps(o, line, ch).sort((x, y) => size(x) - size(y))) {
    if (size(s) <= 0) continue;
    if (nodeSpan2 && (!inside(s, nodeSpan2) || size(s) >= size(nodeSpan2))) continue;
    const last = pre[pre.length - 1];
    if (last && (size(s) === size(last) || !inside(last, s))) continue;
    pre.push(s);
  }
  return { pre, levels };
}
function isSection(o, n, line) {
  if (o.info[n.from]?.kind !== "heading") return false;
  const s = o.sections.find((x) => x.line === n.from);
  return !!s && line < s.end;
}
var START = { level: -1, p: -1, runs: [] };
function spanOf(o, c, st) {
  if (st.level < 0) return st.p < 0 ? null : c.pre[st.p];
  const { sibs } = c.levels[st.level];
  const r = st.runs[st.level];
  return lineSpan(o, sibs[r.i].from, sibs[r.j].to);
}
function step(c, st, dir, grow) {
  if (st.level < 0) {
    if (!grow) return st.p >= 0 ? { ...st, p: st.p - 1 } : null;
    if (st.p + 1 < c.pre.length) return { ...st, p: st.p + 1 };
    const l0 = c.levels[0];
    return l0 ? { level: 0, p: st.p, runs: [{ i: l0.k, j: l0.k }] } : null;
  }
  const L = st.level;
  const { sibs, k } = c.levels[L];
  const r = st.runs[L];
  const runs = st.runs.slice(0, L);
  if (grow) {
    if (dir < 0 ? r.i > 0 : r.j < sibs.length - 1)
      return { ...st, runs: [...runs, dir < 0 ? { i: r.i - 1, j: r.j } : { i: r.i, j: r.j + 1 }] };
    const up = c.levels[L + 1];
    if (!up) return null;
    return { ...st, level: L + 1, runs: [...runs, r, { i: up.k, j: up.k }] };
  }
  if (dir < 0 ? r.i < k : r.j > k)
    return { ...st, runs: [...runs, dir < 0 ? { i: r.i + 1, j: r.j } : { i: r.i, j: r.j - 1 }] };
  if (L > 0) return { ...st, level: L - 1, runs };
  return { level: -1, p: c.pre.length - 1, runs: [] };
}
var same = (a, b) => a === b || !!a && !!b && cmp(a.from, b.from) === 0 && cmp(a.to, b.to) === 0;
function move2(o, c, st, dir, grow) {
  const was = spanOf(o, c, st);
  for (let s = step(c, st, dir, grow); s; s = step(c, s, dir, grow)) if (!same(spanOf(o, c, s), was)) return s;
  return null;
}
function stateOf(o, c, from, to) {
  if (cmp(from, to) === 0) return { st: START, exact: true };
  if (to.ch === 0 && to.line > from.line && from.ch === 0) to = { line: to.line - 1, ch: o.texts[to.line - 1].length };
  const sel = { from, to };
  const holds = (s) => cmp(s.from, from) <= 0 && cmp(s.to, to) >= 0;
  for (let p = 0; p < c.pre.length; p++) {
    const s = c.pre[p];
    if (holds(s)) return { st: { level: -1, p, runs: [] }, exact: same(s, sel) };
  }
  const runs = [];
  for (let L = 0; L < c.levels.length; L++) {
    const { sibs, k } = c.levels[L];
    const end = to.line + 1;
    const exact = from.ch === 0 && to.ch === (o.texts[to.line] ?? "").length ? { i: sibs.findIndex((n) => n.from === from.line), j: sibs.findIndex((n) => n.to === end) } : null;
    if (exact && exact.i >= 0 && exact.i <= k && exact.j >= k)
      return { st: { level: L, p: c.pre.length - 1, runs: [...runs, exact] }, exact: true };
    const one = { i: k, j: k };
    if (holds(lineSpan(o, sibs[k].from, sibs[k].to)))
      return { st: { level: L, p: c.pre.length - 1, runs: [...runs, one] }, exact: false };
    runs.push(one);
  }
  return null;
}
var cmp = (a, b) => a.line - b.line || a.ch - b.ch;
var lineSpan = (o, a, b) => ({
  from: { line: a, ch: 0 },
  to: { line: b - 1, ch: o.texts[b - 1].length }
});
var lengths = (o) => {
  const out = [0];
  for (const t of o.texts) out.push(out[out.length - 1] + t.length + 1);
  return out;
};
var off = (len, p) => len[p.line] + p.ch;
function codeLines(o, b) {
  if (!b || b.end - b.start < 2) return null;
  const t = (i) => o.texts[i].slice(prefixLen(o.texts[i], b.q)).trim();
  const open = /^(`{3,}|~{3,})/.exec(t(b.start));
  if (!open) return null;
  const close = t(b.end - 1);
  const closed = close.length >= open[1].length && [...close].every((x) => x === open[1][0]);
  const end = closed ? b.end - 1 : b.end;
  return end > b.start + 1 ? [b.start + 1, end] : null;
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
function lineSpan2(state) {
  const r = state.selection.main;
  const a = state.doc.lineAt(r.from).number - 1;
  const bl = state.doc.lineAt(r.to);
  let b = bl.number - 1;
  if (r.to > r.from && r.to === bl.from && b > a) b--;
  return [a, b];
}
function applyRows(view, o, rows, userEvent = "move.outliner", cursor) {
  const num = renumberLikeObsidian(
    o.texts,
    rows.map((r2) => r2.t)
  );
  if (num.edits.length) {
    rows = rows.map((r2, i) => num.lines[i] === r2.t ? r2 : { t: num.lines[i], o: r2.o });
    for (const e of num.edits)
      if (cursor && e.line === cursor.line && cursor.ch > e.at) cursor = { line: cursor.line, ch: cursor.ch + e.delta };
  }
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
  const [, l1] = lineSpan2(state);
  const mapEnd = (pos) => {
    const l = state.doc.lineAt(pos);
    if (r.empty || pos !== r.to || pos !== l.from || l.number - 1 !== l1 + 1) return mapPos(pos);
    const ni = newIdx.get(l1);
    if (ni === void 0) return mapPos(pos);
    return ni + 1 < texts.length ? starts[ni + 1] : newS.length;
  };
  let anchor = r.anchor === r.to ? mapEnd(r.anchor) : mapPos(r.anchor);
  let head = r.head === r.to ? mapEnd(r.head) : mapPos(r.head);
  if (cursor) anchor = head = starts[cursor.line] + cursor.ch;
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
  if (state.selection.ranges.length > 1 || !usable(view) || view.composing) return false;
  const o = outlineOf(state);
  const [l0, l1] = lineSpan2(state);
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
var noSteps = (view) => nested(view) || view.state.selection.ranges.length > 1 || view.composing;
function selectStep(view, dir, grow) {
  if (noSteps(view)) return !grow;
  const state = view.state;
  const r = state.selection.main;
  const o = outlineOf(state);
  const prev = expansions.get(view);
  let chain;
  let st;
  let start = r.anchor;
  if (prev && prev.doc === state.doc && prev.anchor === r.anchor && prev.head === r.head) {
    chain = prev.chain;
    st = prev.st;
    start = prev.start;
  } else {
    const h = posOf(state, r.anchor);
    chain = chainAt(o, h.line, h.ch);
    const at = stateOf(o, chain, posOf(state, r.from), posOf(state, r.to));
    if (!at || !at.exact && !grow) return true;
    st = at.st;
    if (!at.exact) return go(view, { chain, st, start }, dir);
  }
  const next = move2(o, chain, st, dir, grow);
  return next ? go(view, { chain, st: next, start }, dir) : true;
}
function go(view, x, dir) {
  const state = view.state;
  const span = spanOf(outlineOf(state), x.chain, x.st);
  let anchor = x.start;
  let head = x.start;
  if (span) {
    const a = offsetOf(state, span.from);
    const b = offsetOf(state, span.to);
    [anchor, head] = dir < 0 ? [b, a] : [a, b];
  }
  expansions.set(view, { ...x, anchor, head, doc: state.doc });
  view.dispatch({ selection: import_state.EditorSelection.single(anchor, head), scrollIntoView: true });
  return true;
}
var expandUp = (view) => selectStep(view, -1, true);
var expandDown = (view) => selectStep(view, 1, true);
var shrinkUp = (view) => selectStep(view, -1, false);
var shrinkDown = (view) => selectStep(view, 1, false);
function soleLine(view) {
  const st = view.state;
  if (st.selection.ranges.length > 1 || !usable(view)) return null;
  return st.doc.lineAt(st.selection.main.head).number - 1;
}
function insertBlock(view, lang, check = false) {
  const line = soleLine(view);
  if (line === null) return false;
  const o = outlineOf(view.state);
  const res = insertCodeBlock(o, line, lang, ctxOf(view.state, false));
  if (!res || check) return !!res;
  applyRows(view, o, res.rows, "insert.outliner", res.cursor);
  view.focus();
  return true;
}
var posOf = (state, pos) => {
  const l = state.doc.lineAt(pos);
  return { line: l.number - 1, ch: pos - l.from };
};
var offsetOf = (state, p) => state.doc.line(p.line + 1).from + p.ch;
function codeEnter(view) {
  if (soleLine(view) === null || view.composing || suggestOpen()) return false;
  const st = view.state;
  const r = st.selection.main;
  const a = posOf(st, r.from);
  const b = posOf(st, r.to);
  const o = outlineOf(st);
  const lead = codeNewline(o, a.line, ctxOf(st, false));
  if (lead === null || codeNewline(o, b.line, ctxOf(st, false)) === null) return false;
  const tl = st.doc.line(b.line + 1);
  let to = r.to;
  while (to < tl.to && /[ \t]/.test(tl.text[to - tl.from])) to++;
  const insert = "\n" + lead;
  view.dispatch({
    changes: { from: r.from, to, insert },
    selection: import_state.EditorSelection.cursor(r.from + insert.length),
    scrollIntoView: true,
    userEvent: "input"
  });
  return true;
}
function codeClipboard(outline) {
  return [
    import_view.EditorView.clipboardOutputFilter.of((text, state) => {
      if (state.selection.ranges.length > 1) return text;
      const r = state.selection.main;
      return codeCopyText(outlineOf(state), posOf(state, r.from), posOf(state, r.to)) ?? text;
    }),
    // highest precedence: before Obsidian's paste handling, which leaves an event it finds handled alone
    import_state.Prec.highest(
      import_view.EditorView.domEventHandlers({
        paste: (e, view) => {
          if (e.defaultPrevented || soleLine(view) === null || !e.clipboardData) return false;
          const text = e.clipboardData.getData("text/plain");
          const st = view.state;
          const r = st.selection.main;
          const insert = text ? codePasteText(outlineOf(st), posOf(st, r.from), posOf(st, r.to), text, ctxOf(st, false)) : null;
          if (insert === null) {
            if (!outline?.(view, e.clipboardData)) return false;
            e.preventDefault();
            return true;
          }
          e.preventDefault();
          view.dispatch({
            changes: { from: r.from, to: r.to, insert },
            selection: import_state.EditorSelection.cursor(r.from + insert.length),
            scrollIntoView: true,
            userEvent: "input.paste"
          });
          return true;
        }
      })
    )
  ];
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
  run(view, n ? [foldLine(view, n.line)] : [], true);
}
function unfoldNode(view) {
  const n = nodeAt(view);
  if (n) run(view, unfoldLines(view, n.line, n.line));
}
function foldChildren(view) {
  const n = nodeAt(view);
  if (!n) return run(view, [], true);
  const folds = n.children.map((c) => foldLine(view, c));
  if (!folds.some((f) => f)) return run(view, [], true);
  run(view, [...unfoldLines(view, n.line, n.line), ...folds]);
}
function unfoldSubtree(view) {
  const n = nodeAt(view);
  if (n) run(view, unfoldLines(view, n.line, n.end - 1));
}
function foldToLevel(view, level2) {
  const o = outlineOf(view.state);
  const effects = [];
  for (const s of o.sections) effects.push(...unfoldLines(view, s.line, s.line));
  for (const s of o.sections)
    if (s.level >= level2 && (s.parent === o.root || s.parent.level < level2)) effects.push(foldLine(view, s.line));
  run(view, effects);
}
function unfoldAll(view) {
  const doc = view.state.doc;
  run(view, unfoldLines(view, 0, doc.lines - 1));
}

// src/mode.ts
var import_state2 = require("@codemirror/state");
var import_view2 = require("@codemirror/view");
var import_language3 = require("@codemirror/language");

// src/active.ts
function cursorOwner(o, i) {
  const w = ownerAt(o, i);
  if (w || i < o.bodyStart || i >= o.texts.length || !isBlank(o, i, true)) return w;
  const L = o.info[i];
  if (L.col === 0) return null;
  let k = i - 1;
  while (k >= o.bodyStart && isBlank(o, k, true)) k--;
  if (k < o.bodyStart) return null;
  const above = ownerAt(o, k);
  if (!above || k !== above.item.ownEnd - 1 || L.qd !== above.list.q || L.col < above.item.cc) return null;
  return above;
}
function activeAt(o, l0, l1) {
  const a = cursorOwner(o, l0);
  if (!a) return null;
  const b = l1 === l0 ? a : cursorOwner(o, l1);
  if (!b || b.list !== a.list) return null;
  return { list: a.list, from: a, to: b };
}
function cleanItem(o, w) {
  const { item, list } = w;
  for (let i = item.line + 1; i < item.ownEnd; i++) {
    const L = o.info[i];
    if (isBlank(o, i, true) || L.kind === "code" && L.empty) continue;
    if (L.qd > list.q) {
      if (list.q === 0 && L.qcol < item.cc) return false;
      continue;
    }
    if (L.qd !== list.q || L.col < item.cc) return false;
  }
  return true;
}
function cleanOwner(o, i) {
  const w = cursorOwner(o, i);
  return w && cleanItem(o, w) ? w : null;
}

// src/enter.ts
function target(o, from, to) {
  if (from.line !== to.line) return null;
  const w = cleanOwner(o, from.line);
  if (!w) return null;
  const L = o.info[from.line];
  if (L.kind === "code" || L.qd > w.list.q) return null;
  return w;
}
var isEmptyText = (s) => s.trim() === "";
function enter(o, from, to, ctx, folded) {
  const w = target(o, from, to);
  if (!w) return null;
  const { item, list } = w;
  const q = list.q;
  const lc = listCtx(o, list, ctx);
  const line = from.line;
  const t = o.texts[line];
  const sc = textStart(o, w, line);
  const a = Math.max(from.ch, sc);
  const b = Math.max(to.ch, sc);
  const ownEnd = Math.max(item.ownEnd, line + 1);
  const head = [];
  for (let i = item.line; i < line; i++) head.push({ t: o.texts[i], o: i });
  const cut = t.slice(0, sc) + t.slice(sc, a).trimEnd();
  if (line === item.line || cut.length > sc) head.push({ t: cut, o: line });
  while (head.length > 1 && isEmptyText(head[head.length - 1].t.slice(prefixLen(head[head.length - 1].t, q))))
    head.pop();
  const headEmpty = head.length === 1 && isEmptyText(head[0].t.slice(o.info[item.line].text));
  const tail = [];
  const rest = t.slice(b).replace(/^[ \t]+/, "");
  if (rest) tail.push({ t: rest, plain: true });
  for (let i = line + 1; i < ownEnd; i++) {
    const L = o.info[i];
    const blank = L.kind !== "code" && L.empty;
    if (blank && !tail.length) continue;
    tail.push({
      t: blank ? "" : stripItemIndent(o.texts[i], q, item.cc, o.tabSize),
      plain: L.kind === "text" && L.qd === q
    });
  }
  const rows = rowsOf(o);
  const sibs = item.parent.children;
  const last = sibs.indexOf(item) === sibs.length - 1;
  if (headEmpty && !tail.length) {
    if (item.depth > 0 && last) {
      const res = outdent(o, item.line, item.line, ctx);
      if (!res || res === "noop" || "error" in res) return null;
      const k = res.rows.findIndex((r) => r.o === item.line);
      return { rows: res.rows, cursor: { line: k, ch: res.rows[k].t.length } };
    }
  } else if (headEmpty) {
    const m = markerOf(o, item.line);
    const marker = itemPrefix(o, w, item.col, m.bullet, m.gap, m.task, lc);
    if (b > a) rows[line] = { t: t.slice(0, a) + t.slice(b), o: line };
    rows.splice(item.line, 0, { t: marker, o: -1 });
    const out2 = finish(o, rows, o.tabSize).rows;
    const r = out2[line + 1];
    const ch = line === item.line ? sc + (r.t.length - rows[line + 1].t.length) : from.ch;
    return { rows: out2, cursor: { line: line + 1, ch } };
  }
  const kids = item.children.length > 0 && !folded.has(item.line);
  const tpl = kids ? item.children[0] : item;
  const tm = markerOf(o, tpl.line);
  const own = markerOf(o, item.line);
  const prefix = itemPrefix(o, w, tpl.col, tm.bullet, tm.gap, own.task, lc);
  const cc = parseLines([prefix + "x"], o.tabSize).info[0].cc;
  const contIndent = quotePrefix(o, w) + makeWs(cc, lc);
  const joined = tail[0]?.plain ? tail.shift().t : "";
  const fresh = [{ t: prefix + joined, o: -1 }];
  for (const x of tail) fresh.push({ t: x.t === "" ? quoteBlank(o, w) : contIndent + x.t, o: -1 });
  const end = Math.max(item.end, ownEnd);
  const middle = rows.slice(ownEnd, end);
  const body = kids ? [...fresh, ...middle] : [...middle, ...fresh];
  const next = [...rows.slice(0, item.line), ...head, ...body, ...rows.slice(end)];
  const at = item.line + head.length + (kids ? 0 : middle.length);
  const out = finish(o, next, o.tabSize).rows;
  return { rows: out, cursor: { line: at, ch: out[at].t.length - joined.length } };
}
function itemPrefix(o, w, col, bullet, gap, task, lc) {
  return quotePrefix(o, w) + makeWs(col, lc) + bullet + gap + (task ? "[ ] " : "");
}
function softBreak(o, from, to, ctx) {
  const w = target(o, from, to);
  if (!w) return null;
  const t = o.texts[from.line];
  const sc = textStart(o, w, from.line);
  const a = Math.max(from.ch, sc);
  let b = Math.max(to.ch, sc);
  while (b < t.length && (t[b] === " " || t[b] === "	")) b++;
  return { line: from.line, from: a, to: b, insert: "\n" + itemIndent(o, w, ctx) };
}
function endList(o, from, to) {
  const w = target(o, from, to);
  if (!w || from.line !== w.item.line) return null;
  const { item, list } = w;
  if (item.depth !== 0 || item.children.length || !emptyItem(o, item)) return null;
  const rows = rowsOf(o);
  const blank = quoteBlank(o, w);
  const above = item.line > list.start && !isBlank(o, item.line - 1, true);
  const below = item.line + 1 < list.end && !isBlank(o, item.line + 1, true);
  const lines = [{ t: blank, o: item.line }];
  if (above) lines.unshift({ t: blank, o: -1 });
  if (below) lines.push({ t: blank, o: -1 });
  rows.splice(item.line, 1, ...lines);
  return { rows: finish(o, rows, o.tabSize).rows, cursor: { line: item.line + (above ? 1 : 0), ch: blank.length } };
}

// src/merge.ts
function owner(o, from, to) {
  return from.line === to.line && from.ch === to.ch ? cleanOwner(o, from.line) : null;
}
function prevVisible(o, list, s, folded) {
  const flat = flatItems(itemsOf(o, list));
  const k = flat.indexOf(s);
  if (k <= 0) return null;
  let best = flat[k - 1];
  for (let x = best; x.parent && x.parent.line >= 0; x = x.parent)
    if (folded.has(x.parent.line) && x.parent.end <= s.line) best = x.parent;
  return best;
}
function fullIndent(t, q, cc, tabSize) {
  const p = prefixLen(t, q);
  return columns(t.slice(p, indentEnd(t, q, cc, tabSize)), tabSize) >= cc;
}
function mergeInto(o, list, t, s, ctx) {
  const q = list.q;
  const lc = listCtx(o, list, ctx);
  const rows = rowsOf(o);
  const parent = s.parent === t;
  if (s.children.length) {
    const col = parent ? s.col : childCol(t, lc);
    shift(o, rows, s.ownEnd, s.end, col - s.children[0].col, lc, q);
  }
  const wt = { item: t, list };
  const ind = itemIndent(o, wt, ctx);
  const last = t.ownEnd - 1;
  const LL = o.info[last];
  const glue = last === t.line || LL.kind === "text" && LL.qd === q;
  const sText = itemText(o, s);
  const lastRow = { ...rows[last] };
  const endCh = lastRow.t.length;
  const own = [];
  let extra = false;
  if (glue) lastRow.t += sText;
  else if (sText.trim()) {
    own.push({ t: ind + sText, o: s.line });
    extra = true;
  }
  for (let i = s.line + 1; i < s.ownEnd; i++)
    own.push({
      t: o.info[i].empty ? quoteBlank(o, wt) : ind + stripItemIndent(o.texts[i], q, s.cc, o.tabSize),
      o: i
    });
  const tEnd = parent ? t.ownEnd : t.end;
  const next = [
    ...rows.slice(0, last),
    lastRow,
    ...own,
    ...rows.slice(t.ownEnd, tEnd),
    ...rows.slice(s.ownEnd, s.end),
    ...rows.slice(s.end)
  ];
  const out = finish(o, next, o.tabSize).rows;
  const d = out[last].t.length - next[last].t.length;
  return {
    rows: out,
    join: extra ? { line: last + 1, ch: ind.length } : { line: last, ch: endCh + d },
    end: { line: last, ch: endCh + d }
  };
}
function join(o, a, head, b, rest) {
  const rows = rowsOf(o);
  rows[a] = { t: head + rest, o: a };
  rows.splice(b, 1);
  return { rows, cursor: { line: a, ch: head.length } };
}
function backspace(o, from, to, ctx, folded) {
  const w = owner(o, from, to);
  if (!w) return null;
  const { item: s, list } = w;
  const q = list.q;
  const line = from.line;
  const t = o.texts[line];
  const L = o.info[line];
  if (L.qd > q) return null;
  if (line === s.line) {
    const m = MARKER.exec(t.slice(L.pre + L.ws, L.text));
    const bulletEnd = L.pre + L.ws + m[1].length + m[2].length;
    if (m[3] && from.ch === L.text) {
      const rows = rowsOf(o);
      rows[line] = { t: t.slice(0, bulletEnd) + t.slice(L.text), o: line };
      return { rows, cursor: { line, ch: bulletEnd } };
    }
    if (from.ch > L.text) return null;
    const p = prevVisible(o, list, s, folded);
    if (!p) return emptyItem(o, s) && !s.children.length ? null : "noop";
    if (p !== s.parent && emptyItem(o, p) && !p.children.length) {
      const rows = rowsOf(o);
      rows.splice(p.line, s.line - p.line);
      const out = finish(o, rows, o.tabSize).rows;
      return { rows: out, cursor: { line: p.line, ch: L.text + out[p.line].t.length - t.length } };
    }
    if (folded.has(p.line) && p.ownEnd > p.line + 1) return "noop";
    const res = mergeInto(o, list, p, s, ctx);
    return { rows: res.rows, cursor: res.join };
  }
  const ie = indentEnd(t, q, s.cc, o.tabSize);
  if (from.ch > ie) return null;
  const a = line - 1;
  const A = o.info[a];
  if (L.kind === "code") {
    const cb = codeBlockAt(o, line);
    if (!cb || cb.owner.item !== s) return null;
    if (line <= cb.innerStart || line >= cb.innerEnd) return "noop";
  } else if (L.kind !== "text" && L.kind !== "blank") return null;
  else if (a !== s.line && (A.kind === "code" || A.qd > q || A.kind !== "text" && !isBlank(o, a, true)))
    return "noop";
  const at = o.texts[a];
  const head = a === s.line || fullIndent(at, q, s.cc, o.tabSize) ? at : itemIndent(o, w, ctx) + at.slice(indentEnd(at, q, s.cc, o.tabSize));
  return join(o, a, head, line, t.slice(ie));
}
function deleteForward(o, from, to, ctx, folded) {
  const w = owner(o, from, to);
  if (!w) return null;
  const { item: t, list } = w;
  const q = list.q;
  const line = from.line;
  const tx = o.texts[line];
  const L = o.info[line];
  if (L.qd > q || from.ch !== tx.length) return null;
  if (folded.has(t.line) || line >= t.ownEnd) return "noop";
  if (line < t.ownEnd - 1) {
    const b = line + 1;
    const B = o.info[b];
    if (L.kind === "code") {
      const cb = codeBlockAt(o, line);
      if (!cb || cb.owner.item !== t) return null;
      if (line < cb.innerStart || line >= cb.innerEnd - 1) return "noop";
    } else if (L.kind !== "text" && L.kind !== "item" && L.kind !== "blank") return null;
    else if (B.kind === "code" || B.qd > q || B.kind !== "text" && !isBlank(o, b, true)) return "noop";
    const bt = o.texts[b];
    return join(o, line, tx, b, bt.slice(indentEnd(bt, q, t.cc, o.tabSize)));
  }
  let n = t.children[0];
  if (!n) {
    const flat = flatItems(itemsOf(o, list));
    n = flat[flat.indexOf(t) + 1];
  }
  if (!n) return "noop";
  const res = mergeInto(o, list, t, n, ctx);
  return { rows: res.rows, cursor: res.end };
}

// src/paste.ts
var FENCE_OPEN = /^[ \t]*(`{3,}|~{3,})/;
var BLOCKS = /^[ \t]*(?:(?:[-+*]|#+|\d{1,9}[.)])[ \t]+|`{3,}|~{3,}|\$\$)/m;
function trimBlank(ls) {
  let a = 0;
  let b = ls.length;
  while (a < b && ls[a].trim() === "") a++;
  while (b > a && ls[b - 1].trim() === "") b--;
  return ls.slice(a, b);
}
function codeAlone(ls) {
  if (ls.length < 2 || !FENCE_OPEN.test(ls[0])) return false;
  const info = parseLines(["", ...ls, "x"]).info;
  const id = info[1].fence;
  return id >= 0 && ls.every((_, k) => info[k + 1].fence === id) && info[ls.length + 1].kind !== "code";
}
function pasteKind(lines) {
  const ls = trimBlank(lines);
  if (codeAlone(ls)) return "code";
  if (BLOCKS.test(ls.join("\n")) || ls.some((l) => l.trim() === "")) return "blocks";
  return "plain";
}
var dropLead = (t, n, tabSize) => stripItemIndent(t, 0, n, tabSize);
var leadCols = (t, tabSize) => columns(/^[ \t]*/.exec(t)[0], tabSize);
function toItems(lines, tabSize) {
  const o = buildOutline(["", ...trimBlank(lines)], tabSize);
  const out = [];
  const chunk = (s, e) => {
    const base = leadCols(o.texts[s], tabSize);
    const ls = [];
    for (let i = s; i < e; i++) ls.push(o.info[i].empty ? "" : dropLead(o.texts[i], base, tabSize));
    if (o.info[s].kind === "code") return { marker: null, text: "", own: ls, kids: [] };
    return { marker: null, text: ls[0], own: ls.slice(1), kids: [] };
  };
  const fromItem = (it) => {
    const L = o.info[it.line];
    const t = o.texts[it.line];
    const m = MARKER.exec(t.slice(L.pre + L.ws, L.text));
    const own = [];
    for (let i = it.line + 1; i < it.ownEnd; i++)
      own.push(o.info[i].empty ? "" : stripItemIndent(o.texts[i], 0, it.cc, tabSize));
    return {
      marker: { bullet: m[1], gap: m[2] || " ", box: m[3] ?? "" },
      text: t.slice(L.text),
      own,
      kids: it.children.map(fromItem)
    };
  };
  for (const s of [o.root, ...o.sections]) {
    let head = null;
    if (s !== o.root) {
      head = { marker: null, text: o.texts[s.line].trim(), own: [], kids: [] };
      out.push(head);
    }
    for (const b of blocksOf(o, s)) {
      if (b.kind === "list") {
        for (const it of itemsOf(o, b).children) out.push(fromItem(it));
        continue;
      }
      const p = chunk(b.start, b.end);
      if (head && b.kind === "para" && b.start === s.line + 1) head.own.push(p.text, ...p.own);
      else out.push(p);
    }
  }
  return out;
}
function render(items, col, top, prefix, blank, lc) {
  const out = [];
  for (const p of items) {
    const mk = top ?? p.marker ?? { bullet: "-", gap: " " };
    const head = prefix + makeWs(col, lc) + mk.bullet + mk.gap;
    out.push(head + (p.marker?.box ?? "") + p.text);
    const cc = parseLines([head + "x"], lc.tabSize).info[0].cc;
    for (const s of p.own) out.push(s === "" ? blank : prefix + makeWs(cc, lc) + s);
    out.push(...render(p.kids, Math.max(col + unitCols(lc), cc), null, prefix, blank, lc));
  }
  return out;
}
function pasteBlocks(o, w, line, items, ctx, folded) {
  const { item: t, list } = w;
  const lc = listCtx(o, list, ctx);
  const prefix = quotePrefix(o, w);
  const blank = quoteBlank(o, w);
  const empty = emptyItem(o, t);
  let at;
  let del = 0;
  let col;
  let tpl;
  if (empty && (!t.children.length || items.length === 1)) {
    at = t.line;
    del = 1;
    col = t.col;
    tpl = t.line;
  } else if (t.children.length && !folded.has(t.line)) {
    at = t.children[0].line;
    col = t.children[0].col;
    tpl = at;
  } else {
    at = t.end;
    col = t.col;
    tpl = t.line;
  }
  const m = markerOf(o, tpl);
  const fresh = render(items, col, { bullet: m.bullet, gap: m.gap }, prefix, blank, lc).map((x) => ({
    t: x,
    o: -1
  }));
  let rows = rowsOf(o);
  rows.splice(at, del, ...fresh);
  if (line >= t.ownEnd) rows = rows.filter((r) => r.o !== line);
  const lastRow = fresh[fresh.length - 1];
  const k = rows.indexOf(lastRow);
  const out = finish(o, rows, o.tabSize).rows;
  return { rows: out, cursor: { line: k, ch: out[k].t.length } };
}
function paste(o, from, to, text, ctx, folded) {
  if (from.line !== to.line) return null;
  const line = from.line;
  const w = cleanOwner(o, line);
  if (!w) return null;
  const L = o.info[line];
  if (L.qd > w.list.q) return null;
  const all = text.split(/\r\n?|\n/);
  const ls = trimBlank(all);
  if (!ls.length) return null;
  const kind = pasteKind(ls);
  const onCode = L.kind === "code";
  const t = o.texts[line];
  const sc = onCode ? 0 : textStart(o, w, line);
  const a = Math.max(from.ch, sc);
  const b = Math.max(to.ch, sc);
  if (kind === "plain") {
    if (all.length < 2 || onCode) return null;
    const ind = itemIndent(o, w, ctx);
    const rest = all.slice(1);
    const min = Math.min(...rest.filter((l) => l.trim() !== "").map((l) => leadCols(l, o.tabSize)), Infinity);
    const ins = [
      all[0],
      ...rest.map((l) => l.trim() === "" ? ind : ind + dropLead(l, min === Infinity ? 0 : min, o.tabSize))
    ];
    const rows = rowsOf(o);
    const n = ins.length;
    const fresh = ins.map((x, k) => ({
      t: (k === 0 ? t.slice(0, a) : "") + x + (k === n - 1 ? t.slice(b) : ""),
      o: k === 0 ? line : -1
    }));
    rows.splice(line, 1, ...fresh);
    return { rows, cursor: { line: line + n - 1, ch: ins[n - 1].length }, plain: true };
  }
  if (kind === "code") {
    const base = leadCols(ls[0], o.tabSize);
    const ind = itemIndent(o, w, ctx);
    const blank = quoteBlank(o, w);
    const fresh = ls.map((l) => {
      const d = dropLead(l, base, o.tabSize);
      return { t: d === "" ? blank : ind + d, o: -1 };
    });
    const cb = onCode ? codeBlockAt(o, line) : null;
    if (onCode && !cb) return null;
    const rows = rowsOf(o);
    const at = cb ? cb.end : line + 1;
    rows.splice(at, 0, ...fresh);
    const k = at + fresh.length - 1;
    return { rows, cursor: { line: k, ch: rows[k].t.length }, plain: false };
  }
  if (onCode) return null;
  let oo = o;
  let ww = w;
  if (b > a) {
    const texts = [...o.texts];
    texts[line] = t.slice(0, a) + t.slice(b);
    oo = buildOutline(texts, o.tabSize);
    ww = cleanOwner(oo, line);
    if (!ww) return null;
  }
  return { ...pasteBlocks(oo, ww, line, toItems(ls, o.tabSize), ctx, folded), plain: false };
}

// src/mode.ts
var modeOn = () => false;
function setModeCheck(fn) {
  modeOn = fn;
}
function activeIn(view) {
  const st = view.state;
  if (!modeOn() || st.selection.ranges.length > 1 || !usable(view)) return null;
  const [l0, l1] = lineSpan2(st);
  return activeAt(outlineOf(st), l0, l1);
}
function stepAside(view, needMode = true) {
  return needMode && !modeOn() || view.composing || suggestOpen() || view.state.selection.ranges.length > 1 || !usable(view) || vimNormal(view);
}
function vimNormal(view) {
  const vim = view.cm?.state?.vim;
  return !!vim && !vim.insertMode;
}
function foldedLines(state) {
  const out = /* @__PURE__ */ new Set();
  (0, import_language3.foldedRanges)(state).between(0, state.doc.length, (from) => {
    out.add(state.doc.lineAt(from).number - 1);
  });
  return out;
}
function runKey(view, userEvent, fn) {
  if (stepAside(view)) return false;
  const st = view.state;
  const o = outlineOf(st);
  const r = st.selection.main;
  const res = fn(o, posOf(st, r.from), posOf(st, r.to), st);
  if (!res) return false;
  if (res !== "noop") applyRows(view, o, res.rows, res.userEvent ?? userEvent, res.cursor);
  return true;
}
var outlineEnter = (view, logical) => runKey(view, "split.outliner", (o, from, to, st) => enter(o, from, to, ctxOf(st, logical), foldedLines(st)));
function outlineShiftEnter(view) {
  if (stepAside(view)) return false;
  const st = view.state;
  const r = st.selection.main;
  const c = softBreak(outlineOf(st), posOf(st, r.from), posOf(st, r.to), ctxOf(st, false));
  if (!c) return false;
  const line = st.doc.line(c.line + 1);
  view.dispatch({
    changes: { from: line.from + c.from, to: line.from + c.to, insert: c.insert },
    selection: import_state2.EditorSelection.cursor(line.from + c.from + c.insert.length),
    scrollIntoView: true,
    userEvent: "input"
  });
  return true;
}
var outlineEndList = (view) => runKey(view, "indent.outliner", endList);
var outlineBackspace = (view) => runKey(view, "merge.outliner", (o, from, to, st) => backspace(o, from, to, ctxOf(st, false), foldedLines(st)));
var outlineDelete = (view) => runKey(view, "merge.outliner", (o, from, to, st) => deleteForward(o, from, to, ctxOf(st, false), foldedLines(st)));
var outlinePaste = (view, text) => runKey(view, "paste.outliner", (o, from, to, st) => {
  const res = paste(o, from, to, text, ctxOf(st, false), foldedLines(st));
  return res && { ...res, userEvent: res.plain ? "input.paste" : void 0 };
});
var watchActive = (onChange) => import_view2.EditorView.updateListener.of((u) => {
  if (!(u.selectionSet || u.docChanged || u.focusChanged)) return;
  const typing = u.docChanged && !u.focusChanged && u.transactions.every((tr) => tr.isUserEvent("input.type") || tr.isUserEvent("delete"));
  onChange(typing);
});

// src/nodesel.ts
var import_state3 = require("@codemirror/state");
var import_view3 = require("@codemirror/view");
var import_language4 = require("@codemirror/language");

// src/nodes.ts
var sectionEnd = (o, s) => trimEnd(o, s.line, s.end);
function itemAt(o, line) {
  const it = locate(o, line)?.item;
  return it && it.line === line ? it : null;
}
function nodeAt2(o, kind, line) {
  if (kind === "item") {
    const it = itemAt(o, line);
    if (!it) return null;
    return {
      line,
      end: it.end,
      sibs: it.parent.children.map((x) => x.line),
      parent: it.parent && it.parent.line >= 0 ? it.parent.line : null,
      children: it.children.map((x) => x.line)
    };
  }
  const s = sectionAt(o, line);
  if (s === o.root || s.line !== line || o.info[line]?.kind !== "heading") return null;
  return {
    line,
    end: sectionEnd(o, s),
    sibs: s.parent.children.map((x) => x.line),
    parent: s.parent && s.parent !== o.root ? s.parent.line : null,
    children: s.children.map((x) => x.line)
  };
}
function nodeLines(o, sel) {
  const a = nodeAt2(o, sel.kind, sel.anchor);
  if (!a) return [];
  const i = a.sibs.indexOf(sel.anchor);
  const j = a.sibs.indexOf(sel.head);
  if (j < 0) return [];
  return a.sibs.slice(Math.min(i, j), Math.max(i, j) + 1);
}
function nodeRange(o, sel) {
  const ls = nodeLines(o, sel);
  if (!ls.length) return null;
  return [ls[0], nodeAt2(o, sel.kind, ls[ls.length - 1]).end];
}
function nodeSpan(o, sel) {
  const r = nodeRange(o, sel);
  if (!r) return null;
  const start = { line: r[0], ch: 0 };
  const end = { line: r[1] - 1, ch: o.texts[r[1] - 1].length };
  const back = sel.head < sel.anchor;
  return back ? { anchor: end, head: start } : { anchor: start, head: end };
}
function nodeSelOf(o, anchor, head) {
  const fwd = anchor.line < head.line || anchor.line === head.line && anchor.ch <= head.ch;
  const from = fwd ? anchor : head;
  const to = fwd ? head : anchor;
  if (from.ch !== 0 || from.line === to.line && from.ch === to.ch) return null;
  let end;
  if (to.line < o.texts.length && to.ch === o.texts[to.line].length) end = to.line + 1;
  else if (to.ch === 0 && to.line > from.line) end = to.line;
  else return null;
  for (const kind of ["item", "heading"]) {
    const a = nodeAt2(o, kind, from.line);
    if (!a) continue;
    const i = a.sibs.indexOf(a.line);
    for (let j = i; j < a.sibs.length; j++) {
      const b = nodeAt2(o, kind, a.sibs[j]);
      if (b.end > end) break;
      if (b.end === end) return fwd ? { kind, anchor: a.line, head: b.line } : { kind, anchor: b.line, head: a.line };
    }
  }
  return null;
}
function parentSel(o, sel) {
  const p = nodeAt2(o, sel.kind, sel.head)?.parent;
  return p === null || p === void 0 ? null : { kind: sel.kind, anchor: p, head: p };
}
function childSel(o, sel) {
  const c = nodeAt2(o, sel.kind, sel.head)?.children[0];
  return c === void 0 ? null : { kind: sel.kind, anchor: c, head: c };
}
function removeNodes(o, sel) {
  const r = nodeRange(o, sel);
  if (!r) return null;
  let [s, e] = r;
  const last = nodeAt2(o, sel.kind, nodeLines(o, sel).pop());
  const after = last.sibs[last.sibs.indexOf(last.line) + 1];
  let b = e;
  while (b < o.texts.length && isBlank(o, b)) b++;
  let a = s;
  while (a > o.bodyStart && isBlank(o, a - 1)) a--;
  if (after !== void 0 || a === o.bodyStart) e = b;
  else s = a;
  const rows = rowsOf(o);
  const first = nodeLines(o, sel)[0];
  if (sel.kind === "item" && after !== void 0 && last.sibs[0] === first) {
    const num = (i) => /^(\d{1,9})[.)]/.exec(o.texts[i].slice(o.info[i].pre + o.info[i].ws));
    const m = num(first);
    const n = num(after);
    if (m && n) {
      const at = o.info[after].pre + o.info[after].ws;
      rows[after] = { t: rows[after].t.slice(0, at) + m[1] + rows[after].t.slice(at + n[1].length), o: after };
    }
  }
  rows.splice(s, e - s);
  const out = finish(o, rows, o.tabSize).rows;
  if (!out.length) out.push({ t: "", o: -1 });
  let cursor;
  if (after !== void 0) {
    const k = out.findIndex((x) => x.o === after);
    cursor = { line: k, ch: o.info[after].text + out[k].t.length - o.texts[after].length };
  } else if (s > 0) cursor = { line: s - 1, ch: out[s - 1].t.length };
  else cursor = { line: 0, ch: 0 };
  return { rows: out, cursor };
}
function nodeText(o, sel) {
  const r = nodeRange(o, sel);
  if (!r) return null;
  const lines = o.texts.slice(r[0], r[1]);
  if (sel.kind === "heading") return lines.join("\n");
  const list = locate(o, r[0]).list;
  const col = o.info[r[0]].col;
  return lines.map((t) => stripItemIndent(t, list.q, col, o.tabSize)).join("\n");
}

// src/nodesel.ts
function wholeLines(state) {
  const r = state.selection.main;
  if (r.empty || state.selection.ranges.length > 1) return false;
  const a = state.doc.lineAt(r.from);
  const b = state.doc.lineAt(r.to);
  return r.from === a.from && (r.to === b.to || r.to === b.from);
}
var derive = (state) => wholeLines(state) ? nodeSelOf(outlineOf(state), posOf(state, state.selection.main.anchor), posOf(state, state.selection.main.head)) : null;
var nodeField = import_state3.StateField.define({
  create: derive,
  update: (value, tr) => tr.selection || tr.docChanged ? derive(tr.state) : value
});
var keysOn = () => false;
function setKeysCheck(fn) {
  keysOn = fn;
}
function nodeSelection(view) {
  const sel = view.state.field(nodeField, false) ?? null;
  if (!sel || view.state.readOnly || vimNormal(view)) return null;
  return keysOn() ? sel : null;
}
function keySel(view) {
  const sel = nodeSelection(view);
  return sel && !stepAside(view, false) ? sel : null;
}
function select(view, sel) {
  const st = view.state;
  const span = nodeSpan(outlineOf(st), sel);
  if (!span) return;
  view.dispatch({
    selection: { anchor: offsetOf(st, span.anchor), head: offsetOf(st, span.head) },
    scrollIntoView: true
  });
}
function left(view) {
  const sel = keySel(view);
  if (!sel) return false;
  const st = view.state;
  const o = outlineOf(st);
  const folded = foldedLines(st);
  const effects = [];
  for (const l of nodeLines(o, sel)) {
    const line = st.doc.line(l + 1);
    const r = folded.has(l) ? null : (0, import_language4.foldable)(st, line.from, line.to);
    if (r) effects.push(import_language4.foldEffect.of(r));
  }
  if (effects.length) view.dispatch({ effects });
  else {
    const p = parentSel(o, sel);
    if (p) select(view, p);
  }
  return true;
}
function right(view) {
  const sel = keySel(view);
  if (!sel) return false;
  const st = view.state;
  const o = outlineOf(st);
  const lines = new Set(nodeLines(o, sel));
  const effects = [];
  (0, import_language4.foldedRanges)(st).between(0, st.doc.length, (from, to) => {
    if (lines.has(st.doc.lineAt(from).number - 1)) effects.push(import_language4.unfoldEffect.of({ from, to }));
  });
  if (effects.length) view.dispatch({ effects });
  else {
    const c = childSel(o, sel);
    if (c) select(view, c);
  }
  return true;
}
function clear(view) {
  const sel = keySel(view);
  if (!sel) return false;
  const st = view.state;
  const L = outlineOf(st).info[sel.anchor];
  view.dispatch({ selection: { anchor: st.doc.line(sel.anchor + 1).from + L.text }, scrollIntoView: true });
  return true;
}
function remove(view, userEvent = "remove.outliner") {
  const sel = keySel(view);
  if (!sel) return false;
  const o = outlineOf(view.state);
  const res = removeNodes(o, sel);
  if (res) applyRows(view, o, res.rows, userEvent, res.cursor);
  return true;
}
function copied(state, sel) {
  const o = outlineOf(state);
  const text = nodeText(o, sel);
  const r = nodeRange(o, sel);
  if (text === null || !r) return null;
  return state.selection.main.to > state.doc.line(r[1]).to ? text + "\n" : text;
}
var highlighted = /* @__PURE__ */ new WeakMap();
var highlight = import_view3.ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = import_view3.Decoration.none;
      /** Whether there is a node selection to highlight (editorAttributes below reads it). */
      this.on = false;
      this.build(view);
    }
    update(u) {
      this.build(u.view);
    }
    build(view) {
      const sel = nodeSelection(view);
      const r = sel && nodeRange(outlineOf(view.state), sel);
      this.on = !!r;
      if (sel && r) highlighted.set(view.state, sel);
      if (!r) {
        this.decorations = import_view3.Decoration.none;
        return;
      }
      const doc = view.state.doc;
      const b = new import_state3.RangeSetBuilder();
      const deco = import_view3.Decoration.line({ class: "eo-node-selected" });
      for (const { from, to } of view.visibleRanges) {
        const a = Math.max(r[0], doc.lineAt(from).number - 1);
        const z = Math.min(r[1], doc.lineAt(to).number);
        for (let l = a; l < z; l++) b.add(doc.line(l + 1).from, doc.line(l + 1).from, deco);
      }
      this.decorations = b.finish();
    }
  },
  { decorations: (v) => v.decorations }
);
function nodeSelectionExtension() {
  return [
    nodeField,
    highlight,
    import_view3.EditorView.editorAttributes.of((view) => view.plugin(highlight)?.on ? { class: "eo-node-selection" } : null),
    import_state3.Prec.highest(
      import_view3.keymap.of([
        { key: "ArrowLeft", run: left },
        { key: "ArrowRight", run: right },
        { key: "Escape", run: clear },
        { key: "Backspace", run: (v) => remove(v) },
        { key: "Delete", run: (v) => remove(v) }
      ])
    ),
    import_view3.EditorView.clipboardOutputFilter.of((text, state) => {
      const sel = highlighted.get(state);
      return (sel && copied(state, sel)) ?? text;
    }),
    // cut removes the nodes like Backspace (CodeMirror's cut would leave an empty line in the list)
    import_state3.Prec.highest(
      import_view3.EditorView.domEventHandlers({
        cut: (e, view) => {
          const sel = keySel(view);
          const text = sel && copied(view.state, sel);
          if (!text || !e.clipboardData) return false;
          e.preventDefault();
          e.clipboardData.clearData();
          e.clipboardData.setData("text/plain", text);
          return remove(view, "cut.outliner");
        }
      })
    )
  ];
}

// src/settings.ts
var import_obsidian3 = require("obsidian");
var DEFAULTS = {
  outlineMode: true,
  logicalOutdent: false,
  keys: true,
  headingGuides: true,
  dragHandles: true,
  deepHeadings: true,
  levelLabels: true
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
    new import_obsidian3.Setting(this.containerEl).setName("Outline mode").setDesc(
      'Inside a list, keys work like an outliner (Logseq): Enter splits the item at the cursor or, on an empty item, outdents it; Shift+Enter starts a new line in the same item; Shift+Tab on an empty top-level item ends the list; Backspace at the start of an item merges it into the one above, Delete at its end pulls the next one in; pasted Markdown lists, headings and paragraphs become items. Elsewhere nothing changes. One switch for all notes; the "Toggle outline mode" command (Ctrl+Super+O; Ctrl+Cmd+O on macOS) and the status bar item switch it too.'
    ).addToggle((t) => t.setValue(this.plugin.settings.outlineMode).onChange((v) => this.plugin.setOutlineMode(v)));
    this.toggle(
      "Logical outdenting",
      "Off: an outdented item or heading stays where it is, and the siblings after it become its children. On: it moves to just after its parent, and those siblings stay with the parent.",
      "logicalOutdent"
    );
    this.toggle(
      "Outliner keys",
      "Tab / Shift+Tab indent and outdent headings and list items; Ctrl+\u2191/\u2193 (Cmd+\u2191/\u2193 on a Mac) move them, or the selected ones, with their children; Alt+\u2191 / Alt+\u2193 expand the selection up / down (word, line, then whole blocks: siblings that way, then the parent) and Alt+Shift+\u2191 / Alt+Shift+\u2193 shrink that edge back; a selection of whole items or sections is a node selection (\u2190/\u2192 fold or go to the parent / child, Backspace deletes, copy gives clean Markdown). Elsewhere (text, tables, code) these keys work as usual. Turn off to use only your own hotkeys for the commands (Settings \u2192 Hotkeys).",
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
    this.toggle(
      "Heading level labels",
      "In Live Preview, a faint H1, H2, \u2026 after each heading, so you can tell the level without moving the cursor onto it. Hidden on the line you're editing, where the # marks show.",
      "levelLabels"
    );
  }
};

// src/view.ts
var import_state4 = require("@codemirror/state");
var import_view4 = require("@codemirror/view");
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
  const same2 = sameSpot(o, it, src.list);
  for (const b of lists) {
    const items = flatItems(itemsOf(o, b)).filter((x) => !inSrc(x));
    const deepest = new Array(b.end - b.start).fill(null);
    for (const x of items) for (let l = x.line; l < Math.max(x.end, x.line + 1); l++) deepest[l - b.start] = x;
    const lines = [...items.map((x) => x.line), b.end];
    if (b === src.list) lines.push(it.line);
    for (const p of [...new Set(lines)].sort((x, y) => x - y)) {
      if (b === src.list && p !== it.line && same2(p)) continue;
      let q = b === src.list && same2(p) ? it.line - 1 : p - 1;
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
    const same2 = p === s2.line || p === s2.end;
    if (same2 && opt.value === s2.level) return null;
    relevel(o, rows, s2.line, s2.end, opt.value - s2.level);
    if (same2) return rows;
    const [moved2, at2] = relocate(rows, s2.line, s2.end, p);
    const e = at2 + (s2.end - s2.line);
    return padBlank(moved2, at2, e);
  }
  if (src.kind === "item") {
    const { it } = src;
    const same2 = sameSpot(o, it, src.list)(p);
    if (same2 && opt.value === it.col) return null;
    shift(o, rows, it.line, it.end, opt.value - it.col, listCtx(o, src.list, ctx), src.list.q);
    if (!same2) [rows] = relocate(rows, it.line, it.end, p);
    return finish(o, rows, ctx.tabSize).rows;
  }
  const { b } = src;
  if (p >= b.start && p <= b.end) return null;
  const [moved, at] = relocate(rows, b.start, b.end, p);
  rows = closeSeam(moved, p > b.start ? b.start : b.end);
  const shiftBack = p > b.start ? moved.length - rows.length : 0;
  const s = at - shiftBack;
  rows = padBlank(rows, s, s + (b.end - b.start));
  const bs = src.section === o.root ? o.bodyStart : src.section.line + 1;
  const first = blocksOf(o, src.section)[0];
  let k = bs;
  while (k < rows.length && rows[k].t.trim() === "") k++;
  const lead = first.start - bs;
  if (k < rows.length && k - bs !== lead)
    rows.splice(bs, k - bs, ...Array.from({ length: lead }, () => ({ t: "", o: -1 })));
  return finish(o, rows, ctx.tabSize).rows;
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
  return import_view4.ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = this.build(view);
      }
      update(u) {
        if (!u.docChanged) return;
        this.decorations = plainEdit(u) ? this.decorations.map(u.changes) : this.build(u.view);
      }
      build(view) {
        const s = settings();
        if (!s.deepHeadings && !s.levelLabels || nested(view)) return import_view4.Decoration.none;
        const o = outlineOf(view.state);
        const b = new import_state4.RangeSetBuilder();
        const doc = view.state.doc;
        for (const sec of o.sections) {
          const cls = [];
          if (s.deepHeadings && sec.level >= 7) cls.push("eo-deep-heading");
          if (s.levelLabels) cls.push("eo-level-label");
          if (!cls.length) continue;
          const from = doc.line(sec.line + 1).from;
          b.add(
            from,
            from,
            import_view4.Decoration.line({ class: cls.join(" "), attributes: { "data-eo-level": String(sec.level) } })
          );
        }
        return b.finish();
      }
    },
    { decorations: (v) => v.decorations }
  );
}
var GUIDE_STEP = 10;
function guideSpans(o) {
  let deepest = 0;
  const depthOf = /* @__PURE__ */ new Map();
  const spans = [];
  for (const s of o.sections) {
    const d = s.parent && s.parent !== o.root ? depthOf.get(s.parent) + 1 : 1;
    depthOf.set(s, d);
    deepest = Math.max(deepest, d);
    spans.push({ line: s.line, endLine: trimEnd(o, s.line, s.end) - 1, depth: d });
  }
  return { spans, deepest };
}
function guidesKeep(u) {
  if (!plainEdit(u)) return false;
  let keep = true;
  u.changes.iterChangedRanges((fa, _ta, fb) => {
    if (keep && u.startState.doc.lineAt(fa).text.trim() === "" !== (u.state.doc.lineAt(fb).text.trim() === ""))
      keep = false;
  });
  return keep;
}
function headingGuides() {
  const cache = /* @__PURE__ */ new WeakMap();
  return (0, import_view4.layer)({
    above: false,
    class: "eo-guides",
    update: (u) => {
      if (!u.docChanged) return u.viewportChanged || u.geometryChanged;
      const c = cache.get(u.view);
      if (c && c.doc === u.startState.doc && guidesKeep(u)) c.doc = u.state.doc;
      return true;
    },
    markers(view) {
      if (nested(view)) return [];
      let c = cache.get(view);
      if (!c || c.doc !== view.state.doc) {
        c = { doc: view.state.doc, ...guideSpans(outlineOf(view.state)) };
        cache.set(view, c);
      }
      const { spans, deepest } = c;
      if (!spans.length) return [];
      const doc = view.state.doc;
      const { from: vFrom, to: vTo } = view.viewport;
      const first = doc.lineAt(vFrom).number - 1;
      const last = doc.lineAt(vTo).number - 1;
      const sc = view.scrollDOM.getBoundingClientRect();
      const baseLeft = sc.left - view.scrollDOM.scrollLeft;
      const baseTop = sc.top - view.scrollDOM.scrollTop;
      const content = view.contentDOM.getBoundingClientRect();
      const textLeft = content.left - baseLeft;
      const room = Math.max(0, textLeft - 10);
      const step2 = deepest > 1 ? Math.max(3, Math.min(GUIDE_STEP, room / (deepest - 1))) : GUIDE_STEP;
      const out = [];
      for (const s of spans) {
        const endLine = s.endLine;
        if (endLine <= s.line || endLine < first || s.line > last) continue;
        const top = view.lineBlockAt(doc.line(Math.max(s.line, first) + 1).from);
        const bottom = view.lineBlockAt(doc.line(Math.min(endLine, last) + 1).from);
        const y0 = (s.line >= first ? top.bottom : top.top) + view.documentTop - baseTop;
        const y1 = bottom.bottom + view.documentTop - baseTop;
        if (y1 - y0 < 1) continue;
        const x = textLeft - 6 - (deepest - s.depth) * step2;
        out.push(new import_view4.RectangleMarker("eo-guide-line", x, y0, null, y1 - y0));
      }
      return out;
    }
  });
}
var HEADING_STEP = 24;
var DRAG_START = 4;
var HANDLE_GAP = 22;
function dragHandles(logical) {
  const plugin = import_view4.ViewPlugin.fromClass(
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
          this.handle.style.left = `${Math.max(c.left - box.left, this.handle.offsetWidth + HANDLE_GAP)}px`;
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
        const left2 = d.base + (d.src.kind === "block" ? 0 : opt.depth * d.step);
        this.indicator.style.display = "";
        this.indicator.style.top = `${d.tops[lo] + view.documentTop - box.top - 1}px`;
        this.indicator.style.left = `${left2 - box.left}px`;
        this.indicator.style.width = `${Math.max(40, d.right - left2)}px`;
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
  const classes = import_view4.EditorView.editorAttributes.of((view) => {
    const p = view.plugin(plugin);
    return p && !p.off ? { class: p.drag ? "eo-drag-handles eo-dragging" : "eo-drag-handles" } : null;
  });
  return [plugin, classes];
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
  let el = activeDocument.activeElement;
  for (let k = 0; el?.tagName === "IFRAME" && k < 4; k++) {
    try {
      el = el.contentDocument?.activeElement;
    } catch {
      return null;
    }
  }
  const ed = el?.closest(".cm-editor");
  return ed ? import_view5.EditorView.findFromDOM(ed) : null;
}
var lastFocused = null;
var rememberFocus = import_view5.EditorView.domEventHandlers({
  focus: (_e, view) => {
    lastFocused = view;
  }
});
var editors = /* @__PURE__ */ new Set();
var tracker = import_view5.ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.view = view;
      editors.add(this);
    }
    destroy() {
      editors.delete(this);
    }
  }
);
var EditorOutlinerPlugin = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULTS };
    this.extensions = [];
    /** Holds the extensions in every editor (see editors). */
    this.compartment = new import_state5.Compartment();
    this.status = null;
    this.statusQueued = false;
    this.statusTimer = 0;
    /** The "Logical outdenting" setting, read when a key or command runs. */
    this.logical = () => this.settings.logicalOutdent;
  }
  async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.addSettingTab(new EditorOutlinerTab(this.app, this));
    setSuggestCheck(() => !!this.app.workspace.editorSuggest?.isShowingSuggestion?.());
    setModeCheck(() => this.settings.outlineMode);
    setKeysCheck(() => this.settings.keys);
    this.buildExtensions();
    this.registerEditorExtension([this.compartment.of(this.extensions)]);
    this.addCommands();
    this.addStatus();
    if (import_obsidian5.Platform.isMobile) this.app.workspace.onLayoutReady(() => this.routeToolbarIndent());
  }
  /**
   * Mobile: the editor toolbar's indent / outdent buttons (Obsidian's "Indent list item" / "Unindent list item")
   * indent and outdent the heading or list item with its subtree, as Tab / Shift+Tab do; elsewhere (body text, a
   * code block, a table cell) Obsidian's own command runs. The patch comes off on unload.
   */
  routeToolbarIndent() {
    const route = (id, kind) => {
      const cmd = this.app.commands?.commands?.[id];
      if (!cmd?.editorCallback) return;
      const logical = this.logical;
      this.register(
        around(cmd, {
          editorCallback: (next) => function(editor, ctx) {
            const view = editor.activeCM ?? editor.cm;
            if (view && runOp(view, kind, logical())) return;
            return next?.call(this, editor, ctx);
          }
        })
      );
    };
    route("editor:indent-list", "indent");
    route("editor:unindent-list", "outdent");
  }
  onunload() {
    window.clearTimeout(this.statusTimer);
    this.reconfigure([]);
    setSuggestCheck(() => false);
    setModeCheck(() => false);
    setKeysCheck(() => false);
    lastFocused = null;
  }
  /** Outline mode on / off (command, setting, status bar): saved, no editor reconfiguration needed. */
  async setOutlineMode(on) {
    this.settings.outlineMode = on;
    await this.saveData(this.settings);
    this.refreshStatus();
    for (const e of [...editors]) e.view.dispatch({});
  }
  /** Gives every editor that has the extensions the new ones (none: unloading). */
  reconfigure(ext) {
    for (const e of [...editors]) e.view.dispatch({ effects: this.compartment.reconfigure(ext) });
  }
  /**
   * The status bar item (desktop; mobile has no status bar): "Outline" when outline mode is on, emphasised
   * while it is active in the focused editor (or the last one focused), faint when off. A click toggles.
   */
  addStatus() {
    const el = this.addStatusBarItem();
    el.addClass("eo-status", "mod-clickable");
    el.setText("Outline");
    this.registerDomEvent(el, "click", () => void this.setOutlineMode(!this.settings.outlineMode));
    this.status = el;
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.refreshStatus()));
    this.refreshStatus();
  }
  /**
   * Updates the status bar item, at most once per frame (it runs on every selection change); while typing, after a
   * pause (typing inside an item rarely changes the active state, and working it out parses the note).
   */
  refreshStatus(typing = false) {
    if (!this.status) return;
    window.clearTimeout(this.statusTimer);
    if (typing) {
      this.statusTimer = window.setTimeout(() => this.refreshStatus(), 300);
      return;
    }
    if (this.statusQueued) return;
    this.statusQueued = true;
    requestAnimationFrame(() => {
      this.statusQueued = false;
      const el = this.status;
      if (!el) return;
      const on = this.settings.outlineMode;
      const view = this.targetView();
      const active = on && !!view && !!activeIn(view);
      el.toggleClass("is-on", on);
      el.toggleClass("is-active", active);
      el.setAttribute(
        "aria-label",
        `Outline mode ${on ? active ? "on, active in this list" : "on" : "off"}. Click to turn it ${on ? "off" : "on"}.`
      );
    });
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.buildExtensions();
    this.reconfigure([...this.extensions]);
  }
  buildExtensions() {
    const logical = this.logical;
    const op = (kind) => (v) => runOp(v, kind, logical());
    this.extensions.length = 0;
    this.extensions.push(tracker);
    this.extensions.push(nodeSelectionExtension());
    this.extensions.push(
      import_state5.Prec.highest(
        import_view5.keymap.of([
          { key: "Enter", run: (v) => outlineEnter(v, logical()) },
          { key: "Shift-Enter", run: outlineShiftEnter },
          { key: "Shift-Tab", run: outlineEndList },
          { key: "Backspace", run: outlineBackspace },
          { key: "Delete", run: outlineDelete }
        ])
      )
    );
    if (this.settings.keys) {
      this.extensions.push(
        import_state5.Prec.highest(
          import_view5.keymap.of([
            { key: "Tab", run: op("indent") },
            { key: "Shift-Tab", run: op("outdent") },
            // Move: Mod = Ctrl on Windows/Linux, Cmd on macOS (there, outside the outline Cmd+↑/↓ falls through
            // to Obsidian's document start / end)
            { key: "Mod-ArrowUp", run: op("up") },
            { key: "Mod-ArrowDown", run: op("down") },
            // Expand up / down: Alt+↑ / Alt+↓; Shrink up / down: Alt+Shift+↑ / Alt+Shift+↓, retracing that edge.
            // They replace CodeMirror's move line / copy line up / down in the editor
            { key: "Alt-ArrowUp", run: expandUp },
            { key: "Alt-ArrowDown", run: expandDown },
            { key: "Alt-Shift-ArrowUp", run: shrinkUp },
            { key: "Alt-Shift-ArrowDown", run: shrinkDown },
            { key: "Enter", run: codeEnter }
          ])
        )
      );
    }
    this.extensions.push(
      rememberFocus,
      codeClipboard((v, data) => {
        const text = this.clipText(data);
        return text !== null && outlinePaste(v, text);
      }),
      watchActive((typing) => this.refreshStatus(typing))
    );
    this.extensions.push(lineDecorations(() => this.settings));
    if (this.settings.headingGuides) this.extensions.push(headingGuides());
    if (this.settings.dragHandles && !import_obsidian5.Platform.isMobile) this.extensions.push(dragHandles(logical));
  }
  /**
   * The text Obsidian's own paste would insert (its clipboard manager, app.js): its own copies' plain text, else
   * text/markdown, else HTML converted to Markdown (when "Auto convert HTML" is on), else plain text. Null for
   * what only Obsidian handles: files, links from a URL list, HTML with images or media.
   */
  clipText(data) {
    if (data.files.length || data.getData("text/uri-list")) return null;
    const plain = data.getData("text/plain");
    const html = data.getData("text/html");
    if (html && html.includes("<!-- obsidian -->") && plain) return plain;
    const md = data.getData("text/markdown");
    if (md) return md;
    if (html) {
      if (!this.app.vault.getConfig("autoConvertHtml")) return plain || null;
      if (/<(img|audio|video)\b/i.test(html)) return null;
      return (0, import_obsidian5.htmlToMarkdown)(html);
    }
    return plain || null;
  }
  /** The editor a command acts on: the focused one, else the last one focused, else Obsidian's active one. */
  targetView() {
    const shown = (v) => v && v.dom.isConnected && v.dom.offsetParent !== null ? v : null;
    return focusedView() ?? shown(lastFocused) ?? shown(this.app.workspace.activeEditor?.editor?.cm ?? null);
  }
  addCommands() {
    const logical = this.logical;
    this.addCommand({
      id: "toggle-outline-mode",
      name: "Toggle outline mode",
      icon: "list-tree",
      hotkeys: [{ modifiers: ["Ctrl", "Meta"], key: "O" }],
      callback: async () => {
        await this.setOutlineMode(!this.settings.outlineMode);
        new import_obsidian5.Notice(`Outline mode ${this.settings.outlineMode ? "on" : "off"}`, 1500);
      }
    });
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
    cmd("expand-selection-up", "Expand selection up", "text-select", expandUp);
    cmd("expand-selection-down", "Expand selection down", "text-select", expandDown);
    cmd("shrink-selection-up", "Shrink selection up", "text-cursor", shrinkUp);
    cmd("shrink-selection-down", "Shrink selection down", "text-cursor", shrinkDown);
    cmd("insert-code-block", "Insert code block in item", "code", (v) => insertBlock(v, ""), {
      applies: (v) => insertBlock(v, "", true)
    });
    cmd("insert-dataview", "Insert Dataview query in item", "database", (v) => insertBlock(v, "dataview"), {
      applies: (v) => insertBlock(v, "dataview", true)
    });
    cmd("fold", "Fold heading or list item", "fold-vertical", foldNode);
    cmd("unfold", "Unfold heading or list item", "unfold-vertical", unfoldNode);
    cmd("fold-children", "Fold children", "chevrons-down-up", foldChildren);
    cmd("unfold-subtree", "Unfold heading or list item and everything under it", "chevrons-up-down", unfoldSubtree);
    for (let n = 1; n <= 6; n++)
      cmd(`fold-to-level-${n}`, `Fold headings to level ${n}`, "list-collapse", (v) => foldToLevel(v, n));
    cmd("unfold-all", "Unfold all", "list-tree", unfoldAll);
  }
};
