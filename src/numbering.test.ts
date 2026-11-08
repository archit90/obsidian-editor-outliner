import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { renumberLikeObsidian } from "./numbering";

const lines = (...l: string[]) => l.join("\n");
/** The note after the change old → next, numbered as Obsidian's renumbering leaves it. */
const num = (old: string, next: string) => renumberLikeObsidian(old.split("\n"), next.split("\n")).lines.join("\n");

// Each expectation was checked against Obsidian 1.15 (the same change dispatched in a real editor).
describe("numbering like Obsidian", () => {
  it("numbers on from the item above at the same level", () => {
    expect(num(lines("1. a", "2. b"), lines("1. a", "1. x", "2. b"))).toBe(lines("1. a", "2. x", "3. b"));
    expect(num(lines("1. a", "2. b", "3. c"), lines("1. a", "3. c"))).toBe(lines("1. a", "2. c"));
  });
  it("a list's first item keeps the list's old start; a changed marker keeps its own number", () => {
    expect(num(lines("5. a", "6. b"), lines("6. b"))).toBe(lines("5. b"));
    expect(num(lines("- a", "- b"), lines("- a", "7. b"))).toBe(lines("- a", "7. b"));
  });
  it("1. and 1) are one list; levels are tabs or 4 spaces", () => {
    expect(num(lines("1. a", "2. b|", "1) c"), lines("1. a", "2. bx", "1) c"))).toBe(lines("1. a", "2. bx", "3) c"));
    expect(num(lines("1. a", "\t1. x"), lines("1. a", "\t1. x", "\t1. y"))).toBe(lines("1. a", "\t1. x", "\t2. y"));
    expect(num(lines("1. a", "2. b"), lines("1. a", "   1. b"))).toBe(lines("1. a", "   2. b"));
  });
  it("blank lines don't end a list; after a paragraph a list keeps its own start", () => {
    expect(num(lines("1. a", "2. b", "3. c"), lines("1. a", "", "", "", "3. c"))).toBe(
      lines("1. a", "", "", "", "2. c"),
    );
    expect(num(lines("1. a", "", "p", "", "2. c"), lines("1. a", "", "p", "", "2. cx"))).toBe(
      lines("1. a", "", "p", "", "2. cx"),
    );
  });
  it("a code block in an item with an empty line restarts the numbering (Obsidian's reading)", () => {
    expect(num(lines("1. a", "2. b"), lines("1. a", "   ```", "   ", "   ```", "2. b"))).toBe(
      lines("1. a", "   ```", "   ", "   ```", "1. b"),
    );
  });
  it("a bullet at the same level stops the run; quotes count by depth", () => {
    expect(num(lines("1. a", "- b", "1. c"), lines("1. a", "1. n", "- b", "1. c"))).toBe(
      lines("1. a", "2. n", "- b", "1. c"),
    );
    expect(num(lines("> 1. a", "> 2. b"), lines("> 1. a", "> 1. x", "> 2. b"))).toBe(
      lines("> 1. a", "> 2. x", "> 3. b"),
    );
  });
  it("is idempotent: numbering its own result again changes nothing", () => {
    const pairs: [string, string][] = [
      [lines("1. a", "2. b", "1) c"), lines("1. a", "2. bx", "1) c")],
      [lines("3. a", "4. b"), lines("4. b", "3. a")],
      [lines("1. a", "\t1. x", "2. b"), lines("1. a", "2. b", "\t1. x")],
    ];
    for (const [a, b] of pairs) {
      const once = num(a, b);
      expect(num(a, once)).toBe(once);
    }
  });
  it("reports the edits with the width change", () => {
    const r = renumberLikeObsidian(["9. a", "1. b"], ["9. a", "1. b", "1. c"]);
    expect(r.lines).toEqual(["9. a", "10. b", "11. c"]);
    expect(r.edits).toEqual([
      { line: 1, at: 0, delta: 1 },
      { line: 2, at: 0, delta: 1 },
    ]);
  });
});

/** A change of the recorded table: the note before and after it, and what Obsidian's renumbering made of it. */
interface Recorded {
  name: string;
  old: string[];
  next: string[];
  obsidian: string[];
}
const table: { obsidian: string; cases: Recorded[] } = JSON.parse(
  fs.readFileSync(new URL("./numbering.fixtures.json", import.meta.url), "utf8"),
);

// Recorded in a real Obsidian by e2e/numbering-capture.mjs (and replayed there on every e2e run, check X12)
describe(`numbering like Obsidian ${table.obsidian}: the recorded table`, () => {
  it.each(table.cases)("$name", c => {
    expect(renumberLikeObsidian(c.old, c.next).lines).toEqual(c.obsidian);
  });
});
