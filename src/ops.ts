// Indent / outdent / move on the outline (the repo's SPEC.md, "Editor Outliner"). Pure: an operation takes the parsed note and the selected
// line span and returns the note's new lines as rows. Each row remembers which old line it came from (o, -1
// for an inserted line), so the caller can map the cursor and folds to the new text.
import {
  Item,
  Outline,
  Section,
  Block,
  blocksOf,
  bodyRange,
  buildOutline,
  columns,
  flatItems,
  itemsOf,
  listsOf,
  locate,
  prefixLen,
  sectionAt,
  siblingRun,
  trimEnd,
} from "./parse";

export interface Row {
  t: string;
  o: number;
}

export interface Ctx {
  tabSize: number;
  /** The editor's indent unit: "\t" or some spaces. */
  unit: string;
  /** Logical outdenting (setting): outdented nodes move after their parent's subtree. */
  logical: boolean;
}

/**
 * null: not for us (let Obsidian handle the key); "noop": ours, but nothing to do. A result with rows can
 * carry a notice for the user.
 */
export type OpResult = { rows: Row[]; notice?: string } | { error: string } | "noop" | null;

export const rowsOf = (o: Outline): Row[] => o.texts.map((t, i) => ({ t, o: i }));
const blankRow = (): Row => ({ t: "", o: -1 });
const isBlankRow = (r: Row | undefined) => !!r && r.t.trim() === "";

export const unitCols = (ctx: Ctx) => (ctx.unit === "\t" || ctx.unit === "" ? ctx.tabSize : ctx.unit.length);

export function makeWs(col: number, ctx: Ctx): string {
  if (ctx.unit === "\t") return "\t".repeat(Math.floor(col / ctx.tabSize)) + " ".repeat(col % ctx.tabSize);
  return " ".repeat(col);
}

/**
 * The indent style of an existing list wins over the editor's: a list indented with spaces keeps spaces in
 * an editor set to tabs, and the other way round.
 */
export function listCtx(o: Outline, list: Block, ctx: Ctx): Ctx {
  for (let i = list.start; i < list.end; i++) {
    const L = o.info[i]!;
    if (L.kind !== "item" || L.ws === 0 || L.qd !== list.q) continue;
    const ws = o.texts[i]!.slice(L.pre, L.pre + L.ws);
    if (ws.includes("\t")) return { ...ctx, unit: "\t" };
    return { ...ctx, unit: ctx.unit === "\t" ? " ".repeat(ctx.tabSize) : ctx.unit };
  }
  return ctx;
}

/** Removes `cols` columns of leading whitespace from ws (a tab that only partly fits becomes spaces). */
export function dropCols(ws: string, cols: number, tabSize: number): string {
  let c = 0;
  let k = 0;
  while (k < ws.length && c < cols) {
    const w = ws[k] === "\t" ? tabSize - (c % tabSize) : 1;
    if (c + w > cols) return " ".repeat(c + w - cols) + ws.slice(k + 1);
    c += w;
    k++;
  }
  return ws.slice(k);
}

/**
 * Re-indents rows[s, e) by delta columns. The rows must still hold their original text. Item lines and
 * plain continuation lines get their indent rebuilt in the list's style; a code line only has its item
 * indent (up to its item's content column) rebuilt, so the code's own whitespace beyond it stays byte for
 * byte; a quote indented under an item moves its `>`. q is the quote depth of the list (inside a callout,
 * the indent after the `>` changes).
 */
export function shift(o: Outline, rows: Row[], s: number, e: number, delta: number, ctx: Ctx, q = 0) {
  if (delta === 0) return;
  for (let i = s; i < e; i++) {
    const r = rows[i]!;
    if (r.o < 0) continue;
    const L = o.info[r.o]!;
    if (L.kind === "blank") continue;
    if (L.kind === "code") {
      // the list's own prefix: a code line's text may start with `>` or whitespace of its own
      const p = prefixLen(r.t, q);
      const ws = /^[ \t]*/.exec(r.t.slice(p))![0];
      if (p + ws.length === r.t.length && ws === "") continue;
      const lead = Math.min(columns(ws, ctx.tabSize), locate(o, r.o)?.item?.cc ?? Infinity);
      r.t =
        r.t.slice(0, p) +
        makeWs(Math.max(0, lead + delta), ctx) +
        dropCols(ws, lead, ctx.tabSize) +
        r.t.slice(p + ws.length);
      continue;
    }
    if (L.empty) continue;
    if (L.qd > q) {
      // a quote under a list item: its indent is the spaces before the `>`
      const lead = r.t.length - r.t.trimStart().length;
      r.t = makeWs(Math.max(0, L.qcol + delta), ctx) + r.t.slice(lead);
      continue;
    }
    const head = r.t.slice(0, L.pre);
    const tail = r.t.slice(L.pre + L.ws);
    r.t = head + makeWs(Math.max(0, L.col + delta), ctx) + tail;
  }
}

