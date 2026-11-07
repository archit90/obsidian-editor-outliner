// Node selection (the repo's SPEC.md, "Editor Outliner" → "Node selection"): CodeMirror glue for nodes.ts. A
// StateField holds the node selection, worked out from the editor's selection on every selection or text
// change (so any other selection change forgets it, as with Expand's steps); its keys, the whole-line
// highlight and copy / cut. Heading node selection follows the "Outliner keys" setting; list items, outline mode.
import { EditorState, Extension, Prec, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, keymap } from "@codemirror/view";
import { foldEffect, foldable, foldedRanges, unfoldEffect } from "@codemirror/language";
import { applyRows, outlineOf, posOf, selectStep } from "./editor";
import { foldedLines, outlineModeOn, stepAside } from "./mode";
import {
  NodeSel,
  childSel,
  extendSel,
  nodeLines,
  nodeRange,
  nodeSelOf,
  nodeSpan,
  nodeText,
  parentSel,
  removeNodes,
} from "./nodes";

/** Whether the selection could cover whole lines: not empty, starting at a line start, ending at a line's start or end. */
function wholeLines(state: EditorState): boolean {
  const r = state.selection.main;
  if (r.empty || state.selection.ranges.length > 1) return false;
  const a = state.doc.lineAt(r.from);
  const b = state.doc.lineAt(r.to);
  return r.from === a.from && (r.to === b.to || r.to === b.from);
}

const derive = (state: EditorState): NodeSel | null =>
  wholeLines(state)
    ? nodeSelOf(outlineOf(state), posOf(state, state.selection.main.anchor), posOf(state, state.selection.main.head))
    : null;

/** The raw node selection, whatever the settings (nodeSelection filters it). */
const nodeField = StateField.define<NodeSel | null>({
  create: derive,
  update: (value, tr) => (tr.selection || tr.docChanged ? derive(tr.state) : value),
});

/** Set by the plugin: whether the "Outliner keys" setting is on (heading node selection needs it). */
let keysOn: () => boolean = () => false;
export function setKeysCheck(fn: () => boolean) {
  keysOn = fn;
}

/** The node selection, when it applies: headings with the outliner keys on, list items in outline mode. */
export function nodeSelection(state: EditorState): NodeSel | null {
  const sel = state.field(nodeField, false) ?? null;
  if (!sel || state.readOnly) return null;
  return (sel.kind === "item" ? outlineModeOn() : keysOn()) ? sel : null;
}

/** The node selection a key acts on: none when the key steps aside (stepAside, also for heading nodes). */
function keySel(view: EditorView): NodeSel | null {
  const sel = nodeSelection(view.state);
  return sel && !stepAside(view, sel.kind === "item") ? sel : null;
}

/** Selects the nodes, as a step Shrink undoes. */
function select(view: EditorView, sel: NodeSel) {
  const st = view.state;
  const span = nodeSpan(outlineOf(st), sel);
  if (!span) return;
  const off = (p: { line: number; ch: number }) => st.doc.line(p.line + 1).from + p.ch;
  selectStep(view, off(span.anchor), off(span.head), st.doc.line(sel.anchor + 1).from);
}

/** ↑ / ↓: extend (or shrink) the run by a sibling in that direction, anchored; nothing past the edge. */
const extend = (dir: -1 | 1) => (view: EditorView) => {
  const sel = keySel(view);
  if (!sel) return false;
  const next = extendSel(outlineOf(view.state), sel, dir);
  if (next) select(view, next);
  return true;
};

/** ←: fold the nodes that can fold and aren't folded; when there are none, select the parent. */
function left(view: EditorView): boolean {
  const sel = keySel(view);
  if (!sel) return false;
  const st = view.state;
  const o = outlineOf(st);
  const folded = foldedLines(st);
  const effects: StateEffect<unknown>[] = [];
  for (const l of nodeLines(o, sel)) {
    const line = st.doc.line(l + 1);
    const r = folded.has(l) ? null : foldable(st, line.from, line.to);
    if (r) effects.push(foldEffect.of(r));
  }
  if (effects.length) view.dispatch({ effects });
  else {
    const p = parentSel(o, sel);
    if (p) select(view, p);
  }
  return true;
}

