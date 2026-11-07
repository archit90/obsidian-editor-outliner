import { describe, expect, it } from "vitest";
import { buildOutline } from "./parse";
import {
  NodeSel,
  childSel,
  extendSel,
  nodeLines,
  nodeSelOf,
  nodeSpan,
  nodeText,
  parentSel,
  removeNodes,
} from "./nodes";

const lines = (...l: string[]) => l.join("\n");
const parse = (text: string) => buildOutline(text.split("\n"));
const at = (line: number, ch: number) => ({ line, ch });
const eol = (o: ReturnType<typeof buildOutline>, line: number) => at(line, o.texts[line]!.length);

const LIST = lines("- a", "    - b", "        - c", "    - d", "    - e", "- f");

describe("nodeSelOf: which selections are node selections", () => {
  const o = parse(LIST);
  it("one item with its subtree", () => {
    expect(nodeSelOf(o, at(1, 0), eol(o, 2))).toEqual({ kind: "item", anchor: 1, head: 1 });
  });
  it("a single-line item's whole line", () => {
    expect(nodeSelOf(o, at(3, 0), eol(o, 3))).toEqual({ kind: "item", anchor: 3, head: 3 });
  });
  it("a run of siblings, forwards and backwards", () => {
    expect(nodeSelOf(o, at(1, 0), eol(o, 4))).toEqual({ kind: "item", anchor: 1, head: 4 });
    expect(nodeSelOf(o, eol(o, 4), at(1, 0))).toEqual({ kind: "item", anchor: 4, head: 1 });
  });
  it("a selection ending at the start of the next line", () => {
    expect(nodeSelOf(o, at(3, 0), at(4, 0))).toEqual({ kind: "item", anchor: 3, head: 3 });
  });
  it("the whole list is its top-level items", () => {
    expect(nodeSelOf(o, at(0, 0), eol(o, 5))).toEqual({ kind: "item", anchor: 0, head: 5 });
  });
  it("not part of a node, nor the item's own lines without its children, nor from mid-line", () => {
    expect(nodeSelOf(o, at(0, 0), eol(o, 0))).toBeNull();
    expect(nodeSelOf(o, at(1, 0), eol(o, 1))).toBeNull();
    expect(nodeSelOf(o, at(1, 4), eol(o, 2))).toBeNull();
    expect(nodeSelOf(o, at(2, 0), eol(o, 3))).toBeNull();
    expect(nodeSelOf(o, at(3, 0), at(3, 0))).toBeNull();
  });
  it("heading sections, one or a run of siblings", () => {
    const h = parse(lines("# A", "text", "", "## B", "x", "", "## C", "", "# D"));
    expect(nodeSelOf(h, at(3, 0), eol(h, 4))).toEqual({ kind: "heading", anchor: 3, head: 3 });
    expect(nodeSelOf(h, at(3, 0), eol(h, 6))).toEqual({ kind: "heading", anchor: 3, head: 6 });
    expect(nodeSelOf(h, at(0, 0), eol(h, 8))).toEqual({ kind: "heading", anchor: 0, head: 8 });
    // the heading and its body without its sub-sections is not a node
    expect(nodeSelOf(h, at(0, 0), eol(h, 1))).toBeNull();
  });
  it("items in a list under a heading are item nodes, the list isn't the section", () => {
    const h = parse(lines("# A", "- x", "- y"));
    expect(nodeSelOf(h, at(1, 0), eol(h, 2))).toEqual({ kind: "item", anchor: 1, head: 2 });
    expect(nodeSelOf(h, at(0, 0), eol(h, 2))).toEqual({ kind: "heading", anchor: 0, head: 0 });
  });
  it("items in a callout", () => {
    const q = parse(lines("> [!note]", "> - a", ">     - b", "> - c"));
    expect(nodeSelOf(q, at(1, 0), eol(q, 2))).toEqual({ kind: "item", anchor: 1, head: 1 });
  });
});