/** Adds delta `#` to every heading in rows[s, e) (original text). Returns how many became deeper than H6. */
export function relevel(o: Outline, rows: Row[], s: number, e: number, delta: number): number {
  let deep = 0;
  for (let i = s; i < e; i++) {
    const r = rows[i]!;
    const L = r.o >= 0 ? o.info[r.o]! : null;
    if (!L || L.kind !== "heading") continue;
    const level = Math.max(1, L.level + delta);
    if (level > 6 && L.level <= 6) deep++;
    r.t = r.t.slice(0, L.ws) + "#".repeat(level) + r.t.slice(L.ws + L.level);
  }
  return deep;
}

export const deepNotice = (n: number) =>
  n
    ? `${n} heading${n > 1 ? "s are" : " is"} now deeper than H6. Obsidian shows ${n > 1 ? "them" : "it"} as text: ` +
      "links to it, the Outline and folding won't see it."
    : undefined;

/** Moves rows[s, e) to before index at (at <= s or at >= e). Returns the rows and the chunk's new start. */
export function relocate(rows: Row[], s: number, e: number, at: number): [Row[], number] {
  if (at >= e)
    return [[...rows.slice(0, s), ...rows.slice(e, at), ...rows.slice(s, e), ...rows.slice(at)], at - (e - s)];
  return [[...rows.slice(0, at), ...rows.slice(s, e), ...rows.slice(at, s), ...rows.slice(e)], at];
}

/** Puts a blank row before and after rows[s, e) where the neighbour isn't blank. */
export function padBlank(rows: Row[], s: number, e: number): Row[] {
  const out = [...rows];
  if (e < out.length && !isBlankRow(out[e - 1]) && !isBlankRow(out[e])) out.splice(e, 0, blankRow());
  if (s > 0 && !isBlankRow(out[s - 1])) out.splice(s, 0, blankRow());
  return out;
}

/** Swaps adjacent ranges A = [a0, a1) and B = [b0, b1) (a1 <= b0), keeping the blank gap between them. */
function swap(o: Outline, a0: number, a1: number, b0: number, b1: number, forceBlank: boolean): Row[] {
  const rows = rowsOf(o);
  const aE = trimEnd(o, a0, a1);
  const bE = trimEnd(o, b0, b1);
  let gap = rows.slice(aE, b0);
  if (forceBlank && gap.length === 0) gap = [blankRow()];
  return [...rows.slice(0, a0), ...rows.slice(b0, bE), ...gap, ...rows.slice(a0, aE), ...rows.slice(bE)];
}

// ---- what the selection covers ----

export function hasHeading(o: Outline, l0: number, l1: number): boolean {
  for (let i = Math.max(l0, o.bodyStart); i <= l1 && i < o.texts.length; i++)
    if (o.info[i]!.kind === "heading") return true;
  return false;
}

export function headingRun(o: Outline, l0: number, l1: number): Section[] | null {
  if (!hasHeading(o, l0, l1)) return null;
  let a = sectionAt(o, l0);
  if (a === o.root) a = o.sections.find(s => s.line >= l0)!;
  return siblingRun(a, sectionAt(o, l1));
}

/**
 * The list items the selection covers, when it lies within one list. A selection that starts on a blank line
 * between items starts at the next item; one that leaves the list is not a list selection.
 */
