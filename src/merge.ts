// Outline mode's Backspace and Delete (the repo's SPEC.md, "Editor Outliner" → "Outline mode"), after Logseq's
// editor.cljs: Backspace at the start of an item merges it into the item above, Delete at the end of an item
// pulls the next one in, and the item indent of continuation and code lines is invisible to both. Pure: works
// on the parsed note; the folded items come in as data (their marker lines). Each function returns the new
// rows and cursor, "noop" (the key is ours but nothing happens), or null (Obsidian's own key applies).
import { Block, Item, Outline, columns, flatItems, isBlank, itemsOf, prefixLen } from "./parse";
import { Ctx, Row, childCol, finish, listCtx, rowsOf, shift } from "./ops";
import { Owner, Pos, codeBlockAt, indentEnd, itemIndent, stripItemIndent } from "./content";
import { cleanItem, cursorOwner } from "./active";
import { Edit, MARKER, quoteBlank } from "./enter";

export type KeyResult = Edit | "noop" | null;

/** The clean item a cursor (not a selection: Obsidian deletes that) edits. */
function owner(o: Outline, from: Pos, to: Pos): Owner | null {
  if (from.line !== to.line || from.ch !== to.ch) return null;
  const w = cursorOwner(o, from.line);
  return w && cleanItem(o, w) ? w : null;
}

const textOf = (o: Outline, it: Item) => o.texts[it.line]!.slice(o.info[it.line]!.text);

/** Nothing after the marker (or checkbox) and no own lines below it. */
const emptyItem = (o: Outline, it: Item) => textOf(o, it).trim() === "" && it.ownEnd === it.line + 1;

/**
 * The item just above s in document order that the reader sees: an item hidden in a folded item counts as
 * the outermost folded item around it (one that doesn't contain s).
 */
function prevVisible(o: Outline, list: Block, s: Item, folded: ReadonlySet<number>): Item | null {
  const flat = flatItems(itemsOf(o, list));
  const k = flat.indexOf(s);
  if (k <= 0) return null;
  let best = flat[k - 1]!;
  for (let x = best; x.parent && x.parent.line >= 0; x = x.parent)
    if (folded.has(x.parent.line) && x.parent.end <= s.line) best = x.parent;
  return best;
}

/** Whether the item indent of line t is all there (its whitespace reaches cc columns after the quote prefix). */
function fullIndent(t: string, q: number, cc: number, tabSize: number): boolean {
  const p = prefixLen(t, q);
  return columns(t.slice(p, indentEnd(t, q, cc, tabSize)), tabSize) >= cc;
}

/**
 * Merges item s into item t (Logseq's merge on Backspace / Delete). t is s's parent (s its first child) or the
 * item just above s in document order (folded children of t then come before s). s's text is appended to t's
 * last own line (a new line at t's content column when that line is code or a quote: text glued to a fence
 * would break it); s's other own lines follow t's own lines, re-indented to t's content column (a code line's
 * own whitespace beyond the indent stays byte for byte); s's children become t's children, in place: after
 * t's existing children, or where s was when t is its parent. Returns the rows (renumbered) and two cursor
 * spots: the join (where the merged text starts) and the end of t's text before the merge.
 */
function mergeInto(o: Outline, list: Block, t: Item, s: Item, ctx: Ctx): { rows: Row[]; join: Pos; end: Pos } {
  const q = list.q;
  const lc = listCtx(o, list, ctx);
  const rows = rowsOf(o);
  const parent = s.parent === t;
  if (s.children.length) {
    const col = parent ? s.col : childCol(t, lc);
    shift(o, rows, s.ownEnd, s.end, col - s.children[0]!.col, lc, q);
  }
  const wt = { item: t, list };
  const ind = itemIndent(o, wt, ctx);
  const last = t.ownEnd - 1;
  const LL = o.info[last]!;
  const glue = last === t.line || (LL.kind === "text" && LL.qd === q);
  const sText = textOf(o, s);
  const lastRow = { ...rows[last]! };
  const endCh = lastRow.t.length;
  const own: Row[] = [];
  let extra = false;
  if (glue) lastRow.t += sText;
  else if (sText.trim()) {
    own.push({ t: ind + sText, o: s.line });
    extra = true;
  }
  for (let i = s.line + 1; i < s.ownEnd; i++)
    own.push({
      t: o.info[i]!.empty ? quoteBlank(o, wt) : ind + stripItemIndent(o.texts[i]!, q, s.cc, o.tabSize),
      o: i,
    });
  // blank lines between t's subtree (its own lines, when it is s's parent) and s go
  const tEnd = parent ? t.ownEnd : t.end;
  const next = [
    ...rows.slice(0, last),
    lastRow,
    ...own,
    ...rows.slice(t.ownEnd, tEnd),
    ...rows.slice(s.ownEnd, s.end),
    ...rows.slice(s.end),
  ];
  const out = finish(o, next, o.tabSize).rows;
  // renumbering may change the marker's width on t's line
  const d = out[last]!.t.length - next[last]!.t.length;
  return {
    rows: out,
    join: extra ? { line: last + 1, ch: ind.length } : { line: last, ch: endCh + d },
    end: { line: last, ch: endCh + d },
  };
}

/** Joins line b onto line a (a < b) as one text change: a's text, then b's without its item indent. */
function join(o: Outline, a: number, head: string, b: number, rest: string): Edit {
  const rows = rowsOf(o);
  rows[a] = { t: head + rest, o: a };
  rows.splice(b, 1);
  return { rows, cursor: { line: a, ch: head.length } };
}

