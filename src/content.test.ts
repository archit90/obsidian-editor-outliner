import { describe, expect, it } from "vitest";
import { Outline, buildOutline } from "./parse";
import { Ctx, OpResult, indent, move, outdent } from "./ops";
import {
  codeBlockAt,
  codeCopyText,
  codeNewline,
  codePasteText,
  insertCodeBlock,
  ownerAt,
  partsOf,
  stripItemIndent,
} from "./content";
import { steps } from "./select";

const sp: Ctx = { tabSize: 4, unit: "    ", logical: false };
const tab: Ctx = { tabSize: 4, unit: "\t", logical: false };
const lines = (...l: string[]) => l.join("\n");
const outline = (...l: string[]) => buildOutline(l);
const insert = (o: Outline, line: number, lang: string, ctx = sp) => {
  const r = insertCodeBlock(o, line, lang, ctx);
  return r && { text: r.rows.map(x => x.t).join("\n"), cursor: r.cursor };
};

// a nested item with two paragraphs, a code block and a child
const NOTE = [
  "- top", // 0
  "    - item", // 1
  "      more", // 2
  "", // 3
  "      second", // 4
  "      ```js", // 5
  "      let a;", // 6
  "        b();", // 7
  "      ```", // 8
  "        - child", // 9
];

describe("multi-block items: model", () => {
  it("an item's own lines split into paragraphs and code blocks", () => {
    const o = buildOutline(NOTE);
    const w = ownerAt(o, 4)!;
    expect(w.item.line).toBe(1);
    expect(partsOf(o, w).map(p => [p.start, p.end, !!p.code])).toEqual([
      [1, 3, false],
      [4, 5, false],
      [5, 9, true],
    ]);
    expect(ownerAt(o, 9)!.item.line).toBe(9);
    const cb = codeBlockAt(o, 7)!;
    expect([cb.start, cb.end, cb.innerStart, cb.innerEnd, cb.owner.item.line]).toEqual([5, 9, 6, 8, 1]);
  });

  it("a code block outside items, or not fenced, isn't an item's code block", () => {
    expect(codeBlockAt(outline("```", "x", "```"), 1)).toBeNull();
    expect(codeBlockAt(outline("- a", "  $$", "  x", "  $$"), 2)).toBeNull();
  });

  it("an unclosed block runs to its end", () => {
    const cb = codeBlockAt(outline("- a", "  ```", "  x"), 2)!;
    expect([cb.innerStart, cb.innerEnd]).toEqual([2, 3]);
  });
});

describe("insert code block / Dataview query in item", () => {
  it("goes after the item's own lines, before its children, indented to the content column", () => {
    const o = buildOutline(NOTE);
    for (const from of [1, 2, 3, 4, 7]) {
      const r = insert(o, from, "dataview")!;
      expect(r.text.split("\n").slice(9, 12)).toEqual(["      ```dataview", "      ", "      ```"]);
      expect(r.text.split("\n")[12]).toBe("        - child");
      expect(r.cursor).toEqual({ line: 10, ch: 6 });
    }
  });

  it("plain code block on a one-line item", () => {
    expect(insert(outline("- a", "- b"), 0, "")).toEqual({
      text: lines("- a", "  ```", "  ", "  ```", "- b"),
      cursor: { line: 2, ch: 2 },
    });
  });

  it("follows the list's tabs, ordered markers and callouts; numbers stay", () => {
    expect(insert(outline("- a", "\t- b"), 1, "", tab)!.text).toBe(lines("- a", "\t- b", "\t  ```", "\t  ", "\t  ```"));
    expect(insert(outline("1. a", "1. b"), 0, "")!.text).toBe(lines("1. a", "   ```", "   ", "   ```", "1. b"));
    expect(insert(outline("> [!note]", "> - a"), 1, "")!.text).toBe(
      lines("> [!note]", "> - a", ">   ```", ">   ", ">   ```"),
    );
  });

  it("not outside an item's own lines", () => {
    expect(insert(outline("para"), 0, "")).toBeNull();
    expect(insert(outline("- a", "", "    - b"), 1, "")).toBeNull();
  });
});

