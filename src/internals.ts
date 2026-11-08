// The Obsidian internals the plugin relies on, checked once on load, so a new Obsidian version that renames one
// says so in the console instead of failing quietly (SPEC.md → Development → Internals). Pure: works on plain
// objects shaped like Obsidian's.

/** What the check reads: Obsidian's app, and whether it runs on mobile. */
export interface InternalsHost {
  app: {
    workspace: { editorSuggest?: { isShowingSuggestion?: unknown } };
    vault: { getConfig?: unknown };
    commands?: { commands?: Record<string, unknown> };
  };
  mobile: boolean;
}

/** The internals that are missing, each with what goes wrong without it; empty when all are there. */
export function missingInternals(h: InternalsHost): string[] {
  const out: string[] = [];
  if (typeof h.app.workspace.editorSuggest?.isShowingSuggestion !== "function")
    out.push("workspace.editorSuggest.isShowingSuggestion (the keys won't step aside for an autocomplete popup)");
  if (typeof h.app.vault.getConfig !== "function")
    out.push('vault.getConfig (outline-mode paste takes "Auto convert HTML" as on)');
  if (h.mobile)
    for (const id of ["editor:indent-list", "editor:unindent-list"])
      if (!h.app.commands?.commands?.[id])
        out.push(`commands["${id}"] (the toolbar's button indents as Obsidian's does, without the subtree)`);
  return out;
}
