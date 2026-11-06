// Editor Outliner: outliner editing for headings, nested lists and body blocks. See SPEC.md.
//
// - parse.ts: the outline model (pure). ops.ts: indent / outdent / move (pure). select.ts: expand steps (pure).
//   drop.ts: drag sources, targets and drops (pure).
// - editor.ts: applies an operation to a CodeMirror view as one transaction. folding.ts: fold commands.
//   view.ts: heading guides, H7+ styling, drag handles.
// Tab / Shift+Tab are a high-precedence CodeMirror keymap, so they run before Obsidian's own list Tab and fall
// through (return false) where the outline doesn't apply. The other keys are the commands' default hotkeys.
import { Editor, Hotkey, Platform, Plugin } from "obsidian";
import { Extension, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { OpKind, expandSelection, nested, runOp, setSuggestCheck, shrinkSelection } from "./editor";
import { foldChildren, foldNode, foldToLevel, unfoldAll, unfoldNode, unfoldSubtree } from "./folding";
import { DEFAULTS, EditorOutlinerTab, Settings } from "./settings";
import { dragHandles, lineDecorations } from "./view";

/** The CodeMirror editor that has keyboard focus (in any window), if any. */
function focusedView(): EditorView | null {
  // no instanceof: a popout window's elements belong to that window's HTMLElement
  const el = activeDocument.activeElement?.closest(".cm-editor");
  return el ? EditorView.findFromDOM(el as HTMLElement) : null;
}

const key = (modifiers: Hotkey["modifiers"], k: string): Hotkey => ({ modifiers, key: k });

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
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.buildExtensions();
    this.app.workspace.updateOptions();
  }

  private buildExtensions() {
    const logical = () => this.settings.logicalOutdent;
    this.extensions.length = 0;
    // Tab is a CodeMirror key, not a hotkey: it must fall through to Obsidian (lists in tables, code, text)
    // when the outline doesn't apply
    if (this.settings.keys)
      this.extensions.push(
        Prec.highest(
          keymap.of([
            { key: "Tab", run: v => runOp(v, "indent", logical()) },
            { key: "Shift-Tab", run: v => runOp(v, "outdent", logical()) },
          ]),
        ),
      );
    this.extensions.push(lineDecorations(() => this.settings));
    if (this.settings.dragHandles && !Platform.isMobile) this.extensions.push(dragHandles(logical));
  }

  private addCommands() {
    const logical = () => this.settings.logicalOutdent;
    /** A command for the note's own editor (not a table cell's); `applies` says whether it does anything. */
    const cmd = (
      id: string,
      name: string,
      icon: string,
      run: (view: EditorView) => unknown,
      opts: { applies?: (view: EditorView) => boolean; hotkeys?: Hotkey[]; repeatable?: boolean } = {},
    ) =>
      this.addCommand({
        id,
        name,
        icon,
        hotkeys: opts.hotkeys,
        // Obsidian runs a held-down hotkey only once unless the command is repeatable
        repeatable: opts.repeatable,
        editorCheckCallback: (checking: boolean, editor: Editor) => {
          // Obsidian hands over workspace.activeEditor, which needn't be the editor being typed in (another
          // Editor Lanes card, say): act on the focused one
          const focused = focusedView();
          const view = focused ?? editor.cm;
          if (!view || nested(view) || (!focused && editor.activeCM && editor.activeCM !== view)) return false;
          // the palette asks first; a hotkey runs straight away
          if (checking) return opts.applies ? opts.applies(view) : true;
          run(view);
          return true;
        },
      });
    const op = (kind: OpKind) => ({
      run: (v: EditorView) => runOp(v, kind, logical()),
      applies: (v: EditorView) => runOp(v, kind, logical(), true),
    });
    // Option+Shift+↑/↓ selects by paragraph on macOS: keep it there, Option+Fn+↑/↓ (PageUp/PageDown) moves
    const moveKeys = (arrow: string, page: string) =>
      Platform.isMacOS ? [key(["Alt"], page)] : [key(["Alt", "Shift"], arrow), key(["Alt"], page)];
    const indentOp = op("indent");
    const outdentOp = op("outdent");
    const upOp = op("up");
    const downOp = op("down");
    cmd("indent", "Indent heading or list item", "indent", indentOp.run, {
      applies: indentOp.applies,
      repeatable: true,
    });
    cmd("outdent", "Outdent heading or list item", "outdent", outdentOp.run, {
      applies: outdentOp.applies,
      repeatable: true,
    });
    cmd("move-up", "Move up with children", "arrow-up", upOp.run, {
      applies: upOp.applies,
      hotkeys: moveKeys("ArrowUp", "PageUp"),
      repeatable: true,
    });
    cmd("move-down", "Move down with children", "arrow-down", downOp.run, {
      applies: downOp.applies,
      hotkeys: moveKeys("ArrowDown", "PageDown"),
      repeatable: true,
    });
    cmd("expand-selection", "Expand selection", "text-select", expandSelection, {
      hotkeys: [key(["Alt"], "ArrowUp")],
      repeatable: true,
    });
    cmd("shrink-selection", "Shrink selection", "text-cursor", shrinkSelection, {
      hotkeys: [key(["Alt"], "ArrowDown")],
      repeatable: true,
    });
    cmd("fold", "Fold heading or list item", "fold-vertical", foldNode);
    cmd("unfold", "Unfold heading or list item", "unfold-vertical", unfoldNode);
    cmd("fold-children", "Fold children", "chevrons-down-up", foldChildren);
    cmd("unfold-subtree", "Unfold heading or list item and everything under it", "chevrons-up-down", unfoldSubtree);
    for (let n = 1; n <= 6; n++)
      cmd(`fold-to-level-${n}`, `Fold headings to level ${n}`, "list-collapse", v => foldToLevel(v, n));
    cmd("unfold-all", "Unfold all", "list-tree", unfoldAll);
  }
}
