// Node selection (the repo's SPEC.md, "Editor Outliner" → "Node selection"): a selection of whole sibling
// nodes, list items with their subtrees or heading sections, that Expand selection reaches (or the user selects
// line by line). Pure: finds it in a text selection, extends it by siblings, and removes or copies the nodes.
// The CodeMirror glue (nodesel.ts) keeps it in a StateField and decides when it applies.
import { Item, Outline, Section, isBlank, locate, sectionAt, trimEnd } from "./parse";
import { finish, rowsOf } from "./ops";
import { Edit, Pos, stripItemIndent } from "./content";

export interface NodeSel {
  kind: "item" | "heading";
  /** The node the selection is anchored at (its marker or heading line). */
  anchor: number;
  /** The node it extends to (the anchor for one node); a sibling of the anchor. */
  head: number;
}

/** A node of either hierarchy: its line, its exclusive (trimmed) end, its siblings, parent and children. */
interface Node {
  line: number;
  end: number;
  sibs: number[];
  parent: number | null;
  children: number[];
}

const sectionEnd = (o: Outline, s: Section) => trimEnd(o, s.line, s.end);

function itemAt(o: Outline, line: number): Item | null {
  const it = locate(o, line)?.item;
  return it && it.line === line ? it : null;
}

function nodeAt(o: Outline, kind: NodeSel["kind"], line: number): Node | null {
  if (kind === "item") {
    const it = itemAt(o, line);
    if (!it) return null;
    return {
      line,
      end: it.end,
      sibs: it.parent!.children.map(x => x.line),
      parent: it.parent && it.parent.line >= 0 ? it.parent.line : null,
      children: it.children.map(x => x.line),
    };
  }
  const s = sectionAt(o, line);
  if (s === o.root || s.line !== line || o.info[line]?.kind !== "heading") return null;
  return {
    line,
    end: sectionEnd(o, s),
    sibs: s.parent!.children.map(x => x.line),
    parent: s.parent && s.parent !== o.root ? s.parent.line : null,
    children: s.children.map(x => x.line),
  };
}

/** The selected nodes' lines, first to last. */
export function nodeLines(o: Outline, sel: NodeSel): number[] {
  const a = nodeAt(o, sel.kind, sel.anchor);
  if (!a) return [];
  const i = a.sibs.indexOf(sel.anchor);
  const j = a.sibs.indexOf(sel.head);
  if (j < 0) return [];
  return a.sibs.slice(Math.min(i, j), Math.max(i, j) + 1);
}

/** The lines the selection covers: [first node's line, last node's end). */
export function nodeRange(o: Outline, sel: NodeSel): [number, number] | null {
  const ls = nodeLines(o, sel);
  if (!ls.length) return null;
  return [ls[0]!, nodeAt(o, sel.kind, ls[ls.length - 1]!)!.end];
}

/** The text selection of the nodes: anchor side at the anchor node, from the first line's start to the last line's end. */
export function nodeSpan(o: Outline, sel: NodeSel): { anchor: Pos; head: Pos } | null {
  const r = nodeRange(o, sel);
  if (!r) return null;
  const start = { line: r[0], ch: 0 };
  const end = { line: r[1] - 1, ch: o.texts[r[1] - 1]!.length };
  const back = sel.head < sel.anchor;
  return back ? { anchor: end, head: start } : { anchor: start, head: end };
}

/**
 * The node selection a text selection (anchor, head) is, if any: it starts at the start of a heading or item
 * marker line and ends at the end of the last line of that node or of a later sibling (or at the start of the
 * line after it). A selection from the end backwards is anchored at the last node. Null for anything else,
 * an empty selection, or text before the first heading.
 */
export function nodeSelOf(o: Outline, anchor: Pos, head: Pos): NodeSel | null {
  const fwd = anchor.line < head.line || (anchor.line === head.line && anchor.ch <= head.ch);
  const from = fwd ? anchor : head;
  const to = fwd ? head : anchor;
  if (from.ch !== 0 || (from.line === to.line && from.ch === to.ch)) return null;
  let end: number;
  if (to.line < o.texts.length && to.ch === o.texts[to.line]!.length) end = to.line + 1;
  else if (to.ch === 0 && to.line > from.line) end = to.line;
  else return null;
  for (const kind of ["item", "heading"] as const) {
    const a = nodeAt(o, kind, from.line);
    if (!a) continue;
    const i = a.sibs.indexOf(a.line);
    for (let j = i; j < a.sibs.length; j++) {
      const b = nodeAt(o, kind, a.sibs[j]!)!;
      if (b.end > end) break;
      if (b.end === end) return fwd ? { kind, anchor: a.line, head: b.line } : { kind, anchor: b.line, head: a.line };
    }
  }
  return null;
}

