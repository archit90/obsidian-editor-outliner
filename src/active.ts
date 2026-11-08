// Outline mode's active state (SPEC.md → Outline mode): whether the selection
// lies inside one list, which item the cursor edits, and whether that item is plain enough for the
// Logseq-like keys to take over. Pure: works on the parsed note, no Obsidian or CodeMirror. The keys (enter.ts,
// merge.ts, paste.ts) all start from cleanOwner, and step aside where it finds no item.
import { Block, Outline, isBlank } from "./parse";
import { Owner, ownerAt } from "./content";

/**
 * The item the cursor on line i edits: the item whose own lines contain i (ownerAt), or, for a
 * whitespace-only line right after an item's own lines (only blank lines between), that item when the line's
 * whitespace reaches its content column. Shift+Enter leaves such a line, and the cursor on it is still in the
 * item. An empty line (no whitespace) after a list is outside it: that is the list's boundary.
 */
export function cursorOwner(o: Outline, i: number): Owner | null {
  const w = ownerAt(o, i);
  if (w || i < o.bodyStart || i >= o.texts.length || !isBlank(o, i, true)) return w;
  const L = o.info[i]!;
  if (L.col === 0) return null;
  let k = i - 1;
  while (k >= o.bodyStart && isBlank(o, k, true)) k--;
  if (k < o.bodyStart) return null;
  const above = ownerAt(o, k);
  if (!above || k !== above.item.ownEnd - 1 || L.qd !== above.list.q || L.col < above.item.cc) return null;
  return above;
}

/** The active state: the selection's first and last lines are both in items of one list. */
export interface Active {
  list: Block;
  /** The item the selection starts in. */
  from: Owner;
  /** The item it ends in (the same as from for a cursor). */
  to: Owner;
}

/**
 * Whether lines l0..l1 (the main selection's lines) make outline mode active: both ends in an item's lines
 * (cursorOwner) of the same list. A blank line between items, the blank line after a list, and a selection
 * reaching outside the list or into another list are idle (heading and body semantics).
 */
export function activeAt(o: Outline, l0: number, l1: number): Active | null {
  const a = cursorOwner(o, l0);
  if (!a) return null;
  const b = l1 === l0 ? a : cursorOwner(o, l1);
  if (!b || b.list !== a.list) return null;
  return { list: a.list, from: a, to: b };
}

/**
 * Whether the item's own lines form a clean tree node: every non-blank line after the marker line is indented
 * to the item's content column (text, code and quote lines alike) at the list's quote depth. A lazy
 * continuation line (unindented text glued to the item) or code that falls out of the item's indent isn't:
 * the keys step aside there and Obsidian's own apply.
 */
export function cleanItem(o: Outline, w: Owner): boolean {
  const { item, list } = w;
  for (let i = item.line + 1; i < item.ownEnd; i++) {
    const L = o.info[i]!;
    if (isBlank(o, i, true) || (L.kind === "code" && L.empty)) continue;
    if (L.qd > list.q) {
      // a quote indented under the item (in a callout the quote's own `>` nest instead)
      if (list.q === 0 && L.qcol < item.cc) return false;
      continue;
    }
    if (L.qd !== list.q || L.col < item.cc) return false;
  }
  return true;
}

/** The item the cursor on line i edits (cursorOwner), when it is a clean tree node (cleanItem): what the keys act on. */
export function cleanOwner(o: Outline, i: number): Owner | null {
  const w = cursorOwner(o, i);
  return w && cleanItem(o, w) ? w : null;
}
