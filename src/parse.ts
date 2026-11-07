// The outline model of a note (see the repo's SPEC.md, "Editor Outliner"): line kinds, the heading tree, body blocks and list trees.
// Pure: works on the note's lines, no Obsidian or CodeMirror.

export type Kind = "front" | "code" | "heading" | "item" | "blank" | "text" | "hr";

export interface LineInfo {
  kind: Kind;
  /** Blockquote / callout depth (number of `>`). */
  qd: number;
  /** Spaces before the first `>` (a quote inside a list item is indented). */
  qcol: number;
  /** Length of the quote prefix (`> > `). */
  pre: number;
  /** Length of the leading whitespace after the prefix. */
  ws: number;
  /** Indent in columns (tabs expanded). */
  col: number;
  /** Item lines: the column where the item's content starts (CommonMark); children are indented at least this far. */
  cc: number;
  /** Heading level (number of `#`), else 0. */
  level: number;
  /** Where the line's own text starts: after `## `, `- `, `- [ ] `, `1. `, or the indent. */
  text: number;
  /** Nothing after the quote prefix (a `>` spacer line in a callout counts as blank inside it). */
  empty: boolean;
  /** Code / math / comment block id (kind "code"), else -1. */
  fence: number;
  /** Indent of the line that opened this code block. */
  fenceCol: number;
}

export interface Section {
  /** Heading line; the root's is the line before the body (-1 without frontmatter). */
  line: number;
  level: number;
  /** First line after the section (the next same-or-higher heading), not trimmed. */
  end: number;
  /** First child heading's line, else end. */
  bodyEnd: number;
  parent: Section | null;
  children: Section[];
}

export type BlockKind = "list" | "code" | "quote" | "table" | "para" | "hr";

export interface Block {
  start: number;
  /** Exclusive; trailing blank lines are not part of the block. */
  end: number;
  kind: BlockKind;
  /** Quote depth the block lives at (0 in a section body, the callout's depth inside a callout). */
  q: number;
}

export interface Item {
  /** The item's marker line; -1 for a list's virtual root. */
  line: number;
  col: number;
  /** Content column: lines indented at least this far belong to the item. */
  cc: number;
  /** 0 for top-level items; -1 for the virtual root. */
  depth: number;
  /** Exclusive end of the subtree, trimmed. */
  end: number;
  /** Exclusive end of the item's own lines (first child's line, or end), trimmed. */
  ownEnd: number;
  parent: Item | null;
  children: Item[];
}

export interface Outline {
  texts: string[];
  info: LineInfo[];
  /** First line after the frontmatter. */
  bodyStart: number;
  root: Section;
  /** All real sections in document order. */
  sections: Section[];
  /** Per line: the number of sections it lies inside, below their heading line. */
  depth: number[];
  tabSize: number;
  blockCache: Map<Section, Block[]>;
  innerCache: Map<Block, Block[]>;
  itemCache: Map<Block, Item>;
}

