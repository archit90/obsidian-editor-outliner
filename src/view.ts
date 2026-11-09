// Editor view extensions: H7+ styling and heading level labels (line decorations), and drag handles.
import { Extension, RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { setIcon } from "obsidian";
import { Outline, shape } from "./parse";
import { unitCols } from "./ops";
import { Option, Source, Target, drop, sourceAt, sourceDepth, sourceLine, targets } from "./drop";
import { applyRows, ctxOf, nested, outlineOf } from "./editor";
import type { Settings } from "./settings";

/**
 * An edit inside one line that can't change any line's heading depth or H7+ status (most typing, also in a
 * heading's text or next to a `-->`): the line keeps its shape (parse.ts), so the decorations only need mapping,
 * and the note isn't re-parsed on every keystroke.
 */
function plainEdit(u: ViewUpdate): boolean {
  if (u.startState.doc.lines !== u.state.doc.lines) return false;
  const tabSize = u.state.tabSize;
  let plain = true;
  u.changes.iterChangedRanges((fa, ta, fb, tb) => {
    if (!plain) return;
    const a = u.startState.doc.lineAt(fa);
    const b = u.state.doc.lineAt(fb);
    if (u.startState.doc.lineAt(ta).number !== a.number || u.state.doc.lineAt(tb).number !== b.number) plain = false;
    else if (shape(a.text, tabSize) !== shape(b.text, tabSize)) plain = false;
  });
  return plain;
}

/**
 * H7+ styling and the level labels: a line decoration on every heading line of the note (headings are few, so
 * the whole note is decorated once per parse and scrolling needs nothing). Plain edits only map them.
 */
export function lineDecorations(settings: () => Settings) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }
      update(u: ViewUpdate) {
        if (!u.docChanged) return;
        this.decorations = plainEdit(u) ? this.decorations.map(u.changes) : this.build(u.view);
      }
      build(view: EditorView): DecorationSet {
        const s = settings();
        if ((!s.deepHeadings && !s.levelLabels) || nested(view)) return Decoration.none;
        const o = outlineOf(view.state);
        const b = new RangeSetBuilder<Decoration>();
        const doc = view.state.doc;
        for (const sec of o.sections) {
          const cls: string[] = [];
          if (s.deepHeadings && sec.level >= 7) cls.push("eo-deep-heading");
          if (s.levelLabels) cls.push("eo-level-label");
          if (!cls.length) continue;
          const from = doc.line(sec.line + 1).from;
          b.add(
            from,
            from,
            Decoration.line({ class: cls.join(" "), attributes: { "data-eo-level": String(sec.level) } }),
          );
        }
        return b.finish();
      }
    },
    { decorations: v => v.decorations },
  );
}

/** Horizontal step on screen between heading levels while dragging, in px. */
const HEADING_STEP = 24;
/** Movement before a press on the handle becomes a drag, in px (a click does nothing). */
const DRAG_START = 4;
/** Gap between the drag handle and the text, in px (the 22px in styles.css .eo-drag-handle's transform). */
const HANDLE_GAP = 22;

interface Drag {
  o: Outline;
  src: Source;
  targets: Target[];
  /** Each target's y from the top of the document (sorted, like the targets). */
  tops: number[];
  target: Target | null;
  opt: Option | null;
  startX: number;
  step: number;
  base: number;
  right: number;
  scroller: HTMLElement | null;
}

