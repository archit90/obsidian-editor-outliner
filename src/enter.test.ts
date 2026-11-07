import { describe, expect, it } from "vitest";
import { buildOutline } from "./parse";
import { Ctx } from "./ops";
import { activeAt, cleanItem, cursorOwner } from "./active";
import { endList, enter, softBreak } from "./enter";
import { Pos } from "./content";

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
  if (!found.length) throw new Error("no cursor");
  return { texts, from: found[0]!, to: found[found.length - 1]! };
}

const withCursor = (rows: string[], c: Pos) =>
  rows.map((t, i) => (i === c.line ? t.slice(0, c.ch) + "|" + t.slice(c.ch) : t)).join("\n");

/** Enter at the `|` cursor: the new note with the new cursor, or null when the key isn't ours. */
function press(text: string, ctx = sp, folded: number[] = []) {
  const { texts, from, to } = parseCursor(text);
  const r = enter(buildOutline(texts), from, to, ctx, new Set(folded));
  return (
    r &&
    withCursor(
      r.rows.map(x => x.t),
      r.cursor,
    )
  );
}

function shiftEnter(text: string, ctx = sp) {
  const { texts, from, to } = parseCursor(text);
  const c = softBreak(buildOutline(texts), from, to, ctx);
  if (!c) return null;
  const t = texts[c.line]!;
  texts[c.line] = t.slice(0, c.from) + c.insert + "|" + t.slice(c.to);
  return texts.join("\n");
}

function shiftTab(text: string) {
  const { texts, from, to } = parseCursor(text);
  const r = endList(buildOutline(texts), from, to);
  return (
    r &&
    withCursor(
      r.rows.map(x => x.t),
      r.cursor,
    )
  );
}

describe("active state", () => {
  const o = buildOutline([
    "para", // 0
    "", // 1
    "- a", // 2
    "  cont", // 3
    "", // 4
    "  second", // 5
    "    - b", // 6
    "", // 7
    "- c", // 8
    "", // 9
    "after", // 10
    "- other list", // 11
  ]);
  it("is active on an item's own lines, its paragraphs and the blank lines between them", () => {
    for (const l of [2, 3, 4, 5, 6, 8]) expect(activeAt(o, l, l)).not.toBeNull();
    expect(cursorOwner(o, 4)!.item.line).toBe(2);
  });
  it("is idle outside the list, on the blank line after it and between items", () => {
    for (const l of [0, 1, 7, 9, 10]) expect(activeAt(o, l, l)).toBeNull();
  });
  it("a selection within one list is active; one reaching outside or into another list is idle", () => {
    expect(activeAt(o, 3, 8)).toMatchObject({ from: { item: { line: 2 } }, to: { item: { line: 8 } } });
    expect(activeAt(o, 0, 3)).toBeNull();
    expect(activeAt(o, 8, 10)).toBeNull();
    expect(activeAt(o, 8, 11)).toBeNull();
  });
  it("a whitespace line just after an item's own lines that reaches its content column is in the item", () => {
    const p = buildOutline(["- a", "  ", "- b", "    - c", "  ", "- d", " "]);
    expect(cursorOwner(p, 1)!.item.line).toBe(0);
    // after c (content column 6): only 2 spaces, not c's; not a's either (a's last own line is a itself)
    expect(cursorOwner(p, 4)).toBeNull();
    expect(cursorOwner(p, 6)).toBeNull();
    expect(cursorOwner(buildOutline(["- a", ""]), 1)).toBeNull();
  });
  it("works inside callouts", () => {
    const p = buildOutline(["> [!note]", "> - a", ">   more"]);
    expect(activeAt(p, 2, 2)!.from.item.line).toBe(1);
    expect(activeAt(p, 0, 0)).toBeNull();
  });
  it("an item with lazy or under-indented lines is not clean", () => {
    const p = buildOutline([
      "- a",
      "lazy",
      "- b",
      "  ok",
      "  ```",
      "code",
      "  ```",
      "- c",
      "  ```",
      "  x",
      "",
      "  ```",
    ]);
    expect(cleanItem(p, cursorOwner(p, 0)!)).toBe(false);
    expect(cleanItem(p, cursorOwner(p, 2)!)).toBe(false);
    expect(cleanItem(p, cursorOwner(p, 7)!)).toBe(true);
  });
});

