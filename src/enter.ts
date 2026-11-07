// Outline mode's Enter, Shift+Enter and Shift+Tab ending a list (the repo's SPEC.md, "Editor Outliner" →
// "Outline mode"), after Logseq's editor.cljs: an item is a block, Enter splits it, an empty item outdents
// or adds another. Pure: works on the parsed note and returns the new rows (or a text change) and where the
// cursor goes; null means the key isn't for us (Obsidian's own Enter applies).
import { Outline, isBlank, parseLines, prefixLen } from "./parse";
import { Ctx, Row, finish, listCtx, makeWs, outdent, rowsOf } from "./ops";
import {
  Edit,
  Owner,
  Pos,
  emptyItem,
  itemIndent,
  markerOf,
  quoteBlank,
  quotePrefix,
  stripItemIndent,
  textStart,
} from "./content";
import { cleanOwner } from "./active";

/** The item a key at from..to (one line) acts on: a clean item, the line not code nor a quote under it. */
function target(o: Outline, from: Pos, to: Pos): Owner | null {
  if (from.line !== to.line) return null;
  const w = cleanOwner(o, from.line);
  if (!w) return null;
  const L = o.info[from.line]!;
  // code (fenced, math, comments) and quotes inside an item keep Obsidian's Enter (and stage A's code Enter)
  if (L.kind === "code" || L.qd > w.list.q) return null;
  return w;
}

const isEmptyText = (s: string) => s.trim() === "";

/**
 * Enter at from..to (a selection within one line is replaced). The item splits at the cursor: the text after
 * it, with the item's own lines below (continuation paragraphs, code blocks), becomes a new item, re-indented
 * to the new item's content column. The new item is the first child when the item has children that aren't
 * folded (folded: the folded item lines), else the next sibling after the subtree. It copies the marker (a
 * task gets `[ ] `; a first child takes the children's bullet or number); ordered lists are renumbered.
 * - Nothing before the cursor and text after it: an empty item goes above; the cursor stays on the text.
 * - An empty item: the last top-level one (no children) ends the list (endList); a nested one with no sibling
 *   after it outdents; any other gets another empty item.
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
  const headEmpty = head.length === 1 && isEmptyText(head[0]!.t.slice(o.info[item.line]!.text));

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
    // an empty item: the last top-level one (no children) ends the list, as Shift+Tab does, so there is
    // always a way out of a list at the end of a note; nested and last → outdent (the existing operation);
    // else another empty item below
    if (item.depth === 0 && last && !item.children.length) return endList(o, from, to);
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
  const contIndent = quotePrefix(o, w) + makeWs(cc, lc);
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
  return quotePrefix(o, w) + makeWs(col, lc) + bullet + gap + (task ? "[ ] " : "");
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
 * Shift+Tab on an empty top-level item without children ends the list: the marker goes and the line is an empty
 * paragraph line outside the list, with a blank line between it and the list above and another before the items
 * after it (they stay a list after it), so what is typed there is a paragraph, never a lazy continuation of the
 * item above. The one case where a top-level item leaves its list: there is nothing in it to lose.
 */
export function endList(o: Outline, from: Pos, to: Pos): Edit | null {
  const w = target(o, from, to);
  if (!w || from.line !== w.item.line) return null;
  const { item, list } = w;
  if (item.depth !== 0 || item.children.length || !emptyItem(o, item)) return null;
  const rows = rowsOf(o);
  const blank = quoteBlank(o, w);
  const above = item.line > list.start && !isBlank(o, item.line - 1, true);
  const below = item.line + 1 < list.end && !isBlank(o, item.line + 1, true);
  const lines: Row[] = [{ t: blank, o: item.line }];
  if (above) lines.unshift({ t: blank, o: -1 });
  if (below) lines.push({ t: blank, o: -1 });
  rows.splice(item.line, 1, ...lines);
  return { rows: finish(o, rows, o.tabSize).rows, cursor: { line: item.line + (above ? 1 : 0), ch: blank.length } };
}
