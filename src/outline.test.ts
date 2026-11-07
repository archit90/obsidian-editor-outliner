import { describe, expect, it } from "vitest";
import { Outline, blocksOf, buildOutline, itemsOf, locate } from "./parse";
import { Ctx, OpResult, indent, move, outdent } from "./ops";
import { steps } from "./select";
import { drop, sourceAt, targets } from "./drop";

const sp: Ctx = { tabSize: 4, unit: "    ", logical: false };
const tab: Ctx = { tabSize: 4, unit: "\t", logical: false };

/** Runs op on the note's 0-based lines l0..l1; returns the new text, or the result when it isn't rows. */
function run(text: string, l0: number, l1: number, op: (o: Outline, a: number, b: number) => OpResult) {
  const o = buildOutline(text.split("\n"));
  const r = op(o, l0, l1);
  if (r === null) return null;
  if (r === "noop") return "noop";
  if ("error" in r) return r;
  return r.rows.map(x => x.t).join("\n");
}
const lines = (...l: string[]) => l.join("\n");

describe("parse", () => {
  it("builds the heading tree, any number of #", () => {
    const o = buildOutline(["# A", "text", "## B", "####### Deep", "## C", "# D"]);
    expect(o.sections.map(s => [s.line, s.level, s.end])).toEqual([
      [0, 1, 5],
      [2, 2, 4],
      [3, 7, 4],
      [4, 2, 5],
      [5, 1, 6],
    ]);
    expect(o.depth).toEqual([0, 1, 1, 2, 1, 0]);
  });

  it("ignores # in code, frontmatter, tags and setext headings", () => {
    const o = buildOutline(["---", "a: 1", "---", "```", "# no", "```", "#tag", "Title", "===", "# yes"]);
    expect(o.sections.map(s => s.line)).toEqual([9]);
    expect(o.bodyStart).toBe(3);
  });

  it("splits a body into blocks", () => {
    const o = buildOutline([
      "para",
      "more",
      "",
      "- a",
      "  - b",
      "",
      "- c",
      "",
      "```",
      "x",
      "",
      "```",
      "",
      "> q",
      ">",
      "> r",
    ]);
    expect(blocksOf(o, o.root).map(b => [b.start, b.end, b.kind])).toEqual([
      [0, 2, "para"],
      [3, 7, "list"],
      [8, 12, "code"],
      [13, 16, "quote"],
    ]);
  });

  it("builds list trees with continuation lines", () => {
    const o = buildOutline(["- a", "  cont", "    - b", "        - c", "    - d", "- e"]);
    const root = itemsOf(o, blocksOf(o, o.root)[0]!);
    const a = root.children[0]!;
    expect([a.line, a.end, a.ownEnd]).toEqual([0, 5, 2]);
    expect(a.children.map(c => [c.line, c.end])).toEqual([
      [2, 4],
      [4, 5],
    ]);
    expect(locate(o, 3)!.item!.line).toBe(3);
  });
});

describe("indent / outdent lists", () => {
  it("indents an item with its children under the previous sibling", () => {
    expect(run(lines("- a", "- b", "    - c"), 1, 1, (o, a, b) => indent(o, a, b, sp))).toBe(
      lines("- a", "    - b", "        - c"),
    );
  });
  it("uses tabs when the editor does", () => {
    expect(run(lines("- a", "- b"), 1, 1, (o, a, b) => indent(o, a, b, tab))).toBe(lines("- a", "\t- b"));
  });
  it("matches existing children's indent", () => {
    expect(run(lines("- a", "  - x", "- b"), 2, 2, (o, a, b) => indent(o, a, b, sp))).toBe(
      lines("- a", "  - x", "  - b"),
    );
  });
  it("does nothing for a first child", () => {
    expect(run(lines("- a", "- b"), 0, 0, (o, a, b) => indent(o, a, b, sp))).toBe("noop");
  });
  it("is not for plain text", () => {
    expect(run(lines("text"), 0, 0, (o, a, b) => indent(o, a, b, sp))).toBeNull();
  });
  it("outdents in place: following siblings become children", () => {
    const t = lines("- p", "    - a", "    - b", "    - c");
    expect(run(t, 2, 2, (o, a, b) => outdent(o, a, b, sp))).toBe(lines("- p", "    - a", "- b", "    - c"));
  });
  it("logical outdent: moves after the parent's subtree", () => {
    const t = lines("- p", "    - a", "    - b", "    - c", "- q");
    expect(run(t, 2, 2, (o, a, b) => outdent(o, a, b, { ...sp, logical: true }))).toBe(
      lines("- p", "    - a", "    - c", "- b", "- q"),
    );
  });
  it("acts on a selection of siblings as a group", () => {
    expect(run(lines("- a", "- b", "- c"), 1, 2, (o, a, b) => indent(o, a, b, sp))).toBe(
      lines("- a", "    - b", "    - c"),
    );
  });
  it("renumbers ordered lists", () => {
    expect(run(lines("1. a", "2. b", "3. c"), 1, 1, (o, a, b) => indent(o, a, b, sp))).toBe(
      lines("1. a", "    1. b", "2. c"),
    );
    expect(run(lines("1. a", "    1. b", "    2. c", "2. d"), 1, 1, (o, a, b) => outdent(o, a, b, sp))).toBe(
      lines("1. a", "2. b", "    1. c", "3. d"),
    );
  });
  it("works inside callouts", () => {
    expect(run(lines("> [!note]", "> - a", "> - b"), 2, 2, (o, a, b) => indent(o, a, b, sp))).toBe(
      lines("> [!note]", "> - a", ">     - b"),
    );
  });
});

