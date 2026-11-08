// Multi-block items (SPEC.md → Multi-block items): an item's own lines hold
// paragraphs and fenced code blocks, indented to the item's content column (cc). Pure: works on the parsed
// note, no Obsidian or CodeMirror.
//
// The item indent is the list's quote prefix (`> ` in a callout) plus cc columns of whitespace. It is the
// only part of a code line our operations add or remove: whatever whitespace a code line has beyond it is
// the code's own and stays byte for byte.
import { Block, Item, Outline, columns, isBlank, locate, prefixLen } from "./parse";
import { Ctx, Row, dropCols, listCtx, makeWs, rowsOf } from "./ops";

export interface Pos {
  line: number;
  ch: number;
}

/** An item and the list it lives in. */
export interface Owner {
  item: Item;
  list: Block;
}

/** The item whose own lines (marker line up to its first child, trimmed) contain line i. */
export function ownerAt(o: Outline, i: number): Owner | null {
  const loc = locate(o, i);
  if (!loc?.item || !loc.list) return null;
  const it = loc.item;
  return i >= it.line && i < it.ownEnd ? { item: it, list: loc.list } : null;
}

/** A change to the note: its new rows, and where the cursor goes in them. */
export interface Edit {
  rows: Row[];
  cursor: Pos;
}

/** The quote prefix of the item's marker line (`> ` in a callout): every line of the list starts with it. */
export function quotePrefix(o: Outline, w: Owner): string {
  const t = o.texts[w.item.line]!;
  return t.slice(0, prefixLen(t, w.list.q));
}

/** A blank line inside the item's list: its quote prefix without the trailing space (empty outside callouts). */
export const quoteBlank = (o: Outline, w: Owner) => quotePrefix(o, w).trimEnd();

/** What goes before a new line to put it in the item: the quote prefix and cc columns in the list's style. */
export function itemIndent(o: Outline, w: Owner, ctx: Ctx): string {
  return quotePrefix(o, w) + makeWs(w.item.cc, listCtx(o, w.list, ctx));
}

/** An item marker: bullet or number, the gap after it, a checkbox (with the gap after it). */
export const MARKER = /^([-*+]|\d{1,9}[.)])([ \t]*)(\[.\][ \t]*)?/;

/** The marker part of an item line (bullet or number, the gap after it, a checkbox), split up. */
export function markerOf(o: Outline, line: number) {
  const L = o.info[line]!;
  const m = MARKER.exec(o.texts[line]!.slice(L.pre + L.ws, L.text))!;
  return { bullet: m[1]!, gap: m[2] || " ", task: !!m[3] };
}

/** The item's text: its marker line after the marker and checkbox. */
export const itemText = (o: Outline, it: Item) => o.texts[it.line]!.slice(o.info[it.line]!.text);

/** Nothing after the marker (or checkbox) and no own lines below it. */
export const emptyItem = (o: Outline, it: Item) => itemText(o, it).trim() === "" && it.ownEnd === it.line + 1;

/** Where the line's own text starts: after the marker (and checkbox) on the marker line, else after the item indent. */
export function textStart(o: Outline, w: Owner, line: number): number {
  if (line === w.item.line) return o.info[line]!.text;
  return indentEnd(o.texts[line]!, w.list.q, w.item.cc, o.tabSize);
}

/** Where the item indent of line t ends: after the quote prefix and the whitespace covering cc columns. */
export function indentEnd(t: string, q: number, cc: number, tabSize: number): number {
  let k = prefixLen(t, q);
  let c = 0;
  while (k < t.length && c < cc && (t[k] === " " || t[k] === "\t")) {
    c += t[k] === "\t" ? tabSize - (c % tabSize) : 1;
    k++;
  }
  return k;
}

/** t without the item indent: the quote prefix and up to cc columns of leading whitespace removed. */
export function stripItemIndent(t: string, q: number, cc: number, tabSize: number): string {
  const p = prefixLen(t, q);
  const ws = /^[ \t]*/.exec(t.slice(p))![0];
  return dropCols(ws, cc, tabSize) + t.slice(p + ws.length);
}

const FENCE = /^(`{3,}|~{3,})/;

export interface CodeBlock {
  /** The opening fence line. */
  start: number;
  /** Exclusive: the line after the closing fence (or after the last line of an unclosed block). */
  end: number;
  /** The code lines between the fences: [innerStart, innerEnd). */
  innerStart: number;
  innerEnd: number;
  owner: Owner;
}

/** The fenced (``` / ~~~) code block in an item's own lines that line i is part of, fence lines included. */
export function codeBlockAt(o: Outline, i: number): CodeBlock | null {
  const L = o.info[i];
  if (!L || L.kind !== "code") return null;
  let s = i;
  while (s > o.bodyStart && o.info[s - 1]!.fence === L.fence) s--;
  let e = i + 1;
  while (e < o.texts.length && o.info[e]!.fence === L.fence) e++;
  const S = o.info[s]!;
  const open = FENCE.exec(o.texts[s]!.slice(S.pre + S.ws));
  if (!open) return null;
  const owner = ownerAt(o, s);
  if (!owner || S.qd !== owner.list.q) return null;
  const last = o.texts[e - 1]!;
  const lc = last.slice(prefixLen(last, owner.list.q)).trim();
  const closed = e - 1 > s && lc.length >= open[1]!.length && [...lc].every(x => x === open[1]![0]);
  return { start: s, end: e, innerStart: s + 1, innerEnd: closed ? e - 1 : e, owner };
}

