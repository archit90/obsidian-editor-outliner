// Outline mode (the repo's SPEC.md, "Editor Outliner" → "Outline mode"): CodeMirror glue for the active
// state and its keys. The mode is one switch for the whole app (a plugin setting); the logic is in active.ts,
// enter.ts, merge.ts and paste.ts. Every key starts with stepAside, which node selection's keys share.
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { foldedRanges } from "@codemirror/language";
import { applyRows, ctxOf, lineSpan, outlineOf, posOf, suggestOpen, usable } from "./editor";
import { Active, activeAt } from "./active";
import { Edit, Pos } from "./content";
import { endList, enter, softBreak } from "./enter";
import { backspace, deleteForward } from "./merge";
import { paste } from "./paste";
import type { Outline } from "./parse";

/** Set by the plugin: whether outline mode is on. */
let modeOn: () => boolean = () => false;
export function setModeCheck(fn: () => boolean) {
  modeOn = fn;
}
export const outlineModeOn = () => modeOn();

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
 * composition, Vim outside insert mode (needMode false: whatever the mode, for heading node selection). The
 * pure functions add the text rules (code blocks, items that aren't a clean tree).
 */
export function stepAside(view: EditorView, needMode = true): boolean {
  return (
    (needMode && !modeOn()) ||
    view.composing ||
    suggestOpen() ||
    view.state.selection.ranges.length > 1 ||
    !usable(view) ||
    vimNormal(view)
  );
}

/**
 * Obsidian's Vim mode (@replit/codemirror-vim) outside insert mode (normal, visual): its keys stay vim's, and a
 * visual-mode selection is no node selection. Its state lives on the view's CodeMirror 5 adapter,
 * view.cm.state.vim (app.js). Vim sees a key before our keymaps; this covers the keys it leaves alone.
 */
export function vimNormal(view: EditorView): boolean {
  const vim = (view as EditorView & { cm?: { state?: { vim?: { insertMode?: boolean } } } }).cm?.state?.vim;
  return !!vim && !vim.insertMode;
}

/** The (0-based) lines that start a fold: a folded item's children are hidden. */
export function foldedLines(state: EditorState): Set<number> {
  const out = new Set<number>();
  foldedRanges(state).between(0, state.doc.length, from => {
    out.add(state.doc.lineAt(from).number - 1);
  });
  return out;
}

/**
 * Runs an active-state key's pure function on the main selection and applies its edit as one change. The
 * function returns null for Obsidian's key, "noop" to eat the key, or the edit (with its userEvent, when it
 * differs from the key's).
 */
function runKey(
  view: EditorView,
  userEvent: string,
  fn: (o: Outline, from: Pos, to: Pos, st: EditorState) => (Edit & { userEvent?: string }) | "noop" | null,
): boolean {
  if (stepAside(view)) return false;
  const st = view.state;
  const o = outlineOf(st);
  const r = st.selection.main;
  const res = fn(o, posOf(st, r.from), posOf(st, r.to), st);
  if (!res) return false;
  if (res !== "noop") applyRows(view, o, res.rows, res.userEvent ?? userEvent, res.cursor);
  return true;
}

/** Enter in the active state: split the item, or the empty-item rules (enter.ts). */
export const outlineEnter = (view: EditorView, logical: boolean) =>
  runKey(view, "split.outliner", (o, from, to, st) => enter(o, from, to, ctxOf(st, logical), foldedLines(st)));

/** Shift+Enter in the active state: a new line in the same item (a continuation line). */
export function outlineShiftEnter(view: EditorView): boolean {
  if (stepAside(view)) return false;
  const st = view.state;
  const r = st.selection.main;
  const c = softBreak(outlineOf(st), posOf(st, r.from), posOf(st, r.to), ctxOf(st, false));
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
export const outlineEndList = (view: EditorView) => runKey(view, "indent.outliner", endList);

/** Backspace / Delete in the active state: merges and line joins (merge.ts). */
export const outlineBackspace = (view: EditorView) =>
  runKey(view, "merge.outliner", (o, from, to, st) => backspace(o, from, to, ctxOf(st, false), foldedLines(st)));
export const outlineDelete = (view: EditorView) =>
  runKey(view, "merge.outliner", (o, from, to, st) => deleteForward(o, from, to, ctxOf(st, false), foldedLines(st)));

/**
 * Paste in the active state (paste.ts), given the clipboard text: Markdown blocks become items, a code block
 * alone goes into the item, multi-line text stays in it (a plain insert counts as a paste, input.paste).
 * False: Obsidian's paste applies.
 */
export const outlinePaste = (view: EditorView, text: string) =>
  runKey(view, "paste.outliner", (o, from, to, st) => {
    const res = paste(o, from, to, text, ctxOf(st, false), foldedLines(st));
    return res && { ...res, userEvent: res.plain ? "input.paste" : undefined };
  });

/** Calls onChange when an editor's selection, text or focus changes (the status bar follows the cursor). */
export const watchActive = (onChange: () => void) =>
  EditorView.updateListener.of(u => {
    if (u.selectionSet || u.docChanged || u.focusChanged) onChange();
  });