describe("Enter splits an item", () => {
  it("in the middle of the text: the rest becomes the next sibling", () => {
    expect(press(lines("- one t|wo", "- three"))).toBe(lines("- one t", "- |wo", "- three"));
  });
  it("drops the spaces around the split", () => {
    expect(press("- one | two")).toBe(lines("- one", "- |two"));
  });
  it("at the end: an empty next sibling", () => {
    expect(press(lines("- a|", "- b"))).toBe(lines("- a", "- |", "- b"));
  });
  it("replaces a selection within the line", () => {
    expect(press("- ab|cd|ef")).toBe(lines("- ab", "- |ef"));
  });
  it("at the start of a non-empty item: an empty item above, the cursor stays on the text", () => {
    expect(press(lines("- a", "- |b", "    - c"))).toBe(lines("- a", "- ", "- |b", "    - c"));
    // in the marker counts as the start
    expect(press("|- b")).toBe(lines("- ", "- |b"));
  });
  it("with unfolded children: the new item is the first child, the children stay with the first part", () => {
    expect(press(lines("- a|b", "    - c", "    - d", "- e"))).toBe(
      lines("- a", "    - |b", "    - c", "    - d", "- e"),
    );
  });
  it("with folded children: the new item is the next sibling after the subtree", () => {
    expect(press(lines("- a|b", "    - c", "        - c1", "- e"), sp, [0])).toBe(
      lines("- a", "    - c", "        - c1", "- |b", "- e"),
    );
  });
  it("a nested item: the new sibling goes after its subtree, at its indent", () => {
    expect(press(lines("- p", "    - a|", "        - x", "    - b"), sp, [1])).toBe(
      lines("- p", "    - a", "        - x", "    - |", "    - b"),
    );
  });
  it("the first child takes the children's bullet", () => {
    expect(press(lines("- a|", "    1. x", "    2. y"))).toBe(lines("- a", "    1. |", "    2. x", "    3. y"));
    expect(press(lines("1. a|", "    * x"))).toBe(lines("1. a", "    * |", "    * x"));
  });
  it("keeps the bullet character", () => {
    expect(press("* a|")).toBe(lines("* a", "* |"));
    expect(press("+   a|")).toBe(lines("+   a", "+   |"));
  });
  it("tabs: the new item uses the list's indent", () => {
    expect(press(lines("- p", "\t- a|", "- q"), tab)).toBe(lines("- p", "\t- a", "\t- |", "- q"));
    // a list indented with spaces keeps spaces in an editor set to tabs
    expect(press(lines("- p", "    - a|b", "        - c"), tab)).toBe(
      lines("- p", "    - a", "        - |b", "        - c"),
    );
  });
});

describe("Enter: tasks and ordered lists", () => {
  it("a task's new item is an open task", () => {
    expect(press("- [x] done| more")).toBe(lines("- [x] done", "- [ ] |more"));
    expect(press("- [ ] |")).toBe(lines("- [ ] ", "- [ ] |"));
  });
  it("a task with children: the first child is a task too, with the children's bullet", () => {
    expect(press(lines("- [ ] a|", "    * x"))).toBe(lines("- [ ] a", "    * [ ] |", "    * x"));
  });
  it("an empty item above a task is an open task", () => {
    expect(press("- [x] |done")).toBe(lines("- [ ] ", "- [x] |done"));
  });
  it("renumbers ordered lists", () => {
    expect(press(lines("1. a|", "2. b", "3. c"))).toBe(lines("1. a", "2. |", "3. b", "4. c"));
    expect(press(lines("1. a", "2. |b"))).toBe(lines("1. a", "2. ", "3. |b"));
    expect(press(lines("3) a|", "4) b"))).toBe(lines("3) a", "4) |", "5) b"));
  });
  it("renumbering past 9 keeps the cursor on the text", () => {
    const l = Array.from({ length: 9 }, (_, i) => `${i + 1}. x${i}`);
    l[8] = "9. |x8";
    expect(press(lines(...l))).toBe(lines(...l.slice(0, 8), "9. ", "10. |x8"));
  });
});

