// Outline mode's Paste (the repo's SPEC.md, "Editor Outliner" → "Outline mode"), after Logseq's paste.cljs:
// Markdown blocks become items placed by the target item, a code block alone goes into the current item,
// other multi-line text stays in the item. Pure: works on the parsed note and the clipboard text (the glue
// picks the text the way Obsidian would, Markdown converted from HTML included). Pasting inside a code block
// in an item is the code-indent rule of Multi-block items (content.ts), which comes first.
import { Item, Outline, blocksOf, buildOutline, columns, itemsOf, parseLines } from "./parse";
import { Ctx, Row, finish, listCtx, makeWs, rowsOf, unitCols } from "./ops";
import {
  Edit,
  MARKER,
  Owner,
  Pos,
  codeBlockAt,
  emptyItem,
  itemIndent,
  markerOf,
  quoteBlank,
  quotePrefix,
  stripItemIndent,
  textStart,
} from "./content";
import { cleanOwner } from "./active";

/** A pasted block as an item: its marker (null: the neighbour's), its text line, own lines, children. */
export interface PItem {
  marker: { bullet: string; gap: string; box: string } | null;
  text: string;
  /** The lines below the text line, without the item indent; "" for a blank line. */
  own: string[];
  kids: PItem[];
}

const FENCE_OPEN = /^[ \t]*(`{3,}|~{3,})/;
/**
 * Logseq's markdown-blocks? (a bullet or heading at a line start), plus ordered markers (`1.` / `1)`: pasted
 * numbered lists become items too), a fence, or `$$`.
 */
const BLOCKS = /^[ \t]*(?:(?:[-+*]|#+|\d{1,9}[.)])[ \t]+|`{3,}|~{3,}|\$\$)/m;

/** The lines without leading and trailing blank lines. */
function trimBlank(ls: string[]): string[] {
  let a = 0;
  let b = ls.length;
  while (a < b && ls[a]!.trim() === "") a++;
  while (b > a && ls[b - 1]!.trim() === "") b--;
  return ls.slice(a, b);
}

/** Whether the lines are one closed fenced code block and nothing else. */
export function codeAlone(ls: string[]): boolean {
  if (ls.length < 2 || !FENCE_OPEN.test(ls[0]!)) return false;
  // a line after the block isn't code exactly when the last line closes it
  const info = parseLines(["", ...ls, "x"]).info;
  const id = info[1]!.fence;
  return id >= 0 && ls.every((_, k) => info[k + 1]!.fence === id) && info[ls.length + 1]!.kind !== "code";
}

export type PasteKind = "code" | "blocks" | "plain";

/**
 * What a paste is: a code block alone; Markdown blocks (a list marker, numbered too, or heading at a line start, a fence or
 * `$$` anywhere) or paragraphs separated by blank lines; else plain text.
 */
export function pasteKind(lines: string[]): PasteKind {
  const ls = trimBlank(lines);
  if (codeAlone(ls)) return "code";
  if (BLOCKS.test(ls.join("\n")) || ls.some(l => l.trim() === "")) return "blocks";
  return "plain";
}

/** Drops n columns of leading whitespace from t (a line's own indentation beyond n stays as it is). */
const dropLead = (t: string, n: number, tabSize: number) => stripItemIndent(t, 0, n, tabSize);

/** The columns of t's leading whitespace. */
const leadCols = (t: string, tabSize: number) => columns(/^[ \t]*/.exec(t)![0], tabSize);

/**
 * The pasted text as a list of items (Logseq's block parsing): list items keep their tree, markers and own
 * lines (continuation paragraphs, code); a heading becomes an item with its `#`s, a paragraph right under it
 * joins it; every other block (paragraph, code block, table, quote) becomes an item of its own. A code (or
 * math, comment) block can't start on a marker line here, so such an item has an empty text line and the
 * block below it.
 */
