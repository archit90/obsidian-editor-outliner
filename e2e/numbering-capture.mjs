// @ts-check
// Records how Obsidian renumbers ordered lists after a change, for the fixture table numbering.ts is unit-tested
// against (src/numbering.fixtures.json; SPEC.md → Development → Internals). Each seed is a note before and after a
// change; in a sandbox's Obsidian the "before" text is set without renumbering (userEvent "set"), the change is
// dispatched as one edit, and the note Obsidian's renumbering leaves is what the table records. Run it again after
// an Obsidian update; e2e/extra.mjs (X12) replays the table on every run and fails when Obsidian's rules changed.
//   npm run e2e:numbering (CDP_PORT, default e2e/cdp.mjs's: sandbox 4)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";
import { assertSandboxVault, connect } from "./cdp.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "src", "numbering.fixtures.json");

/** @type {[string, string, string][]} name, before, after (lines separated by \n) */
const SEEDS = [
  ["insert an item in the middle", "1. a\n2. b", "1. a\n1. x\n2. b"],
  ["delete an item in the middle", "1. a\n2. b\n3. c", "1. a\n3. c"],
  ["delete the first item", "1. a\n2. b\n3. c", "2. b\n3. c"],
  ["insert at the top", "1. a\n2. b", "1. x\n1. a\n2. b"],
  ["a list keeps its start", "5. a\n6. b", "6. b"],
  ["a changed marker keeps its number", "- a\n- b", "- a\n7. b"],
  ["1. and 1) are one list", "1. a\n2. b\n1) c", "1. a\n2. bx\n1) c"],
  ["a delimiter changed", "1. a\n2. b", "1) a\n2. b"],
  ["tab levels", "1. a\n\t1. x", "1. a\n\t1. x\n\t1. y"],
  ["4-space levels", "1. a\n    1. x", "1. a\n    1. x\n    1. y"],
  ["3 spaces are the same level", "1. a\n2. b", "1. a\n   1. b"],
  ["indent an item", "1. a\n2. b\n3. c", "1. a\n\t2. b\n3. c"],
  ["outdent an item", "1. a\n\t1. b\n\t2. c\n2. d", "1. a\n2. b\n\t2. c\n2. d"],
  ["indent the first item", "1. a\n2. b", "\t1. a\n2. b"],
  ["move an item up", "1. a\n2. b\n3. c", "2. b\n1. a\n3. c"],
  ["move an item down", "1. a\n2. b\n3. c", "1. a\n3. c\n2. b"],
  ["blank lines don't end a list", "1. a\n2. b\n3. c", "1. a\n\n\n\n3. c"],
  ["a paragraph after a blank line keeps the next list's start", "1. a\n\np\n\n2. c", "1. a\n\np\n\n2. cx"],
  ["text right under a list", "1. a\n2. b\ntext\n3. c", "1. a\ntext\n3. c"],
  ["a code block with an empty line restarts at 1", "1. a\n2. b", "1. a\n   ```\n   \n   ```\n2. b"],
  ["continuation lines", "1. a\n   more\n2. b", "1. a\n   more\n1. x\n2. b"],
  ["a bullet at the same level stops the run", "1. a\n- b\n1. c", "1. a\n1. n\n- b\n1. c"],
  ["bullets under an ordered item", "1. a\n\t- x\n2. b", "1. a\n\t- x\n\t- y\n2. b"],
  ["ordered under a bullet", "- a\n\t1. x\n\t2. y", "- a\n\t1. x\n\t1. n\n\t2. y"],
  ["a heading ends a list", "1. a\n# H\n1. b", "1. a\n1. x\n# H\n1. b"],
  ["a rule ends a list", "1. a\n---\n1. b", "1. a\n1. x\n---\n1. b"],
  ["a fence ends a list", "1. a\n```\nx\n```\n1. b", "1. a\n1. y\n```\nx\n```\n1. b"],
  ["a second list after a heading", "1. a\n# H\n5. b\n6. c", "1. a\n# H\n5. b\n5. x\n6. c"],
  ["quotes count by depth", "> 1. a\n> 2. b", "> 1. a\n> 1. x\n> 2. b"],
  ["nested quotes", "> > 1. a\n> > 2. b", "> > 1. a\n> > 1. x\n> > 2. b"],
  ["a blank quote line inside a quoted list", "> 1. a\n>\n> 2. b", "> 1. a\n>\n> 1. x\n> 2. b"],
  ["tasks", "1. [ ] a\n2. [ ] b", "1. [ ] a\n1. [ ] x\n2. [ ] b"],
  ["width changes: 9 to 10", "9. a\n1. b", "9. a\n1. b\n1. c"],
  ["big numbers", "99. a\n100. b", "99. a\n99. x\n100. b"],
  ["starting at 0", "0. a\n1. b", "0. a\n0. x\n1. b"],
  ["an empty item", "1. a\n2. ", "1. a\n2. \n2. "],
  ["a change in the middle of a long list", "1. a\n2. b\n3. c\n4. d\n5. e", "1. a\n2. b\n4. d\n5. e"],
  ["two spaces before a marker", "1. a\n  2. b", "1. a\n  2. b\n  2. c"],
  ["a list ended by a paragraph, then a new one", "1. a\n2. b\n\npara\n\n3. c", "1. a\n\npara\n\n3. c"],
];

const c = await connect();
await assertSandboxVault(c);
try {
  const got = await c.ev(`(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    for (const d of ["_test", "_test/tab"]) if (!app.vault.getAbstractFileByPath(d)) await app.vault.createFolder(d).catch(() => {});
    const p = "_test/tab/x-num.md"; const f = app.vault.getAbstractFileByPath(p) || await app.vault.create(p, "");
    let leaf; try { leaf = app.workspace.getLeaf("tab"); } catch { leaf = app.workspace.getLeaf(false); }
    await leaf.openFile(f); await sleep(800); const cm = leaf.view.editor.cm;
    const out = [];
    for (const [name, a, b] of ${JSON.stringify(SEEDS)}) {
      cm.dispatch({ changes: { from: 0, to: cm.state.doc.length, insert: a }, userEvent: "set" });
      const max = Math.min(a.length, b.length); let p = 0; while (p < max && a[p] === b[p]) p++;
      let q = 0; while (q < max - p && a[a.length - 1 - q] === b[b.length - 1 - q]) q++;
      cm.dispatch({ changes: { from: p, to: a.length - q, insert: b.slice(p, b.length - q) }, userEvent: "input" });
      out.push({ name, old: a.split("\\n"), next: b.split("\\n"), obsidian: cm.state.doc.toString().split("\\n") });
    }
    leaf.detach();
    return { version: (navigator.userAgent.match(/obsidian\\/([\\d.]+)/i) || [])[1] || "unknown", out };
  })()`);
  const json = JSON.stringify({ obsidian: got.version, cases: got.out }, null, 2);
  const options = (await prettier.resolveConfig(OUT)) ?? {};
  fs.writeFileSync(OUT, await prettier.format(json, { ...options, filepath: OUT }));
  console.log(`${got.out.length} cases from Obsidian ${got.version}: wrote src/numbering.fixtures.json`);
} finally {
  c.close();
}
