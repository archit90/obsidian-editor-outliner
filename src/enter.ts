// Outline mode's Enter, Shift+Enter and Shift+Tab ending a list (the repo's SPEC.md, "Editor Outliner" →
// "Outline mode"), after Logseq's editor.cljs: an item is a block, Enter splits it, an empty item outdents
// or adds another. Pure: works on the parsed note and returns the new rows (or a text change) and where the
// cursor goes; null means the key isn't for us (Obsidian's own Enter applies).
import { Outline, parseLines, prefixLen } from "./parse";
import { Ctx, Row, finish, listCtx, makeWs, outdent, rowsOf } from "./ops";
import { Owner, Pos, indentEnd, itemIndent, stripItemIndent } from "./content";
import { cursorOwner, cleanItem } from "./active";

export interface Edit {
  rows: Row[];
  cursor: Pos;
}

/** The item a key at from..to (one line) acts on: a clean item, the line not code nor a quote under it. */
function target(o: Outline, from: Pos, to: Pos): Owner | null {
  if (from.line !== to.line) return null;
  const w = cursorOwner(o, from.line);
  if (!w || !cleanItem(o, w)) return null;
  const L = o.info[from.line]!;
  // code (fenced, math, comments) and quotes inside an item keep Obsidian's Enter (and stage A's code Enter)
  if (L.kind === "code" || L.qd > w.list.q) return null;
  return w;
}

/** Where the line's own text starts: after the marker (and checkbox) on the marker line, else after the item indent. */
function textStart(o: Outline, w: Owner, line: number): number {
  if (line === w.item.line) return o.info[line]!.text;
  return indentEnd(o.texts[line]!, w.list.q, w.item.cc, o.tabSize);
}

const MARKER = /^([-*+]|\d{1,9}[.)])([ \t]*)(\[.\][ \t]*)?/;

/** The marker part of an item line (bullet or number, the gap after it, a checkbox), split up. */
function markerOf(o: Outline, line: number) {
  const L = o.info[line]!;
  const m = MARKER.exec(o.texts[line]!.slice(L.pre + L.ws, L.text))!;
  return { bullet: m[1]!, gap: m[2] || " ", task: !!m[3] };
}

/** The quote prefix of the item's marker line (`> ` in a callout), as a blank line inside the list writes it. */
const quoteBlank = (o: Outline, w: Owner) => {
  const t = o.texts[w.item.line]!;
  return t.slice(0, prefixLen(t, w.list.q)).trimEnd();
};

const isEmptyText = (s: string) => s.trim() === "";

/**
 * Enter at from..to (a selection within one line is replaced). The item splits at the cursor: the text after
 * it, with the item's own lines below (continuation paragraphs, code blocks), becomes a new item, re-indented
 * to the new item's content column. The new item is the first child when the item has children that aren't
 * folded (folded: the folded item lines), else the next sibling after the subtree. It copies the marker (a
 * task gets `[ ] `; a first child takes the children's bullet or number); ordered lists are renumbered.
 * - Nothing before the cursor and text after it: an empty item goes above; the cursor stays on the text.
 * - An empty item: a nested one with no sibling after it outdents; any other gets another empty item.
 */
