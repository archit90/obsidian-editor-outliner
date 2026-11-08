// CodeMirror glue: parses the editor's note (cached per document version), runs an operation, and applies
// its rows as one transaction (one undo step) with the selection and folds carried over.
import { EditorSelection, EditorState, Extension, Prec, StateEffect, Text, Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { foldEffect, foldable, foldedRanges, indentUnit, unfoldEffect } from "@codemirror/language";
import { Notice } from "obsidian";
import { Outline, buildOutline, locate } from "./parse";
import {
  Ctx,
  ORDERED_LINE,
  OpResult,
  Row,
  applies,
  indent,
  isNumbered,
  listIn,
  move,
  outdent,
  outlineOfRows,
  unitCols,
} from "./ops";
import { Chain, XState, chainAt, move as moveStep, spanOf, stateOf } from "./select";
import { renumberLikeObsidian } from "./numbering";
import { Pos, canInsertCodeBlock, codeCopyText, codeNewline, codePasteText, insertCodeBlock } from "./content";
import { RowChange, rowChange } from "./rowdiff";

const outlines = new WeakMap<Text, Outline>();

/** The outline of a document, parsed once per document version. */
export function outlineOfDoc(doc: Text, tabSize: number): Outline {
  let o = outlines.get(doc);
  if (!o) {
    o = buildOutline(doc.toJSON(), tabSize);
    outlines.set(doc, o);
  }
  return o;
}

export const outlineOf = (state: EditorState): Outline => outlineOfDoc(state.doc, state.tabSize);

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

/** Whether a row in or right next to the changed lines may be an ordered item: only there can Obsidian's
 * renumbering rules start (numbering.ts visits the changed lines and the one after). */
function orderedNear(rows: Row[], c: RowChange): boolean {
  for (let i = Math.max(0, c.first - 1); i < Math.min(rows.length, c.newEnd + 2); i++)
    if (ORDERED_LINE.test(rows[i]!.t)) return true;
  return false;
}

/** Whether the transaction (after the transaction filters) makes exactly the one change, nothing more. */
function onlyChange(tr: Transaction, c: RowChange): boolean {
  let n = 0;
  let same = true;
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, ins) => {
    n++;
    if (fromA !== c.from || toA !== c.to || ins.length !== c.insert.length || ins.toString() !== c.insert) same = false;
  });
  return same && n === 1;
}

/**
 * Replaces the note with rows as one change (one undo step), mapping the selection (or putting the cursor at
 * cursor, a position in the new rows) and re-folding folds the change touched. userEvent is never "input.*" /
 * "delete.*", so Obsidian doesn't open autocomplete for it. Only the changed lines are compared and written
 * (rowdiff.ts), so a key in a long note doesn't copy the whole note.
 */
