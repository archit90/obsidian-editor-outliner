import { describe, expect, it } from "vitest";
import { buildOutline } from "./parse";
import { homeStops, homeTarget } from "./home";

const lines = (...l: string[]) => l.join("\n");
const stops = (text: string, line: number, tabSize = 4) => homeStops(buildOutline(text.split("\n"), tabSize), line);

/** Every place the cursor rests, pressing Home from the end of the line until it stops moving. */
function presses(text: string, line: number): number[] {
  const s = stops(text, line)!;
  const out: number[] = [];
  let ch = text.split("\n")[line]!.length;
  for (;;) {
    const to = homeTarget(s, ch);
    if (to === ch) return out;
    out.push((ch = to));
  }
}

describe("homeStops: headings", () => {
  it("the text's start, then the line's start", () => {
    expect(stops("## Title", 0)).toEqual([3, 0]);
    expect(stops("# A\n\n####### deep", 2)).toEqual([8, 0]);
  });
  it("a heading without text; leading spaces aren't a stop", () => {
    expect(stops("## ", 0)).toEqual([3, 0]);
    expect(stops("  ## T", 0)).toEqual([5, 0]);
  });
});

describe("homeStops: list items", () => {
  it("a top-level item: after the marker, then the line's start", () => {
    expect(stops("- item", 0)).toEqual([2, 0]);
    expect(stops("12. item", 0)).toEqual([4, 0]);
  });
  it("after the checkbox first", () => {
    expect(stops("- [ ] task", 0)).toEqual([6, 0]);
    expect(stops("- a\n\t- [x] done", 1)).toEqual([7, 1, 0]);
  });
  it("a nested item: the marker, then one level out per stop (tabs)", () => {
    const t = lines("- a", "\t- b", "\t\t- c");
    expect(stops(t, 2)).toEqual([4, 2, 1, 0]);
    expect(presses(t, 2)).toEqual([4, 2, 1, 0]);
    expect(stops(t, 1)).toEqual([3, 1, 0]);
  });
  it("space indents: the ancestors' marker columns", () => {
    const t = lines("- a", "  - b", "      - c");
    expect(stops(t, 2)).toEqual([8, 6, 2, 0]);
  });
  it("under an ordered item (children at its content column)", () => {
    expect(stops(lines("1. a", "   - b", "     - c"), 2)).toEqual([7, 5, 3, 0]);
  });
  it("a list that starts indented: its first level isn't the line's start", () => {
    expect(stops(lines("  - a", "    - b"), 1)).toEqual([6, 4, 2, 0]);
  });
  it("a level that falls inside a tab is skipped", () => {
    expect(stops(lines("- a", "  - b", "\t- c"), 2)).toEqual([3, 1, 0]);
  });
  it("an item's other text lines: the text's start, then the item's level and outwards", () => {
    const t = lines("- a", "\t- b", "\t  more", "\t  ", "  lazy");
    expect(stops(t, 2)).toEqual([3, 1, 0]);
    expect(stops(lines("- a", "  more"), 1)).toEqual([2, 0]);
    // indented less than its item: only the levels it reaches
    expect(stops(lines("- a", "\t- b", "\t\t- c", "  lazy"), 3)).toEqual([2, 0]);
  });
  it("in a callout: the levels count from the quote prefix, the last stop is the line's start", () => {
    const t = lines("> [!note]", "> - a", ">   - b");
    expect(stops(t, 1)).toEqual([4, 2, 0]);
    expect(stops(t, 2)).toEqual([6, 4, 2, 0]);
  });
});

describe("homeStops: lines that are Obsidian's", () => {
  it("body text, a blank line, a rule", () => {
    const t = lines("para", "", "---", "    indented");
    for (const i of [0, 1, 2, 3]) expect(stops(t, i)).toBeNull();
  });
  it("code and blank lines in an item, a quote in an item", () => {
    const t = lines("- a", "  ```", "  x", "  ```", "  ", "  > quote");
    for (const i of [1, 2, 3, 4, 5]) expect(stops(t, i)).toBeNull();
  });
  it("frontmatter, and a line past the note's end", () => {
    expect(stops(lines("---", "# no", "---", "x"), 1)).toBeNull();
    expect(stops("- a", 5)).toBeNull();
  });
  it("an unindented line glued to a top-level item has nowhere to stop", () => {
    expect(stops(lines("- a", "lazy"), 1)).toBeNull();
  });
});

describe("homeTarget", () => {
  const s = [4, 2, 1, 0];
  it("the nearest stop left of the cursor", () => {
    expect(homeTarget(s, 9)).toBe(4);
    expect(homeTarget(s, 4)).toBe(2);
    expect(homeTarget(s, 3)).toBe(2);
    expect(homeTarget(s, 1)).toBe(0);
  });
  it("stays at the line's start", () => {
    expect(homeTarget(s, 0)).toBe(0);
  });
});
