// Run by e2e/sandbox.sh once a sandbox's vault is made, before Obsidian starts: the fixtures the suite and the manual
// checklist want on disk. Idempotent; in a copied vault (OBS_VAULT) it only adds or refreshes the suite's own paths
// and the settings below, never the vault's other notes.
//   - .obsidian/app.json: the editor settings the cases are written for (merged into what's there): tabs of size 4,
//     Live Preview, folding of headings and indents, "Auto convert HTML", no Vim, and no readable line length (the
//     geometry the drag and guide cases were measured in);
//   - .obsidian/core-plugins.json: Canvas, Page preview and the command palette on (the Canvas and popover surfaces,
//     the palette case); a fresh vault gets Obsidian's other defaults;
//   - _test/ and _test/tab/ (the runners' notes; _test/tab/ is the normal-tab folder Lanes leaves alone);
//   - _test/manual/: the hand-test notes of SPEC.md's manual checklist (e2e/fixtures/, and a generated long outline).
// Usage: node e2e/make-vault.mjs <vault>
// @ts-check
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const vault = process.argv[2];
if (!vault || !fs.existsSync(path.join(vault, ".obsidian"))) {
  console.error("usage: node e2e/make-vault.mjs <vault> (a folder with .obsidian/)");
  process.exit(2);
}

/**
 * Merges values into a JSON settings file of the vault (made when missing, from base).
 * @param {string} file
 * @param {Record<string, unknown>} values
 * @param {Record<string, unknown>} [base]
 */
function merge(file, values, base = {}) {
  const p = path.join(vault, ".obsidian", file);
  /** @type {Record<string, unknown>} */
  let cur = { ...base };
  if (fs.existsSync(p)) {
    try {
      cur = JSON.parse(fs.readFileSync(p, "utf8"));
    } catch {
      console.error(`make-vault: ${file} isn't JSON; rewriting it`);
    }
  }
  fs.writeFileSync(p, JSON.stringify({ ...cur, ...values }, null, 2) + "\n");
}

merge("app.json", {
  useTab: true,
  tabSize: 4,
  livePreview: true,
  foldHeading: true,
  foldIndent: true,
  autoConvertHtml: true,
  vimMode: false,
  readableLineLength: false,
});

// Obsidian 1.15's defaults for a new vault, for when the file doesn't exist yet
const CORE_DEFAULTS = {
  "file-explorer": true,
  "global-search": true,
  switcher: true,
  graph: true,
  backlink: true,
  canvas: true,
  "outgoing-link": true,
  "tag-pane": true,
  properties: true,
  "page-preview": true,
  "daily-notes": true,
  templates: true,
  "note-composer": true,
  "command-palette": true,
  "editor-status": true,
  bookmarks: true,
  outline: true,
  "word-count": true,
  "file-recovery": true,
  bases: true,
};
merge("core-plugins.json", { canvas: true, "page-preview": true, "command-palette": true }, CORE_DEFAULTS);

for (const d of ["_test", "_test/tab", "_test/manual"]) fs.mkdirSync(path.join(vault, d), { recursive: true });

const manual = path.join(vault, "_test", "manual");
for (const f of fs.readdirSync(path.join(HERE, "fixtures")))
  fs.copyFileSync(path.join(HERE, "fixtures", f), path.join(manual, f));

// a long note for moves, folding and guides by hand: 20 chapters, each with sections, lists and subsections
const long = [];
for (let c = 1; c <= 20; c++) {
  long.push(`# Chapter ${c}`, "", `Intro to chapter ${c}.`, "");
  for (let s = 1; s <= 3; s++) {
    const n = `${c}.${s}`;
    long.push(`## Section ${n}`, "", `Body of section ${n}.`, "");
    long.push(`- Point ${n}.1`, "\t- Detail a", "\t- Detail b", "\t\t- Deeper", `- Point ${n}.2`, `- Point ${n}.3`, "");
    long.push(`### Subsection ${n}.1`, "", "Small print.", "");
  }
}
fs.writeFileSync(path.join(manual, "Long outline.md"), long.join("\n"));
console.log(
  `make-vault: settings, _test/ folders and ${fs.readdirSync(manual).length} manual-checklist notes in ${vault}`,
);