export function itemRun(o: Outline, l0: number, l1: number): { run: Item[]; list: Block } | null {
  const A = locate(o, l0);
  if (!A) return null;
  let a = A.item;
  const list = A.list;
  if (!list) return null;
  if (!a) {
    a = flatItems(itemsOf(o, list)).find(x => x.line >= l0 && x.line <= l1) ?? null;
    if (!a) return null;
  }
  const B = l1 === l0 ? A : locate(o, l1);
  if (B?.list !== list) return null;
  let b = B.item;
  if (!b) {
    // l1 on a blank line inside the list: the last item that starts before it
    b =
      flatItems(itemsOf(o, list))
        .filter(x => x.line <= l1)
        .pop() ?? a;
  }
  if (b.line < a.line) b = a;
  return { run: siblingRun(a, b), list };
}

export function blockRun(o: Outline, l0: number, l1: number): { all: Block[]; i0: number; i1: number } | null {
  const s = sectionAt(o, l0);
  if (l0 < o.bodyStart || (s !== o.root && s.line === l0)) return null;
  const all = blocksOf(o, s);
  const [, bEnd] = bodyRange(o, s);
  const hi = Math.min(l1, bEnd - 1);
  const i0 = all.findIndex(b => b.end > l0);
  let i1 = -1;
  all.forEach((b, k) => {
    if (b.start <= hi) i1 = k;
  });
  if (i0 < 0 || i1 < i0 || all[i0]!.start > hi) return null;
  return { all, i0, i1 };
}

/** Where a new child of `prev` goes: its existing children's indent, else one unit in (and past its marker). */
export function childCol(prev: Item, ctx: Ctx, exclude?: (x: Item) => boolean): number {
  const kid = prev.children.find(x => !exclude?.(x));
  return kid?.col ?? Math.max(prev.col + unitCols(ctx), prev.cc);
}

// ---- operations ----

export function indent(o: Outline, l0: number, l1: number, ctx: Ctx): OpResult {
  const hs = headingRun(o, l0, l1);
  if (hs) {
    const rows = rowsOf(o);
    const deep = relevel(o, rows, hs[0]!.line, hs[hs.length - 1]!.end, 1);
    return { rows, notice: deepNotice(deep) };
  }
  const ir = itemRun(o, l0, l1);
  if (!ir) return null;
  const lc = listCtx(o, ir.list, ctx);
  const first = ir.run[0]!;
  const last = ir.run[ir.run.length - 1]!;
  const sibs = first.parent!.children;
  const k = sibs.indexOf(first);
  if (k === 0) return "noop";
  const rows = rowsOf(o);
  shift(o, rows, first.line, last.end, childCol(sibs[k - 1]!, lc) - first.col, lc, ir.list.q);
  return finish(o, rows, ctx.tabSize);
}

export function outdent(o: Outline, l0: number, l1: number, ctx: Ctx): OpResult {
  const hs = headingRun(o, l0, l1);
  if (hs) {
    if (hs.some(s => s.level <= 1)) return { error: "An H1 heading can't be outdented." };
    const first = hs[0]!;
    const end = hs[hs.length - 1]!.end;
    let rows = rowsOf(o);
    relevel(o, rows, first.line, end, -1);
    const P = first.parent!;
    if (ctx.logical && P !== o.root && P.end > end) {
      const [moved, at] = relocate(rows, first.line, end, P.end);
      rows = padBlank(moved, at, at + (end - first.line));
    }
    return { rows };
  }
  const ir = itemRun(o, l0, l1);
  if (!ir) return null;
  const lc = listCtx(o, ir.list, ctx);
  const first = ir.run[0]!;
  const last = ir.run[ir.run.length - 1]!;
  const P = first.parent!;
  if (P.line < 0) return "noop";
  let rows = rowsOf(o);
  shift(o, rows, first.line, last.end, P.col - first.col, lc, ir.list.q);
  if (ctx.logical && P.end > last.end) [rows] = relocate(rows, first.line, last.end, P.end);
  return finish(o, rows, ctx.tabSize);
}