export function toItems(lines: string[], tabSize: number): PItem[] {
  // a leading empty line: a pasted "---" is never frontmatter
  const o = buildOutline(["", ...trimBlank(lines)], tabSize);
  const out: PItem[] = [];
  const chunk = (s: number, e: number): PItem => {
    const base = leadCols(o.texts[s]!, tabSize);
    const ls: string[] = [];
    for (let i = s; i < e; i++) ls.push(o.info[i]!.empty ? "" : dropLead(o.texts[i]!, base, tabSize));
    if (o.info[s]!.kind === "code") return { marker: null, text: "", own: ls, kids: [] };
    return { marker: null, text: ls[0]!, own: ls.slice(1), kids: [] };
  };
  const fromItem = (it: Item): PItem => {
    const L = o.info[it.line]!;
    const t = o.texts[it.line]!;
    const m = MARKER.exec(t.slice(L.pre + L.ws, L.text))!;
    const own: string[] = [];
    for (let i = it.line + 1; i < it.ownEnd; i++)
      own.push(o.info[i]!.empty ? "" : stripItemIndent(o.texts[i]!, 0, it.cc, tabSize));
    return {
      marker: { bullet: m[1]!, gap: m[2] || " ", box: m[3] ?? "" },
      text: t.slice(L.text),
      own,
      kids: it.children.map(fromItem),
    };
  };
  for (const s of [o.root, ...o.sections]) {
    let head: PItem | null = null;
    if (s !== o.root) {
      head = { marker: null, text: o.texts[s.line]!.trim(), own: [], kids: [] };
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

/**
 * The lines of pasted items at column col: the top-level ones with the marker top (the item they sit next to:
 * one list keeps one marker type), keeping their checkbox; children one indent unit in and past the marker,
 * with their own markers. Own lines get the item's content column; their text beyond it stays as it is.
 */
function render(
  items: PItem[],
  col: number,
  top: { bullet: string; gap: string } | null,
  prefix: string,
  blank: string,
  lc: Ctx,
): string[] {
  const out: string[] = [];
  for (const p of items) {
    const mk = top ?? p.marker ?? { bullet: "-", gap: " " };
    const head = prefix + makeWs(col, lc) + mk.bullet + mk.gap;
    out.push(head + (p.marker?.box ?? "") + p.text);
    const cc = parseLines([head + "x"], lc.tabSize).info[0]!.cc;
    for (const s of p.own) out.push(s === "" ? blank : prefix + makeWs(cc, lc) + s);
    out.push(...render(p.kids, Math.max(col + unitCols(lc), cc), null, prefix, blank, lc));
  }
  return out;
}

export interface PasteEdit extends Edit {
  /** A plain insert (typing-like) rather than new items. */
  plain: boolean;
}

/**
 * Pasted Markdown blocks (toItems) placed by the target item w, wherever the cursor is in it (Logseq):
 * - an empty item (no text, no own lines) without children is replaced by them; also one with children when
 *   one block is pasted (the children stay under it);
 * - an item with unfolded children: they become its first children;
 * - otherwise: its next siblings, after its subtree.
 * A whitespace-only line the cursor was on just past the item's own lines goes. The cursor goes to the end
 * of the last pasted line. Ordered lists are renumbered.
 */
function pasteBlocks(o: Outline, w: Owner, line: number, items: PItem[], ctx: Ctx, folded: ReadonlySet<number>): Edit {
  const { item: t, list } = w;
  const lc = listCtx(o, list, ctx);
  const prefix = quotePrefix(o, w);
  const blank = quoteBlank(o, w);
  const empty = emptyItem(o, t);
  let at: number;
  let del = 0;
  let col: number;
  let tpl: number;
  if (empty && (!t.children.length || items.length === 1)) {
    at = t.line;
    del = 1;
    col = t.col;
    tpl = t.line;
  } else if (t.children.length && !folded.has(t.line)) {
    at = t.children[0]!.line;
    col = t.children[0]!.col;
    tpl = at;
  } else {
    at = t.end;
    col = t.col;
    tpl = t.line;
  }
  const m = markerOf(o, tpl);
  const fresh: Row[] = render(items, col, { bullet: m.bullet, gap: m.gap }, prefix, blank, lc).map(x => ({
    t: x,
    o: -1,
  }));
  let rows = rowsOf(o);
  rows.splice(at, del, ...fresh);
  if (line >= t.ownEnd) rows = rows.filter(r => r.o !== line);
  const lastRow = fresh[fresh.length - 1]!;
  const k = rows.indexOf(lastRow);
  const out = finish(o, rows, o.tabSize).rows;
  return { rows: out, cursor: { line: k, ch: out[k]!.t.length } };
}

/**
 * Paste at from..to (one line) in outline mode's active state: null when the rule doesn't apply (Obsidian's
 * paste does). See pasteKind for what the text is:
 * - a code block alone: new lines after the cursor's line (after the code block, on a fence line), at the
 *   item's content column; the code's own indentation relative to its opening fence stays byte for byte;
 * - Markdown blocks: items (toItems), placed by pasteBlocks; a selection within the line goes first;
 * - plain text over several lines: inserted at the cursor (replacing a selection), every line after the first
 *   at the item's content column (the lines' common indentation removed), so it stays in the item. One line
 *   of plain text: Obsidian's paste.
 * Not in a quote under the item, nor on a code line (except a code block alone on a fence line), nor in an
 * item that isn't a clean tree.
 */
export function paste(
  o: Outline,
  from: Pos,
  to: Pos,
  text: string,
  ctx: Ctx,
  folded: ReadonlySet<number>,
): PasteEdit | null {
  if (from.line !== to.line) return null;
  const line = from.line;
  const w = cleanOwner(o, line);
  if (!w) return null;
  const L = o.info[line]!;
  if (L.qd > w.list.q) return null;
  const all = text.split(/\r\n?|\n/);
  const ls = trimBlank(all);
  if (!ls.length) return null;
  const kind = pasteKind(ls);
  const onCode = L.kind === "code";
  const t = o.texts[line]!;
  const sc = onCode ? 0 : textStart(o, w, line);
  const a = Math.max(from.ch, sc);
  const b = Math.max(to.ch, sc);

  if (kind === "plain") {
    if (all.length < 2 || onCode) return null;
    const ind = itemIndent(o, w, ctx);
    const rest = all.slice(1);
    const min = Math.min(...rest.filter(l => l.trim() !== "").map(l => leadCols(l, o.tabSize)), Infinity);
    const ins = [
      all[0]!,
      ...rest.map(l => (l.trim() === "" ? ind : ind + dropLead(l, min === Infinity ? 0 : min, o.tabSize))),
    ];
    const rows = rowsOf(o);
    const n = ins.length;
    const fresh: Row[] = ins.map((x, k) => ({
      t: (k === 0 ? t.slice(0, a) : "") + x + (k === n - 1 ? t.slice(b) : ""),
      o: k === 0 ? line : -1,
    }));
    rows.splice(line, 1, ...fresh);
    return { rows, cursor: { line: line + n - 1, ch: ins[n - 1]!.length }, plain: true };
  }

  if (kind === "code") {
    const base = leadCols(ls[0]!, o.tabSize);
    const ind = itemIndent(o, w, ctx);
    const blank = quoteBlank(o, w);
    const fresh = ls.map(l => {
      const d = dropLead(l, base, o.tabSize);
      return { t: d === "" ? blank : ind + d, o: -1 };
    });
    const cb = onCode ? codeBlockAt(o, line) : null;
    if (onCode && !cb) return null;
    const rows = rowsOf(o);
    const at = cb ? cb.end : line + 1;
    rows.splice(at, 0, ...fresh);
    const k = at + fresh.length - 1;
    return { rows, cursor: { line: k, ch: rows[k]!.t.length }, plain: false };
  }

  if (onCode) return null;
  let oo = o;
  let ww: Owner | null = w;
  if (b > a) {
    // the selection goes first; then the item is judged as it is without it
    const texts = [...o.texts];
    texts[line] = t.slice(0, a) + t.slice(b);
    oo = buildOutline(texts, o.tabSize);
    ww = cleanOwner(oo, line);
    if (!ww) return null;
  }
  return { ...pasteBlocks(oo, ww, line, toItems(ls, o.tabSize), ctx, folded), plain: false };
}
