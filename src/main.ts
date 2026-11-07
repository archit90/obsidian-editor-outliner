// Editor Outliner: outliner editing for headings, nested lists and body blocks. See the repo's SPEC.md, "Editor Outliner".
//
// - parse.ts: the outline model (pure). ops.ts: indent / outdent / move (pure). select.ts: expand steps (pure).
//   drop.ts: drag sources, targets and drops (pure). content.ts: paragraphs and code blocks inside items, the
//   code-indent rules and the insert commands (pure).
// - editor.ts: applies an operation to a CodeMirror view as one transaction. folding.ts: fold commands.
//   view.ts: heading guides, H7+ styling, drag handles. Outline mode: active.ts (the active state), enter.ts
//   (Enter / Shift+Enter / Shift+Tab), merge.ts (Backspace / Delete), paste.ts (Paste), all pure; mode.ts
//   their CodeMirror glue. nodes.ts: node selection (pure); nodesel.ts: its field, keys and highlight.
// The keys are high-precedence CodeMirror keymaps (see buildExtensions); of the commands only "Toggle outline
// mode" has a default hotkey (Ctrl+Super+O; Ctrl+Cmd+O on macOS).
import { Command, Editor, MarkdownFileInfo, MarkdownView, Notice, Platform, Plugin, htmlToMarkdown } from "obsidian";
import { around } from "monkey-around";
import { Compartment, Extension, Prec } from "@codemirror/state";
import { EditorView, ViewPlugin, keymap } from "@codemirror/view";
import {
  OpKind,
  codeClipboard,
  codeEnter,
  expandSelection,
  insertBlock,
  nested,
  runOp,
  setSuggestCheck,
  shrinkSelection,
} from "./editor";
import { foldChildren, foldNode, foldToLevel, unfoldAll, unfoldNode, unfoldSubtree } from "./folding";
import {
  activeIn,
  outlineBackspace,
  outlineDelete,
  outlineEndList,
  outlineEnter,
  outlinePaste,
  outlineShiftEnter,
  setModeCheck,
  watchActive,
} from "./mode";
import { nodeSelectionExtension, setKeysCheck } from "./nodesel";
import { DEFAULTS, EditorOutlinerTab, Settings } from "./settings";
import { dragHandles, headingGuides, lineDecorations } from "./view";

/**
 * The CodeMirror editor that has keyboard focus (in any window), if any. A Canvas card (file or text card)
 * is edited in a same-origin iframe: the focused element is then the iframe, and the editor is inside it.
 */
function focusedView(): EditorView | null {
  // no instanceof: a popout window's (or iframe's) elements belong to that window's HTMLElement
  let el: Element | null | undefined = activeDocument.activeElement;
  for (let k = 0; el?.tagName === "IFRAME" && k < 4; k++) {
    try {
      el = (el as HTMLIFrameElement).contentDocument?.activeElement;
    } catch {
      return null; // a cross-origin frame (a web embed): no editor of ours
    }
  }
  const ed = el?.closest(".cm-editor");
  return ed ? EditorView.findFromDOM(ed as HTMLElement) : null;
}

/** The last editor that had focus (commands from the palette run after focus has moved to the palette). */
let lastFocused: EditorView | null = null;
const rememberFocus = EditorView.domEventHandlers({
  focus: (_e, view) => {
    lastFocused = view;
  },
});

/**
 * Every editor that has the plugin's extensions, so a settings change or unloading can reconfigure them all.
 * Obsidian's workspace.updateOptions() only reaches Markdown tabs (and Editor Lanes cards): a Canvas card's or a
 * page preview popover's editor would keep the old extensions (drag handles, guides, keys) until it closes.
 */
const editors = new Set<{ view: EditorView }>();
const tracker = ViewPlugin.fromClass(
  class {
    constructor(readonly view: EditorView) {
      editors.add(this);
    }
    destroy() {
      editors.delete(this);
    }
  },
);

export default class EditorOutlinerPlugin extends Plugin {
  override settings: Settings = { ...DEFAULTS };
  private extensions: Extension[] = [];
  /** Holds the extensions in every editor (see editors). */
  private compartment = new Compartment();
  private status: HTMLElement | null = null;
  private statusQueued = false;
  private statusTimer = 0;