describe("indent / outdent headings", () => {
  it("demotes the section and its sub-headings, past H6", () => {
    expect(run(lines("## A", "###### B", "text", "## C"), 0, 0, (o, a, b) => indent(o, a, b, sp))).toBe(
      lines("### A", "####### B", "text", "## C"),
    );
  });
  it("refuses to promote H1", () => {
    expect(run(lines("# A"), 0, 0, (o, a, b) => outdent(o, a, b, sp))).toEqual({
      error: "An H1 heading can't be outdented.",
    });
  });
  it("promotes in place", () => {
    expect(run(lines("# P", "## A", "### B"), 2, 2, (o, a, b) => outdent(o, a, b, sp))).toBe(
      lines("# P", "## A", "## B"),
    );
  });
  it("logical promote moves after the parent section", () => {
    const t = lines("# P", "", "## A", "", "## B", "", "# Q");
    expect(run(t, 2, 2, (o, a, b) => outdent(o, a, b, { ...sp, logical: true }))).toBe(
      lines("# P", "", "## B", "", "# A", "", "# Q"),
    );
  });
  it("a selection with a heading line acts on the sibling sections it covers", () => {
    const t = lines("# A", "- x", "# B", "# C");
    expect(run(t, 1, 2, (o, a, b) => indent(o, a, b, sp))).toBe(lines("## A", "- x", "## B", "# C"));
  });
});

describe("move", () => {
  it("swaps heading sections, keeping blank lines", () => {
    const t = lines("# A", "a", "", "# B", "b", "", "# C");
    expect(run(t, 3, 3, (o, a, b) => move(o, a, b, -1, sp))).toBe(lines("# B", "b", "", "# A", "a", "", "# C"));
  });
  it("stops headings at the edge", () => {
    expect(run(lines("# A", "## B", "# C"), 1, 1, (o, a, b) => move(o, a, b, -1, sp))).toBe("noop");
  });
  it("swaps list items with children", () => {
    const t = lines("- a", "    - a1", "- b");
    expect(run(t, 2, 2, (o, a, b) => move(o, a, b, -1, sp))).toBe(lines("- b", "- a", "    - a1"));
  });
  it("jumps a first child into the previous parent", () => {
    const t = lines("- p", "    - x", "- q", "    - y");
    expect(run(t, 3, 3, (o, a, b) => move(o, a, b, -1, sp))).toBe(lines("- p", "    - x", "    - y", "- q"));
  });
  it("jumps a last child into the next parent", () => {
    const t = lines("- p", "    - x", "- q", "    - y");
    expect(run(t, 1, 1, (o, a, b) => move(o, a, b, 1, sp))).toBe(lines("- p", "- q", "    - x", "    - y"));
  });
  it("jumps only into the parent's adjacent sibling, as in Logseq", () => {
    // the parent (a1) has no sibling above / below: nothing happens, even though x1 / b1 are at its depth
    const up = lines("- x", "    - x1", "- a", "    - a1", "        - g");
    expect(run(up, 4, 4, (o, a, b) => move(o, a, b, -1, sp))).toBe("noop");
    const down = lines("- a", "    - a1", "        - g", "- b", "    - b1");
    expect(run(down, 2, 2, (o, a, b) => move(o, a, b, 1, sp))).toBe("noop");
    // the parent's adjacent sibling has no children: the item becomes its only child
    const lone = lines("- p", "    - p1", "    - p2", "        - g");
    expect(run(lone, 3, 3, (o, a, b) => move(o, a, b, -1, sp))).toBe(
      lines("- p", "    - p1", "        - g", "    - p2"),
    );
  });
  it("never moves a list item past a heading", () => {
    expect(run(lines("# A", "- a", "# B", "- b"), 1, 1, (o, a, b) => move(o, a, b, 1, sp))).toBe("noop");
  });
  it("moves body blocks within a section", () => {
    const t = lines("# A", "p1", "", "p2", "", "```", "c", "```");
    expect(run(t, 3, 3, (o, a, b) => move(o, a, b, 1, sp))).toBe(lines("# A", "p1", "", "```", "c", "```", "", "p2"));
    expect(run(t, 1, 1, (o, a, b) => move(o, a, b, -1, sp))).toBe("noop");
  });
});