export function enter(o: Outline, from: Pos, to: Pos, ctx: Ctx, folded: ReadonlySet<number>): Edit | null {
  const w = target(o, from, to);
  if (!w) return null;
  const { item, list } = w;
  const q = list.q;
  const lc = listCtx(o, list, ctx);
  const line = from.line;
  const t = o.texts[line]!;
  const sc = textStart(o, w, line);
  const a = Math.max(from.ch, sc);
  const b = Math.max(to.ch, sc);
  // the item's own lines, through a whitespace-only line the cursor is on just past them
  const ownEnd = Math.max(item.ownEnd, line + 1);

  // before the cursor: the marker line and the own lines up to it, the split line cut at the cursor; an
  // emptied continuation line and trailing blank lines go
  const head: Row[] = [];
  for (let i = item.line; i < line; i++) head.push({ t: o.texts[i]!, o: i });
  const cut = t.slice(0, sc) + t.slice(sc, a).trimEnd();
  if (line === item.line || cut.length > sc) head.push({ t: cut, o: line });
  while (head.length > 1 && isEmptyText(head[head.length - 1]!.t.slice(prefixLen(head[head.length - 1]!.t, q))))
    head.pop();
  const markerText = head[0]!.t.slice(o.info[item.line]!.text);
  const headEmpty = head.length === 1 && isEmptyText(markerText);

  // after the cursor: the rest of the split line and the own lines below it, without the item indent and
  // without leading blank lines
  const tail: { t: string; plain: boolean }[] = [];
  const rest = t.slice(b).replace(/^[ \t]+/, "");
  if (rest) tail.push({ t: rest, plain: true });
  for (let i = line + 1; i < ownEnd; i++) {
    const L = o.info[i]!;
    const blank = L.kind !== "code" && L.empty;
    if (blank && !tail.length) continue;
    tail.push({
      t: blank ? "" : stripItemIndent(o.texts[i]!, q, item.cc, o.tabSize),
      plain: L.kind === "text" && L.qd === q,
    });
  }

  const rows = rowsOf(o);
  const sibs = item.parent!.children;
  const last = sibs.indexOf(item) === sibs.length - 1;

  if (headEmpty && !tail.length) {
    // an empty item: nested and last → outdent (the existing operation); else another empty item below
    if (item.depth > 0 && last) {
      const res = outdent(o, item.line, item.line, ctx);
      if (!res || res === "noop" || "error" in res) return null;
      const k = res.rows.findIndex(r => r.o === item.line);
      return { rows: res.rows, cursor: { line: k, ch: res.rows[k]!.t.length } };
    }
  } else if (headEmpty) {
    // nothing before the cursor: an empty item above, at the item's indent with its marker
    const m = markerOf(o, item.line);
    const marker = itemPrefix(o, w, item.col, m.bullet, m.gap, m.task, lc);
    if (b > a) rows[line] = { t: t.slice(0, a) + t.slice(b), o: line };
    rows.splice(item.line, 0, { t: marker, o: -1 });
    const out = finish(o, rows, o.tabSize).rows;
    const r = out[line + 1]!;
    // renumbering may change the marker's width; the cursor keeps its place in the text
    const ch = line === item.line ? sc + (r.t.length - rows[line + 1]!.t.length) : from.ch;
    return { rows: out, cursor: { line: line + 1, ch } };
  }

  // the new item: first child (unfolded children) or next sibling after the subtree
  const kids = item.children.length > 0 && !folded.has(item.line);
  const tpl = kids ? item.children[0]! : item;
  const tm = markerOf(o, tpl.line);
  const own = markerOf(o, item.line);
  const prefix = itemPrefix(o, w, tpl.col, tm.bullet, tm.gap, own.task, lc);
  const cc = parseLines([prefix + "x"], o.tabSize).info[0]!.cc;
  const contIndent = o.texts[item.line]!.slice(0, prefixLen(o.texts[item.line]!, q)) + makeWs(cc, lc);
  const joined = tail[0]?.plain ? tail.shift()!.t : "";
  const fresh: Row[] = [{ t: prefix + joined, o: -1 }];
  for (const x of tail) fresh.push({ t: x.t === "" ? quoteBlank(o, w) : contIndent + x.t, o: -1 });

  const end = Math.max(item.end, ownEnd);
  const middle = rows.slice(ownEnd, end);
  const body = kids ? [...fresh, ...middle] : [...middle, ...fresh];
  const next = [...rows.slice(0, item.line), ...head, ...body, ...rows.slice(end)];
  const at = item.line + head.length + (kids ? 0 : middle.length);
  const out = finish(o, next, o.tabSize).rows;
  return { rows: out, cursor: { line: at, ch: out[at]!.t.length - joined.length } };
}

/** An item line's start: the list's quote prefix, the indent, bullet or number, gap, `[ ] ` for a task. */
function itemPrefix(o: Outline, w: Owner, col: number, bullet: string, gap: string, task: boolean, lc: Ctx) {
  const t = o.texts[w.item.line]!;
  return t.slice(0, prefixLen(t, w.list.q)) + makeWs(col, lc) + bullet + gap + (task ? "[ ] " : "");
}

/** A text change: replace [from, to) on line with insert; the cursor goes after the insert. */
export interface LineChange {
  line: number;
  from: number;
  to: number;
  insert: string;
}

/**
 * Shift+Enter at from..to (one line): a new line in the same item, indented to its content column, so it is
 * a continuation line. On such a line left empty, the same again: the empty line stays in the item as a
 * paragraph break and the cursor goes to the next one. Whitespace right after the cursor goes.
 */
export function softBreak(o: Outline, from: Pos, to: Pos, ctx: Ctx): LineChange | null {
  const w = target(o, from, to);
  if (!w) return null;
  const t = o.texts[from.line]!;
  const sc = textStart(o, w, from.line);
  const a = Math.max(from.ch, sc);
  let b = Math.max(to.ch, sc);
  while (b < t.length && (t[b] === " " || t[b] === "\t")) b++;
  return { line: from.line, from: a, to: b, insert: "\n" + itemIndent(o, w, ctx) };
}

/**
 * Shift+Tab on an empty top-level item without children ends the list: the marker goes and the line is an
 * empty line after the list (items after it stay a list after it). The one case where a top-level item
 * leaves its list: there is nothing in it to lose. Ordered items after it keep their numbers.
 */
export function endList(o: Outline, from: Pos, to: Pos): Edit | null {
  const w = target(o, from, to);
  if (!w || from.line !== w.item.line) return null;
  const { item } = w;
  if (item.depth !== 0 || item.children.length || item.ownEnd !== item.line + 1) return null;
  if (!isEmptyText(o.texts[item.line]!.slice(o.info[item.line]!.text))) return null;
  const rows = rowsOf(o);
  const blank = quoteBlank(o, w);
  rows[item.line] = { t: blank, o: item.line };
  // no renumbering: the items after it start a list of their own and keep their numbers
  return { rows, cursor: { line: item.line, ch: blank.length } };
}
