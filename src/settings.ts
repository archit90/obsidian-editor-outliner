import { App, PluginSettingTab, Setting } from "obsidian";
import type EditorOutlinerPlugin from "./main";

export interface Settings {
  outlineMode: boolean; // Logseq-like Enter / Shift+Enter / Shift+Tab inside lists (the "Toggle outline mode" command too)
  logicalOutdent: boolean; // outdented nodes move after their parent's subtree; following siblings stay
  keys: boolean; // Tab / Shift+Tab, Mod+Up/Down, Alt+Up/Down, Alt+Shift+Up/Down (a CodeMirror keymap)
  headingGuides: boolean;
  dragHandles: boolean;
  deepHeadings: boolean; // style lines of 7+ # as headings
  levelLabels: boolean; // Live Preview: a faint "H3" after each heading
}

export const DEFAULTS: Settings = {
  outlineMode: true,
  logicalOutdent: false,
  keys: true,
  headingGuides: true,
  dragHandles: true,
  deepHeadings: true,
  levelLabels: true,
};

export class EditorOutlinerTab extends PluginSettingTab {
  constructor(
    app: App,
    private plugin: EditorOutlinerPlugin,
  ) {
    super(app, plugin);
  }

  private toggle(name: string, desc: string, key: keyof Settings) {
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(desc)
      .addToggle(t =>
        t.setValue(this.plugin.settings[key]).onChange(async v => {
          this.plugin.settings[key] = v;
          await this.plugin.saveSettings();
        }),
      );
  }

  override display() {
    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName("Outline mode")
      .setDesc(
        'Inside a list, keys work like an outliner (Logseq): Enter splits the item at the cursor or, on an empty item, outdents it; Shift+Enter starts a new line in the same item; Shift+Tab on an empty top-level item ends the list; Backspace at the start of an item merges it into the one above, Delete at its end pulls the next one in; pasted Markdown lists, headings and paragraphs become items. Elsewhere nothing changes. One switch for all notes; the "Toggle outline mode" command (Ctrl+Super+O; Ctrl+Cmd+O on macOS) and the status bar item switch it too.',
      )
      .addToggle(t => t.setValue(this.plugin.settings.outlineMode).onChange(v => this.plugin.setOutlineMode(v)));
    this.toggle(
      "Logical outdenting",
      "Off: an outdented item or heading stays where it is, and the siblings after it become its children. On: it moves to just after its parent, and those siblings stay with the parent.",
      "logicalOutdent",
    );
    this.toggle(
      "Outliner keys",
      "Tab / Shift+Tab indent and outdent headings and list items; Ctrl+↑/↓ (Cmd+↑/↓ on a Mac) move them, or the selected ones, with their children; Alt+↑ / Alt+↓ expand the selection up / down (word, line, then whole blocks: siblings that way, then the parent) and Alt+Shift+↑ / Alt+Shift+↓ shrink that edge back; a selection of whole items or sections is a node selection (←/→ fold or go to the parent / child, Backspace deletes, copy gives clean Markdown). Elsewhere (text, tables, code) these keys work as usual. Turn off to use only your own hotkeys for the commands (Settings → Hotkeys).",
      "keys",
    );
    this.toggle("Heading guides", "Vertical lines in the left margin showing each heading's section.", "headingGuides");
    this.toggle(
      "Drag handles",
      "A handle left of the heading, list item or block under the mouse; drag it to move the node. Desktop only.",
      "dragHandles",
    );
    this.toggle(
      "Style headings beyond H6",
      "Lines starting with 7 or more # are outline headings for this plugin; show them like small headings.",
      "deepHeadings",
    );
    this.toggle(
      "Heading level labels",
      "In Live Preview, a faint H1, H2, … after each heading, so you can tell the level without moving the cursor onto it. Hidden on the line you're editing, where the # marks show.",
      "levelLabels",
    );
  }
}