describe("Enter on an empty item", () => {
  it("the last child of a nested list outdents", () => {
    expect(press(lines("- p", "    - a", "    - |", "- q"))).toBe(lines("- p", "    - a", "- |", "- q"));
    expect(press(lines("- p", "    - a", "        - |"))).toBe(lines("- p", "    - a", "    - |"));
  });
  it("outdents a nested empty task and keeps its box", () => {
    expect(press(lines("- p", "    - [ ] |"))).toBe(lines("- p", "- [ ] |"));
  });
  it("logical outdenting changes nothing for a last child", () => {
    expect(press(lines("- p", "    - |", "- q"), { ...sp, logical: true })).toBe(lines("- p", "- |", "- q"));
  });
  it("with a sibling after it: another empty item", () => {
    expect(press(lines("- p", "    - |", "    - b"))).toBe(lines("- p", "    - ", "    - |", "    - b"));
    expect(press(lines("- |", "- b"))).toBe(lines("- ", "- |", "- b"));
  });
  it("the last top-level item: another empty item (the list doesn't end)", () => {
    expect(press(lines("- a", "- |"))).toBe(lines("- a", "- ", "- |"));
  });
  it("an empty item with unfolded children gets an empty first child", () => {
    expect(press(lines("- |", "    - c", "- d"))).toBe(lines("- ", "    - |", "    - c", "- d"));
  });
  it("an empty nested last child with children outdents with them", () => {
    expect(press(lines("- p", "    - |", "        - c"))).toBe(lines("- p", "- |", "    - c"));
  });
  it("renumbers after an outdent", () => {
    expect(press(lines("1. a", "    1. x", "    2. |", "2. b"))).toBe(lines("1. a", "    1. x", "2. |", "3. b"));
  });
});

describe("Enter with continuation paragraphs and code", () => {
  it("everything after the cursor in the item's own lines moves to the new item", () => {
    expect(press(lines("- one| two", "  cont", "- b"))).toBe(lines("- one", "- |two", "  cont", "- b"));
  });
  it("re-indents the moved lines to the new item's content column", () => {
    expect(press(lines("- a|b", "  cont", "    - c"))).toBe(lines("- a", "    - |b", "      cont", "    - c"));
  });
  it("at the end of the marker line: the next paragraph line becomes the new item's text", () => {
    expect(press(lines("- a|", "  cont", "  more"))).toBe(lines("- a", "- |cont", "  more"));
    expect(press(lines("- a|", "", "  second", "- b"))).toBe(lines("- a", "- |second", "- b"));
  });
  it("split in a continuation line", () => {
    expect(press(lines("- a", "  co|nt", "  more"))).toBe(lines("- a", "  co", "- |nt", "  more"));
  });
  it("at the start of a continuation line: that line and the rest move", () => {
    expect(press(lines("- a", "  |cont"))).toBe(lines("- a", "- |cont"));
    // in the item indent counts as the start
    expect(press(lines("- a", "|  cont"))).toBe(lines("- a", "- |cont"));
  });
  it("a later paragraph after a blank line moves with its blank line dropped from both items", () => {
    expect(press(lines("- a", "", "  |second", "  more"))).toBe(lines("- a", "- |second", "  more"));
  });
  it("a code block after the cursor moves with the new item, the code's own whitespace kept", () => {
    expect(press(lines("- a|", "  ```js", "  if (x)", "  \t  y();", "", "  ```", "- b"))).toBe(
      lines("- a", "- |", "  ```js", "  if (x)", "  \t  y();", "", "  ```", "- b"),
    );
  });
  it("code moving into a first child gains the child's indent", () => {
    expect(press(lines("- a|b", "  ```", "    x", "  ```", "    - c"))).toBe(
      lines("- a", "    - |b", "      ```", "        x", "      ```", "    - c"),
    );
  });
  it("a code block before the cursor stays", () => {
    expect(press(lines("- a", "  ```", "  x", "  ```", "  af|ter"))).toBe(
      lines("- a", "  ```", "  x", "  ```", "  af", "- |ter"),
    );
  });
  it("in a code block it is not ours (the code Enter or Obsidian's applies)", () => {
    expect(press(lines("- a", "  ```", "  x|", "  ```"))).toBeNull();
    expect(press(lines("- a", "  ```|", "  ```"))).toBeNull();
  });
  it("a whitespace line left by Shift+Enter is dropped from the first part", () => {
    expect(press(lines("- a", "  |", "- b"))).toBe(lines("- a", "- |", "- b"));
  });
  it("in a callout", () => {
    expect(press(lines("> [!note]", "> - a|b", ">   cont"))).toBe(lines("> [!note]", "> - a", "> - |b", ">   cont"));
    expect(press(lines("> - a|", ">", ">   second"))).toBe(lines("> - a", "> - |second"));
  });
  it("tasks: continuation lines indent to the content column (after the bullet)", () => {
    expect(press(lines("- [ ] a|b", "  cont", "    - c"))).toBe(
      lines("- [ ] a", "    - [ ] |b", "      cont", "    - c"),
    );
  });
});