describe("expand selection steps", () => {
  it("grows word, link, line text, line, item, parent", () => {
    const t = ["- a", "    - see [[Some Note]] now", "# H"];
    const o = buildOutline(t);
    const s = steps(o, 1, 13).map(x => [x.from.line, x.from.ch, x.to.line, x.to.ch]);
    expect(s).toContainEqual([1, 12, 1, 16]); // Some
    expect(s).toContainEqual([1, 12, 1, 21]); // Some Note
    expect(s).toContainEqual([1, 10, 1, 23]); // [[Some Note]]
    expect(s).toContainEqual([1, 6, 1, 27]); // line text
    expect(s).toContainEqual([1, 0, 1, 27]); // line
    expect(s).toContainEqual([0, 0, 1, 27]); // parent item
  });
});

describe("drag and drop", () => {
  it("drops a heading before another with the level picked", () => {
    const t = ["# A", "", "# B", "", "## C"];
    const o = buildOutline(t);
    const src = sourceAt(o, 4)!;
    const ts = targets(o, src, sp);
    const before = ts.find(x => x.line === 2)!;
    expect(before.options.map(x => x.value)).toEqual([1, 2]);
    expect(drop(o, src, 2, before.options[1]!, sp)!.map(r => r.t)).toEqual(["# A", "", "## C", "", "# B", ""]);
  });
  it("drops a list item at a depth", () => {
    const o = buildOutline(["- a", "- b", "- c"]);
    const src = sourceAt(o, 2)!;
    const t = targets(o, src, sp).find(x => x.line === 1)!;
    expect(t.options.map(x => x.depth)).toEqual([0, 1]);
    expect(drop(o, src, 1, t.options[1]!, sp)!.map(r => r.t)).toEqual(["- a", "    - c", "- b"]);
  });
  it("moves a body block and tidies the blank lines", () => {
    const o = buildOutline(["p1", "", "p2", "", "p3"]);
    const src = sourceAt(o, 0)!;
    expect(drop(o, src, 5, { value: 0, depth: 0 }, sp)!.map(r => r.t)).toEqual(["p2", "", "p3", "", "p1"]);
  });
});

