import { describe, expect, it } from "vitest";
import { buildOutline } from "./parse";
import { Ctx } from "./ops";
import { Pos } from "./content";
import { backspace, deleteForward } from "./merge";

const sp: Ctx = { tabSize: 4, unit: "    ", logical: false };
const tab: Ctx = { tabSize: 4, unit: "\t", logical: false };
const lines = (...l: string[]) => l.join("\n");

function parseCursor(text: string): { texts: string[]; at: Pos } {
  const texts = text.split("\n");
  let at: Pos | null = null;
  texts.forEach((t, line) => {
    const ch = t.indexOf("|");
    if (ch >= 0) {
      at = { line, ch };
      texts[line] = t.slice(0, ch) + t.slice(ch + 1);
    }
  });
  if (!at) throw new Error("no cursor");
  return { texts, at };
}

const withCursor = (rows: string[], c: Pos) =>
  rows.map((t, i) => (i === c.line ? t.slice(0, c.ch) + "|" + t.slice(c.ch) : t)).join("\n");

/** The key at the `|` cursor: the new note with the cursor, "noop", or null (Obsidian's key). */
function press(op: typeof backspace, text: string, folded: number[] = [], ctx = sp) {
  const { texts, at } = parseCursor(text);
  const r = op(buildOutline(texts), at, at, ctx, new Set(folded));
  if (!r || r === "noop") return r;
  return withCursor(
    r.rows.map(x => x.t),
    r.cursor,
  );
}
const bs = (text: string, folded: number[] = [], ctx = sp) => press(backspace, text, folded, ctx);
const del = (text: string, folded: number[] = [], ctx = sp) => press(deleteForward, text, folded, ctx);

describe("Backspace at the start of an item", () => {
  it("merges into the previous sibling", () => {
    expect(bs(lines("- one", "- |two"))).toBe(lines("- one|two"));
  });
  it("works from anywhere in the marker", () => {
    expect(bs(lines("- one", "|- two"))).toBe(lines("- one|two"));
    expect(bs(lines("- one", "    |- two"))).toBe(lines("- one|two"));
  });
  it("merges into the parent when it is the first child", () => {
    expect(bs(lines("- p", "    - |c", "    - d"))).toBe(lines("- p|c", "    - d"));
  });
  it("merges into the last visible descendant of the previous sibling", () => {
    expect(bs(lines("- a", "    - b", "        - c", "- |d"))).toBe(lines("- a", "    - b", "        - c|d"));
  });
  it("moves the children under the merge target, after its own", () => {
    expect(bs(lines("- a", "    - b", "- |c", "    - d", "    - e"))).toBe(
      lines("- a", "    - b|c", "        - d", "        - e"),
    );
  });
  it("puts the children where the item was when merging into the parent", () => {
    expect(bs(lines("- p", "    - |c", "        - x", "    - d"))).toBe(lines("- p|c", "    - x", "    - d"));
  });
  it("keeps the children's own structure", () => {
    expect(bs(lines("- a", "- |b", "    - c", "        - d"))).toBe(lines("- a|b", "    - c", "        - d"));
  });
  it("moves continuation paragraphs and code to the target's indent, code bytes kept", () => {
    expect(bs(lines("- a", "    - |b", "      more", "", "      ```", "      \tx  y", "      ```"))).toBe(
      lines("- a|b", "  more", "", "  ```", "  \tx  y", "  ```"),
    );
  });
  it("deletes a blank previous item instead (not the parent)", () => {
    expect(bs(lines("- a", "- ", "- |b", "    - c"))).toBe(lines("- a", "- |b", "    - c"));
    expect(bs(lines("- a", "", "- ", "", "- |b"))).toBe(lines("- a", "", "- |b"));
  });
  it("merges an empty item into its parent rather than deleting the parent", () => {
    expect(bs(lines("- ", "    - |b"))).toBe(lines("- |b"));
  });
  it("drops the blank lines between the items", () => {
    expect(bs(lines("- a", "", "- |b"))).toBe(lines("- a|b"));
  });
  it("skips folded-away items: merges into the folded item, which stays folded", () => {
    // line 0 folded: b is hidden, so the previous visible item of c is a
    expect(bs(lines("- a", "    - b", "- |c", "    - d"), [0])).toBe(lines("- a|c", "    - b", "    - d"));
  });
  it("does nothing when the folded previous item has own lines below its marker", () => {
    expect(bs(lines("- a", "  more", "    - b", "- |c"), [0])).toBe("noop");
  });
  it("first item: nothing with text, Obsidian's when empty", () => {
    expect(bs(lines("para", "", "- |a", "- b"))).toBe("noop");
    expect(bs(lines("- |", "- b"))).toBeNull();
    expect(bs(lines("- |", "    - c"))).toBe("noop");
  });
  it("removes a task's checkbox first", () => {
    expect(bs(lines("- a", "- [ ] |b"))).toBe(lines("- a", "- |b"));
    expect(bs(lines("- a", "- |[ ] b"))).toBe(lines("- a|b"));
  });
  it("renumbers ordered lists", () => {
    expect(bs(lines("1. a", "2. |b", "3. c"))).toBe(lines("1. a|b", "2. c"));
  });
  it("puts the text on a new line when the target ends with a code block", () => {
    expect(bs(lines("- a", "  ```", "  x", "  ```", "- |b"))).toBe(lines("- a", "  ```", "  x", "  ```", "  |b"));
  });
  it("is Obsidian's inside the text and with a selection", () => {
    expect(bs(lines("- a", "- b|c"))).toBeNull();
    const o = buildOutline(["- a", "- bc"]);
    expect(backspace(o, { line: 1, ch: 2 }, { line: 1, ch: 3 }, sp, new Set())).toBeNull();
  });
  it("keeps the callout prefix", () => {
    expect(bs(lines("> - a", "> - |b", ">   more"))).toBe(lines("> - a|b", ">   more"));
  });
  it("uses the list's tabs", () => {
    expect(bs(lines("- a", "- |b", "\t- c"), [], tab)).toBe(lines("- a|b", "\t- c"));
  });
});

