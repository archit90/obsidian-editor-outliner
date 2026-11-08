// Ordered-list numbering exactly as Obsidian does it (SPEC.md → Indent / outdent → Renumbering). Obsidian 1.15 renumbers ordered lists in a transactionFilter on every editor change (app.js:
// skipped only for userEvent "set" / "input.renumber", table cells and IME composition) and merges its edits into
// the same transaction. The plugin numbers its own changes the same way, so Obsidian finds nothing to change: the
// result is the same whether or not Obsidian's filter runs, and undo restores a note Obsidian leaves alone.
// Pure: a port of that filter for one changed range (what applyRows dispatches), lines in, lines out.

/** Obsidian's list line: prefix (quotes and whitespace), marker (bullet or number + delimiter + space, box). */
const MARK = /^([>\s]*)(([*+-] |(\d+)([.)] ))(?:\[(.)\] )?)?/;
/** Lines that end a list for Obsidian when no blank line came first: quotes, headings, rules, fences. */
const BREAK = /^\s*(?:> |#{1,6} |([-_*])(\s*\1){2,}\s*$|~~~|```)/;

const quoteDepth = (prefix: string) => (prefix.match(/>/g) || []).length;

/** Obsidian's nesting level of a prefix: whole tabs or 4-space groups (after the last `>` and one space). */
function level(prefix: string): number {
  let n = 0;
  let s = prefix;
  const units = () => {
    for (;;) {
      if (s.startsWith("\t")) s = s.substring(1);
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

const mark = (t: string) => MARK.exec(t)!;

/** The number of the previous item at the same level and quote depth in the same list, or null (1-based line t). */
function prevNumber(lines: string[], t: number, lvl: number, depth: number): number | null {
  let seenText = false;
  for (let s = t - 1; s >= 1; s--) {
    const text = lines[s - 1]!;
    const c = mark(text);
    const d = quoteDepth(c[1]!);
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
    const h = level(c[1]!);
    if (h === lvl && d === depth) return c[4] ? parseInt(c[4], 10) : null;
    if (h < lvl || d < depth) break;
  }
  return null;
}

/** The first number of the list line t is in (scanning up), 1 when none: where a list's numbering starts. */
function listStart(lines: string[], t: number, lvl: number, depth: number): number {
  let n = 1;
  let seenText = false;
  for (let s = t; s >= 1; s--) {
    const text = lines[s - 1]!;
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
    const d = level(c[1]!);
    const h = quoteDepth(c[1]!);
    if (d === lvl && h === depth && c[4]) n = parseInt(c[4], 10);
    if (d < lvl || h < depth) break;
  }
  return n;
}

/** A number rewritten on a line (0-based): at column at, the marker's text grows by delta characters. */
export interface NumberEdit {
  line: number;
  at: number;
  delta: number;
}

/**
 * The new lines with ordered lists numbered as Obsidian would after the change from oldLines to newLines (one
 * changed range: the common prefix and suffix are unchanged), and the number edits it made.
 */
export function renumberLikeObsidian(oldLines: string[], newLines: string[]): { lines: string[]; edits: NumberEdit[] } {
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
  // CodeMirror's invertedDesc.mapPos (assoc -1): a position in the new note to the old one
  const back = (pos: number) =>
    pos < fromB ? pos : pos < toB ? fromA : pos === toB && toB === fromB ? fromA : pos - toB + toA;

  const startsOf = (lines: string[]) => {
    const st: number[] = [];
    let acc = 0;
    for (const t of lines) {
      st.push(acc);
      acc += t.length + 1;
    }
    return st;
  };
  const startB = startsOf(newLines);
  const startA = startsOf(oldLines);
  /** 1-based line number containing pos. */
  const lineAt = (starts: number[], pos: number) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid]! <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  const out = [...newLines];
  const edits: NumberEdit[] = [];
  const setNumber = (ln: number, at: number, len: number, insert: string) => {
    const t = out[ln - 1]!;
    out[ln - 1] = t.slice(0, at) + insert + t.slice(at + len);
    edits.push({ line: ln - 1, at, delta: insert.length - len });
  };
  const done = new Set<number>();
  const visit = (hn: number) => {
    if (done.has(hn)) return;
    done.add(hn);
    const ht = newLines[hn - 1]!;
    const u = mark(ht);
    if (!u[0] || !u[4]) return;
    const prefix = u[1]!;
    const lvl = level(prefix);
    const depth = quoteDepth(prefix);
    let b = prevNumber(newLines, hn, lvl, depth);
    if (b === null) {
      // the first item of its list: its own number when its marker changed, else where the list started
      b = 1;
      const hFrom = startB[hn - 1]!;
      const hTo = hFrom + ht.length;
      const old = oldLines[lineAt(startA, back(hTo)) - 1]!;
      const E = mark(old);
      if (fromB <= hTo && toB >= hFrom && E[2] !== u[2]) b = parseInt(u[4], 10);
      else if (level(E[1]!) === lvl) b = listStart(oldLines, lineAt(startA, back(hTo)), lvl, quoteDepth(E[1]!));
    } else b++;
    if (String(b) !== u[4]) setNumber(hn, prefix.length, u[3]!.length, b + u[5]!);
    // the items after it at its level, until one already has the right number
    let blank = false;
    for (let w = hn + 1; w <= newLines.length && !done.has(w); w++) {
      const kt = newLines[w - 1]!;
      if (!kt) {
        blank = true;
        continue;
      }
      const x = mark(kt);
      if (!x[0]) {
        if (blank || BREAK.test(kt)) break;
        continue;
      }
      const E = level(x[1]!);
      const C = quoteDepth(x[1]!);
      if (x[1] && !x[2]) continue;
      if (E === lvl && C === depth) {
        if (!x[4]) break;
        b++;
        if (String(b) === x[4]) {
          done.add(w);
          break;
        }
        setNumber(w, x[1]!.length, x[3]!.length, b + x[5]!);
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
