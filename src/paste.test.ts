import { describe, expect, it } from "vitest";
import { buildOutline } from "./parse";
import { Ctx } from "./ops";
import { Pos } from "./content";
import { codeAlone, paste, pasteKind, toItems } from "./paste";

const sp: Ctx = { tabSize: 4, unit: "    ", logical: false };
const tab: Ctx = { tabSize: 4, unit: "\t", logical: false };
const lines = (...l: string[]) => l.join("\n");

/** The note's lines and the cursor (`|`) or selection (`|…|`) in them. */
function parseCursor(text: string): { texts: string[]; from: Pos; to: Pos } {
  const texts = text.split("\n");
  const found: Pos[] = [];
  texts.forEach((t, line) => {
    let ch: number;
    while ((ch = t.indexOf("|")) >= 0) {
      found.push({ line, ch });
      t = t.slice(0, ch) + t.slice(ch + 1);
    }
    texts[line] = t;
  });
  return { texts, from: found[0]!, to: found[found.length - 1]! };
}

const withCursor = (rows: string[], c: Pos) =>
  rows.map((t, i) => (i === c.line ? t.slice(0, c.ch) + "|" + t.slice(c.ch) : t)).join("\n");

function pv(note: string, clip: string, folded: number[] = [], ctx = sp) {
  const { texts, from, to } = parseCursor(note);
  const r = paste(buildOutline(texts), from, to, clip, ctx, new Set(folded));
  return (
    r &&
    withCursor(
      r.rows.map(x => x.t),
      r.cursor,
    )
  );
}

describe("what a paste is", () => {
  it("a code block alone", () => {
    expect(codeAlone(["```js", "x", "```"])).toBe(true);
    expect(codeAlone(["```js", "x"])).toBe(false);
    expect(codeAlone(["```", "x", "```", "after"])).toBe(false);
    expect(pasteKind(["", "```", "x", "", "y", "```", ""])).toBe("code");
    expect(pasteKind(["~~~~", "```", "~~~~"])).toBe("code");
  });
  it("Markdown blocks: markers, headings, fences, math, or several paragraphs", () => {
    expect(pasteKind(["- a"])).toBe("blocks");
    expect(pasteKind(["text", "  * b"])).toBe("blocks");
    expect(pasteKind(["## Title"])).toBe("blocks");
    expect(pasteKind(["text", "```", "x", "```"])).toBe("blocks");
    expect(pasteKind(["$$", "x", "$$"])).toBe("blocks");
    expect(pasteKind(["one", "", "two"])).toBe("blocks");
  });
  it("plain text", () => {
    expect(pasteKind(["one", "two"])).toBe("plain");
    expect(pasteKind(["#tag text", "-dash", "1. not a bullet"])).toBe("plain");
  });
});

describe("toItems", () => {
  it("keeps the list tree, markers and own lines", () => {
    const r = toItems(["- a", "  more", "    - [x] b", "1. c"], 4);
    expect(r.map(x => x.text)).toEqual(["a", "c"]);
    expect(r[0]!.own).toEqual(["more"]);
    expect(r[0]!.kids[0]!.marker).toEqual({ bullet: "-", gap: " ", box: "[x] " });
    expect(r[1]!.marker!.bullet).toBe("1.");
  });
  it("turns headings and paragraphs into items; a paragraph under a heading joins it", () => {
    const r = toItems(["# T", "body", "", "p1", "", "- x"], 4);
    expect(r.map(x => [x.text, x.own])).toEqual([
      ["# T", ["body"]],
      ["p1", []],
      ["x", []],
    ]);
  });
  it("puts a code block below an empty text line", () => {
    const r = toItems(["p", "", "```", "  x", "```"], 4);
    expect(r[1]).toMatchObject({ text: "", own: ["```", "  x", "```"] });
  });
  it("doesn't read a leading --- as frontmatter", () => {
    expect(toItems(["---", "a", "---", "", "- b"], 4).length).toBeGreaterThan(1);
  });
});