describe("extending and moving in the tree", () => {
  const o = parse(LIST);
  const one = (l: number): NodeSel => ({ kind: "item", anchor: l, head: l });
  it("↓ / ↑ extend anchored and stop at the edge", () => {
    let s = extendSel(o, one(1), 1)!;
    expect(s).toEqual({ kind: "item", anchor: 1, head: 3 });
    s = extendSel(o, s, 1)!;
    expect(nodeLines(o, s)).toEqual([1, 3, 4]);
    expect(extendSel(o, s, 1)).toBeNull();
    s = extendSel(o, s, -1)!;
    expect(nodeLines(o, s)).toEqual([1, 3]);
    expect(extendSel(o, extendSel(o, s, -1)!, -1)).toBeNull();
  });
  it("↑ from the anchor extends backwards", () => {
    const s = extendSel(o, one(4), -1)!;
    expect(s).toEqual({ kind: "item", anchor: 4, head: 3 });
    expect(nodeSpan(o, s)).toEqual({ anchor: eol(o, 4), head: at(3, 0) });
  });
  it("the span runs from the first line's start to the last line's end", () => {
    expect(nodeSpan(o, one(1))).toEqual({ anchor: at(1, 0), head: eol(o, 2) });
  });
  it("parent and first child", () => {
    expect(parentSel(o, one(2))).toEqual(one(1));
    expect(parentSel(o, one(0))).toBeNull();
    expect(childSel(o, one(0))).toEqual(one(1));
    expect(childSel(o, one(3))).toBeNull();
  });
  it("headings: sub-sections are the children, top-level ones have no parent", () => {
    const h = parse(lines("# A", "## B", "### C", "## D"));
    const s: NodeSel = { kind: "heading", anchor: 1, head: 1 };
    expect(childSel(h, s)).toEqual({ kind: "heading", anchor: 2, head: 2 });
    expect(parentSel(h, s)).toEqual({ kind: "heading", anchor: 0, head: 0 });
    expect(parentSel(h, { kind: "heading", anchor: 0, head: 0 })).toBeNull();
    expect(nodeLines(h, extendSel(h, s, 1)!)).toEqual([1, 3]);
  });
});

describe("removeNodes", () => {
  const rm = (text: string, sel: NodeSel) => {
    const r = removeNodes(parse(text), sel)!;
    const t = r.rows.map(x => x.t);
    t[r.cursor.line] = t[r.cursor.line]!.slice(0, r.cursor.ch) + "|" + t[r.cursor.line]!.slice(r.cursor.ch);
    return t.join("\n");
  };
  it("removes items with their subtrees; the cursor goes to the next sibling's text", () => {
    expect(rm(LIST, { kind: "item", anchor: 1, head: 3 })).toBe(lines("- a", "    - |e", "- f"));
  });
  it("the last child: the cursor goes to the end of the line above", () => {
    expect(rm(LIST, { kind: "item", anchor: 4, head: 4 })).toBe(
      lines("- a", "    - b", "        - c", "    - d|", "- f"),
    );
  });
  it("renumbers ordered lists", () => {
    expect(rm(lines("1. a", "2. b", "3. c"), { kind: "item", anchor: 0, head: 0 })).toBe(lines("1. |b", "2. c"));
  });
  it("keeps the blank line after a list when the last item goes", () => {
    expect(rm(lines("- a", "- b", "", "para"), { kind: "item", anchor: 1, head: 1 })).toBe(lines("- a|", "", "para"));
  });
  it("a whole list between paragraphs takes one blank line with it", () => {
    expect(rm(lines("p", "", "- a", "- b", "", "q"), { kind: "item", anchor: 2, head: 3 })).toBe(lines("p|", "", "q"));
  });
  it("sections take the blank lines before the next sibling", () => {
    const h = lines("# A", "", "## B", "x", "", "## C", "", "# D");
    expect(rm(h, { kind: "heading", anchor: 2, head: 2 })).toBe(lines("# A", "", "## |C", "", "# D"));
    expect(rm(h, { kind: "heading", anchor: 5, head: 5 })).toBe(lines("# A", "", "## B", "x|", "", "# D"));
  });
  it("everything", () => {
    expect(rm(lines("- a", "- b"), { kind: "item", anchor: 0, head: 1 })).toBe("|");
  });
});

describe("nodeText: copy at column 0", () => {
  it("drops the items' indent, keeping relative indent and code bytes", () => {
    const o = parse(
      lines("- a", "    - b", "      text", "      ```", "      \t x", "      ```", "        - c", "    - d"),
    );
    expect(nodeText(o, { kind: "item", anchor: 1, head: 7 })).toBe(
      lines("- b", "  text", "  ```", "  \t x", "  ```", "    - c", "- d"),
    );
  });
  it("tab-indented lists", () => {
    const o = parse(lines("- a", "\t- b", "\t\t- c"));
    expect(nodeText(o, { kind: "item", anchor: 1, head: 1 })).toBe(lines("- b", "\t- c"));
  });
  it("drops a callout's quote prefix", () => {
    const o = parse(lines("> [!note]", "> - a", ">     - b"));
    expect(nodeText(o, { kind: "item", anchor: 1, head: 1 })).toBe(lines("- a", "    - b"));
  });
  it("headings as they are", () => {
    const o = parse(lines("# A", "x", "## B"));
    expect(nodeText(o, { kind: "heading", anchor: 0, head: 0 })).toBe(lines("# A", "x", "## B"));
  });
});