describe("Enter steps aside", () => {
  it("outside lists, on blank lines between items, in headings", () => {
    expect(press("te|xt")).toBeNull();
    expect(press(lines("- a", "|", "- b"))).toBeNull();
    expect(press(lines("# He|ading", "- a"))).toBeNull();
  });
  it("in an item that isn't a clean tree node", () => {
    expect(press(lines("- a|", "lazy"))).toBeNull();
  });
  it("with a selection over several lines", () => {
    expect(press(lines("- a|b", "- c|d"))).toBeNull();
  });
  it("in a quote under an item", () => {
    expect(press(lines("- a", "  > q|uote"))).toBeNull();
  });
});

describe("Shift+Enter", () => {
  it("a new line in the same item, at its content column", () => {
    expect(shiftEnter(lines("- one| two", "- b"))).toBe(lines("- one", "  |two", "- b"));
    expect(shiftEnter("1. a|")).toBe(lines("1. a", "   |"));
    expect(shiftEnter(lines("- p", "\t- a|"), tab)).toBe(lines("- p", "\t- a", "\t  |"));
  });
  it("on an empty continuation line: a paragraph break, the next line still in the item", () => {
    expect(shiftEnter(lines("- a", "  |"))).toBe(lines("- a", "  ", "  |"));
  });
  it("in a continuation line and in a callout", () => {
    expect(shiftEnter(lines("- a", "  b|c"))).toBe(lines("- a", "  b", "  |c"));
    expect(shiftEnter("> - a|")).toBe(lines("> - a", ">   |"));
  });
  it("steps aside in code and outside lists", () => {
    expect(shiftEnter(lines("- a", "  ```", "  x|", "  ```"))).toBeNull();
    expect(shiftEnter("te|xt")).toBeNull();
  });
});

describe("Shift+Tab ends a list", () => {
  it("an empty top-level item becomes an empty line after the list", () => {
    expect(shiftTab(lines("- a", "- |"))).toBe(lines("- a", "|"));
    expect(shiftTab(lines("- a", "- [ ] |"))).toBe(lines("- a", "|"));
  });
  it("in the middle: the items after it stay a list after the empty line, numbers unchanged", () => {
    expect(shiftTab(lines("1. a", "2. |", "3. c"))).toBe(lines("1. a", "|", "3. c"));
    expect(shiftTab(lines("- |", "- b"))).toBe(lines("|", "- b"));
  });
  it("in a callout the line keeps its >", () => {
    expect(shiftTab(lines("> [!note]", "> - a", "> - |"))).toBe(lines("> [!note]", "> - a", ">|"));
  });
  it("not for a nested, non-empty or parent item", () => {
    expect(shiftTab(lines("- a", "    - |"))).toBeNull();
    expect(shiftTab(lines("- a", "- b|"))).toBeNull();
    expect(shiftTab(lines("- |", "    - c"))).toBeNull();
  });
});