export function move(o: Outline, l0: number, l1: number, dir: -1 | 1, ctx: Ctx): OpResult {
  const hs = headingRun(o, l0, l1);
  if (hs) {
    const first = hs[0]!;
    const last = hs[hs.length - 1]!;
    const sibs = first.parent!.children;
    const k0 = sibs.indexOf(first);
    const other = dir < 0 ? sibs[k0 - 1] : sibs[k0 + hs.length];
    if (!other) return "noop";
    const rows =
      dir < 0
        ? swap(o, other.line, other.end, first.line, last.end, true)
        : swap(o, first.line, last.end, other.line, other.end, true);
    return { rows };
  }
  const ir = itemRun(o, l0, l1);
  if (ir) {
    const lc = listCtx(o, ir.list, ctx);
    const first = ir.run[0]!;
    const last = ir.run[ir.run.length - 1]!;
    const P = first.parent!;
    const sibs = P.children;
    const k0 = sibs.indexOf(first);
    const other = dir < 0 ? sibs[k0 - 1] : sibs[k0 + ir.run.length];
    if (other) {
      const rows =
        dir < 0
          ? swap(o, other.line, other.end, first.line, last.end, false)
          : swap(o, first.line, last.end, other.line, other.end, false);
      return finish(o, rows, ctx.tabSize);
    }
    // at the edge: jump to the nearest item at the parent's depth
    if (P.line < 0) return "noop";
    const flat = flatItems(itemsOf(o, ir.list));
    const target =
      dir < 0
        ? flat.filter(x => x.depth === P.depth && x.line < P.line).pop()
        : flat.find(x => x.depth === P.depth && x.line >= P.end);
    if (!target) return "noop";
    let rows = rowsOf(o);
    shift(o, rows, first.line, last.end, childCol(target, lc) - first.col, lc, ir.list.q);
    [rows] = relocate(rows, first.line, last.end, dir < 0 ? target.end : target.ownEnd);
    return finish(o, rows, ctx.tabSize);
  }
  const br = blockRun(o, l0, l1);
  if (!br) return null;
  const { all, i0, i1 } = br;
  const other = dir < 0 ? all[i0 - 1] : all[i1 + 1];
  if (!other) return "noop";
  const a = all[i0]!;
  const b = all[i1]!;
  const rows =
    dir < 0
      ? swap(o, other.start, other.end, a.start, b.end, true)
      : swap(o, a.start, b.end, other.start, other.end, true);
  return finish(o, rows, ctx.tabSize);
}

// ---- ordered lists ----

/**
 * Renumbers the ordered lists the change touched: a row is touched when its text changed or it no longer
 * follows the row it used to follow (moved, or something was removed or inserted just before it).
 */
export function finish(o: Outline, rows: Row[], tabSize = 4): { rows: Row[] } {
  const touched = new Set<number>();
  rows.forEach((r, i) => {
    const follows = i === 0 ? r.o === 0 : rows[i - 1]!.o >= 0 && r.o === rows[i - 1]!.o + 1;
    if (r.o < 0 || r.t !== o.texts[r.o] || !follows) touched.add(i);
  });
  return { rows: renumber(rows, touched, tabSize) };
}

const ORDERED = /^(\d{1,9})([.)])/;

export function renumber(rows: Row[], touched: Set<number> | null, tabSize = 4): Row[] {
  const o = buildOutline(
    rows.map(r => r.t),
    tabSize,
  );
  const out = rows.map(r => ({ ...r }));
  const num = (it: Item) => {
    const L = o.info[it.line]!;
    const m = ORDERED.exec(o.texts[it.line]!.slice(L.pre + L.ws));
    return m ? { n: Number(m[1]), len: m[1]!.length, at: L.pre + L.ws, delim: m[2]! } : null;
  };
  const fix = (parent: Item) => {
    let run: Item[] = [];
    const flush = () => {
      // only runs whose items (or their children) the change touched; other lists stay as they are
      const hit = (x: Item) => {
        for (let i = x.line; i < Math.max(x.end, x.line + 1); i++) if (touched!.has(i)) return true;
        return false;
      };
      // a list the change touched, or one under an item the change touched (its parent moved or changed)
      if (run.length && (!touched || run.some(hit) || touched.has(parent.line))) {
        // a list of one is new here (an item indented on its own, or children left under an outdented
        // item): it starts at 1; a longer one keeps its lowest number
        let n = run.length === 1 && touched ? 1 : Math.min(...run.map(x => num(x)!.n));
        for (const it of run) {
          const m = num(it)!;
          const r = out[it.line]!;
          r.t = r.t.slice(0, m.at) + String(n++) + r.t.slice(m.at + m.len);
        }
      }
      run = [];
    };
    for (const c of parent.children) {
      const m = num(c);
      if (!m || (run.length && num(run[0]!)!.delim !== m.delim)) flush();
      if (m) run.push(c);
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