export function dragHandles(logical: () => boolean): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      handle: HTMLElement;
      indicator: HTMLElement;
      hoverLine = -1;
      /** The press on the handle, until it moves far enough to be a drag. */
      press: { x: number; y: number; pointerId: number; line: number } | null = null;
      drag: Drag | null = null;
      scrollTimer = 0;
      lastPointer = { x: 0, y: 0 };
      readonly off: boolean;
      readonly doc: Document;
      readonly win: Window;

      constructor(readonly view: EditorView) {
        // editors in popout windows have their own document and window
        this.doc = view.dom.ownerDocument;
        this.win = this.doc.defaultView ?? window;
        this.handle = this.doc.createElement("div");
        this.handle.className = "eo-drag-handle";
        this.handle.setAttribute("aria-label", "Drag to move");
        setIcon(this.handle, "grip-vertical");
        this.indicator = this.doc.createElement("div");
        this.indicator.className = "eo-drop-indicator";
        this.off = nested(view);
        if (this.off) return;
        view.dom.appendChild(this.handle);
        view.dom.appendChild(this.indicator);
        this.hide();
        this.indicator.style.display = "none";
        view.contentDOM.addEventListener("mousemove", this.onHover);
        view.dom.addEventListener("mouseleave", this.onLeave);
        view.scrollDOM.addEventListener("scroll", this.onScroll, { passive: true });
        this.handle.addEventListener("pointerdown", this.onDown);
      }

      update(u: ViewUpdate) {
        if (!this.drag && (u.docChanged || u.viewportChanged || u.geometryChanged)) this.hide();
      }

      destroy() {
        if (this.off) return;
        this.end();
        this.view.contentDOM.removeEventListener("mousemove", this.onHover);
        this.view.dom.removeEventListener("mouseleave", this.onLeave);
        this.view.scrollDOM.removeEventListener("scroll", this.onScroll);
        this.handle.remove();
        this.indicator.remove();
      }

      hide() {
        this.handle.style.display = "none";
        this.hoverLine = -1;
      }

      onScroll = () => {
        // the handle sits outside the scroller: it would stay put while the text moves
        if (!this.drag && !this.press) this.hide();
      };

      onLeave = (e: MouseEvent) => {
        const to = e.relatedTarget as Node | null;
        if (!this.drag && !this.press && to !== this.handle && !this.handle.contains(to)) this.hide();
      };

      onHover = (e: MouseEvent) => {
        if (this.drag || this.press) return;
        const view = this.view;
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
        if (pos === null) return this.hide();
        const o = outlineOf(view.state);
        const src = sourceAt(o, view.state.doc.lineAt(pos).number - 1);
        if (!src) return this.hide();
        const first = sourceLine(src);
        if (first === this.hoverLine) return;
        const line = view.state.doc.line(first + 1);
        const L = o.info[first]!;
        const at = Math.min(line.to, line.from + (src.kind === "item" ? L.pre + L.ws : 0));
        const c = view.coordsAtPos(at);
        if (!c) return this.hide();
        const box = view.dom.getBoundingClientRect();
        this.hoverLine = first;
        this.handle.style.display = "";
        this.handle.style.top = `${c.top - box.top}px`;
        this.handle.style.height = `${Math.max(16, c.bottom - c.top)}px`;
        // styles.css puts the handle HANDLE_GAP px left of the text; where the editor has no margin for it (a
        // Canvas card), it stays inside the editor's left edge instead of being cut off
        this.handle.style.left = `${Math.max(c.left - box.left, this.handle.offsetWidth + HANDLE_GAP)}px`;
      };

      onDown = (e: PointerEvent) => {
        if (e.button !== 0 || this.hoverLine < 0) return;
        e.preventDefault();
        e.stopPropagation();
        this.press = { x: e.clientX, y: e.clientY, pointerId: e.pointerId, line: this.hoverLine };
        this.handle.setPointerCapture(e.pointerId);
        this.handle.addEventListener("pointermove", this.onMove);
        this.handle.addEventListener("pointerup", this.onUp);
        this.handle.addEventListener("pointercancel", this.onCancel);
        this.handle.addEventListener("lostpointercapture", this.onCancel);
        this.win.addEventListener("keydown", this.onKey, true);
      };

      /** Turns the press into a drag: works out the source, its targets and their positions once. */
      begin(): boolean {
        const p = this.press!;
        const view = this.view;
        const o = outlineOf(view.state);
        const src = sourceAt(o, p.line);
        if (!src) return false;
        const ctx = ctxOf(view.state, logical());
        const ts = targets(o, src, ctx).sort((a, b) => a.line - b.line);
        const doc = view.state.doc;
        const tops = ts.map(t =>
          t.line < doc.lines ? view.lineBlockAt(doc.line(t.line + 1).from).top : view.lineBlockAt(doc.length).bottom,
        );
        const content = view.contentDOM.getBoundingClientRect();
        const pad = parseFloat(this.win.getComputedStyle(view.contentDOM).paddingLeft) || 0;
        const sc = view.scrollDOM;
        this.drag = {
          o,
          src,
          targets: ts,
          tops,
          target: null,
          opt: null,
          startX: p.x,
          step: src.kind === "item" ? view.defaultCharacterWidth * unitCols(ctx) : HEADING_STEP,
          base: content.left + pad,
          right: content.right,
          // an editor that grows with its text (an Editor Multiple Lanes card, say) scrolls in an ancestor
          scroller: sc.scrollHeight > sc.clientHeight ? sc : scrollParent(sc),
        };
        view.dom.classList.add("eo-dragging");
        return true;
      }

      onMove = (e: PointerEvent) => {
        const p = this.press;
        if (!p) return;
        if (!this.drag) {
          if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_START) return;
          if (!this.begin()) return this.end();
        }
        this.lastPointer = { x: e.clientX, y: e.clientY };
        this.autoScroll();
        this.pick(e.clientX, e.clientY);
      };

      autoScroll() {
        const d = this.drag;
        if (!d?.scroller) return;
        const r = d.scroller.getBoundingClientRect();
        const y = this.lastPointer.y;
        const dy = y < r.top + 40 ? -12 : y > r.bottom - 40 ? 12 : 0;
        if (!dy) return;
        d.scroller.scrollBy(0, dy);
        if (!this.scrollTimer)
          this.scrollTimer = this.win.setTimeout(() => {
            this.scrollTimer = 0;
            if (this.drag) {
              this.autoScroll();
              this.pick(this.lastPointer.x, this.lastPointer.y);
            }
          }, 30);
      }

      pick(x: number, y: number) {
        const d = this.drag!;
        const view = this.view;
        if (!d.targets.length) return;
        // nearest target by y: binary search over the sorted tops
        const dy = y - view.documentTop;
        let lo = 0;
        let hi = d.tops.length - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (d.tops[mid]! < dy) lo = mid + 1;
          else hi = mid;
        }
        if (lo > 0 && Math.abs(d.tops[lo - 1]! - dy) <= Math.abs(d.tops[lo]! - dy)) lo--;
        const best = d.targets[lo]!;
        // depth follows how far the pointer moved sideways since the press, from the node's own depth
        const want = sourceDepth(d.src) + Math.round((x - d.startX) / d.step);
        let opt = best.options[0]!;
        for (const op of best.options) if (Math.abs(op.depth - want) < Math.abs(opt.depth - want)) opt = op;
        d.target = best;
        d.opt = opt;
        const box = view.dom.getBoundingClientRect();
        const left = d.base + (d.src.kind === "block" ? 0 : opt.depth * d.step);
        this.indicator.style.display = "";
        this.indicator.style.top = `${d.tops[lo]! + view.documentTop - box.top - 1}px`;
        this.indicator.style.left = `${left - box.left}px`;
        this.indicator.style.width = `${Math.max(40, d.right - left)}px`;
        this.indicator.textContent = d.src.kind === "heading" ? `H${opt.value}` : "";
      }

      onUp = () => {
        const d = this.drag;
        this.end();
        // the note changed during the drag (outlines are cached per document): drop nothing
        if (!d?.target || !d.opt || outlineOf(this.view.state) !== d.o) return;
        const rows = drop(d.o, d.src, d.target.line, d.opt, ctxOf(this.view.state, logical()));
        if (rows) applyRows(this.view, d.o, rows);
      };

      onCancel = () => this.end();

      onKey = (e: KeyboardEvent) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        e.stopPropagation();
        this.end();
      };

      end() {
        const p = this.press;
        this.press = null;
        this.drag = null;
        this.handle.removeEventListener("pointermove", this.onMove);
        this.handle.removeEventListener("pointerup", this.onUp);
        this.handle.removeEventListener("pointercancel", this.onCancel);
        this.handle.removeEventListener("lostpointercapture", this.onCancel);
        this.win.removeEventListener("keydown", this.onKey, true);
        if (p) {
          try {
            this.handle.releasePointerCapture(p.pointerId);
          } catch {}
        }
        this.view.dom.classList.remove("eo-dragging");
        this.indicator.style.display = "none";
        this.hide();
      }
    },
  );
  // CodeMirror owns the editor element's class attribute (it rewrites it when focus changes): the classes go
  // through editorAttributes. eo-dragging is also set directly while a drag starts, before any update.
  const classes = EditorView.editorAttributes.of(view => {
    const p = view.plugin(plugin);
    return p && !p.off ? { class: p.drag ? "eo-drag-handles eo-dragging" : "eo-drag-handles" } : null;
  });
  return [plugin, classes];
}

function scrollParent(el: HTMLElement): HTMLElement | null {
  const win = el.ownerDocument.defaultView ?? window;
  for (let p = el.parentElement; p; p = p.parentElement) {
    const oy = win.getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}
