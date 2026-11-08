import { describe, expect, it } from "vitest";
import { DEFAULTS, loadSettings } from "./settings";
import { missingInternals } from "./internals";

describe("saved settings", () => {
  it("defaults when nothing is saved", () => {
    expect(loadSettings(null)).toEqual(DEFAULTS);
    expect(loadSettings("nonsense")).toEqual(DEFAULTS);
  });

  it("keeps known booleans, drops the old outlineMode switch, unknown keys and damaged values", () => {
    const s = loadSettings({ logicalOutdent: true, keys: "no", outlineMode: false, extra: 1, dragHandles: false });
    expect(s).toEqual({ ...DEFAULTS, logicalOutdent: true, dragHandles: false });
    expect(Object.keys(s).sort()).toEqual(Object.keys(DEFAULTS).sort());
  });
});

describe("Obsidian internals", () => {
  const ok = {
    workspace: { editorSuggest: { isShowingSuggestion: () => false } },
    vault: { getConfig: () => true },
    commands: { commands: { "editor:indent-list": {}, "editor:unindent-list": {} } },
  };

  it("nothing missing on Obsidian as checked (desktop and mobile)", () => {
    expect(missingInternals({ app: ok, mobile: false })).toEqual([]);
    expect(missingInternals({ app: ok, mobile: true })).toEqual([]);
  });

  it("names each missing one; the toolbar commands only on mobile", () => {
    const bare = { workspace: {}, vault: {} };
    expect(missingInternals({ app: bare, mobile: false }).map(m => m.split(" ")[0])).toEqual([
      "workspace.editorSuggest.isShowingSuggestion",
      "vault.getConfig",
    ]);
    expect(missingInternals({ app: bare, mobile: true })).toHaveLength(4);
  });
});