describe("paste blocks", () => {
  it("replaces an empty item", () => {
    expect(pv(lines("- a", "- |", "- c"), "- x\n- y")).toBe(lines("- a", "- x", "- y|", "- c"));
  });
  it("adds next siblings after the subtree otherwise, wherever the cursor is", () => {
    expect(pv(lines("- a|bc", "- d"), "- x\n    - y")).toBe(lines("- abc", "- x", "    - y|", "- d"));
    expect(pv(lines("- |abc"), "- x")).toBe(lines("- abc", "- x|"));
  });
  it("adds first children when the item has unfolded children", () => {
    expect(pv(lines("- p|", "    - c"), "- x\n- y")).toBe(lines("- p", "    - x", "    - y|", "    - c"));
  });
  it("adds siblings after a folded item's subtree", () => {
    expect(pv(lines("- p|", "    - c", "- d"), "- x", [0])).toBe(lines("- p", "    - c", "- x|", "- d"));
  });
  it("an empty item with children: replaced by one block, which keeps them", () => {
    expect(pv(lines("- |", "    - c"), "- x")).toBe(lines("- x|", "    - c"));
    expect(pv(lines("- |", "    - c"), "- x\n- y")).toBe(lines("- ", "    - x", "    - y|", "    - c"));
  });
  it("re-indents the pasted tree to the target", () => {
    expect(pv(lines("- a", "    - b|"), "- x\n  - y\n    - z")).toBe(
      lines("- a", "    - b", "    - x", "        - y", "            - z|"),
    );
  });
  it("keeps code inside pasted items byte for byte beyond the item indent", () => {
    const clip = lines("- x", "  ```", "  \tif (a)  b;", "    c", "  ```");
    expect(pv(lines("- a", "    - b|"), clip)).toBe(
      lines("- a", "    - b", "    - x", "      ```", "      \tif (a)  b;", "        c", "      ```|"),
    );
  });
  it("takes the neighbour's marker for the top-level items, keeping checkboxes", () => {
    expect(pv(lines("* a|"), "- x\n- [ ] y\n    + z")).toBe(lines("* a", "* x", "* [ ] y", "    + z|"));
  });
  it("renumbers ordered lists", () => {
    expect(pv(lines("1. a|", "2. b"), "- x\n- y")).toBe(lines("1. a", "2. x", "3. y|", "4. b"));
  });
  it("paragraphs separated by blank lines become items", () => {
    expect(pv(lines("- a|"), "one\ntwo\n\nthree")).toBe(lines("- a", "- one", "  two", "- three|"));
  });
  it("headings become items with their #", () => {
    expect(pv(lines("- |"), "# T\nbody\n- x")).toBe(lines("- # T", "  body", "- x|"));
  });
  it("a selection in the line goes first", () => {
    expect(pv(lines("- |abc|", "- d"), "- x")).toBe(lines("- x|", "- d"));
  });
  it("in a callout, with tabs", () => {
    expect(pv(lines("> - a|"), "- x\n  - y")).toBe(lines("> - a", "> - x", ">     - y|"));
    expect(pv(lines("- a", "\t- b|"), "- x\n  - y", [], tab)).toBe(lines("- a", "\t- b", "\t- x", "\t\t- y|"));
  });
  it("is Obsidian's outside a clean item or across lines", () => {
    expect(pv(lines("para|"), "- x")).toBeNull();
    expect(pv(lines("- a", "lazy|"), "- x")).toBeNull();
    expect(pv(lines("- |a", "- b|"), "- x")).toBeNull();
  });
});

describe("paste a code block alone", () => {
  it("goes into the current item after the cursor's line", () => {
    expect(pv(lines("- a|b", "    - c"), "```js\n  x\n```")).toBe(
      lines("- ab", "  ```js", "    x", "  ```|", "    - c"),
    );
  });
  it("keeps the code's indentation relative to its fence", () => {
    expect(pv(lines("- a|"), "    ```\n    \tx\n      y\n    ```")).toBe(
      lines("- a", "  ```", "  \tx", "    y", "  ```|"),
    );
  });
  it("on a fence line: after the code block", () => {
    expect(pv(lines("- a", "  ```|", "  q", "  ```"), "```\nx\n```")).toBe(
      lines("- a", "  ```", "  q", "  ```", "  ```", "  x", "  ```|"),
    );
  });
});

describe("plain paste", () => {
  it("one line: Obsidian's", () => {
    expect(pv(lines("- a|"), "word")).toBeNull();
  });
  it("lines after the first get the item indent, their common indent removed", () => {
    expect(pv(lines("- a|b", "- c"), "one\n    two\n      three")).toBe(lines("- aone", "  two", "    three|b", "- c"));
  });
  it("replaces a selection, also in a continuation line", () => {
    expect(pv(lines("- a", "  x|yy|z"), "one\ntwo")).toBe(lines("- a", "  xone", "  two|z"));
  });
  it("a trailing newline leaves the cursor on an indented line", () => {
    expect(pv(lines("    - a|"), "one\ntwo\n")).toBe(lines("    - aone", "      two", "      |"));
  });
});