const QUOTE = /^(?: {0,3}>[ \t]?)*/;
const ITEM = /^([-*+]|\d{1,9}[.)])(?:([ \t]+)(?:\[.\](?:[ \t]+|$))?|$)/;
const HR = /^([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const HEADING = /^(#+)(?:[ \t]+|$)/;

export function columns(ws: string, tabSize: number, start = 0): number {
  let c = start;
  for (const ch of ws) c = ch === "\t" ? c + tabSize - (c % tabSize) : c + 1;
  return c - start;
}

const count = (s: string, sub: string) => s.split(sub).length - 1;

type FenceKind = "fence" | "math" | "comment" | "html";
interface Fence {
  id: number;
  kind: FenceKind;
  ch: string;
  len: number;
  col: number;
  qd: number;
}

function closes(f: Fence, c: string): boolean {
  const ce = c.trimEnd();
  if (f.kind === "fence") return ce.length >= f.len && [...ce].every(x => x === f.ch);
  if (f.kind === "math") return ce.includes("$$");
  if (f.kind === "comment") return ce.includes("%%");
  return ce.includes("-->");
}

export function parseLines(texts: string[], tabSize = 4): { info: LineInfo[]; bodyStart: number } {
  const info: LineInfo[] = [];
  let bodyStart = 0;
  // Obsidian only reads frontmatter closed by `---`
  if (texts.length > 1 && texts[0]!.trimEnd() === "---") {
    for (let j = 1; j < texts.length; j++) {
      if (texts[j]!.trimEnd() === "---") {
        bodyStart = j + 1;
        break;
      }
    }
  }
  let fence: Fence | null = null;
  let fenceId = 0;
  const open = (kind: FenceKind, ch: string, len: number, col: number, qd: number): Fence => ({
    id: ++fenceId,
    kind,
    ch,
    len,
    col,
    qd,
  });
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i]!;
    const base = {
      qd: 0,
      qcol: 0,
      pre: 0,
      ws: 0,
      col: 0,
      cc: 0,
      level: 0,
      text: 0,
      empty: false,
      fence: -1,
      fenceCol: 0,
    };
    if (i < bodyStart) {
      info.push({ ...base, kind: "front" });
      continue;
    }
    const pm = QUOTE.exec(t)![0];
    const pre = pm.length;
    const qd = count(pm, ">");
    const qcol = qd ? /^ */.exec(t)![0].length : 0;
    const rest = t.slice(pre);
    const wsStr = /^[ \t]*/.exec(rest)![0];
    const ws = wsStr.length;
    const col = columns(wsStr, tabSize);
    const c = rest.slice(ws);
    const L: LineInfo = { ...base, kind: "text", qd, qcol, pre, ws, col, text: pre + ws, empty: c === "" };
    // a code block opened inside a quote ends with the quote
    if (fence && qd < fence.qd) fence = null;
    if (fence) {
      L.kind = "code";
      L.fence = fence.id;
      L.fenceCol = fence.col;
      if (closes(fence, c)) fence = null;
      info.push(L);
      continue;
    }
    if (t.trim() === "") {
      L.kind = "blank";
      L.empty = true;
      info.push(L);
      continue;
    }
    const fm = /^(`{3,}|~{3,})(.*)$/.exec(c);
    let opened: Fence | null = null;
    // a backtick fence's info string can't contain a backtick (```inline``` is inline code)
    if (fm && !(fm[1]![0] === "`" && fm[2]!.includes("`"))) opened = open("fence", fm[1]![0]!, fm[1]!.length, col, qd);
    else if (c.startsWith("$$") && count(c, "$$") % 2 === 1) opened = open("math", "$", 2, col, qd);
    else if (c.startsWith("%%") && count(c, "%%") % 2 === 1) opened = open("comment", "%", 2, col, qd);
    else if (c.startsWith("<!--") && !c.slice(4).includes("-->")) opened = open("html", "<", 4, col, qd);
    if (opened) {
      fence = opened;
      L.kind = "code";
      L.fence = opened.id;
      L.fenceCol = col;
      info.push(L);
      continue;
    }
    const hm = qd === 0 && col <= 3 ? HEADING.exec(c) : null;
    if (hm) {
      L.kind = "heading";
      L.level = hm[1]!.length;
      L.text = pre + ws + hm[0].length;
    } else if (HR.test(c)) {
      L.kind = "hr";
    } else {
      const im = ITEM.exec(c);
      if (im) {
        L.kind = "item";
        L.text = pre + ws + im[0].length;
        const sp = im[2] ? columns(im[2], tabSize, col + im[1]!.length) : 0;
        L.cc = col + im[1]!.length + (sp >= 1 && sp <= 4 ? sp : 1);
      }
    }
    // a comment or math block opened mid-line hides the lines after it
    if (count(c, "%%") % 2 === 1) fence = open("comment", "%", 2, col, qd);
    else if (count(c, "$$") % 2 === 1) fence = open("math", "$", 2, col, qd);
    else if (c.lastIndexOf("<!--") > c.lastIndexOf("-->")) fence = open("html", "<", 4, col, qd);
    info.push(L);
  }
  return { info, bodyStart };
}

export function buildOutline(texts: string[], tabSize = 4): Outline {
  const { info, bodyStart } = parseLines(texts, tabSize);
  const n = texts.length;
  const root: Section = { line: bodyStart - 1, level: 0, end: n, bodyEnd: n, parent: null, children: [] };
  const sections: Section[] = [];
  const depth = new Array<number>(n).fill(0);
  const stack: Section[] = [root];
  for (let i = bodyStart; i < n; i++) {
    const L = info[i]!;
    if (L.kind === "heading") {
      while (stack[stack.length - 1]!.level >= L.level) stack.pop()!.end = i;
      const parent = stack[stack.length - 1]!;
      const s: Section = { line: i, level: L.level, end: n, bodyEnd: n, parent, children: [] };
      parent.children.push(s);
      sections.push(s);
      depth[i] = stack.length - 1;
      stack.push(s);
    } else depth[i] = stack.length - 1;
  }
  for (const s of [root, ...sections]) s.bodyEnd = s.children[0]?.line ?? s.end;
  return {
    texts,
    info,
    bodyStart,
    root,
    sections,
    depth,
    tabSize,
    blockCache: new Map(),
    innerCache: new Map(),
    itemCache: new Map(),
  };
}

/** A blank line; with loose, also a `>` spacer line (blank inside its callout). */
export function isBlank(o: Outline, i: number, loose = false): boolean {
  const L = o.info[i]!;
  return L.kind === "blank" || (loose && L.empty && L.kind !== "code");
}

/** Moves an exclusive end back over blank lines (not past start). */
export function trimEnd(o: Outline, start: number, end: number, loose = false): number {
  while (end > start && isBlank(o, end - 1, loose)) end--;
  return end;
}

/** The deepest section containing line i (the section itself for its heading line). */
export function sectionAt(o: Outline, i: number): Section {
  let s = o.root;
  for (;;) {
    const c = s.children.find(x => x.line <= i && i < x.end);
    if (!c) return s;
    s = c;
  }
}

/** The section's own body lines: [start, end). */
export function bodyRange(o: Outline, s: Section): [number, number] {
  return [s === o.root ? o.bodyStart : s.line + 1, s.bodyEnd];
}

export function blocksOf(o: Outline, s: Section): Block[] {
  let bs = o.blockCache.get(s);
  if (!bs) {
    const [a, b] = bodyRange(o, s);
    bs = splitBlocks(o, a, b, 0);
    o.blockCache.set(s, bs);
  }
  return bs;
}

/** The blocks inside a callout / quote (its lists, paragraphs, code), at the quote's depth. */
export function innerBlocks(o: Outline, b: Block): Block[] {
  let bs = o.innerCache.get(b);
  if (!bs) {
    bs = b.kind === "quote" ? splitBlocks(o, b.start, b.end, o.info[b.start]!.qd) : [];
    o.innerCache.set(b, bs);
  }
  return bs;
}

/** Every list in a section's body, including lists inside its callouts. */
export function listsOf(o: Outline, s: Section): Block[] {
  const out: Block[] = [];
  for (const b of blocksOf(o, s)) {
    if (b.kind === "list") out.push(b);
    else if (b.kind === "quote") out.push(...innerBlocks(o, b).filter(x => x.kind === "list"));
  }
  return out;
}

/** Splits lines [s, e) at quote depth q into blocks separated by blank lines. */
function splitBlocks(o: Outline, s: number, e: number, q: number): Block[] {
  const { info, texts } = o;
  const loose = q > 0;
  const blank = (i: number) => isBlank(o, i, loose);
  const out: Block[] = [];
  const isTable = (i: number) =>
    info[i]!.kind === "text" && info[i]!.qd === q && texts[i]!.slice(info[i]!.pre).trimStart().startsWith("|");
  // a quote indented under a list item belongs to the item
  const inItemQuote = (i: number) => q === 0 && info[i]!.qd > 0 && info[i]!.qcol > 0;
  const indentOf = (i: number) => {
    const L = info[i]!;
    if (inItemQuote(i)) return L.qcol;
    return L.kind === "code" ? L.fenceCol : L.col;
  };
  let i = s;
  while (i < e) {
    const L = info[i]!;
    if (blank(i)) {
      i++;
      continue;
    }
    let j = i + 1;
    let kind: BlockKind;
    if (L.qd > q) {
      kind = "quote";
      while (j < e && info[j]!.qd > q && info[j]!.kind !== "blank") j++;
    } else if (L.kind === "code") {
      kind = "code";
      while (j < e && info[j]!.fence === L.fence) j++;
    } else if (L.kind === "item") {
      kind = "list";
      while (j < e) {
        const M = info[j]!;
        if (blank(j)) {
          let k = j;
          while (k < e && blank(k)) k++;
          const continues =
            k < e &&
            (info[k]!.qd === q || inItemQuote(k)) &&
            info[k]!.kind !== "heading" &&
            (info[k]!.kind === "item" || indentOf(k) > 0);
          if (!continues) break;
          j = k;
          continue;
        }
        if (M.kind === "heading" || (M.qd !== q && !inItemQuote(j))) break;
        if (M.kind === "item" || indentOf(j) > 0) {
          j++;
          continue;
        }
        // lazy continuation: unindented text right after a list line
        if (M.kind === "text" && !blank(j - 1)) {
          j++;
          continue;
        }
        break;
      }
    } else if (isTable(i)) {
      kind = "table";
      while (j < e && isTable(j)) j++;
    } else if (L.kind === "hr") {
      kind = "hr";
    } else {
      kind = "para";
      while (j < e && info[j]!.kind === "text" && info[j]!.qd === q && !blank(j) && !isTable(j)) j++;
      // `---` straight under a paragraph is its setext underline: keep them together
      if (j < e && info[j]!.kind === "hr" && /^-+\s*$/.test(texts[j]!.slice(info[j]!.pre).trim())) j++;
    }
    out.push({ start: i, end: trimEnd(o, i, j, loose), kind, q });
    i = j;
  }
  return out;
}

/** The list block's tree, as a virtual root (line -1) whose children are the top-level items. */
export function itemsOf(o: Outline, b: Block): Item {
  let r = o.itemCache.get(b);
  if (r) return r;
  const { info } = o;
  const q = b.q;
  const root: Item = {
    line: -1,
    col: -1,
    cc: 0,
    depth: -1,
    end: b.end,
    ownEnd: b.end,
    parent: null,
    children: [],
  };
  const stack: Item[] = [root];
  const all: Item[] = [];
  const top = () => stack[stack.length - 1]!;
  let prevBlank = false;
  for (let i = b.start; i < b.end; i++) {
    const L = info[i]!;
    if (isBlank(o, i, true)) {
      prevBlank = true;
      continue;
    }
    if (L.kind === "item" && L.qd === q) {
      while (stack.length > 1 && top().cc > L.col) stack.pop()!.end = i;
      const parent = top();
      const it: Item = {
        line: i,
        col: L.col,
        cc: L.cc,
        depth: stack.length - 1,
        end: b.end,
        ownEnd: b.end,
        parent,
        children: [],
      };
      parent.children.push(it);
      all.push(it);
      stack.push(it);
    } else if (prevBlank && !(L.kind === "code" && info[i - 1]?.fence === L.fence)) {
      // a line after a blank belongs to the innermost item it's indented under
      const col = L.qd > q ? L.qcol : L.kind === "code" ? L.fenceCol : L.col;
      while (stack.length > 1 && top().cc > col) stack.pop()!.end = i;
    }
    prevBlank = false;
  }
  for (const it of all) {
    it.end = trimEnd(o, it.line, it.end, true);
    it.ownEnd = trimEnd(o, it.line, it.children[0]?.line ?? it.end, true);
  }
  r = root;
  o.itemCache.set(b, r);
  return r;
}

/** Every item of a list tree in document order. */
export function flatItems(root: Item): Item[] {
  const out: Item[] = [];
  const walk = (it: Item) => {
    for (const c of it.children) {
      out.push(c);
      walk(c);
    }
  };
  walk(root);
  return out;
}

export interface Location {
  section: Section;
  /** On the section's heading line. */
  onHeading: boolean;
  /** The body block (a callout counts as one block). */
  block: Block | null;
  /** The list the line is in: the block itself, or a list inside the callout. */
  list: Block | null;
  /** The deepest list item containing the line. */
  item: Item | null;
}

export function locate(o: Outline, i: number): Location | null {
  if (i < o.bodyStart || i >= o.texts.length) return null;
  const section = sectionAt(o, i);
  if (section !== o.root && section.line === i)
    return { section, onHeading: true, block: null, list: null, item: null };
  const block = blocksOf(o, section).find(b => b.start <= i && i < b.end) ?? null;
  let list: Block | null = null;
  if (block?.kind === "list") list = block;
  else if (block?.kind === "quote")
    list = innerBlocks(o, block).find(b => b.kind === "list" && b.start <= i && i < b.end) ?? null;
  let item: Item | null = null;
  if (list) {
    let cur = itemsOf(o, list);
    for (;;) {
      const c = cur.children.find(x => x.line <= i && i < x.end);
      if (!c) break;
      cur = c;
    }
    if (cur.line >= 0) item = cur;
  }
  return { section, onHeading: false, block, list, item };
}

/**
 * The smallest run of whole siblings covering nodes a and b (b after a): [a] or [b] when one contains the
 * other, else the children of their lowest common ancestor from a's branch to b's.
 */
export function siblingRun<T extends { parent: T | null; children: T[] }>(a: T, b: T): T[] {
  const chainA: T[] = [];
  for (let x: T | null = a; x; x = x.parent) chainA.push(x);
  let prevB: T | null = null;
  let x: T | null = b;
  while (x && !chainA.includes(x)) {
    prevB = x;
    x = x.parent;
  }
  if (!x || x === a || !prevB) return [x === b ? b : a];
  const prevA = chainA[chainA.indexOf(x) - 1]!;
  const sibs = x.children;
  return sibs.slice(sibs.indexOf(prevA), sibs.indexOf(prevB) + 1);
}
