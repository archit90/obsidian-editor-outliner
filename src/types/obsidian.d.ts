// Obsidian internals this plugin relies on (not in the public API).
import "obsidian";
import type { EditorView } from "@codemirror/view";

declare module "obsidian" {
  interface Editor {
    /** The CodeMirror 6 view behind a Markdown editor. */
    cm?: EditorView;
    /** The CodeMirror view that has focus: a Live Preview table cell's own editor while one is edited. */
    activeCM?: EditorView;
  }
  interface Vault {
    /** A vault setting from app.json ("autoConvertHtml": Settings, Editor, Auto convert HTML). */
    getConfig(key: string): unknown;
  }
  interface Workspace {
    /** Reconfigures every editor's extensions (after registerEditorExtension's array changes). */
    updateOptions(): void;
    /** The editor autocomplete popups ([[ links, #tags, plugin suggests). */
    editorSuggest?: { isShowingSuggestion?(): boolean };
  }
}
