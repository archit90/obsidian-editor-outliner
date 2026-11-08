// The parts that keep long notes fast (SPEC.md → Where it works → Performance) give the same answers as the full
// work they replace: inline code and block delimiters, line shapes (which edits can't change the heading tree), the
// cheap "would this command act here" checks, and finish()'s numbering shortcut.
import { describe, expect, it } from "vitest";
import { Outline, buildOutline, locate, maskCode, shape } from "./parse";
import {
  Ctx,
  OpResult,
  applies,
  finish,
  indent,
  isNumbered,
  listIn,
  move,
  outdent,
  outlineOfRows,
  rowsOf,
} from "./ops";
import { canInsertCodeBlock, insertCodeBlock } from "./content";

const sp: Ctx = { tabSize: 4, unit: "    ", logical: false };
const lines = (...l: string[]) => l.join("\n");

/** A small deterministic random generator (mulberry32). */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lines that exercise headings, lists, quotes, fences and the comment / math / HTML delimiters. */
const POOL = [
  "",
  "text",
  "# H1",
  "## H2",
  "####### H7",
  "    # not a heading",
  "#tag",
  "- a",
  "- b",
  "\t- c",
  "    - d",
  "1. one",
  "2) two",
  "  continuation",
  "> quote",
  "> # in a quote",
  "> - a",
  "```",
  "```js",
  "~~~",
  "```inline``` code",
  "$$",
  "x $$ y",
  "$$ a $$",
  "%%",
  "a %% b",
  "a `%%` b",
  "x `$$` y",
  "see `<!--` here",
  "<!--",
  "-->",
  "<!-- x -->",
  "a <!-- b",
  "---",
  "***",
  "| a | b |",
];

describe("inline code and block delimiters", () => {
  it("masks inline code spans, keeping the line's length", () => {
    expect(maskCode("a `%%` b")).toBe("a      b");
    expect(maskCode("``a`b`` %%")).toBe("        %%");
    expect(maskCode("a `%% b")).toBe("a `%% b");
    expect(maskCode("no code")).toBe("no code");
  });

  it("a %% inside inline code opens no comment block", () => {
    const o = buildOutline(["- Use `%%` for comments", "- b", "# H"]);
    expect(o.sections.map(s => s.line)).toEqual([2]);
    expect(o.info[1]!.kind).toBe("item");
  });

  it("nor does $$ or <!-- inside inline code", () => {
    expect(buildOutline(["Price `$$` here", "# H"]).sections.map(s => s.line)).toEqual([1]);
    expect(buildOutline(["See `<!--` in HTML", "# H"]).sections.map(s => s.line)).toEqual([1]);
    expect(buildOutline(["Two `$$` and `$$`", "# H"]).sections.map(s => s.line)).toEqual([1]);
  });

  it("a delimiter outside the code span still opens the block", () => {
    expect(buildOutline(["text `x` %%", "# hidden", "%%", "# real"]).sections.map(s => s.line)).toEqual([3]);
    expect(buildOutline(["`a` $$", "# hidden", "$$", "# real"]).sections.map(s => s.line)).toEqual([3]);
    expect(buildOutline(["`a` <!--", "# hidden", "-->", "# real"]).sections.map(s => s.line)).toEqual([3]);
  });

  it("moving a section above such a line moves only that section", () => {
    const t = lines("# A", "x", "# B", "- Use `%%` here", "# C", "y");
    const o = buildOutline(t.split("\n"));
    const r = move(o, 2, 2, -1, sp);
    expect(r && r !== "noop" && "rows" in r ? r.rows.map(x => x.t) : r).toEqual([
      "# B",
      "- Use `%%` here",
      "",
      "# A",
      "x",
      "# C",
      "y",
    ]);
  });
});

