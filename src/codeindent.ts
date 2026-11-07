// Code blocks in list items, in Live Preview (the repo's SPEC.md, "Editor Outliner" → "Multi-block items"):
// Obsidian indents an item's text lines (a measured padding on the line) but not its fenced code block lines,
// so the block's background and frame start at the editor's left edge with the item indent drawn inside them
// as whitespace. This hides each code line's item indent (the whitespace up to the item's content column)
// and moves the line box to where the item's text starts, so the block sits under the item and only the
// code's own indent shows. A cursor never rests in the hidden indent (typing there would take the line out of
// the item), and Backspace right after it is outline mode's (the line joins the one above), never a deletion
// of whitespace you can't see. Source mode, Reading view and callouts are left as they are.
import { EditorSelection, EditorState, Extension, Prec, RangeSetBuilder, StateEffect } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, keymap } from "@codemirror/view";
import { editorLivePreviewField } from "obsidian";
import { applyRows, ctxOf, outlineOf, posOf } from "./editor";
import { codeBlockAt, indentEnd } from "./content";
import { Outline } from "./parse";
import { backspace } from "./merge";
import { foldedLines, stepAside } from "./mode";

/** Where line i's hidden item indent ends (a column in the line), when it is a code line of an item: else 0. */
function hiddenEnd(o: Outline, i: number): number {
  if (o.info[i]?.kind !== "code") return 0;
  const cb = codeBlockAt(o, i);
  // callouts render as widgets; their code lines keep Obsidian's look
  if (!cb || cb.owner.list.q > 0) return 0;
  return indentEnd(o.texts[i]!, 0, cb.owner.item.cc, o.tabSize);
}

/** The length of a line's leading whitespace (the hidden indent lies within it). */
const leadingWs = (t: string) => t.length - t.trimStart().length;

const isLive = (state: EditorState) => state.field(editorLivePreviewField, false) === true;

/**
 * An empty cursor that lands in a hidden item indent goes to its end; moving left out of it goes on to the end
 * of the line above.
 */
const keepOutOfIndent = EditorState.transactionFilter.of(tr => {
  if (!tr.selection || !isLive(tr.state)) return tr;
  const st = tr.state;
  // the note is parsed only for a cursor in a line's leading whitespace (typing elsewhere stays cheap)
  let o: Outline | null = null;
  const was = tr.startState.selection.main.head;
  let moved = false;
  const ranges = tr.selection.ranges.map(r => {
    if (!r.empty) return r;
    const line = st.doc.lineAt(r.head);
    if (r.head - line.from >= leadingWs(line.text)) return r;
    o ??= outlineOf(st);
    const k = hiddenEnd(o, line.number - 1);
    if (!k || r.head - line.from >= k) return r;
    moved = true;
    // one character left from the text start (←), not a jump to the line start (Home)
    const left = !tr.docChanged && was === line.from + k && r.head === was - 1 && line.number > 1;
    return EditorSelection.cursor(left ? line.from - 1 : line.from + k);
  });
  return moved ? [tr, { selection: EditorSelection.create(ranges, tr.selection.mainIndex), sequential: true }] : tr;
});

/** Backspace right after a hidden item indent: outline mode's join with the line above, or nothing. */
function backspaceAtIndent(view: EditorView): boolean {
  const st = view.state;
  const r = st.selection.main;
  if (!isLive(st) || !r.empty || stepAside(view, false)) return false;
  const line = st.doc.lineAt(r.head);
  if (r.head - line.from > leadingWs(line.text)) return false;
  const o = outlineOf(st);
  const k = hiddenEnd(o, line.number - 1);
  if (!k || r.head - line.from !== k) return false;
  const p = posOf(st, r.head);
  const res = backspace(o, p, p, ctxOf(st, false), foldedLines(st));
  if (res && res !== "noop") applyRows(view, o, res.rows, "merge.outliner", res.cursor);
  return true;
}

/** A remeasure changed an item's text offset: rebuild the decorations with it. */
const remeasured = StateEffect.define<null>();

const livePreview = (view: EditorView) => isLive(view.state);