/** →: unfold the folded nodes; when none is folded, select the head node's first child. */
function right(view: EditorView): boolean {
  const sel = keySel(view);
  if (!sel) return false;
  const st = view.state;
  const o = outlineOf(st);
  const lines = new Set(nodeLines(o, sel));
  const effects: StateEffect<unknown>[] = [];
  foldedRanges(st).between(0, st.doc.length, (from, to) => {
    if (lines.has(st.doc.lineAt(from).number - 1)) effects.push(unfoldEffect.of({ from, to }));
  });
  if (effects.length) view.dispatch({ effects });
  else {
    const c = childSel(o, sel);
    if (c) select(view, c);
  }
  return true;
}

/** Escape: clear the node selection; the cursor goes to the start of the anchor node's text. */
function clear(view: EditorView): boolean {
  const sel = keySel(view);
  if (!sel) return false;
  const st = view.state;
  const L = outlineOf(st).info[sel.anchor]!;
  view.dispatch({ selection: { anchor: st.doc.line(sel.anchor + 1).from + L.text }, scrollIntoView: true });
  return true;
}

/** Backspace / Delete (and cut): remove the nodes with their subtrees, one undo step. */
function remove(view: EditorView, userEvent = "remove.outliner"): boolean {
  const sel = keySel(view);
  if (!sel) return false;
  const o = outlineOf(view.state);
  const res = removeNodes(o, sel);
  if (res) applyRows(view, o, res.rows, userEvent, res.cursor);
  return true;
}

/** The copied text: the nodes' Markdown at column 0 (plus the line break when the selection took it). */
function copied(state: EditorState, sel: NodeSel): string | null {
  const o = outlineOf(state);
  const text = nodeText(o, sel);
  const r = nodeRange(o, sel);
  if (text === null || !r) return null;
  return state.selection.main.to > state.doc.line(r[1]).to ? text + "\n" : text;
}

/** The whole-line highlight: a class on every selected line, and one on the editor that hides the text selection. */
const highlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet = Decoration.none;
    constructor(view: EditorView) {
      this.build(view);
    }
    update(u: ViewUpdate) {
      this.build(u.view);
    }
    build(view: EditorView) {
      const sel = nodeSelection(view.state);
      const r = sel && nodeRange(outlineOf(view.state), sel);
      view.dom.classList.toggle("eo-node-selection", !!r);
      if (!r) {
        this.decorations = Decoration.none;
        return;
      }
      const doc = view.state.doc;
      const b = new RangeSetBuilder<Decoration>();
      const deco = Decoration.line({ class: "eo-node-selected" });
      for (const { from, to } of view.visibleRanges) {
        const a = Math.max(r[0], doc.lineAt(from).number - 1);
        const z = Math.min(r[1], doc.lineAt(to).number);
        for (let l = a; l < z; l++) b.add(doc.line(l + 1).from, doc.line(l + 1).from, deco);
      }
      this.decorations = b.finish();
    }
  },
  { decorations: v => v.decorations },
);

export function nodeSelectionExtension(): Extension {
  return [
    nodeField,
    highlight,
    Prec.highest(
      keymap.of([
        { key: "ArrowUp", run: extend(-1) },
        { key: "ArrowDown", run: extend(1) },
        { key: "ArrowLeft", run: left },
        { key: "ArrowRight", run: right },
        { key: "Escape", run: clear },
        { key: "Backspace", run: v => remove(v) },
        { key: "Delete", run: v => remove(v) },
      ]),
    ),
    EditorView.clipboardOutputFilter.of((text, state) => {
      const sel = nodeSelection(state);
      return (sel && copied(state, sel)) ?? text;
    }),
    // cut removes the nodes like Backspace (CodeMirror's cut would leave an empty line in the list)
    Prec.highest(
      EditorView.domEventHandlers({
        cut: (e, view) => {
          const sel = keySel(view);
          const text = sel && copied(view.state, sel);
          if (!text || !e.clipboardData) return false;
          e.preventDefault();
          e.clipboardData.clearData();
          e.clipboardData.setData("text/plain", text);
          return remove(view, "cut.outliner");
        },
      }),
    ),
  ];
}