describe("line shapes", () => {
  /** What an edit must leave alone: every line's heading level and whether it is opaque (code, math, comment). */
  const structure = (t: string[]) =>
    buildOutline(t).info.map(L =>
      L.kind === "front" ? "f" : L.kind === "code" ? "c" : L.kind === "heading" ? L.level : 0,
    );

  it("typing in a heading's text, a tag line or next to an arrow keeps the shape", () => {
    expect(shape("## Title")).toBe(shape("## Titles and more"));
    expect(shape("#tag")).toBe(shape("#tags"));
    expect(shape("A --> B")).toBe(shape("A --> Bx"));
    expect(shape("text `x`")).toBe(shape("text `xy`"));
  });

  it("changing a heading level, a fence or a delimiter changes it", () => {
    expect(shape("## Title")).not.toBe(shape("### Title"));
    expect(shape("``")).not.toBe(shape("```"));
    expect(shape("a %")).not.toBe(shape("a %%"));
    expect(shape("a `%%")).not.toBe(shape("a `%%`"));
    expect(shape("--")).not.toBe(shape("---"));
    expect(shape("> # x")).not.toBe(shape("# x"));
  });

  it("replacing a line by one of the same shape never changes any line's heading level or opacity", () => {
    const rand = rng(7);
    const pick = () => POOL[Math.floor(rand() * POOL.length)]!;
    const byShape = new Map<string, string[]>();
    for (const t of POOL) byShape.set(shape(t), [...(byShape.get(shape(t)) ?? []), t]);
    let compared = 0;
    for (let k = 0; k < 3000; k++) {
      const note = Array.from({ length: 2 + Math.floor(rand() * 10) }, pick);
      const at = Math.floor(rand() * note.length);
      for (const other of byShape.get(shape(note[at]!))!) {
        if (other === note[at]) continue;
        const next = [...note];
        next[at] = other;
        expect(structure(next)).toEqual(structure(note));
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(100);
  });
});

describe("cheap checks agree with the full work", () => {
  const rand = rng(11);
  const pick = () => POOL[Math.floor(rand() * POOL.length)]!;
  const notes = Array.from({ length: 400 }, () => Array.from({ length: 2 + Math.floor(rand() * 12) }, pick));
  const spans = (n: number) => {
    const out: [number, number][] = [];
    for (let a = 0; a < n; a++) for (let b = a; b < Math.min(n, a + 3); b++) out.push([a, b]);
    return out;
  };

  it("applies() is whether indent / outdent / move return something", () => {
    const ops: [Parameters<typeof applies>[1], (o: Outline, a: number, b: number) => OpResult][] = [
      ["indent", (o, a, b) => indent(o, a, b, sp)],
      ["outdent", (o, a, b) => outdent(o, a, b, sp)],
      ["move", (o, a, b) => move(o, a, b, 1, sp)],
      ["move", (o, a, b) => move(o, a, b, -1, sp)],
    ];
    for (const t of notes) {
      const o = buildOutline(t);
      for (const [a, b] of spans(t.length))
        for (const [kind, op] of ops) expect(applies(o, kind, a, b)).toBe(op(o, a, b) !== null);
    }
  });

  it("listIn() is whether some line of the span is in a list", () => {
    for (const t of notes) {
      const o = buildOutline(t);
      for (const [a, b] of spans(t.length)) {
        let inList = false;
        for (let l = a; l <= b && !inList; l++) inList = !!locate(o, l)?.list;
        expect(listIn(o, a, b)).toBe(inList);
      }
    }
  });

  it("canInsertCodeBlock() is whether Insert code block in item does something", () => {
    for (const t of notes) {
      const o = buildOutline(t);
      for (let l = 0; l < t.length; l++) expect(canInsertCodeBlock(o, l)).toBe(insertCodeBlock(o, l, "", sp) !== null);
    }
  });
});

describe("finish() numbering", () => {
  it("without ordered items: the rows as they are, marked numbered, no parse", () => {
    const o = buildOutline(["- a", "- b"]);
    const rows = rowsOf(o).reverse();
    const out = finish(o, rows).rows;
    expect(out).toBe(rows);
    expect(isNumbered(out)).toBe(true);
    expect(outlineOfRows(out)).toBeNull();
  });

  it("with ordered items: numbered, and the outline it parsed comes along when numbering changed nothing", () => {
    const o = buildOutline(["1. a", "2. b", "- x"]);
    const same = finish(o, [
      { t: "1. a", o: 0 },
      { t: "2. b", o: 1 },
      { t: "- y", o: -1 },
    ]).rows;
    expect(isNumbered(same)).toBe(true);
    expect(outlineOfRows(same)?.texts).toEqual(["1. a", "2. b", "- y"]);
    const moved = finish(o, [
      { t: "2. b", o: 1 },
      { t: "1. a", o: 0 },
      { t: "- x", o: 2 },
    ]).rows;
    expect(moved.map(r => r.t)).toEqual(["1. b", "2. a", "- x"]);
    expect(outlineOfRows(moved)).toBeNull();
  });
});