export function itemCodeIndent(): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      hidden: DecorationSet = Decoration.none;
      /** Item marker line (0-based) → its text's offset from the line's left edge, in px. */
      offsets = new Map<number, number>();
      /** The item marker lines whose code lines are in view, to measure. */
      items = new Set<number>();
      timer = 0;

      destroy() {
        window.clearTimeout(this.timer);
      }

      constructor(readonly view: EditorView) {
        this.build(view);
        this.measure();
      }

      update(u: ViewUpdate) {
        const again = u.transactions.some(tr => tr.effects.some(e => e.is(remeasured)));
        // typing: the decorations follow the text, and are worked out again after a pause (parsing a long
        // note on every keystroke would slow typing down)
        const typing =
          u.docChanged &&
          !again &&
          // (the viewport's offsets shift with every keystroke: viewportChanged doesn't mean new lines in view;
          // lines scrolled into view while typing get their decorations after the pause)
          u.transactions.every(tr => tr.isUserEvent("input.type") || tr.isUserEvent("delete"));
        if (typing) {
          this.decorations = this.decorations.map(u.changes);
          this.hidden = this.hidden.map(u.changes);
          window.clearTimeout(this.timer);
          const view = u.view;
          this.timer = window.setTimeout(() => {
            if (view.dom.isConnected) view.dispatch({ effects: remeasured.of(null) });
          }, 300);
          return;
        }
        if (u.docChanged) this.offsets.clear();
        if (
          u.docChanged ||
          u.viewportChanged ||
          again ||
          u.startState.field(editorLivePreviewField, false) !== livePreview(u.view)
        ) {
          this.build(u.view);
        }
        if (u.docChanged || u.viewportChanged || u.geometryChanged || again) this.measure();
      }

      build(view: EditorView) {
        this.items.clear();
        if (!livePreview(view)) {
          this.decorations = this.hidden = Decoration.none;
          return;
        }
        const st = view.state;
        const o = outlineOf(st);
        const lines = new RangeSetBuilder<Decoration>();
        const hide = new RangeSetBuilder<Decoration>();
        for (const { from, to } of view.visibleRanges) {
          for (let n = st.doc.lineAt(from).number; n <= st.doc.lineAt(to).number; n++) {
            const i = n - 1;
            const k = hiddenEnd(o, i);
            if (!k) continue;
            const it = codeBlockAt(o, i)!.owner.item;
            this.items.add(it.line);
            const line = st.doc.line(n);
            const px = this.offsets.get(it.line);
            lines.add(
              line.from,
              line.from,
              Decoration.line({
                class: "eo-item-code",
                attributes: px === undefined ? {} : { style: `--eo-item-indent: ${px}px` },
              }),
            );
            hide.add(line.from, line.from + k, Decoration.replace({}));
          }
        }
        this.decorations = lines.finish();
        this.hidden = hide.finish();
      }

      /** Reads where each item's text starts; a change rebuilds the decorations. */
      measure() {
        if (!this.items.size) return;
        this.view.requestMeasure({
          key: this,
          read: view => {
            const st = view.state;
            const out = new Map<number, number>();
            for (const l of this.items) {
              if (l >= st.doc.lines) continue;
              const line = st.doc.line(l + 1);
              const o = outlineOf(st);
              const at = view.coordsAtPos(line.from + (o.info[l]?.text ?? 0), 1);
              const lineEl = view.domAtPos(line.from).node;
              const el = (lineEl instanceof HTMLElement ? lineEl : lineEl.parentElement)?.closest(".cm-line");
              if (!at || !el) continue;
              out.set(l, Math.max(0, Math.round(at.left - el.getBoundingClientRect().left)));
            }
            return out;
          },
          write: (out, view) => {
            let changed = false;
            for (const [l, px] of out) {
              if (this.offsets.get(l) !== px) {
                this.offsets.set(l, px);
                changed = true;
              }
            }
            if (changed)
              queueMicrotask(() => {
                if (view.dom.isConnected) view.dispatch({ effects: remeasured.of(null) });
              });
          },
        });
      }
    },
    { decorations: v => v.decorations },
  );
  return [
    plugin,
    EditorView.decorations.of(view => view.plugin(plugin)?.hidden ?? Decoration.none),
    keepOutOfIndent,
    Prec.highest(keymap.of([{ key: "Backspace", run: backspaceAtIndent }])),
  ];
}