/**
 * Backspace at a cursor (Logseq rules):
 * - At the start of an item's text (anywhere in its marker): merge into the previous visible item (mergeInto).
 *   That item blank (no text, no own lines, no children) and not the parent: it is deleted instead. A folded
 *   previous item stays folded (the merged children go under the fold); one whose own lines below its marker
 *   are folded away takes nothing (the text would land out of sight). The first item of the list: nothing
 *   happens, unless it is empty with no children (Obsidian's Backspace).
 * - Right after a task's checkbox: the checkbox goes (the item stays, the next Backspace merges).
 * - The item indent is invisible: at the start of a continuation line's text, or in a fenced code line's
 *   leading whitespace up to the item indent, the line joins the one above (the indent goes with the line
 *   break). A blank line above simply goes. Next to a fence line, or a continuation line under a code block or
 *   quote, nothing happens (joining would break the block). A code line's own indent beyond the item's is
 *   text, as is anything after the cursor's spot.
 */
export function backspace(o: Outline, from: Pos, to: Pos, ctx: Ctx, folded: ReadonlySet<number>): KeyResult {
  const w = owner(o, from, to);
  if (!w) return null;
  const { item: s, list } = w;
  const q = list.q;
  const line = from.line;
  const t = o.texts[line]!;
  const L = o.info[line]!;
  if (L.qd > q) return null;

  if (line === s.line) {
    const m = MARKER.exec(t.slice(L.pre + L.ws, L.text))!;
    const bulletEnd = L.pre + L.ws + m[1]!.length + m[2]!.length;
    if (m[3] && from.ch === L.text) {
      const rows = rowsOf(o);
      rows[line] = { t: t.slice(0, bulletEnd) + t.slice(L.text), o: line };
      return { rows, cursor: { line, ch: bulletEnd } };
    }
    if (from.ch > L.text) return null;
    const p = prevVisible(o, list, s, folded);
    if (!p) return emptyItem(o, s) && !s.children.length ? null : "noop";
    if (p !== s.parent && emptyItem(o, p) && !p.children.length) {
      // the blank item above goes, with the blank lines between it and s
      const rows = rowsOf(o);
      rows.splice(p.line, s.line - p.line);
      const out = finish(o, rows, o.tabSize).rows;
      return { rows: out, cursor: { line: p.line, ch: L.text + out[p.line]!.t.length - t.length } };
    }
    if (folded.has(p.line) && p.ownEnd > p.line + 1) return "noop";
    const res = mergeInto(o, list, p, s, ctx);
    return { rows: res.rows, cursor: res.join };
  }

  // a continuation or code line (or the whitespace-only line just after the item's own lines)
  const ie = indentEnd(t, q, s.cc, o.tabSize);
  if (from.ch > ie) return null;
  const a = line - 1;
  const A = o.info[a]!;
  if (L.kind === "code") {
    const cb = codeBlockAt(o, line);
    if (!cb || cb.owner.item !== s) return null;
    if (line <= cb.innerStart || line >= cb.innerEnd) return "noop";
  } else if (L.kind !== "text" && L.kind !== "blank") return null;
  else if (a !== s.line && (A.kind === "code" || A.qd > q || (A.kind !== "text" && !isBlank(o, a, true))))
    return "noop";
  const at = o.texts[a]!;
  const head =
    a === s.line || fullIndent(at, q, s.cc, o.tabSize)
      ? at
      : itemIndent(o, w, ctx) + at.slice(indentEnd(at, q, s.cc, o.tabSize));
  return join(o, a, head, line, t.slice(ie));
}

/**
 * Delete at a cursor at the end of a line (Logseq rules):
 * - At the end of the item's text (its last own line): the next visible item merges in (its first child when
 *   its children show, else the item after it), its text at the cursor and its children under this item.
 *   Nothing happens on a folded item, or on the last item of the list.
 * - At the end of a continuation or fenced code line: the next line joins it, without its item indent (an
 *   empty line below just goes). Nothing happens where that would glue text to a fence line, code or a quote.
 */
export function deleteForward(o: Outline, from: Pos, to: Pos, ctx: Ctx, folded: ReadonlySet<number>): KeyResult {
  const w = owner(o, from, to);
  if (!w) return null;
  const { item: t, list } = w;
  const q = list.q;
  const line = from.line;
  const tx = o.texts[line]!;
  const L = o.info[line]!;
  if (L.qd > q || from.ch !== tx.length) return null;
  if (folded.has(t.line) || line >= t.ownEnd) return "noop";

  if (line < t.ownEnd - 1) {
    const b = line + 1;
    const B = o.info[b]!;
    if (L.kind === "code") {
      const cb = codeBlockAt(o, line);
      if (!cb || cb.owner.item !== t) return null;
      if (line < cb.innerStart || line >= cb.innerEnd - 1) return "noop";
    } else if (L.kind !== "text" && L.kind !== "item" && L.kind !== "blank") return null;
    else if (B.kind === "code" || B.qd > q || (B.kind !== "text" && !isBlank(o, b, true))) return "noop";
    const bt = o.texts[b]!;
    return join(o, line, tx, b, bt.slice(indentEnd(bt, q, t.cc, o.tabSize)));
  }

  let n: Item | undefined = t.children[0];
  if (!n) {
    const flat = flatItems(itemsOf(o, list));
    n = flat[flat.indexOf(t) + 1];
  }
  if (!n) return "noop";
  const res = mergeInto(o, list, t, n, ctx);
  return { rows: res.rows, cursor: res.end };
}