describe("Backspace: the item indent is invisible", () => {
  it("joins a continuation line to the line above", () => {
    expect(bs(lines("- a", "  |b"))).toBe(lines("- a|b"));
    expect(bs(lines("- a", "|  b"))).toBe(lines("- a|b"));
    expect(bs(lines("- a", "  x", "  |b"))).toBe(lines("- a", "  x|b"));
  });
  it("removes a blank line above (a paragraph break)", () => {
    expect(bs(lines("- a", "", "  |b"))).toBe(lines("- a", "  |b"));
  });
  it("joins code lines without the item indent, keeping the code's own", () => {
    expect(bs(lines("- a", "  ```", "  x", "  |\ty", "  ```"))).toBe(lines("- a", "  ```", "  x|\ty", "  ```"));
    expect(bs(lines("- a", "  ```", "  x", "    |y", "  ```"))).toBeNull();
  });
  it("does nothing next to a fence line", () => {
    expect(bs(lines("- a", "  ```", "  |x", "  ```"))).toBe("noop");
    expect(bs(lines("- a", "  ```", "  x", "  |```"))).toBe("noop");
    expect(bs(lines("- a", "  |```", "  x", "  ```"))).toBe("noop");
    expect(bs(lines("- a", "  ```", "  x", "  ```", "  |after"))).toBe("noop");
  });
  it("joins a code line to an empty code line above", () => {
    expect(bs(lines("- a", "  ```", "", "  |x", "  ```"))).toBe(lines("- a", "  ```", "  |x", "  ```"));
  });
  it("is Obsidian's past the indent", () => {
    expect(bs(lines("- a", "  b|c"))).toBeNull();
  });
});

describe("Delete at the end of an item", () => {
  it("pulls the next sibling in", () => {
    expect(del(lines("- one|", "- two"))).toBe(lines("- one|two"));
  });
  it("pulls the first child in when the children show", () => {
    expect(del(lines("- p|", "    - c", "        - x", "    - d"))).toBe(lines("- p|c", "    - x", "    - d"));
  });
  it("moves the next item's children under this item", () => {
    expect(del(lines("- a|", "- b", "    - c"))).toBe(lines("- a|b", "    - c"));
    expect(del(lines("- a", "    - b|", "- c", "    - d"))).toBe(lines("- a", "    - b|c", "        - d"));
  });
  it("does nothing on a folded item or the last item", () => {
    expect(del(lines("- p|", "    - c"), [0])).toBe("noop");
    expect(del(lines("- a", "- b|", "", "para"))).toBe("noop");
  });
  it("from the end of the last own line", () => {
    expect(del(lines("- a", "  more|", "- b", "  cont"))).toBe(lines("- a", "  more|b", "  cont"));
  });
  it("is Obsidian's elsewhere in the text", () => {
    expect(del(lines("- a|b", "- c"))).toBeNull();
  });
  it("renumbers", () => {
    expect(del(lines("1. a|", "2. b", "3. c"))).toBe(lines("1. a|b", "2. c"));
  });
});

describe("Delete: the item indent is invisible", () => {
  it("joins the next continuation line without its indent", () => {
    expect(del(lines("- a|", "  b", "- c"))).toBe(lines("- a|b", "- c"));
    expect(del(lines("- a", "  x|", "  b"))).toBe(lines("- a", "  x|b"));
  });
  it("removes a blank line below", () => {
    expect(del(lines("- a|", "", "  b"))).toBe(lines("- a|", "  b"));
  });
  it("joins code lines, keeping the code's own indent", () => {
    expect(del(lines("- a", "  ```", "  x|", "  \t y", "  ```"))).toBe(lines("- a", "  ```", "  x|\t y", "  ```"));
  });
  it("does nothing at a fence", () => {
    expect(del(lines("- a", "  ```", "  x|", "  ```", "  b"))).toBe("noop");
    expect(del(lines("- a|", "  ```", "  x", "  ```"))).toBe("noop");
  });
});

describe("Backspace and Delete on the whitespace-only line after an item", () => {
  it("Backspace joins it to the item; Delete does nothing", () => {
    expect(bs(lines("- a", "  |"))).toBe(lines("- a|"));
    expect(del(lines("- a", "  |", "- b"))).toBe("noop");
  });
});
