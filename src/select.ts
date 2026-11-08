// Expand / shrink selection (SPEC.md → Expand / shrink selection). Pure. First the text steps at the
// cursor (word, link, sentence, line, the item's paragraph and own lines, ...), the same either way; then whole
// nodes: Expand up / down adds the next sibling that way, at the edge selects the parent, then the parent's
// siblings, and so on up to the note's top level. Shrink up / down retraces that edge back to the start.
import { Block, Item, Outline, Section, blocksOf, innerBlocks, itemsOf, locate, prefixLen, trimEnd } from "./parse";
import { Pos, partAt } from "./content";

export interface Span {
  from: Pos;
  to: Pos;
}

const WORD = /[\p{L}\p{M}\p{N}_]/u;

/** Paired inline markers: [regex, length of the opening marker, length of the closing marker]. */
const INLINE: [RegExp, number, number][] = [
  [/!?\[\[[^\]\n]*\]\]/g, 2, 2],
  [/!?\[[^\]\n]*\]\([^)\n]*\)/g, 1, 0],
  [/`[^`\n]+`/g, 1, 1],
  [/\*\*[^*\n]+\*\*/g, 2, 2],
  [/__[^_\n]+__/g, 2, 2],
  [/==[^=\n]+==/g, 2, 2],
  [/~~[^~\n]+~~/g, 2, 2],
  [/(?<![*\w])\*[^*\s][^*\n]*\*(?!\*)/g, 1, 1],
  [/(?<![_\w])_[^_\s][^_\n]*_(?![_\w])/g, 1, 1],
  [/\$[^$\n]+\$/g, 1, 1],
];

export function steps(o: Outline, line: number, ch: number): Span[] {
  const text = o.texts[line] ?? "";
  const out: Span[] = [];
  const on = (a: number, b: number): Span => ({ from: { line, ch: a }, to: { line, ch: b } });
  const lines = (a: number, b: number): Span => ({
    from: { line: a, ch: 0 },
    to: { line: b - 1, ch: o.texts[b - 1]!.length },
  });

  // word (by code point: letters outside the BMP are two UTF-16 units)
  const before = (i: number) => (i >= 2 && /[\uDC00-\uDFFF]/.test(text[i - 1]!) ? 2 : 1);
  let a = ch;
  let b = ch;
  while (a > 0 && WORD.test(text.slice(a - before(a), a))) a -= before(a);
  while (b < text.length && WORD.test(String.fromCodePoint(text.codePointAt(b)!)))
    b += text.codePointAt(b)! > 0xffff ? 2 : 1;
  if (b > a) out.push(on(a, b));

  // inline constructs
  const inline: [number, number][] = [];
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

  // sentence, line text, whole line
  const L = o.info[line];
  const cs = L && L.kind !== "front" && L.kind !== "code" ? L.text : (L?.pre ?? 0) + (L?.ws ?? 0);
  const ce = text.trimEnd().length;
  if (ch >= cs && ce > cs) {
    // a full stop inside a link or code span ([[img.png]]) doesn't end a sentence: mask them first
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

  // the steps inside the node at the cursor: an item's code lines, its paragraph and its own lines; a body code
  // block's code lines; a heading section's own body (when it has subsections)
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
    const inner = innerBlocks(o, loc.block).find(b => b.start <= line && line < b.end) ?? null;
    const c = codeLines(o, code ?? (inner?.kind === "code" ? inner : null));
    if (c) out.push(lines(c[0], c[1]));
  }
  return out;
}

// ---- the node steps ----

/**
 * A node Expand selects whole: a heading section, a body block (a list, a paragraph, a code block, a callout,
 * a table), or a list item with its subtree. Lines [from, to), trimmed.
 */
export interface XNode {
  from: number;
  to: number;
  kids: () => XNode[];
}

const blockNode = (o: Outline, b: Block): XNode => ({
  from: b.start,
  to: b.end,
  kids: () =>
    b.kind === "list"
      ? itemsOf(o, b).children.map(it => itemNode(it))
      : b.kind === "quote"
        ? innerBlocks(o, b).map(x => blockNode(o, x))
        : [],
});
const itemNode = (it: Item): XNode => ({ from: it.line, to: it.end, kids: () => it.children.map(itemNode) });
/** A section's children: the blocks of its own body, then its subsections. */
const sectionKids = (o: Outline, s: Section): XNode[] => [
  ...blocksOf(o, s).map(b => blockNode(o, b)),
  ...s.children.map(c => ({ from: c.line, to: trimEnd(o, c.line, c.end), kids: () => sectionKids(o, c) })),
];

/** One level of the cursor's path: the siblings (the parent's children) and which one holds the cursor. */
export interface Level {
  sibs: XNode[];
  k: number;
}

/**
 * Everything Expand can reach from (line, ch): the text steps (pre, smallest first, each inside the next and
 * inside the node at the cursor) and the path of nodes from the deepest one at the cursor (levels[0]) up to the
 * note's top level (the root's children, last). A section's children are its body blocks then its subsections;
 * a list's are its items, an item's its child items, a callout's its inner blocks.
 */
export interface Chain {
  pre: Span[];
  levels: Level[];
}

export function chainAt(o: Outline, line: number, ch: number): Chain {
  const levels: Level[] = [];
  if (line >= o.bodyStart && line < o.texts.length) {
    let sibs = sectionKids(o, o.root);
    for (;;) {
      // a section holds the blank lines up to the next heading; other nodes are trimmed
      const k = sibs.findIndex(n => n.from <= line && (line < n.to || isSection(o, n, line)));
      if (k < 0) break;
      levels.unshift({ sibs, k });
      sibs = sibs[k]!.kids();
    }
  }
  const top = levels[0] ? levels[0].sibs[levels[0].k]! : null;
  const len = lengths(o);
  const size = (s: Span) => off(len, s.to) - off(len, s.from);
  const inside = (a: Span, b: Span) => cmp(a.from, b.from) >= 0 && cmp(a.to, b.to) <= 0;
  const nodeSpan = top ? lineSpan(o, top.from, top.to) : null;
  const pre: Span[] = [];
  for (const s of steps(o, line, ch).sort((x, y) => size(x) - size(y))) {
    if (size(s) <= 0) continue;
    if (nodeSpan && (!inside(s, nodeSpan) || size(s) >= size(nodeSpan))) continue;
    const last = pre[pre.length - 1];
    if (last && (size(s) === size(last) || !inside(last, s))) continue;
    pre.push(s);
  }
  return { pre, levels };
}

/** Whether node n is a heading section containing line (its untrimmed end: the blank lines before the next heading). */
function isSection(o: Outline, n: XNode, line: number): boolean {
  if (o.info[n.from]?.kind !== "heading") return false;
  const s = o.sections.find(x => x.line === n.from);
  return !!s && line < s.end;
}

/**
 * Where an Expand / Shrink is. level -1: the text steps, at pre[p] (p -1: where it started, the cursor).
 * level L >= 0: the run runs[L] of levels[L].sibs (it always holds sibs[k]); runs[0..L-1] are the runs it
 * left below, which Shrink goes back to.
 */
export interface XState {
  level: number;
  p: number;
  runs: { i: number; j: number }[];
}

export const START: XState = { level: -1, p: -1, runs: [] };

/** The lines the state selects; null at the start (the cursor). */
export function spanOf(o: Outline, c: Chain, st: XState): Span | null {
  if (st.level < 0) return st.p < 0 ? null : c.pre[st.p]!;
  const { sibs } = c.levels[st.level]!;
  const r = st.runs[st.level]!;
  return lineSpan(o, sibs[r.i]!.from, sibs[r.j]!.to);
}

function step(c: Chain, st: XState, dir: -1 | 1, grow: boolean): XState | null {
  if (st.level < 0) {
    if (!grow) return st.p >= 0 ? { ...st, p: st.p - 1 } : null;
    if (st.p + 1 < c.pre.length) return { ...st, p: st.p + 1 };
    const l0 = c.levels[0];
    return l0 ? { level: 0, p: st.p, runs: [{ i: l0.k, j: l0.k }] } : null;
  }
  const L = st.level;
  const { sibs, k } = c.levels[L]!;
  const r = st.runs[L]!;
  const runs = st.runs.slice(0, L);
  if (grow) {
    // the next sibling that way; at the edge, the parent (then its siblings); nothing past the top level
    if (dir < 0 ? r.i > 0 : r.j < sibs.length - 1)
      return { ...st, runs: [...runs, dir < 0 ? { i: r.i - 1, j: r.j } : { i: r.i, j: r.j + 1 }] };
    const up = c.levels[L + 1];
    if (!up) return null;
    return { ...st, level: L + 1, runs: [...runs, r, { i: up.k, j: up.k }] };
  }
  // back the way it grew: that edge moves in toward the node at the cursor, then down a level, then the text steps
  if (dir < 0 ? r.i < k : r.j > k)
    return { ...st, runs: [...runs, dir < 0 ? { i: r.i + 1, j: r.j } : { i: r.i, j: r.j - 1 }] };
  if (L > 0) return { ...st, level: L - 1, runs };
  return { level: -1, p: c.pre.length - 1, runs: [] };
}

const same = (a: Span | null, b: Span | null) =>
  a === b || (!!a && !!b && cmp(a.from, b.from) === 0 && cmp(a.to, b.to) === 0);

/**
 * Expand (grow) or Shrink one step toward dir (-1 up, 1 down): the next state whose lines differ (a parent with
 * the same lines as the run, a list with all its items selected say, is passed through). Null when nothing changes.
 */
export function move(o: Outline, c: Chain, st: XState, dir: -1 | 1, grow: boolean): XState | null {
  const was = spanOf(o, c, st);
  for (let s = step(c, st, dir, grow); s; s = step(c, s, dir, grow)) if (!same(spanOf(o, c, s), was)) return s;
  return null;
}

/**
 * The state a selection [from, to] is in the chain: exact when a step selects just that (a run of siblings
 * around the cursor's node, at any level), else the first step that holds it (exact false). Null when none does.
 */
export function stateOf(o: Outline, c: Chain, from: Pos, to: Pos): { st: XState; exact: boolean } | null {
  if (cmp(from, to) === 0) return { st: START, exact: true };
  // whole lines up to the start of the next one: as far as the end of the last
  if (to.ch === 0 && to.line > from.line && from.ch === 0) to = { line: to.line - 1, ch: o.texts[to.line - 1]!.length };
  const sel: Span = { from, to };
  const holds = (s: Span) => cmp(s.from, from) <= 0 && cmp(s.to, to) >= 0;
  for (let p = 0; p < c.pre.length; p++) {
    const s = c.pre[p]!;
    if (holds(s)) return { st: { level: -1, p, runs: [] }, exact: same(s, sel) };
  }
  const runs: { i: number; j: number }[] = [];
  for (let L = 0; L < c.levels.length; L++) {
    const { sibs, k } = c.levels[L]!;
    const end = to.line + 1;
    const exact =
      from.ch === 0 && to.ch === (o.texts[to.line] ?? "").length
        ? { i: sibs.findIndex(n => n.from === from.line), j: sibs.findIndex(n => n.to === end) }
        : null;
    if (exact && exact.i >= 0 && exact.i <= k && exact.j >= k)
      return { st: { level: L, p: c.pre.length - 1, runs: [...runs, exact] }, exact: true };
    const one = { i: k, j: k };
    if (holds(lineSpan(o, sibs[k]!.from, sibs[k]!.to)))
      return { st: { level: L, p: c.pre.length - 1, runs: [...runs, one] }, exact: false };
    runs.push(one);
  }
  return null;
}

const cmp = (a: Pos, b: Pos) => a.line - b.line || a.ch - b.ch;
const lineSpan = (o: Outline, a: number, b: number): Span => ({
  from: { line: a, ch: 0 },
  to: { line: b - 1, ch: o.texts[b - 1]!.length },
});
/** Each line's start offset (line breaks counted), to compare span sizes. */
const lengths = (o: Outline) => {
  const out = [0];
  for (const t of o.texts) out.push(out[out.length - 1]! + t.length + 1);
  return out;
};
const off = (len: number[], p: Pos) => len[p.line]! + p.ch;

/** A fenced (``` / ~~~) code block's code lines, [first, end), when it has any: between its fence lines. */
function codeLines(o: Outline, b: Block | null): [number, number] | null {
  if (!b || b.end - b.start < 2) return null;
  const t = (i: number) => o.texts[i]!.slice(prefixLen(o.texts[i]!, b.q)).trim();
  const open = /^(`{3,}|~{3,})/.exec(t(b.start));
  if (!open) return null;
  const close = t(b.end - 1);
  const closed = close.length >= open[1]!.length && [...close].every(x => x === open[1]![0]);
  const end = closed ? b.end - 1 : b.end;
  return end > b.start + 1 ? [b.start + 1, end] : null;
}