describe("expand selection inside items", () => {
  const spans = (o: Outline, line: number, ch: number) =>
    steps(o, line, ch).map(s => [s.from.line, s.from.ch, s.to.line, s.to.ch]);

  it("paragraph, before the item's own lines", () => {
    const o = buildOutline(NOTE);
    expect(spans(o, 2, 7)).toContainEqual([1, 0, 2, 10]); // first paragraph: marker line + continuation
    expect(spans(o, 4, 7)).toContainEqual([4, 0, 4, 12]); // later paragraph
    expect(spans(o, 4, 7)).toContainEqual([1, 0, 8, 9]); // own lines
  });

  it("code: the code lines, then the whole fence", () => {
    const s = spans(buildOutline(NOTE), 7, 9);
    expect(s).toContainEqual([6, 0, 7, 12]);
    expect(s).toContainEqual([5, 0, 8, 9]);
    const own = s.findIndex(x => x.join() === "1,0,8,9");
    expect(s.findIndex(x => x.join() === "5,0,8,9")).toBeLessThan(own);
  });
});

describe("code-indent rules", () => {
  it("Enter: item indent plus the line's own indent", () => {
    const o = buildOutline(NOTE);
    expect(codeNewline(o, 6, sp)).toBe("      ");
    expect(codeNewline(o, 7, sp)).toBe("        ");
    expect(codeNewline(o, 5, sp)).toBe("      ");
    expect(codeNewline(o, 4, sp)).toBeNull();
    // a code line short of the content column gets the item indent
    expect(codeNewline(outline("- a", "  ```", "x", "  ```"), 2, sp)).toBe("  ");
    expect(codeNewline(outline("> - a", ">   ```", ">     x"), 2, sp)).toBe(">     ");
    expect(codeNewline(outline("\t- a", "\t  ```", "\t  \tx"), 2, tab)).toBe("\t  \t");
  });

  it("copy out of a code block strips the item indent from every line", () => {
    const o = buildOutline(NOTE);
    expect(codeCopyText(o, { line: 6, ch: 0 }, { line: 7, ch: 12 })).toBe(lines("let a;", "  b();"));
    expect(codeCopyText(o, { line: 5, ch: 0 }, { line: 8, ch: 9 })).toBe(lines("```js", "let a;", "  b();", "```"));
    // starting mid-line: the first piece is as selected
    expect(codeCopyText(o, { line: 6, ch: 10 }, { line: 7, ch: 9 })).toBe(lines("a;", "  b"));
    // one line, or reaching out of the block: not ours
    expect(codeCopyText(o, { line: 6, ch: 0 }, { line: 6, ch: 12 })).toBeNull();
    expect(codeCopyText(o, { line: 4, ch: 0 }, { line: 7, ch: 4 })).toBeNull();
    expect(codeCopyText(outline("```", "a", "b", "```"), { line: 1, ch: 0 }, { line: 2, ch: 1 })).toBeNull();
  });

  it("copy keeps the code's own tabs and spaces; callout prefix goes too", () => {
    const o = outline("\t- a", "\t  ```", "\t  \t x", "\t   \ty", "\t  ```");
    expect(codeCopyText(o, { line: 2, ch: 0 }, { line: 3, ch: 6 })).toBe(lines("\t x", " \ty"));
    const c = outline("> - a", ">   ```", ">   x", ">     y", ">   ```");
    expect(codeCopyText(c, { line: 2, ch: 0 }, { line: 3, ch: 7 })).toBe(lines("x", "  y"));
  });

  it("paste into a code block adds the item indent to every line after the first", () => {
    const o = buildOutline(NOTE);
    const at = { line: 6, ch: 12 };
    expect(codePasteText(o, at, at, "x\n  y\n\nz", sp)).toBe(lines("x", "        y", "", "      z"));
    // text ending in a newline: the rest of the line keeps the item indent
    expect(codePasteText(o, at, at, "x\ny\n", sp)).toBe(lines("x", "      y", "      "));
    // cursor inside the indent: the rest already has it
    expect(codePasteText(o, { line: 6, ch: 0 }, { line: 6, ch: 0 }, "x\n", sp)).toBe(lines("x", ""));
    expect(codePasteText(o, at, at, "one line", sp)).toBeNull();
    expect(codePasteText(o, { line: 5, ch: 9 }, { line: 5, ch: 9 }, "a\nb", sp)).toBeNull(); // on the fence
    expect(codePasteText(o, { line: 4, ch: 0 }, { line: 4, ch: 0 }, "a\nb", sp)).toBeNull();
    const c = outline("> - a", ">   ```", ">   x", ">   ```");
    expect(codePasteText(c, { line: 2, ch: 5 }, { line: 2, ch: 5 }, "1\n\n2", sp)).toBe(lines("1", ">", ">   2"));
  });

  it("stripItemIndent removes only cc columns", () => {
    expect(stripItemIndent("      \t x", 0, 6, 4)).toBe("\t x");
    expect(stripItemIndent("\t  \t x", 0, 6, 4)).toBe("\t x");
    expect(stripItemIndent("  x", 0, 6, 4)).toBe("x");
    expect(stripItemIndent(">   > x", 1, 2, 4)).toBe("> x");
  });
});