/** ↑ / ↓: the head moves to the previous / next sibling (anchored, so the run grows or shrinks). Null at the edge. */
export function extendSel(o: Outline, sel: NodeSel, dir: -1 | 1): NodeSel | null {
  const h = nodeAt(o, sel.kind, sel.head);
  if (!h) return null;
  const next = h.sibs[h.sibs.indexOf(sel.head) + dir];
  return next === undefined ? null : { ...sel, head: next };
}

/** ←: the nodes' parent (null for top-level items and sections). */
export function parentSel(o: Outline, sel: NodeSel): NodeSel | null {
  const p = nodeAt(o, sel.kind, sel.head)?.parent;
  return p === null || p === undefined ? null : { kind: sel.kind, anchor: p, head: p };
}

/** →: the head node's first child (null without children). */
export function childSel(o: Outline, sel: NodeSel): NodeSel | null {
  const c = nodeAt(o, sel.kind, sel.head)?.children[0];
  return c === undefined ? null : { kind: sel.kind, anchor: c, head: c };
}

/**
 * Backspace / Delete / cut: removes the nodes with their subtrees. Blank lines that separated them from the
 * next sibling go with them; with no sibling after, the blank lines before them go instead (so text after a
 * list doesn't become a lazy continuation of the item above), and none when there are none before. Ordered
 * lists are renumbered. The cursor goes to the start of the next sibling's text, else to the end of the line
 * above.
 */
export function removeNodes(o: Outline, sel: NodeSel): Edit | null {
  const r = nodeRange(o, sel);
  if (!r) return null;
  let [s, e] = r;
  const last = nodeAt(o, sel.kind, nodeLines(o, sel).pop()!)!;
  const after = last.sibs[last.sibs.indexOf(last.line) + 1];
  let b = e;
  while (b < o.texts.length && isBlank(o, b)) b++;
  let a = s;
  while (a > o.bodyStart && isBlank(o, a - 1)) a--;
  if (after !== undefined || a === o.bodyStart) e = b;
  else s = a;
  const rows = rowsOf(o);
  // the first item of an ordered list goes: the next one takes its number (the list keeps its start)
  const first = nodeLines(o, sel)[0]!;
  if (sel.kind === "item" && after !== undefined && last.sibs[0] === first) {
    const num = (i: number) => /^(\d{1,9})[.)]/.exec(o.texts[i]!.slice(o.info[i]!.pre + o.info[i]!.ws));
    const m = num(first);
    const n = num(after);
    if (m && n) {
      const at = o.info[after]!.pre + o.info[after]!.ws;
      rows[after] = { t: rows[after]!.t.slice(0, at) + m[1] + rows[after]!.t.slice(at + n[1]!.length), o: after };
    }
  }
  rows.splice(s, e - s);
  const out = finish(o, rows, o.tabSize).rows;
  if (!out.length) out.push({ t: "", o: -1 });
  let cursor: Pos;
  if (after !== undefined) {
    const k = out.findIndex(x => x.o === after);
    // renumbering may change the marker's width
    cursor = { line: k, ch: o.info[after]!.text + out[k]!.t.length - o.texts[after]!.length };
  } else if (s > 0) cursor = { line: s - 1, ch: out[s - 1]!.t.length };
  else cursor = { line: 0, ch: 0 };
  return { rows: out, cursor };
}

/**
 * Copy / cut: the nodes' Markdown re-based to column 0. List items lose the list's quote prefix (in a callout)
 * and the first node's indent, so relative indentation (children, continuation lines, code beyond the item
 * indent) is kept byte for byte past it. Headings are copied as they are.
 */
export function nodeText(o: Outline, sel: NodeSel): string | null {
  const r = nodeRange(o, sel);
  if (!r) return null;
  const lines = o.texts.slice(r[0], r[1]);
  if (sel.kind === "heading") return lines.join("\n");
  const list = locate(o, r[0])!.list!;
  const col = o.info[r[0]]!.col;
  return lines.map(t => stripItemIndent(t, list.q, col, o.tabSize)).join("\n");
}
