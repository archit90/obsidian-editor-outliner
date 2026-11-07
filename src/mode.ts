// Outline mode (the repo's SPEC.md, "Editor Outliner" → "Outline mode"): CodeMirror glue for the active
// state and its keys. The mode is one switch for the whole app (a plugin setting); the logic is in active.ts
// and enter.ts. Every active-state key starts with stepAside and activeIn, so the keys added later
// (Backspace / Delete / Paste, node selection) share the same rules.
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { foldedRanges } from "@codemirror/language";
import { applyRows, ctxOf, lineSpan, outlineOf, posOf, suggestOpen, usable } from "./editor";
import { Active, activeAt } from "./active";
import { endList, enter, softBreak } from "./enter";

/** Set by the plugin: whether outline mode is on. */
let modeOn: () => boolean = () => false;
export function setModeCheck(fn: () => boolean) {
  modeOn = fn;
}

/**
 * Whether outline mode is active in this editor: on, one selection range, a usable editor, and the selection
 * inside one list (activeAt). The status bar shows it.
 */
export function activeIn(view: EditorView): Active | null {
  const st = view.state;
  if (!modeOn() || st.selection.ranges.length > 1 || !usable(view)) return null;
  const [l0, l1] = lineSpan(st);
  return activeAt(outlineOf(st), l0, l1);
}

/**
 * Whether an active-state key leaves the key to Obsidian before looking at the text: outline mode off,
 * several cursors, a read-only or nested editor (a Live Preview table cell), an autocomplete popup open, IME
 * composition. The pure functions add the text rules (code blocks, items that aren't a clean tree).
 */
export function stepAside(view: EditorView): boolean {
  return !modeOn() || view.composing || suggestOpen() || view.state.selection.ranges.length > 1 || !usable(view);
}

/** The (0-based) lines that start a fold: a folded item's children are hidden. */
export function foldedLines(state: EditorState): Set<number> {
  const out = new Set<number>();
  foldedRanges(state).between(0, state.doc.length, from => {
    out.add(state.doc.lineAt(from).number - 1);
  });
  return out;
}

const selected = (state: EditorState) => {
  const r = state.selection.main;
  return { from: posOf(state, r.from), to: posOf(state, r.to) };
};

/** Enter in the active state: split the item, or the empty-item rules (enter.ts). */
export function outlineEnter(view: EditorView, logical: boolean): boolean {
  if (stepAside(view)) return false;
  const st = view.state;
  const o = outlineOf(st);
  const { from, to } = selected(st);
  const res = enter(o, from, to, ctxOf(st, logical), foldedLines(st));
  if (!res) return false;
  applyRows(view, o, res.rows, "split.outliner", res.cursor);
  return true;
}

/** Shift+Enter in the active state: a new line in the same item (a continuation line). */
export function outlineShiftEnter(view: EditorView): boolean {
  if (stepAside(view)) return false;
  const st = view.state;
  const { from, to } = selected(st);
  const c = softBreak(outlineOf(st), from, to, ctxOf(st, false));
  if (!c) return false;
  const line = st.doc.line(c.line + 1);
  view.dispatch({
    changes: { from: line.from + c.from, to: line.from + c.to, insert: c.insert },
    selection: EditorSelection.cursor(line.from + c.from + c.insert.length),
    scrollIntoView: true,
    userEvent: "input",
  });
  return true;
}

/** Shift+Tab on an empty top-level item ends the list; anything else goes on to the outdent key. */
export function outlineEndList(view: EditorView): boolean {
  if (stepAside(view)) return false;
  const st = view.state;
  const o = outlineOf(st);
  const { from, to } = selected(st);
  const res = endList(o, from, to);
  if (!res) return false;
  applyRows(view, o, res.rows, "indent.outliner", res.cursor);
  return true;
}

/** Calls onChange when an editor's selection, text or focus changes (the status bar follows the cursor). */
export const watchActive = (onChange: () => void) =>
  EditorView.updateListener.of(u => {
    if (u.selectionSet || u.docChanged || u.focusChanged) onChange();
  });
