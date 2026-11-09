// Home in a heading or a list (SPEC.md → Keys → Home): where the cursor stops on its way to the line's start.
// Pure: works on the parsed note, no Obsidian or CodeMirror.
import { Item, Outline, locate } from "./parse";

/**
 * The offset in t where the whitespace that starts at from reaches column col; -1 when it doesn't (a tab jumps
 * over the column, or the text starts before it).
 */
function atCol(t: string, from: number, col: number, tabSize: number): number {
  let k = from;
  let c = 0;
  while (c < col && (t[k] === " " || t[k] === "\t")) {
    c += t[k] === "\t" ? tabSize - (c % tabSize) : 1;
    k++;
  }
  return c === col ? k : -1;
}

/**
 * Home's stops on line i, as offsets in the line from right to left, the last one 0; null where Home is Obsidian's
 * (a line that is neither a heading nor a text line of a list item: body text, code, a blank line, a quote in an item).
 * - A heading: the start of its text (after the `#`s), then the line's start.
 * - An item's marker line: the start of its text (after the marker and checkbox), the marker, then one level out
 *   at a time (where each ancestor's marker is), then the line's start.
 * - Another text line of an item: the start of its text, then the item's level and its ancestors' the same way.
 */
export function homeStops(o: Outline, i: number): number[] | null {
  const L = o.info[i];
  if (!L) return null;
  if (L.kind === "heading") return L.text > 0 ? [L.text, 0] : null;
  if (L.kind !== "item" && L.kind !== "text") return null;
  const loc = locate(o, i);
  if (!loc?.item || !loc.list || L.qd !== loc.list.q) return null;
  const t = o.texts[i]!;
  const stops = [L.text];
  const add = (k: number) => {
    if (k >= 0 && k < stops[stops.length - 1]!) stops.push(k);
  };
  const own = i === loc.item.line;
  if (own) add(L.pre + L.ws);
  for (let it: Item | null = own ? loc.item.parent : loc.item; it && it.line >= 0; it = it.parent)
    add(atCol(t, L.pre, it.col, o.tabSize));
  add(0);
  return stops.length > 1 ? stops : null;
}

/** Where Home takes a cursor at offset ch: the nearest stop to its left; at the line's start it stays. */
export const homeTarget = (stops: number[], ch: number): number => stops.find(s => s < ch) ?? 0;
