// Drag handles (SPEC.md "Drag handles"): what a handle drags, where it can be dropped, and the drop itself.
// Pure: the view code maps the pointer to a target and an option.
import {
  Block,
  Item,
  Outline,
  Section,
  blocksOf,
  flatItems,
  innerBlocks,
  isBlank,
  itemsOf,
  listsOf,
  locate,
  sectionAt,
} from "./parse";
import { Ctx, Row, childCol, finish, listCtx, padBlank, relevel, relocate, rowsOf, shift } from "./ops";

export type Source =
  | { kind: "heading"; s: Section }
  | { kind: "item"; it: Item; list: Block; block: Block; section: Section }
  | { kind: "block"; b: Block; section: Section };

export function sourceAt(o: Outline, line: number): Source | null {
  const loc = locate(o, line);
  if (!loc) return null;
  if (loc.onHeading) return { kind: "heading", s: loc.section };
  if (loc.item && loc.list && loc.block)
    return { kind: "item", it: loc.item, list: loc.list, block: loc.block, section: loc.section };
  if (loc.block) return { kind: "block", b: loc.block, section: loc.section };
  return null;
}

export const sourceLine = (src: Source) =>
  src.kind === "heading" ? src.s.line : src.kind === "item" ? src.it.line : src.b.start;

/** The source's own depth on screen, the same scale as Option.depth. */
export const sourceDepth = (src: Source) =>
  src.kind === "heading" ? src.s.level - 1 : src.kind === "item" ? src.it.depth : 0;

export interface Option {
  /** Heading level, or item indent column; unused for blocks. */
  value: number;
  /** Indentation step on screen: heading level - 1, or item depth. */
  depth: number;
}

export interface Target {
  /** Insert before this line (the note's line count = at the end). */
  line: number;
  options: Option[];
}

export function targets(o: Outline, src: Source, ctx: Ctx): Target[] {
  if (src.kind === "heading") return headingTargets(o, src.s);
  if (src.kind === "item") return itemTargets(o, src, ctx);
  return blockTargets(o, src.b, src.section);
}

function headingTargets(o: Outline, s: Section): Target[] {
  const n = o.texts.length;
  const out: Target[] = [];
  const lines = [...o.sections.filter(x => x.line < s.line || x.line >= s.end).map(x => x.line), s.line, n];
  for (const p of [...new Set(lines)].sort((a, b) => a - b)) {
    if (p === s.end && p !== s.line) continue; // same spot as s.line
    const nextLine = p === s.line ? s.end : p;
    const lNext = nextLine < n ? o.info[nextLine]!.level : 1;
    const q = p === s.line ? s.line - 1 : p - 1;
    const prev = q >= o.bodyStart ? sectionAt(o, q) : o.root;
    const lPrev = prev === o.root ? 0 : prev.level;
    // from a sibling of the next heading (or shallower) down to a child of the previous one
    const options: Option[] = [];
    const lo = Math.min(lNext, lPrev + 1);
    const hi = Math.max(lNext, lPrev + 1);
    for (let l = lo; l <= hi; l++) options.push({ value: l, depth: l - 1 });
    out.push({ line: p, options });
  }
  return out;
}

function itemTargets(o: Outline, src: { it: Item; list: Block; block: Block; section: Section }, ctx: Ctx): Target[] {
  const { it } = src;
  const lc = listCtx(o, src.list, ctx);
  // lists in the same body (or, for a callout's list, in the same callout)
  const lists =
    src.list.q > 0
      ? innerBlocks(o, src.block).filter(b => b.kind === "list")
      : listsOf(o, src.section).filter(b => b.q === 0);
  const out: Target[] = [];
  const inSrc = (x: Item) => x.line >= it.line && x.line < it.end;
  const same = sameSpot(o, it, src.list);
  for (const b of lists) {
    const items = flatItems(itemsOf(o, b)).filter(x => !inSrc(x));
    // the deepest item (not in the source) covering each line of the list, in one pass
    const deepest: (Item | null)[] = new Array(b.end - b.start).fill(null);
    for (const x of items) for (let l = x.line; l < Math.max(x.end, x.line + 1); l++) deepest[l - b.start] = x;
    const lines = [...items.map(x => x.line), b.end];
    if (b === src.list) lines.push(it.line);
    for (const p of [...new Set(lines)].sort((x, y) => x - y)) {
      if (b === src.list && p !== it.line && same(p)) continue;
      let q = b === src.list && same(p) ? it.line - 1 : p - 1;
      if (q >= it.line && q < it.end) q = it.line - 1;
      while (q >= b.start && isBlank(o, q, true)) q--;
      const prev = q >= b.start ? deepest[q - b.start]! : null;
      const options: Option[] = [];
      if (!prev) options.push({ value: items[0]?.col ?? it.col, depth: 0 });
      else {
        const chain: Item[] = [];
        for (let x: Item | null = prev; x && x.line >= 0; x = x.parent) chain.unshift(x);
        chain.forEach((x, d) => options.push({ value: x.col, depth: d }));
        options.push({ value: childCol(prev, lc, inSrc), depth: chain.length });
      }
      out.push({ line: p, options });
    }
  }
  return out;
}

/** Drop positions that leave the item where it is: its own line up to the next non-blank line after it. */
function sameSpot(o: Outline, it: Item, list: Block): (p: number) => boolean {
  let next = it.end;
  while (next < list.end && isBlank(o, next, true)) next++;
  return p => p >= it.line && p <= next;
}

function blockTargets(o: Outline, b: Block, section: Section): Target[] {
  const all = blocksOf(o, section);
  const lines = [...all.map(x => x.start), all[all.length - 1]!.end];
  const k = all.indexOf(b);
  const after = all[k + 1]?.start ?? b.end;
  return lines.filter(p => p !== after || p === b.start).map(line => ({ line, options: [{ value: 0, depth: 0 }] }));
}

/** The note's rows after dropping src before line p with the chosen option, or null for no change. */
export function drop(o: Outline, src: Source, p: number, opt: Option, ctx: Ctx): Row[] | null {
  let rows = rowsOf(o);
  if (src.kind === "heading") {
    const { s } = src;
    const same = p === s.line || p === s.end;
    if (same && opt.value === s.level) return null;
    relevel(o, rows, s.line, s.end, opt.value - s.level);
    if (same) return rows;
    const [moved, at] = relocate(rows, s.line, s.end, p);
    const e = at + (s.end - s.line);
    // a section that ended the note may have no blank line after it
    return padBlank(moved, at, e);
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

/** Where a chunk was removed, two runs of blank lines meet: keep only the longer run. */
function closeSeam(rows: Row[], seam: number): Row[] {
  const blank = (i: number) => (rows[i]?.t.trim() ?? "x") === "";
  let g1 = 0;
  while (blank(seam - 1 - g1)) g1++;
  let g2 = 0;
  while (blank(seam + g2)) g2++;
  // at the top of the note, no blank lines above the next block; at the end, none after the last one
  if (seam === 0) return rows.slice(g2);
  if (seam + g2 === rows.length) return [...rows.slice(0, seam - g1), ...rows.slice(seam)];
  const cut = Math.min(g1, g2);
  return cut ? [...rows.slice(0, seam), ...rows.slice(seam + cut)] : rows;
}
