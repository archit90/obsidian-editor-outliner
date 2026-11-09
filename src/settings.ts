import { App, PluginSettingTab, Setting } from "obsidian";
import type EditorOutlinerPlugin from "./main";

export interface Settings {
  logicalOutdent: boolean; // outdented nodes move after their parent's subtree; following siblings stay
  keys: boolean; // Tab / Shift+Tab, Mod+Up/Down, Alt+Up/Down, Alt+Shift+Up/Down, Home (a CodeMirror keymap)
  dragHandles: boolean;
  deepHeadings: boolean; // style lines of 7+ # as headings
  levelLabels: boolean; // Live Preview: a faint "H3" after each heading
}

export const DEFAULTS: Settings = {
  logicalOutdent: false,
  keys: true,
  dragHandles: true,
  deepHeadings: true,
  levelLabels: true,
};

/**
 * The settings from saved data: each known setting that holds a boolean, else its default. Anything else goes,
 * such as the outlineMode switch older versions saved (outline mode is always on now) or a damaged value.
 */
export function loadSettings(saved: unknown): Settings {
  const out: Settings = { ...DEFAULTS };
  if (saved && typeof saved === "object")
    for (const k of Object.keys(DEFAULTS) as (keyof Settings)[]) {
      const v: unknown = Reflect.get(saved, k);
      if (typeof v === "boolean") out[k] = v;
    }
  return out;
}

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
      "Tab / Shift+Tab indent and outdent headings and list items; Ctrl+↑/↓ (Cmd+↑/↓ on a Mac) move them, or the selected ones, with their children; Alt+↑ / Alt+↓ expand the selection up / down (word, line, then whole blocks: siblings that way, then the parent) and Alt+Shift+↑ / Alt+Shift+↓ shrink that edge back; Home stops at the start of a heading's or list item's text, then goes to the line's start (in a list one indent per press); a selection of whole items or sections is a node selection (←/→ fold or go to the parent / child, Backspace deletes, copy gives clean Markdown). Elsewhere (text, tables, code) these keys work as usual. Turn off to use only your own hotkeys for the commands (Settings → Hotkeys).",
      "keys",
    );
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