/** A paragraph or code block of an item's own lines: [start, end). code: the fenced block, if it is one. */
export interface Part {
  start: number;
  end: number;
  code: CodeBlock | null;
}

/**
 * An item's own lines split into parts separated by blank lines: paragraphs (the first one starts with the
 * marker line), code blocks (any opaque block: fenced code, math, comments) and quotes indented under it.
 */
export function partsOf(o: Outline, w: Owner): Part[] {
  const out: Part[] = [];
  const { item } = w;
  const q = w.list.q;
  let i = item.line;
  while (i < item.ownEnd) {
    if (isBlank(o, i, true)) {
      i++;
      continue;
    }
    const L = o.info[i]!;
    let j = i + 1;
    if (L.kind === "code") {
      while (j < item.ownEnd && o.info[j]!.fence === L.fence) j++;
      out.push({ start: i, end: j, code: codeBlockAt(o, i) });
    } else {
      const quoted = L.qd > q;
      while (j < item.ownEnd && !isBlank(o, j, true) && o.info[j]!.kind !== "code" && o.info[j]!.qd > q === quoted) j++;
      out.push({ start: i, end: j, code: null });
    }
    i = j;
  }
  return out;
}

/** The part of its item's own lines that line i is in. */
export function partAt(o: Outline, i: number): Part | null {
  const w = ownerAt(o, i);
  return w ? (partsOf(o, w).find(p => p.start <= i && i < p.end) ?? null) : null;
}

// ---- commands ----

/** Whether "Insert code block in item" applies on line (it is in an item's own lines), without building its rows. */
export const canInsertCodeBlock = (o: Outline, line: number) => ownerAt(o, line) !== null;

/**
 * "Insert code block in item": a fenced block (```lang, an empty line, ```) after the item's own lines, before
 * its children, indented to its content column, with no blank lines around it. The cursor goes on the empty
 * line. Null when line isn't in an item's own lines.
 */
export function insertCodeBlock(o: Outline, line: number, lang: string, ctx: Ctx): Edit | null {
  const w = ownerAt(o, line);
  if (!w) return null;
  const ind = itemIndent(o, w, ctx);
  const at = w.item.ownEnd;
  const rows = rowsOf(o);
  rows.splice(at, 0, { t: ind + "```" + lang, o: -1 }, { t: ind, o: -1 }, { t: ind + "```", o: -1 });
  return { rows, cursor: { line: at + 1, ch: ind.length } };
}

// ---- code-indent rules ----

/**
 * Enter on line i of a fenced code block in an item: the new line's leading text. That is the line's own
 * prefix and indent when it reaches the item's content column (item indent + the code's own indent), else the
 * item indent. Null when line i isn't in such a block.
 */
export function codeNewline(o: Outline, i: number, ctx: Ctx): string | null {
  const cb = codeBlockAt(o, i);
  if (!cb) return null;
  const t = o.texts[i]!;
  const p = prefixLen(t, cb.owner.list.q);
  const ws = /^[ \t]*/.exec(t.slice(p))![0];
  if (columns(ws, o.tabSize) >= cb.owner.item.cc) return t.slice(0, p + ws.length);
  return itemIndent(o, cb.owner, ctx);
}

/**
 * Copying a selection that lies in one fenced code block in an item (fence lines included): the text with
 * the item indent removed from every line, so it pastes as plain code anywhere. Null when the rule doesn't
 * apply (or changes nothing: a selection within one line).
 */
export function codeCopyText(o: Outline, from: Pos, to: Pos): string | null {
  if (from.line === to.line) return null;
  const cb = codeBlockAt(o, from.line);
  if (!cb || to.line < cb.start || to.line >= cb.end) return null;
  const q = cb.owner.list.q;
  const cc = cb.owner.item.cc;
  const out: string[] = [];
  for (let l = from.line; l <= to.line; l++) {
    const t = o.texts[l]!;
    const a = l === from.line ? from.ch : 0;
    const b = l === to.line ? to.ch : t.length;
    // a piece starting past the indent is plain text; one starting in it loses the whole indent
    out.push(a >= indentEnd(t, q, cc, o.tabSize) ? t.slice(a, b) : stripItemIndent(t.slice(0, b), q, cc, o.tabSize));
  }
  return out.join("\n");
}

/**
 * Pasting multi-line text into a fenced code block in an item (between its fences): the first line goes at
 * the cursor as is, every later line gets the item indent (an empty line only the quote prefix), so the code
 * stays in the item. Null when the rule doesn't apply.
 */
export function codePasteText(o: Outline, from: Pos, to: Pos, text: string, ctx: Ctx): string | null {
  const ls = text.split(/\r\n?|\n/);
  if (ls.length < 2) return null;
  const cb = codeBlockAt(o, from.line);
  if (!cb) return null;
  const inner = (l: number) => l >= cb.innerStart && l < cb.innerEnd;
  if (!inner(from.line) || !inner(to.line)) return null;
  const ind = itemIndent(o, cb.owner, ctx);
  const q = cb.owner.list.q;
  const pre = ind.slice(0, prefixLen(ind, q)).trimEnd();
  const tt = o.texts[to.line]!;
  // the text after the selection starts the last pasted line: give that line the indent unless the rest
  // still has it (the selection ended inside the indent)
  const restIndented = to.ch < indentEnd(tt, q, cb.owner.item.cc, o.tabSize);
  return ls
    .map((l, k) => {
      if (k === 0) return l;
      if (k === ls.length - 1 && restIndented) return l;
      return l === "" && k < ls.length - 1 ? pre : ind + l;
    })
    .join("\n");
}