// Regression tests for the 2026-11-06 review (reviews/2026-11-06-plugins-review.md, EO-xx).
describe("review fixes", () => {
  const ind = (o: Outline, a: number, b: number) => indent(o, a, b, sp);
  const tind = (o: Outline, a: number, b: number) => indent(o, a, b, tab);

  it("EO-03: a quote indented under an item moves with it", () => {
    const t = lines("- p", "- a", "  > quoted", "  > more", "- b");
    expect(run(t, 1, 1, ind)).toBe(lines("- p", "    - a", "      > quoted", "      > more", "- b"));
    expect(run(t, 1, 1, (o, a, b) => move(o, a, b, -1, sp))).toBe(lines("- a", "  > quoted", "  > more", "- p", "- b"));
  });

  it("EO-04: lists separated by a paragraph in one callout aren't siblings", () => {
    const t = lines("> - a", ">", "> para", ">", "> - b");
    expect(run(t, 0, 0, (o, a, b) => move(o, a, b, 1, sp))).toBe("noop");
    expect(run(t, 4, 4, ind)).toBe("noop");
  });

  it("EO-04: a loose callout list keeps its > spacers in place when items move", () => {
    const t = lines("> - a", ">", "> - b", ">", "> - c");
    expect(run(t, 4, 4, (o, a, b) => move(o, a, b, -1, sp))).toBe(lines("> - a", ">", "> - c", ">", "> - b"));
  });

  it("EO-02: code inside a list item keeps its own whitespace; Tab in it is Obsidian's", () => {
    const t = lines("- a", "- b", "  ```yaml", "  key:", "    sub: 1", "  ```");
    expect(run(t, 1, 1, tind)).toBe(lines("- a", "\t- b", "\t  ```yaml", "\t  key:", "\t    sub: 1", "\t  ```"));
  });

  it("EO-05: a selection that leaves the list isn't a list selection", () => {
    const t = lines("- a", "- b", "", "para after");
    expect(run(t, 1, 3, ind)).toBeNull();
  });

  it("EO-06: an ordered list the change didn't touch keeps its numbers", () => {
    const t = lines("# A", "intro", "```x", "```", "# B", "1. one", "1. two");
    expect(run(t, 2, 2, (o, a, b) => move(o, a, b, -1, sp))).toBe(
      lines("# A", "```x", "```", "", "intro", "# B", "1. one", "1. two"),
    );
  });

  it("EO-07: an existing list's indent style wins over the editor's", () => {
    expect(run(lines("- a", "    - b", "- c"), 2, 2, tind)).toBe(lines("- a", "    - b", "    - c"));
  });

  it("EO-08: a demote past H6 says so", () => {
    const o = buildOutline(["##### A", "###### B"]);
    const r = indent(o, 0, 0, sp);
    expect(r !== null && typeof r === "object" && "rows" in r ? r.notice : r).toMatch(/deeper than H6/);
  });

  it("EO-09: comment, math and HTML blocks opened mid-line are opaque; inline ``` isn't a fence", () => {
    expect(buildOutline(["text %%", "# hidden", "%%", "# real"]).sections.map(s => s.line)).toEqual([3]);
    expect(buildOutline(["<!--", "# hidden", "-->", "# real"]).sections.map(s => s.line)).toEqual([3]);
    expect(buildOutline(["```inline``` code", "# real"]).sections.map(s => s.line)).toEqual([1]);
    expect(buildOutline(["> ```", "> code", "", "# H1"]).sections.map(s => s.line)).toEqual([3]);
  });

  it("EO-10: a setext underline stays with its paragraph", () => {
    const t = lines("Title", "---", "", "para");
    expect(run(t, 3, 3, (o, a, b) => move(o, a, b, -1, sp))).toBe(lines("para", "", "Title", "---"));
  });

  it("numbering after a change is one Obsidian's renumbering leaves alone", () => {
    // a move keeps the list's start, as Obsidian's own Move line up does
    expect(run(lines("1. a", "2. b"), 1, 1, (o, a, b) => move(o, a, b, -1, sp))).toBe(lines("1. b", "2. a"));
    // a bullet at the same level ends Obsidian's list: the item after it starts a new one at 1
    expect(run(lines("1. a", "2. b", "3) c", "- d"), 3, 3, (o, a, b) => move(o, a, b, -1, sp))).toBe(
      lines("1. a", "2. b", "- d", "1) c"),
    );
  });

  it("EO-11: nesting follows the content column, as Obsidian renders it", () => {
    expect(run(lines("- a", " - b"), 1, 1, ind)).toBe(lines("- a", "    - b"));
    // the child sits at the content column; Obsidian's numbering counts levels in tabs or 4 spaces only, so it
    // reads "   1. b" as the same level and numbers it on (numbering.ts follows Obsidian)
    expect(run(lines("1. a", "2. b"), 1, 1, (o, a, b) => indent(o, a, b, { ...sp, unit: "  " }))).toBe(
      lines("1. a", "   2. b"),
    );
  });

  it("EO-12: heading drop at the top offers the next heading's level too", () => {
    const o = buildOutline(["## A", "a", "", "## B", "b", "", "## C", "c"]);
    const t = targets(o, sourceAt(o, 6)!, sp).find(x => x.line === 0)!;
    expect(t.options.map(x => x.value)).toEqual([1, 2]);
  });

  it("EO-13: loose lists: dropping in place is no change, and nesting is offered", () => {
    const o = buildOutline(["- a", "", "- b", "", "- c"]);
    const src = sourceAt(o, 2)!;
    const ts = targets(o, src, sp);
    expect(ts.find(x => x.line === 4)).toBeUndefined();
    expect(ts.find(x => x.line === 2)!.options.map(x => x.depth)).toEqual([0, 1]);
    expect(drop(o, src, 2, { value: 0, depth: 0 }, sp)).toBeNull();
  });

  it("EO-14: dropping a block last leaves no stray blank line", () => {
    const o = buildOutline(["p1", "", "p2"]);
    expect(drop(o, sourceAt(o, 2)!, 0, { value: 0, depth: 0 }, sp)!.map(r => r.t)).toEqual(["p2", "", "p1"]);
  });

  it("EO-15: words with combining marks and astral letters; full stops inside links", () => {
    const word = (t: string, ch: number) => {
      const s = steps(buildOutline([t]), 0, ch)[0]!;
      return t.slice(s.from.ch, s.to.ch);
    };
    expect(word("नमस्ते x", 1)).toBe("नमस्ते");
    expect(word("𝒜bc d", 3)).toBe("𝒜bc");
    const o = buildOutline(["See ![[img.png]] now. Next one."]);
    const spans = steps(o, 0, 9).map(s => [s.from.ch, s.to.ch]);
    expect(spans).toContainEqual([0, 21]); // the sentence, link included
    expect(spans).not.toContainEqual([4, 11]); // not "![[img."
  });
});