  override async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.addSettingTab(new EditorOutlinerTab(this.app, this));
    setSuggestCheck(() => !!this.app.workspace.editorSuggest?.isShowingSuggestion?.());
    setModeCheck(() => this.settings.outlineMode);
    setKeysCheck(() => this.settings.keys);
    this.buildExtensions();
    this.registerEditorExtension([this.compartment.of(this.extensions)]);
    this.addCommands();
    this.addStatus();
    if (Platform.isMobile) this.app.workspace.onLayoutReady(() => this.routeToolbarIndent());
  }

  /**
   * Mobile: the editor toolbar's indent / outdent buttons (Obsidian's "Indent list item" / "Unindent list item")
   * indent and outdent the heading or list item with its subtree, as Tab / Shift+Tab do; elsewhere (body text, a
   * code block, a table cell) Obsidian's own command runs. The patch comes off on unload.
   */
  private routeToolbarIndent() {
    const route = (id: string, kind: OpKind) => {
      const cmd = this.app.commands?.commands?.[id];
      if (!cmd?.editorCallback) return;
      const logical = this.logical;
      this.register(
        around(cmd, {
          editorCallback: next =>
            function (this: Command, editor: Editor, ctx: MarkdownView | MarkdownFileInfo) {
              const view = editor.activeCM ?? editor.cm;
              if (view && runOp(view, kind, logical())) return;
              return next?.call(this, editor, ctx);
            },
        }),
      );
    };
    route("editor:indent-list", "indent");
    route("editor:unindent-list", "outdent");
  }

  override onunload() {
    window.clearTimeout(this.statusTimer);
    // every editor drops the extensions now (Obsidian's own unregistering misses Canvas cards and popovers)
    this.reconfigure([]);
    setSuggestCheck(() => false);
    setModeCheck(() => false);
    setKeysCheck(() => false);
    lastFocused = null;
  }

  /** Outline mode on / off (command, setting, status bar): saved, no editor reconfiguration needed. */
  async setOutlineMode(on: boolean) {
    this.settings.outlineMode = on;
    await this.saveData(this.settings);
    this.refreshStatus();
    // editors redraw: the status of each editor follows the mode
    for (const e of [...editors]) e.view.dispatch({});
  }

  /** Gives every editor that has the extensions the new ones (none: unloading). */
  private reconfigure(ext: Extension) {
    for (const e of [...editors]) e.view.dispatch({ effects: this.compartment.reconfigure(ext) });
  }

  /**
   * The status bar item (desktop; mobile has no status bar): "Outline" when outline mode is on, emphasised
   * while it is active in the focused editor (or the last one focused), faint when off. A click toggles.
   */
  private addStatus() {
    const el = this.addStatusBarItem();
    el.addClass("eo-status", "mod-clickable");
    el.setText("Outline");
    this.registerDomEvent(el, "click", () => void this.setOutlineMode(!this.settings.outlineMode));
    this.status = el;
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.refreshStatus()));
    this.refreshStatus();
  }

  /**
   * Updates the status bar item, at most once per frame (it runs on every selection change); while typing, after a
   * pause (typing inside an item rarely changes the active state, and working it out parses the note).
   */
  private refreshStatus(typing = false) {
    if (!this.status) return;
    window.clearTimeout(this.statusTimer);
    if (typing) {
      this.statusTimer = window.setTimeout(() => this.refreshStatus(), 300);
      return;
    }
    if (this.statusQueued) return;
    this.statusQueued = true;
    requestAnimationFrame(() => {
      this.statusQueued = false;
      const el = this.status;
      if (!el) return;
      const on = this.settings.outlineMode;
      const view = this.targetView();
      const active = on && !!view && !!activeIn(view);
      el.toggleClass("is-on", on);
      el.toggleClass("is-active", active);
      el.setAttribute(
        "aria-label",
        `Outline mode ${on ? (active ? "on, active in this list" : "on") : "off"}. Click to turn it ${on ? "off" : "on"}.`,
      );
    });
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.buildExtensions();
    this.reconfigure([...this.extensions]);
  }

  /** The "Logical outdenting" setting, read when a key or command runs. */
  private logical = () => this.settings.logicalOutdent;

  private buildExtensions() {
    const logical = this.logical;
    const op = (kind: OpKind) => (v: EditorView) => runOp(v, kind, logical());
    this.extensions.length = 0;
    this.extensions.push(tracker);
    // Node selection's keys come before the rest: they only act on a selection of whole nodes
    this.extensions.push(nodeSelectionExtension());
    // Outline mode's keys come first: each falls through (false) when outline mode is off or not active
    // here, and then the outliner keys below (Shift+Tab outdent, Enter in code) or Obsidian's apply
    this.extensions.push(
      Prec.highest(
        keymap.of([
          { key: "Enter", run: v => outlineEnter(v, logical()) },
          { key: "Shift-Enter", run: outlineShiftEnter },
          { key: "Shift-Tab", run: outlineEndList },
          { key: "Backspace", run: outlineBackspace },
          { key: "Delete", run: outlineDelete },
        ]),
      ),
    );
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
            // Mod = Ctrl on Windows/Linux, Cmd on macOS (there, outside the outline Cmd+↑/↓ falls through to
            // Obsidian's document start / end)
            { key: "Mod-ArrowUp", run: op("up") },
            { key: "Mod-ArrowDown", run: op("down") },
            { key: "Alt-PageUp", run: op("up") },
            { key: "Alt-PageDown", run: op("down") },
            { key: "Alt-ArrowUp", run: expandSelection },
            { key: "Alt-ArrowDown", run: shrinkSelection },
            { key: "Enter", run: codeEnter },
          ]),
        ),
      );
    }
    this.extensions.push(
      rememberFocus,
      codeClipboard((v, data) => {
        const text = this.clipText(data);
        return text !== null && outlinePaste(v, text);
      }),
      watchActive(typing => this.refreshStatus(typing)),
    );
    this.extensions.push(lineDecorations(() => this.settings));
    if (this.settings.headingGuides) this.extensions.push(headingGuides());
    if (this.settings.dragHandles && !Platform.isMobile) this.extensions.push(dragHandles(logical));
  }

  /**
   * The text Obsidian's own paste would insert (its clipboard manager, app.js): its own copies' plain text, else
   * text/markdown, else HTML converted to Markdown (when "Auto convert HTML" is on), else plain text. Null for
   * what only Obsidian handles: files, links from a URL list, HTML with images or media.
   */
  private clipText(data: DataTransfer): string | null {
    if (data.files.length || data.getData("text/uri-list")) return null;
    const plain = data.getData("text/plain");
    const html = data.getData("text/html");
    if (html && html.includes("<!-- obsidian -->") && plain) return plain;
    const md = data.getData("text/markdown");
    if (md) return md;
    if (html) {
      if (!this.app.vault.getConfig("autoConvertHtml")) return plain || null;
      if (/<(img|audio|video)\b/i.test(html)) return null;
      return htmlToMarkdown(html);
    }
    return plain || null;
  }

  /** The editor a command acts on: the focused one, else the last one focused, else Obsidian's active one. */
  private targetView(): EditorView | null {
    const shown = (v: EditorView | null) => (v && v.dom.isConnected && v.dom.offsetParent !== null ? v : null);
    return focusedView() ?? shown(lastFocused) ?? shown(this.app.workspace.activeEditor?.editor?.cm ?? null);
  }

  private addCommands() {
    const logical = this.logical;
    // global, not per editor: available everywhere, also with no editor open
    this.addCommand({
      id: "toggle-outline-mode",
      name: "Toggle outline mode",
      icon: "list-tree",
      hotkeys: [{ modifiers: ["Ctrl", "Meta"], key: "O" }],
      callback: async () => {
        await this.setOutlineMode(!this.settings.outlineMode);
        new Notice(`Outline mode ${this.settings.outlineMode ? "on" : "off"}`, 1500);
      },
    });
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
    cmd("insert-code-block", "Insert code block in item", "code", v => insertBlock(v, ""), {
      applies: v => insertBlock(v, "", true),
    });
    cmd("insert-dataview", "Insert Dataview query in item", "database", v => insertBlock(v, "dataview"), {
      applies: v => insertBlock(v, "dataview", true),
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
