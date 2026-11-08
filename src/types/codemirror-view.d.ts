// The part of Obsidian's EditorView this plugin reads that CodeMirror doesn't declare (app.js, Obsidian 1.15).
import "@codemirror/view";

declare module "@codemirror/view" {
  interface EditorView {
    /** Obsidian's CodeMirror 5 adapter, set while Vim key bindings are on: its state holds Vim's mode. */
    cm?: { state?: { vim?: { insertMode?: boolean; visualMode?: boolean } } };
  }
}
