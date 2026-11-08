// The one change that turns a note's lines into an operation's new rows, found without building the whole note
// as a string: the lines before the first and after the last differing line are skipped, and only a window of
// whole lines around them is compared character by character. The result is exactly the change a character
// diff of the two whole texts gives (their common prefix, then the common suffix of the rest), which is what
// the editor dispatches and Obsidian's renumbering reads. Pure: no Obsidian or CodeMirror.

export interface RowChange {
  /** Replace [from, to) of the old text (offsets) with insert. */
  from: number;
  to: number;
  insert: string;
  /** The first line that differs (the same index in both). */
  first: number;
  /** Exclusive ends of the differing lines: in the old lines and in the new rows (the lines after are equal). */
  oldEnd: number;
  newEnd: number;
}

/**
 * The change from old (the note's lines) to rows (the new lines), or null when they are the same. lineStart(i)
 * is the offset of old line i in the old text.
 */
export function rowChange(
  old: readonly string[],
  rows: readonly { t: string }[],
  lineStart: (i: number) => number,
): RowChange | null {
  const nO = old.length;
  const nN = rows.length;
  const m = Math.min(nO, nN);
  let first = 0;
  while (first < m && old[first] === rows[first]!.t) first++;
  if (first === nO && first === nN) return null;
  let oldEnd = nO;
  let newEnd = nN;
  while (oldEnd > first && newEnd > first && old[oldEnd - 1] === rows[newEnd - 1]!.t) {
    oldEnd--;
    newEnd--;
  }
  // whole lines around the differing ones: an equal line before them (the line break before the first one is
  // part of a change that appends or removes lines) and one after, where there are such lines
  const w0 = Math.max(0, first - 1);
  const oldW1 = Math.min(nO, oldEnd + 1);
  const newW1 = Math.min(nN, newEnd + 1);
  const tail = oldW1 < nO;
  const lines: string[] = [];
  for (let i = w0; i < newW1; i++) lines.push(rows[i]!.t);
  const oldWin = old.slice(w0, oldW1).join("\n") + (tail ? "\n" : "");
  const newWin = lines.join("\n") + (tail ? "\n" : "");
  // no rows and one empty line are the same empty text
  if (oldWin === newWin) return null;
  const max = Math.min(oldWin.length, newWin.length);
  let p = 0;
  while (p < max && oldWin.charCodeAt(p) === newWin.charCodeAt(p)) p++;
  let q = 0;
  while (q < max - p && oldWin.charCodeAt(oldWin.length - 1 - q) === newWin.charCodeAt(newWin.length - 1 - q)) q++;
  const base = lineStart(w0);
  return {
    from: base + p,
    to: base + oldWin.length - q,
    insert: newWin.slice(p, newWin.length - q),
    first,
    oldEnd,
    newEnd,
  };
}
