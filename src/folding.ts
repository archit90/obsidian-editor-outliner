// Folding commands (SPEC.md → Folding). Uses Obsidian's own fold ranges (CodeMirror's foldable(), which
// Obsidian's fold service answers for headings and list items), so folds look and persist like native ones.
import { EditorView } from "@codemirror/view";
import { StateEffect } from "@codemirror/state";
import { foldEffect, foldable, foldedRanges, unfoldEffect } from "@codemirror/language";
import { Notice } from "obsidian";
import { locate } from "./parse";
import { outlineOf } from "./editor";

interface Node {
  line: number;
  /** Exclusive last line. */
  end: number;
  children: number[];
}

/** The node at the cursor: the deepest list item, else the section (null in text before any heading). */
function nodeAt(view: EditorView): Node | null {
  const o = outlineOf(view.state);
  const line = view.state.doc.lineAt(view.state.selection.main.head).number - 1;
  const loc = locate(o, line);
  if (!loc) return null;
  if (loc.item) return { line: loc.item.line, end: loc.item.end, children: loc.item.children.map(c => c.line) };
  const s = loc.section;
  if (s === o.root) return null;
  return { line: s.line, end: s.end, children: s.children.map(c => c.line) };
}

function foldLine(view: EditorView, line: number) {
  const l = view.state.doc.line(line + 1);
  const r = foldable(view.state, l.from, l.to);
  return r ? foldEffect.of(r) : null;
}

/** Unfold effects for every fold that starts on a line in [from, to] (0-based lines). */
function unfoldLines(view: EditorView, from: number, to: number) {
  const doc = view.state.doc;
  const a = doc.line(from + 1).from;
  const b = doc.line(Math.min(to, doc.lines - 1) + 1).to;
  const out: StateEffect<unknown>[] = [];
  foldedRanges(view.state).between(a, b, (f, t) => {
    if (f >= a && f <= b) out.push(unfoldEffect.of({ from: f, to: t }));
  });
  return out;
}

/** Applies the effects; says so when there was nothing to fold (Obsidian's fold settings, or H7+). */
function run(view: EditorView, effects: (StateEffect<unknown> | null)[], folding = false) {
  const e = effects.filter((x): x is StateEffect<unknown> => !!x);
  if (e.length) view.dispatch({ effects: e });
  else if (folding)
    new Notice(
      'Nothing to fold here. Folding needs "Fold heading" and "Fold indent" on in Settings → Editor; headings deeper than H6 can\'t fold.',
    );
}

export function foldNode(view: EditorView) {
  const n = nodeAt(view);
  run(view, n ? [foldLine(view, n.line)] : [], true);
}

export function unfoldNode(view: EditorView) {
  const n = nodeAt(view);
  if (n) run(view, unfoldLines(view, n.line, n.line));
}

export function foldChildren(view: EditorView) {
  const n = nodeAt(view);
  if (!n) return run(view, [], true);
  const folds = n.children.map(c => foldLine(view, c));
  if (!folds.some(f => f)) return run(view, [], true);
  run(view, [...unfoldLines(view, n.line, n.line), ...folds]);
}

export function unfoldSubtree(view: EditorView) {
  const n = nodeAt(view);
  if (n) run(view, unfoldLines(view, n.line, n.end - 1));
}

/** Shows headings down to level N: every heading section at level N or deeper whose parent is shallower folds. */
export function foldToLevel(view: EditorView, level: number) {
  const o = outlineOf(view.state);
  const effects: (StateEffect<unknown> | null)[] = [];
  for (const s of o.sections) effects.push(...unfoldLines(view, s.line, s.line));
  for (const s of o.sections)
    if (s.level >= level && (s.parent === o.root || s.parent!.level < level)) effects.push(foldLine(view, s.line));
  run(view, effects);
}

export function unfoldAll(view: EditorView) {
  const doc = view.state.doc;
  run(view, unfoldLines(view, 0, doc.lines - 1));
}