describe("a list always stays a list", () => {
  it("outdenting a top-level item changes nothing, in every kind of list", () => {
    const out = (o: Outline, a: number, b: number) => outdent(o, a, b, tab);
    for (const t of [
      lines("- a", "- b"),
      lines("# H", "- a"),
      lines("para", "- a"),
      lines("1. a", "2. b"),
      lines("- [ ] task"),
      lines("> - a", "> - b"),
      lines("  - a", "  - b"),
      lines("- a", "", "- b"),
    ]) {
      const n = t.split("\n").length;
      for (let l = 0; l < n; l++) {
        const o = buildOutline(t.split("\n"));
        if (o.info[l]!.kind !== "item") continue;
        expect([t, l, out(o, l, l)]).toEqual([t, l, "noop"]);
      }
    }
  });
});

// Regression tests for the deep test run (TEST-CASES.md, 2026-11-07).
describe("deep test fixes", () => {
  /** Every step's text for the cursor at (line, ch), smallest first, as Expand reaches them. */
  const chain = (text: string, line: number, ch: number) => {
    const o = buildOutline(text.split("\n"));
    const t = text.split("\n");
    const seen = new Set<string>();
    return steps(o, line, ch)
      .map(s => {
        const a = t.slice(0, s.from.line).join("\n").length + (s.from.line ? 1 : 0) + s.from.ch;
        const b = t.slice(0, s.to.line).join("\n").length + (s.to.line ? 1 : 0) + s.to.ch;
        return [a, b] as const;
      })
      .sort((x, y) => x[1] - x[0] - (y[1] - y[0]))
      .map(([a, b]) => text.slice(a, b))
      .filter(x => !seen.has(x) && !!seen.add(x));
  };

  it("XS11: a body code block has a code-lines step before the whole block", () => {
    const c = chain(lines("# H", "```", "xx", "yy", "```"), 2, 1);
    expect(c.slice(0, 3)).toEqual(["xx", "xx\nyy", "```\nxx\nyy\n```"]);
  });

  it("XS11: also an unclosed fence; none for a $$ block", () => {
    expect(chain(lines("```", "xx", "yy"), 1, 1)).toContain("xx\nyy");
    expect(chain(lines("$$", "xx", "yy", "$$"), 1, 1)).not.toContain("xx\nyy");
  });

  it("XS17 / XS22: in a callout, the list or paragraph before the whole callout", () => {
    const t = lines("> [!note] T", "> - a", "> - b", "> ", "> para");
    expect(chain(t, 2, 4)).toContain("> - a\n> - b");
    const p = lines("> [!note] T", "> one", "> two", ">", "> - x");
    expect(chain(p, 2, 3)).toContain("> [!note] T\n> one\n> two");
  });

  it("DG6: a block dragged from under its heading leaves the next block under it, as Move does", () => {
    const o = buildOutline(["# H", "p1", "", "p2", "", "p3"]);
    expect(drop(o, sourceAt(o, 1)!, 5, { value: 0, depth: 0 }, sp)!.map(r => r.t)).toEqual([
      "# H",
      "p2",
      "",
      "p1",
      "",
      "p3",
    ]);
  });

  it("DG6: a block dropped first under its heading gets no blank line above it", () => {
    const o = buildOutline(["# H", "p1", "", "p2"]);
    expect(drop(o, sourceAt(o, 3)!, 1, { value: 0, depth: 0 }, sp)!.map(r => r.t)).toEqual(["# H", "p2", "", "p1"]);
  });

  it("DG6: a body that starts with a blank line keeps it", () => {
    const o = buildOutline(["# H", "", "p1", "", "p2"]);
    expect(drop(o, sourceAt(o, 4)!, 2, { value: 0, depth: 0 }, sp)!.map(r => r.t)).toEqual(["# H", "", "p2", "", "p1"]);
  });
});
