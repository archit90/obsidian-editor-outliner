// Obsidian internals this plugin relies on (not in the public API; checked against Obsidian 1.15.0's app.js). They
// are optional here, so the code says what it does without one; internals.ts reports the missing ones on load.
import "obsidian";
import type { EditorView } from "@codemirror/view";

declare module "obsidian" {
  interface Editor {
    /** The CodeMirror 6 view behind a Markdown editor. */
    cm?: EditorView;
    /** The CodeMirror view that has focus: a Live Preview table cell's own editor while one is edited. */
    activeCM?: EditorView;
  }
  interface App {
    /** The command registry (the mobile toolbar runs editor:indent-list / editor:unindent-list from it). */
    commands?: { commands?: Record<string, Command> };
  }
  interface Vault {
    /** A vault setting from app.json ("autoConvertHtml": Settings, Editor, Auto convert HTML). */
    getConfig?(key: string): unknown;
  }
  interface Workspace {
    /** The editor autocomplete popups ([[ links, #tags, plugin suggests). */
    editorSuggest?: { isShowingSuggestion?(): boolean };
  }
}