/** Runs op on the note's lines l0..l1 and returns the new lines. */
function run(t: string[], l0: number, op: (o: Outline, a: number, b: number) => OpResult): string[] {
  const r = op(buildOutline(t), l0, l0);
  if (r === null || r === "noop" || "error" in r) throw new Error(`no rows: ${JSON.stringify(r)}`);
  return r.rows.map(x => x.t);
}

describe("indent / outdent / move never touch a code line's own whitespace", () => {
  // code lines whose own indent (beyond the item's content column) mixes tabs and spaces
  const own = ["```py", "\tif x:", " \t  y()", "  \tz", "\t \t", "```"];
  const under = (pre: string, cc: number, note: string[], at: number) => {
    const t = [...note];
    t.splice(at, 0, ...own.map(l => pre + l));
    return { t, cc, at };
  };
  // the code's own text: every code line with its item indent (cc columns) removed
  const code = (t: string[], from: number, cc: number) =>
    t.slice(from, from + own.length).map(l => stripItemIndent(l, 0, cc, 4));

  it("spaces list: indent, outdent, move up, move down", () => {
    const { t, at } = under("  ", 2, ["- a", "- b", "- c"], 2);
    expect(code(t, at, 2)).toEqual(own);
    const ind = run(t, 1, (o, a, b) => indent(o, a, b, sp));
    expect(ind[1]).toBe("    - b");
    expect(code(ind, at, 6)).toEqual(own);
    const out = run(ind, 1, (o, a, b) => outdent(o, a, b, sp));
    expect(out).toEqual(t);
    const up = run(t, 1, (o, a, b) => move(o, a, b, -1, sp));
    expect(up[0]).toBe("- b");
    expect(code(up, 1, 2)).toEqual(own);
    const down = run(t, 1, (o, a, b) => move(o, a, b, 1, sp));
    expect(down[1]).toBe("- c");
    expect(code(down, 3, 2)).toEqual(own);
  });

  it("tab list: indent, outdent, jump into the next parent", () => {
    const { t, at } = under("\t  ", 6, ["- a", "\t- b", "- c", "\t- d"], 2);
    expect(code(t, at, 6)).toEqual(own);
    const out = run(t, 1, (o, a, b) => outdent(o, a, b, tab));
    expect(out[1]).toBe("- b");
    expect(code(out, at, 2)).toEqual(own);
    expect(run(out, 1, (o, a, b) => indent(o, a, b, tab))).toEqual(t);
    const down = run(t, 1, (o, a, b) => move(o, a, b, 1, tab));
    expect(down.slice(0, 2)).toEqual(["- a", "- c"]);
    expect(down[2]).toBe("\t- b");
    expect(code(down, 3, 6)).toEqual(own);
  });

  it("ordered list with an odd content column", () => {
    const { t, at } = under("   ", 3, ["1. a", "2. b"], 2);
    const ind = run(t, 1, (o, a, b) => indent(o, a, b, sp));
    expect(ind[1]).toBe("    1. b");
    expect(code(ind, at, 7)).toEqual(own);
    expect(run(ind, 1, (o, a, b) => outdent(o, a, b, sp))).toEqual(t);
  });
});
