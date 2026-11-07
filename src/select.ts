// Expand-selection steps (the repo's SPEC.md, "Expand / shrink selection"). Pure: lists every range the cursor's
// position grows through, smallest first; the caller picks the first one that strictly contains the
// current selection.
import { Item, Outline, Section, bodyRange, locate, trimEnd } from "./parse";

export interface Pos {
  line: number;
  ch: number;
}
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

  // outline nodes
  const loc = locate(o, line);
  if (!loc) return out;
  const own = (s: Section) => lines(s.line, Math.max(trimEnd(o, s.line, s.bodyEnd), s.line + 1));
  const whole = (s: Section) => lines(s.line, trimEnd(o, s.line, s.end));
  if (!loc.onHeading && loc.block) {
    if (loc.item) {
      for (let it: Item | null = loc.item; it && it.line >= 0; it = it.parent) {
        if (it === loc.item) out.push(lines(it.line, it.ownEnd));
        out.push(lines(it.line, it.end));
      }
    }
    out.push(lines(loc.block.start, loc.block.end));
  }
  for (let s: Section | null = loc.section; s; s = s.parent) {
    if (s === o.root) {
      const [b0, be] = bodyRange(o, s);
      let bs = b0;
      while (bs < be && o.info[bs]!.kind === "blank") bs++;
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
