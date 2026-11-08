import { describe, expect, it } from "vitest";
import { rowChange } from "./rowdiff";

/** The reference: a character diff of the two whole texts (common prefix, then common suffix of the rest). */
function reference(old: string[], next: string[]) {
  const a = old.join("\n");
  const b = next.join("\n");
  if (a === b) return null;
  const max = Math.min(a.length, b.length);
  let p = 0;
  while (p < max && a.charCodeAt(p) === b.charCodeAt(p)) p++;
  let q = 0;
  while (q < max - p && a.charCodeAt(a.length - 1 - q) === b.charCodeAt(b.length - 1 - q)) q++;
  return { from: p, to: a.length - q, insert: b.slice(p, b.length - q) };
}

function change(old: string[], next: string[]) {
  const starts: number[] = [];
  let acc = 0;
  for (const t of old) {
    starts.push(acc);
    acc += t.length + 1;
  }
  const c = rowChange(
    old,
    next.map(t => ({ t })),
    i => starts[i]!,
  );
  return c && { from: c.from, to: c.to, insert: c.insert };
}

/** A small deterministic random generator (mulberry32). */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("rowChange", () => {
  it("is the character diff of the two texts", () => {
    const cases: [string[], string[]][] = [
      [
        ["a", "b", "c"],
        ["a", "x", "c"],
      ],
      [
        ["x", "y"],
        ["x", "N", "y"],
      ],
      [["a"], ["a", "b"]],
      [["a", "b"], ["a"]],
      [["ab"], ["ab", "ab"]],
      [
        ["- a", "- b"],
        ["- b", "- a"],
      ],
      [[""], []],
      [["a"], ["a"]],
      [[""], ["", ""]],
      [
        ["a", "", "b"],
        ["a", "b"],
      ],
      [["one two"], ["one", "two"]],
    ];
    for (const [old, next] of cases) expect(change(old, next)).toEqual(reference(old, next));
  });

  it("agrees with the character diff on random edits", () => {
    const rand = rng(42);
    const pool = ["", "- a", "- b", "\t- c", "x", "ab", "a", "b", "# H", "```", "1. n", "> q"];
    const pick = () => pool[Math.floor(rand() * pool.length)]!;
    for (let k = 0; k < 4000; k++) {
      const old = Array.from({ length: 1 + Math.floor(rand() * 8) }, pick);
      const next = [...old];
      const edits = 1 + Math.floor(rand() * 3);
      for (let e = 0; e < edits; e++) {
        const at = Math.floor(rand() * (next.length + 1));
        const r = rand();
        if (r < 0.3) next.splice(at, 0, pick());
        else if (r < 0.6 && next.length) next.splice(Math.min(at, next.length - 1), 1);
        else if (next.length) next[Math.min(at, next.length - 1)] = pick();
      }
      expect(change(old, next)).toEqual(reference(old, next));
    }
  });
});