export function applyRows(view: EditorView, o: Outline, rows: Row[], userEvent = "move.outliner", cursor?: Pos) {
  const state = view.state;
  const doc = state.doc;
  const lineStart = (i: number) => doc.line(i + 1).from;
  let change = rowChange(o.texts, rows, lineStart);
  if (!change) return;
  // ordered lists numbered as Obsidian's own renumbering would (numbering.ts), whatever the operation, so
  // Obsidian has nothing left to change and the note undo restores is one it leaves alone (rows from finish()
  // are numbered already)
  if (!isNumbered(rows) && orderedNear(rows, change)) {
    const num = renumberLikeObsidian(
      o.texts,
      rows.map(r => r.t),
    );
    if (num.edits.length) {
      rows = rows.map((r, i) => (num.lines[i] === r.t ? r : { t: num.lines[i]!, o: r.o }));
      for (const e of num.edits)
        if (cursor && e.line === cursor.line && cursor.ch > e.at)
          cursor = { line: cursor.line, ch: cursor.ch + e.delta };
      change = rowChange(o.texts, rows, lineStart);
      if (!change) return;
    }
  }
  const c = change;
  const nO = o.texts.length;
  const nN = rows.length;
  const lenDelta = c.insert.length - (c.to - c.from);
  const newLen = doc.length + lenDelta;

  // the new index of an old line (the last row that came from it), worked out when first needed
  let index: Int32Array | null = null;
  const newIndexOf = (l: number): number | undefined => {
    if (!index) {
      const idx = new Int32Array(nO).fill(-1);
      rows.forEach((r, i) => {
        if (r.o >= 0 && r.o < nO) idx[r.o] = i;
      });
      index = idx;
    }
    const v = index[l];
    return v === undefined || v < 0 ? undefined : v;
  };
  // where new line ni starts: before the change as in the old text, after it shifted with the text's end
  const firstStart = c.first < nO ? lineStart(c.first) : doc.length + 1;
  const newStart = (ni: number): number => {
    if (ni < c.first) return lineStart(ni);
    if (ni >= c.newEnd) return lineStart(ni - (nN - nO)) + lenDelta;
    let at = firstStart;
    for (let k = c.first; k < ni; k++) at += rows[k]!.t.length + 1;
    return at;
  };
  const mapPos = (pos: number): number | null => {
    const l = doc.lineAt(pos);
    const ni = newIndexOf(l.number - 1);
    if (ni === undefined) return null;
    const t = rows[ni]!.t;
    const d = t.length - o.texts[l.number - 1]!.length;
    // the edits only change a line's prefix (indent, #, number): keep the cursor on the same text,
    // except a cursor at the very start of a line, which stays there
    const ch0 = pos - l.from;
    const ch = ch0 === 0 ? 0 : Math.max(0, Math.min(t.length, ch0 + d));
    return newStart(ni) + ch;
  };
  const r = state.selection.main;
  // a selection that ends at the start of the next line covers whole lines: keep it ending right after
  // its last line, wherever that line went
  const [, l1] = lineSpan(state);
  const mapEnd = (pos: number): number | null => {
    const l = doc.lineAt(pos);
    if (r.empty || pos !== r.to || pos !== l.from || l.number - 1 !== l1 + 1) return mapPos(pos);
    const ni = newIndexOf(l1);
    if (ni === undefined) return mapPos(pos);
    return ni + 1 < nN ? newStart(ni + 1) : newLen;
  };
  let anchor = r.anchor === r.to ? mapEnd(r.anchor) : mapPos(r.anchor);
  let head = r.head === r.to ? mapEnd(r.head) : mapPos(r.head);
  if (cursor) anchor = head = newStart(cursor.line) + cursor.ch;

  // folds touching the changed region: Obsidian drops them, so remember their lines and refold after
  const refold: number[] = [];
  foldedRanges(state).between(0, doc.length, (from, to) => {
    if (from <= c.to && to >= c.from) {
      const ni = newIndexOf(doc.lineAt(from).number - 1);
      if (ni !== undefined) refold.push(ni);
    }
  });

  const tr = state.update({
    changes: { from: c.from, to: c.to, insert: c.insert },
    selection: anchor !== null && head !== null ? EditorSelection.single(anchor, head) : undefined,
    scrollIntoView: true,
    userEvent,
  });
  // the rows' outline when finish() parsed them already: the decorations then don't parse the note again
  const parsed = outlineOfRows(rows);
  if (parsed && parsed.tabSize === state.tabSize && onlyChange(tr, c)) outlines.set(tr.newDoc, parsed);
  view.dispatch(tr);

  if (refold.length) {
    const st = view.state;
    const effects: StateEffect<unknown>[] = [];
    const newTo = c.from + c.insert.length;
    foldedRanges(st).between(c.from, newTo, (from, to) => {
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
 * With check, only says whether it would apply, without working out the result (the palette asks every command).
 */
export function runOp(view: EditorView, kind: OpKind, logical: boolean, check = false): boolean {
  const state = view.state;
  if (state.selection.ranges.length > 1 || !usable(view) || view.composing) return false;
  const o = outlineOf(state);
  const [l0, l1] = lineSpan(state);
  const ctx = ctxOf(state, logical);
  // A list always stays a list: Shift+Tab inside one never goes to Obsidian, whose outdent removes
  // indentation line by line and can take lines out of their item, or the item out of the list
  const keep = kind === "outdent" && listIn(o, l0, l1);
  if (suggestOpen()) return keep;
  // Tab inside a code block (also one nested in a list item) is Obsidian's; Shift+Tab too, as long as the
  // line stays inside its item
  const head = state.doc.lineAt(state.selection.main.head).number - 1;
  const L = o.info[head];
  if (L?.kind === "code" && kind === "indent") return false;
  if (L?.kind === "code" && kind === "outdent") {
    const item = locate(o, head)?.item;
    return item ? L.col - unitCols(ctx) < item.cc : false;
  }
  if (check) return keep || applies(o, kind === "up" || kind === "down" ? "move" : kind, l0, l1);
  let res: OpResult;
  if (kind === "indent") res = indent(o, l0, l1, ctx);
  else if (kind === "outdent") res = outdent(o, l0, l1, ctx);
  else res = move(o, l0, l1, kind === "up" ? -1 : 1, ctx);
  if (res === null) return keep;
  if (res === "noop") return true;
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
  chain: Chain;
  st: XState;
  /** Where the first step began (the cursor Shrink goes back to). */
  start: number;
  /** The selection and document the last step left; anything else means the user moved on. */
  anchor: number;
  head: number;
  doc: Text;
}
const expansions = new WeakMap<EditorView, Expansion>();

/** Expand / Shrink step aside in a nested editor, with several cursors and while composing. */
const noSteps = (view: EditorView) => nested(view) || view.state.selection.ranges.length > 1 || view.composing;

/**
 * Expand / Shrink selection up (dir -1) or down (1): Alt+↑ / Alt+↓, Alt+Shift+↑ / Alt+Shift+↓. They carry on
 * from the last step while the selection is the one it left, else start over from the selection (the anchor as
 * the cursor's place). Where they step aside, Expand lets Obsidian's key run and Shrink does nothing; otherwise
 * the key is used even when nothing changes (at the top level, back at the start).
 */
export function selectStep(view: EditorView, dir: -1 | 1, grow: boolean): boolean {
  if (noSteps(view)) return !grow;
  const state = view.state;
  const r = state.selection.main;
  const o = outlineOf(state);
  const prev = expansions.get(view);
  let chain: Chain;
  let st: XState;
  // a selection made some other way: the anchor is where it started
  let start = r.anchor;
  if (prev && prev.doc === state.doc && prev.anchor === r.anchor && prev.head === r.head) {
    chain = prev.chain;
    st = prev.st;
    start = prev.start;
  } else {
    const h = posOf(state, r.anchor);
    chain = chainAt(o, h.line, h.ch);
    const at = stateOf(o, chain, posOf(state, r.from), posOf(state, r.to));
    if (!at || (!at.exact && !grow)) return true;
    st = at.st;
    // a selection the chain doesn't have: Expand first selects the step that holds it
    if (!at.exact) return go(view, { chain, st, start }, dir);
  }
  const next = moveStep(o, chain, st, dir, grow);
  return next ? go(view, { chain, st: next, start }, dir) : true;
}

/** Selects the state's lines (back at the start: the cursor where the first step began), the moving edge as the head. */
function go(view: EditorView, x: { chain: Chain; st: XState; start: number }, dir: -1 | 1): boolean {
  const state = view.state;
  const span = spanOf(outlineOf(state), x.chain, x.st);
  let anchor = x.start;
  let head = x.start;
  if (span) {
    const a = offsetOf(state, span.from);
    const b = offsetOf(state, span.to);
    [anchor, head] = dir < 0 ? [b, a] : [a, b];
  }
  expansions.set(view, { ...x, anchor, head, doc: state.doc });
  view.dispatch({ selection: EditorSelection.single(anchor, head), scrollIntoView: true });
  return true;
}

export const expandUp = (view: EditorView) => selectStep(view, -1, true);
export const expandDown = (view: EditorView) => selectStep(view, 1, true);
export const shrinkUp = (view: EditorView) => selectStep(view, -1, false);
export const shrinkDown = (view: EditorView) => selectStep(view, 1, false);

// ---- multi-block items ----

/** The main cursor's line, when the plugin may act: one selection range, a usable editor. */
function soleLine(view: EditorView): number | null {
  const st = view.state;
  if (st.selection.ranges.length > 1 || !usable(view)) return null;
  return st.doc.lineAt(st.selection.main.head).number - 1;
}

/** "Insert code block in item" (lang "") / "Insert Dataview query in item" (lang "dataview"). */
export function insertBlock(view: EditorView, lang: string, check = false): boolean {
  const line = soleLine(view);
  if (line === null) return false;
  const o = outlineOf(view.state);
  if (check) return canInsertCodeBlock(o, line);
  const res = insertCodeBlock(o, line, lang, ctxOf(view.state, false));
  if (!res) return false;
  applyRows(view, o, res.rows, "insert.outliner", res.cursor);
  view.focus();
  return true;
}

/** A document offset as a (0-based) line and column, as the pure modules use them; offsetOf converts back. */
export const posOf = (state: EditorState, pos: number): Pos => {
  const l = state.doc.lineAt(pos);
  return { line: l.number - 1, ch: pos - l.from };
};
export const offsetOf = (state: EditorState, p: Pos) => state.doc.line(p.line + 1).from + p.ch;

/**
 * Enter in a fenced code block in an item: the new line gets the item indent plus the code line's own indent,
 * so the code stays in the item. Whitespace right after the cursor goes (it would double the indent). False
 * elsewhere, with an autocomplete popup open and while composing (Obsidian's Enter applies).
 */
export function codeEnter(view: EditorView): boolean {
  if (soleLine(view) === null || view.composing || suggestOpen()) return false;
  const st = view.state;
  const r = st.selection.main;
  const a = posOf(st, r.from);
  const b = posOf(st, r.to);
  const o = outlineOf(st);
  const lead = codeNewline(o, a.line, ctxOf(st, false));
  if (lead === null || codeNewline(o, b.line, ctxOf(st, false)) === null) return false;
  const tl = st.doc.line(b.line + 1);
  let to = r.to;
  while (to < tl.to && /[ \t]/.test(tl.text[to - tl.from]!)) to++;
  const insert = "\n" + lead;
  view.dispatch({
    changes: { from: r.from, to, insert },
    selection: EditorSelection.cursor(r.from + insert.length),
    scrollIntoView: true,
    userEvent: "input",
  });
  return true;
}

/**
 * The clipboard rules for code blocks in items, whatever the "Outliner keys" setting: copied / cut / dragged text
 * loses the item indent; pasted multi-line text gains it on every line after the first. outline: outline mode's
 * paste of the clipboard data, as the change to make, tried when those rules don't apply (null: not ours). offer:
 * hands a paste the plugin would take to other plugins first (Obsidian's "editor-paste" event, which its own paste
 * fires before pasting); true when one of them took it.
 */
export function codeClipboard(
  outline?: (view: EditorView, data: DataTransfer) => (() => void) | null,
  offer?: (view: EditorView, e: ClipboardEvent) => boolean,
): Extension {
  return [
    EditorView.clipboardOutputFilter.of((text, state) => {
      if (state.selection.ranges.length > 1) return text;
      const r = state.selection.main;
      return codeCopyText(outlineOf(state), posOf(state, r.from), posOf(state, r.to)) ?? text;
    }),
    // highest precedence: before Obsidian's paste handling, which leaves an event it finds handled alone
    Prec.highest(
      EditorView.domEventHandlers({
        paste: (e, view) => {
          const data = e.clipboardData;
          if (e.defaultPrevented || soleLine(view) === null || !data) return false;
          const plan = () => {
            const st = view.state;
            const text = data.getData("text/plain");
            const r = st.selection.main;
            const insert = text
              ? codePasteText(outlineOf(st), posOf(st, r.from), posOf(st, r.to), text, ctxOf(st, false))
              : null;
            if (insert === null) return outline?.(view, data) ?? null;
            return () =>
              view.dispatch({
                changes: { from: r.from, to: r.to, insert },
                selection: EditorSelection.cursor(r.from + insert.length),
                scrollIntoView: true,
                userEvent: "input.paste",
              });
          };
          let go = plan();
          if (!go) return false;
          const before = view.state;
          if (offer?.(view, e)) return true;
          // a handler that changed the note without taking the paste: work it out again
          if (view.state !== before) go = plan();
          if (!go) return false;
          e.preventDefault();
          go();
          return true;
        },
      }),
    ),
  ];
}
