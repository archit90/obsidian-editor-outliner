// CodeMirror glue: parses the editor's note (cached per document version), runs an operation, and applies
// its rows as one transaction (one undo step) with the selection and folds carried over.
import { EditorSelection, EditorState, Extension, Prec, StateEffect, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { foldEffect, foldable, foldedRanges, indentUnit, unfoldEffect } from "@codemirror/language";
import { Notice } from "obsidian";
import { Outline, buildOutline, locate } from "./parse";
import { Ctx, OpResult, Row, indent, move, outdent, unitCols } from "./ops";
import { Chain, XState, chainAt, move as moveStep, spanOf, stateOf } from "./select";
import { renumberLikeObsidian } from "./numbering";
import { Pos, codeCopyText, codeNewline, codePasteText, insertCodeBlock } from "./content";

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
 * Replaces the note with rows as one change (one undo step), mapping the selection (or putting the cursor at
 * cursor, a position in the new rows) and re-folding folds the change touched. userEvent is never "input.*" /
 * "delete.*", so Obsidian doesn't open autocomplete for it.
 */
export function applyRows(view: EditorView, o: Outline, rows: Row[], userEvent = "move.outliner", cursor?: Pos) {
  // ordered lists numbered as Obsidian's own renumbering would (numbering.ts), whatever the operation, so
  // Obsidian has nothing left to change and the note undo restores is one it leaves alone
  const num = renumberLikeObsidian(
    o.texts,
    rows.map(r => r.t),
  );
  if (num.edits.length) {
    rows = rows.map((r, i) => (num.lines[i] === r.t ? r : { t: num.lines[i]!, o: r.o }));
    for (const e of num.edits)
      if (cursor && e.line === cursor.line && cursor.ch > e.at) cursor = { line: cursor.line, ch: cursor.ch + e.delta };
  }
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
  let anchor = r.anchor === r.to ? mapEnd(r.anchor) : mapPos(r.anchor);
  let head = r.head === r.to ? mapEnd(r.head) : mapPos(r.head);
  if (cursor) anchor = head = starts[cursor.line]! + cursor.ch;

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
  if (state.selection.ranges.length > 1 || !usable(view) || view.composing) return false;
  const o = outlineOf(state);
  const [l0, l1] = lineSpan(state);
  const ctx = ctxOf(state, logical);
  // A list always stays a list: Shift+Tab inside one never goes to Obsidian, whose outdent removes
  // indentation line by line and can take lines out of their item, or the item out of the list
  let inList = false;
  for (let l = l0; l <= l1 && !inList; l++) inList = !!locate(o, l)?.list;
  const keep = kind === "outdent" && inList;
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
  let res: OpResult;
  if (kind === "indent") res = indent(o, l0, l1, ctx);
  else if (kind === "outdent") res = outdent(o, l0, l1, ctx);
  else res = move(o, l0, l1, kind === "up" ? -1 : 1, ctx);
  if (res === null) return keep;
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
  const res = insertCodeBlock(o, line, lang, ctxOf(view.state, false));
  if (!res || check) return !!res;
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
 * The clipboard rules for code blocks in items, on whether or not the outliner keys are: copied / cut / dragged
 * text loses the item indent; pasted multi-line text gains it on every line after the first. outline: outline
 * mode's paste, tried when they don't apply (it says whether it took the paste).
 */
export function codeClipboard(outline?: (view: EditorView, data: DataTransfer) => boolean): Extension {
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
          if (e.defaultPrevented || soleLine(view) === null || !e.clipboardData) return false;
          const text = e.clipboardData.getData("text/plain");
          const st = view.state;
          const r = st.selection.main;
          const insert = text
            ? codePasteText(outlineOf(st), posOf(st, r.from), posOf(st, r.to), text, ctxOf(st, false))
            : null;
          if (insert === null) {
            if (!outline?.(view, e.clipboardData)) return false;
            e.preventDefault();
            return true;
          }
          e.preventDefault();
          view.dispatch({
            changes: { from: r.from, to: r.to, insert },
            selection: EditorSelection.cursor(r.from + insert.length),
            scrollIntoView: true,
            userEvent: "input.paste",
          });
          return true;
        },
      }),
    ),
  ];
}
