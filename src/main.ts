// Editor Outliner: outliner editing for headings, nested lists and body blocks. See SPEC.md.
//
// - parse.ts: the outline model (pure). ops.ts: indent / outdent / move (pure). select.ts: expand steps (pure).
//   drop.ts: drag sources, targets and drops (pure).
// - editor.ts: applies an operation to a CodeMirror view as one transaction. folding.ts: fold commands.
//   view.ts: heading guides, H7+ styling, drag handles.
// The keys are a high-precedence CodeMirror keymap (see buildExtensions); the commands have no default hotkeys.
import { Platform, Plugin } from "obsidian";
import { Extension, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { OpKind, expandSelection, nested, runOp, setSuggestCheck, shrinkSelection } from "./editor";
import { foldChildren, foldNode, foldToLevel, unfoldAll, unfoldNode, unfoldSubtree } from "./folding";
import { DEFAULTS, EditorOutlinerTab, Settings } from "./settings";
import { dragHandles, headingGuides, lineDecorations } from "./view";

/** The CodeMirror editor that has keyboard focus (in any window), if any. */
function focusedView(): EditorView | null {
  // no instanceof: a popout window's elements belong to that window's HTMLElement
  const el = activeDocument.activeElement?.closest(".cm-editor");
  return el ? EditorView.findFromDOM(el as HTMLElement) : null;
}

/** The last editor that had focus (commands from the palette run after focus has moved to the palette). */
let lastFocused: EditorView | null = null;
const rememberFocus = EditorView.domEventHandlers({
  focus: (_e, view) => {
    lastFocused = view;
  },
});

export default class EditorOutlinerPlugin extends Plugin {
  override settings: Settings = { ...DEFAULTS };
  private extensions: Extension[] = [];

  override async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.addSettingTab(new EditorOutlinerTab(this.app, this));
    setSuggestCheck(() => !!this.app.workspace.editorSuggest?.isShowingSuggestion?.());
    this.buildExtensions();
    this.registerEditorExtension(this.extensions);
    this.addCommands();
  }

  override onunload() {
    setSuggestCheck(() => false);
    lastFocused = null;
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.buildExtensions();
    this.app.workspace.updateOptions();
  }

  private buildExtensions() {
    const logical = () => this.settings.logicalOutdent;
    const op = (kind: OpKind) => (v: EditorView) => runOp(v, kind, logical());
    this.extensions.length = 0;
    // The keys are a CodeMirror keymap, not Obsidian hotkeys: Obsidian runs editor hotkeys only on
    // workspace.activeEditor, which in a lanes tab can be the lanes view (then nothing happens), and only once
    // while a key is held. Keys here act on the focused editor, repeat, and fall through (false) to
    // Obsidian where the outline doesn't apply.
    if (this.settings.keys) {
      // Option+Shift+↑/↓ selects by paragraph on macOS: there only Option+Fn+↑/↓ (PageUp/PageDown) moves
      const move = Platform.isMacOS
        ? []
        : [
            { key: "Alt-Shift-ArrowUp", run: op("up") },
            { key: "Alt-Shift-ArrowDown", run: op("down") },
          ];
      this.extensions.push(
        Prec.highest(
          keymap.of([
            { key: "Tab", run: op("indent") },
            { key: "Shift-Tab", run: op("outdent") },
            ...move,
            { key: "Alt-PageUp", run: op("up") },
            { key: "Alt-PageDown", run: op("down") },
            { key: "Alt-ArrowUp", run: expandSelection },
            { key: "Alt-ArrowDown", run: shrinkSelection },
          ]),
        ),
      );
    }
    this.extensions.push(rememberFocus);
    this.extensions.push(lineDecorations(() => this.settings));
    if (this.settings.headingGuides) this.extensions.push(headingGuides());
    if (this.settings.dragHandles && !Platform.isMobile) this.extensions.push(dragHandles(logical));
  }

  /** The editor a command acts on: the focused one, else the last one focused, else Obsidian's active one. */
  private targetView(): EditorView | null {
    const shown = (v: EditorView | null) => (v && v.dom.isConnected && v.dom.offsetParent !== null ? v : null);
    return focusedView() ?? shown(lastFocused) ?? shown(this.app.workspace.activeEditor?.editor?.cm ?? null);
  }

  private addCommands() {
    const logical = () => this.settings.logicalOutdent;
    /**
     * A command for a note's own editor (not a table cell's); `applies` says whether it does anything. A plain
     * checkCallback, not editorCheckCallback: that one only runs when Obsidian has an active Markdown editor,
     * which a lanes tab doesn't always have.
     */
    const cmd = (
      id: string,
      name: string,
      icon: string,
      run: (view: EditorView) => unknown,
      opts: { applies?: (view: EditorView) => boolean } = {},
    ) =>
      this.addCommand({
        id,
        name,
        icon,
        repeatable: true,
        checkCallback: (checking: boolean) => {
          const view = this.targetView();
          if (!view || nested(view)) return false;
          if (checking) return opts.applies ? opts.applies(view) : true;
          run(view);
          return true;
        },
      });
    const op = (kind: OpKind) => ({
      run: (v: EditorView) => runOp(v, kind, logical()),
      applies: (v: EditorView) => runOp(v, kind, logical(), true),
    });
    for (const [id, name, icon, kind] of [
      ["indent", "Indent heading or list item", "indent", "indent"],
      ["outdent", "Outdent heading or list item", "outdent", "outdent"],
      ["move-up", "Move up with children", "arrow-up", "up"],
      ["move-down", "Move down with children", "arrow-down", "down"],
    ] as const) {
      const o = op(kind);
      cmd(id, name, icon, o.run, { applies: o.applies });
    }
    cmd("expand-selection", "Expand selection", "text-select", expandSelection);
    cmd("shrink-selection", "Shrink selection", "text-cursor", shrinkSelection);
    cmd("fold", "Fold heading or list item", "fold-vertical", foldNode);
    cmd("unfold", "Unfold heading or list item", "unfold-vertical", unfoldNode);
    cmd("fold-children", "Fold children", "chevrons-down-up", foldChildren);
    cmd("unfold-subtree", "Unfold heading or list item and everything under it", "chevrons-up-down", unfoldSubtree);
    for (let n = 1; n <= 6; n++)
      cmd(`fold-to-level-${n}`, `Fold headings to level ${n}`, "list-collapse", v => foldToLevel(v, n));
    cmd("unfold-all", "Unfold all", "list-tree", unfoldAll);
  }
}
