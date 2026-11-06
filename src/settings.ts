import { App, PluginSettingTab, Setting } from "obsidian";
import type EditorOutlinerPlugin from "./main";

export interface Settings {
  logicalOutdent: boolean; // outdented nodes move after their parent's subtree; following siblings stay
  keys: boolean; // Tab / Shift+Tab, Alt+Shift+Up/Down, Alt+PageUp/PageDown, Alt+Up/Down (a CodeMirror keymap)
  headingGuides: boolean;
  dragHandles: boolean;
  deepHeadings: boolean; // style lines of 7+ # as headings
}

export const DEFAULTS: Settings = {
  logicalOutdent: false,
  keys: true,
  headingGuides: true,
  dragHandles: true,
  deepHeadings: true,
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
    this.toggle(
      "Logical outdenting",
      "Off: an outdented item or heading stays where it is, and the siblings after it become its children. On: it moves to just after its parent, and those siblings stay with the parent.",
      "logicalOutdent",
    );
    this.toggle(
      "Outliner keys",
      "Tab / Shift+Tab indent and outdent headings and list items; Alt+Shift+↑/↓ or Alt+Fn+↑/↓ (Option+Fn+↑/↓ on a Mac) move them with their children; Alt+↑/↓ expand and shrink the selection. Elsewhere (text, tables, code) these keys work as usual. Turn off to use only your own hotkeys for the commands (Settings → Hotkeys).",
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
  }
}
