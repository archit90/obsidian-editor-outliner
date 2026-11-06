// CodeMirror glue: parses the editor's note (cached per document version), runs an operation, and applies
// its rows as one transaction (one undo step) with the selection and folds carried over.
import { EditorSelection, EditorState, StateEffect, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { foldEffect, foldable, foldedRanges, indentUnit, unfoldEffect } from "@codemirror/language";
import { Notice } from "obsidian";
import { Outline, buildOutline } from "./parse";
import { Ctx, OpResult, Row, indent, move, outdent } from "./ops";
import { steps } from "./select";

const outlines = new WeakMap<Text, Outline>();

export function outlineOf(state: EditorState): Outline {
  let o = outlines.get(state.doc);
  if (!o) {
    o = buildOutline(state.doc.toJSON(), state.tabSize);
    outlines.set(state.doc, o);
  }
  return o;
}

export function ctxOf(state: EditorState, logical: boolean): Ctx {
  return { tabSize: state.tabSize, unit: state.facet(indentUnit), logical };
}

/** The main selection's lines; a selection ending at the start of a line doesn't include that line. */
export function lineSpan(state: EditorState): [number, number] {
  const r = state.selection.main;
  const a = state.doc.lineAt(r.from).number - 1;
  const bl = state.doc.lineAt(r.to);
  let b = bl.number - 1;
  if (r.to > r.from && r.to === bl.from && b > a) b--;
  return [a, b];
}

/**
 * Replaces the note with rows as one change (one undo step), mapping the selection and re-folding folds the
 * change touched. userEvent is never "input.*" / "delete.*", so Obsidian doesn't open autocomplete for it.
 */
export function applyRows(view: EditorView, o: Outline, rows: Row[], userEvent = "move.outliner") {
  const state = view.state;
  const oldS = state.doc.toString();
  const texts = rows.map(r => r.t);
  const newS = texts.join("\n");
  if (oldS === newS) return;
  const max = Math.min(oldS.length, newS.length);
  let p = 0;
  while (p < max && oldS.charCodeAt(p) === newS.charCodeAt(p)) p++;
  let q = 0;
  while (q < max - p && oldS.charCodeAt(oldS.length - 1 - q) === newS.charCodeAt(newS.length - 1 - q)) q++;
  const changedTo = oldS.length - q;

  const newIdx = new Map<number, number>();
  rows.forEach((r, i) => {
    if (r.o >= 0) newIdx.set(r.o, i);
  });
  const starts: number[] = [];
  let acc = 0;
  for (const t of texts) {
    starts.push(acc);
    acc += t.length + 1;
  }
  const mapPos = (pos: number): number | null => {
    const l = state.doc.lineAt(pos);
    const ni = newIdx.get(l.number - 1);
    if (ni === undefined) return null;
    const d = texts[ni]!.length - o.texts[l.number - 1]!.length;
    // the edits only change a line's prefix (indent, #, number): keep the cursor on the same text,
    // except a cursor at the very start of a line, which stays there
    const ch0 = pos - l.from;
    const ch = ch0 === 0 ? 0 : Math.max(0, Math.min(texts[ni]!.length, ch0 + d));
    return starts[ni]! + ch;
  };
  const r = state.selection.main;
  // a selection that ends at the start of the next line covers whole lines: keep it ending right after
  // its last line, wherever that line went
  const [, l1] = lineSpan(state);
  const mapEnd = (pos: number): number | null => {
    const l = state.doc.lineAt(pos);
    if (r.empty || pos !== r.to || pos !== l.from || l.number - 1 !== l1 + 1) return mapPos(pos);
    const ni = newIdx.get(l1);
    if (ni === undefined) return mapPos(pos);
    return ni + 1 < texts.length ? starts[ni + 1]! : newS.length;
  };
  const anchor = r.anchor === r.to ? mapEnd(r.anchor) : mapPos(r.anchor);
  const head = r.head === r.to ? mapEnd(r.head) : mapPos(r.head);

  // folds touching the changed region: Obsidian drops them, so remember their lines and refold after
  const refold: number[] = [];
  foldedRanges(state).between(0, oldS.length, (from, to) => {
    if (from <= changedTo && to >= p) {
      const ni = newIdx.get(state.doc.lineAt(from).number - 1);
      if (ni !== undefined) refold.push(ni);
    }
  });

  view.dispatch({
    changes: { from: p, to: changedTo, insert: newS.slice(p, newS.length - q) },
    selection: anchor !== null && head !== null ? EditorSelection.single(anchor, head) : undefined,
    scrollIntoView: true,
    userEvent,
  });

  if (refold.length) {
    const st = view.state;
    const effects: StateEffect<unknown>[] = [];
    const newTo = newS.length - q;
    foldedRanges(st).between(p, newTo, (from, to) => {
      effects.push(unfoldEffect.of({ from, to }));
    });
    for (const ni of new Set(refold)) {
      const line = st.doc.line(ni + 1);
      const range = foldable(st, line.from, line.to);
      if (range) effects.push(foldEffect.of(range));
    }
    if (effects.length) view.dispatch({ effects });
  }
}

export type OpKind = "indent" | "outdent" | "up" | "down";

/** Set by the plugin: whether an autocomplete popup (EditorSuggest) is open. */
export let suggestOpen: () => boolean = () => false;
export function setSuggestCheck(fn: () => boolean) {
  suggestOpen = fn;
}

/**
 * Whether the plugin should act in this editor: not read-only, and not a nested editor (a Live Preview
 * table cell or an embed is a CodeMirror view inside the note's own).
 */
export function usable(view: EditorView): boolean {
  return !view.state.readOnly && !nested(view);
}

export const nested = (view: EditorView) => !!view.dom.parentElement?.closest(".cm-editor");

/**
 * Runs an outline operation on the main selection. False when it isn't for us (Obsidian handles the key).
 * With check, only says whether it would apply.
 */
export function runOp(view: EditorView, kind: OpKind, logical: boolean, check = false): boolean {
  const state = view.state;
  if (state.selection.ranges.length > 1 || !usable(view) || suggestOpen()) return false;
  const o = outlineOf(state);
  const [l0, l1] = lineSpan(state);
  // Tab inside a code block (also one nested in a list item) is Obsidian's
  const head = state.doc.lineAt(state.selection.main.head).number - 1;
  if ((kind === "indent" || kind === "outdent") && o.info[head]?.kind === "code") return false;
  const ctx = ctxOf(state, logical);
  let res: OpResult;
  if (kind === "indent") res = indent(o, l0, l1, ctx);
  else if (kind === "outdent") res = outdent(o, l0, l1, ctx);
  else res = move(o, l0, l1, kind === "up" ? -1 : 1, ctx);
  if (res === null) return false;
  if (check || res === "noop") return true;
  if ("error" in res) {
    new Notice(res.error);
    return true;
  }
  applyRows(view, o, res.rows, kind === "indent" || kind === "outdent" ? "indent.outliner" : "move.outliner");
  if (res.notice) new Notice(res.notice, 8000);
  return true;
}

// ---- expand / shrink selection ----

interface Expansion {
  /** Where the first Expand started; later steps are computed from it. */
  origin: number;
  /** Selections to go back to, oldest first. */
  stack: { anchor: number; head: number }[];
  /** The selection the last step set; anything else means the user moved on. */
  last: { anchor: number; head: number };
}
const expansions = new WeakMap<EditorView, Expansion>();

export function expandSelection(view: EditorView): boolean {
  if (nested(view)) return false;
  const state = view.state;
  const r = state.selection.main;
  const prev = expansions.get(view);
  const going = prev && prev.last.anchor === r.anchor && prev.last.head === r.head;
  const origin = going ? prev.origin : r.head;
  const o = outlineOf(state);
  const line = state.doc.lineAt(origin);
  const off = (p: { line: number; ch: number }) => state.doc.line(p.line + 1).from + p.ch;
  let best: [number, number] | null = null;
  for (const s of steps(o, line.number - 1, origin - line.from)) {
    const a = off(s.from);
    const b = off(s.to);
    if (a > r.from || b < r.to || b - a <= r.to - r.from) continue;
    if (!best || b - a < best[1] - best[0]) best = [a, b];
  }
  if (!best) return true;
  const stack = going ? prev.stack : [];
  stack.push({ anchor: r.anchor, head: r.head });
  const last = { anchor: best[0], head: best[1] };
  expansions.set(view, { origin, stack, last });
  view.dispatch({ selection: EditorSelection.single(best[0], best[1]) });
  return true;
}

export function shrinkSelection(view: EditorView): boolean {
  if (nested(view)) return false;
  const r = view.state.selection.main;
  const prev = expansions.get(view);
  if (!prev || prev.last.anchor !== r.anchor || prev.last.head !== r.head || !prev.stack.length) return true;
  const back = prev.stack.pop()!;
  prev.last = back;
  if (!prev.stack.length) expansions.delete(view);
  view.dispatch({ selection: EditorSelection.single(back.anchor, back.head) });
  return true;
}
