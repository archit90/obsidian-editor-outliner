# Outline mode: hand tests

Editor Outliner hand tests (SPEC.md → Verification status → manual checklist), one section per stage. Each case: what to do → what should happen. Try them in a normal tab, in Source mode, in a Canvas card, and in an Editor Multiple Lanes card when that plugin is installed. Ctrl+Z after each case should undo it in one step. Moves are Ctrl+↑ / ↓ (Cmd+↑ / ↓ on macOS), Expand selection Alt+↑ / ↓, Shrink Alt+Shift+↑ / ↓.

## Stage A: multi-block items

### A1. Insert code block in item

- Put the cursor anywhere on this item's lines (also on the continuation line below) and run "Editor Outliner: Insert code block in item" from the palette.
  This continuation line belongs to the item.
    - child item
- Expect: a fence pair appears right after "This continuation line…", before "child item", indented 2 spaces, no blank lines around it, cursor on the empty line inside. The child stays a child.

### A2. Insert Dataview query in item

- parent
    - Nested item: run "Insert Dataview query in item" here, type LIST FROM "" LIMIT 3 on the empty line, then move the cursor away.
- Expect: the fence opens with dataview, is indented 6 spaces, and (with the Dataview plugin) Live Preview renders a list of 3 notes inside the nested item. Reading view renders it too.
- On a plain paragraph line (like the intro above) the two commands are not in the palette.

### A3. Dataview query already in a nested item

- top
    - nested item with a query:
      ```dataview
      LIST FROM "" LIMIT 3
      ```
    - sibling after it
- Expect (with the Dataview plugin): renders as a 3-note list in Live Preview and Reading view, inside "nested item with a query". Ctrl+↑ on "sibling after it" swaps it above the query item; the query moves with its item.

### A4. Expand selection: paragraph and code steps

- First paragraph of this item,
  still the first paragraph.

  Second paragraph of the same item.
  ```js
  function f() {
      return 1;
  }
  ```
    - a child
- Cursor in "still": Alt+↑ repeatedly → word → sentence/line text → line → both lines of the first paragraph (marker line included) → the whole item's own lines (up to the closing fence) → item with child → whole list …
- Cursor in "Second": Alt+↑ reaches just that paragraph line before the item's own lines.
- Cursor in "return": Alt+↑ → word → line text → line → the three code lines → the code block with its fence lines → the item's own lines.
- Alt+Shift+↑ (Shrink up) walks back through the same steps.

### A5. Enter in a code block in an item

- Code:
  ```py
  def g():
      x = 1
  ```
- Cursor at the end of "x = 1", Enter → the new line starts at the same column as "x" (2 + 4 spaces). Cursor at the end of "def g():", Enter → new line at the "def" column (2 spaces). Then type: it stays inside the code block in the item.

### A6. Copy out of a code block strips the item indent

- Select the three lines of the py block above (or the whole block with its fence lines), Ctrl+C, paste into a new note → the code starts at column 0 ("def g():" with no leading spaces, "x = 1" indented 4).
- Ctrl+X on the same selection: same clipboard text, the lines are removed.
- Copying part of a single code line is unchanged.

### A7. Paste into a code block adds the item indent

Copy the two code lines of this block (not in a list):

```py
for i in range(3):
    print(i)
```

- Put the cursor at the end of "def g():" in A5's block, Enter (the new line starts at column 2, the item indent), Ctrl+V → "for…" at column 2, "print(i)" at column 6 (the item's 2 + its own 4). The block still renders inside the item. (Pasted at an already-indented spot, the first line goes at the cursor as is and only the later lines get the item indent, like a plain paste.)
- Paste from a web page (HTML on the clipboard) into the same spot → same result, no Markdown conversion.

### A8. Tab / Shift+Tab / move keep the code's own whitespace

- item one
- item two with code (the second code line has a tab, the third mixes a tab and spaces):
  ```text
  plain
  	tabbed
   	  mixed
  ```
- Cursor on "item two…", Tab → it becomes a child of "item one"; the fence and code lines gain exactly the item's extra indent; "tabbed" still has its tab, "mixed" its space-tab-spaces (check in Source mode). Shift+Tab → back exactly as before. Ctrl+↑ → swaps with "item one", code untouched.

### A9. Callout

> [!note] A callout
> - item in a callout: run "Insert code block in item" → the fence lines start with "> " then 2 spaces.
> - Enter inside that block keeps "> " plus the indent.

## Stage B: outline mode, Enter, Shift+Enter, ending a list

Outline mode is always on: there is no setting, command, hotkey or status bar item for it. It is active while the selection is in a list; elsewhere every key is Obsidian's (or the outliner keys').

### B1. Active vs idle

This paragraph is outside any list: Enter at the end of it is Obsidian's (a new line).

- Cursor here, Enter → a new item (outline mode is active).
  On this continuation line, Enter → a new item too (it belongs to the item above).
- Select from this item down into the paragraph below, Enter → Obsidian's (the selection reaches outside the list).

The empty line above this paragraph is outside the list: Enter there is Obsidian's.

### B2. Enter splits an item

- Put the cursor between "split" and "here", Enter: split here → "split" stays, a new item "here" below it with the cursor at its start.
- Cursor at the end of this line, Enter → an empty item below.
- Cursor at the very start of this text, Enter → an empty item appears above; the cursor stays before "Cursor".

### B3. Children: unfolded vs folded

- parent: cursor after "parent", Enter → the new item becomes the FIRST CHILD (above "child one"), indented like the children.
    - child one
    - child two
- folded parent: fold this item first (click its arrow), then cursor after "parent", Enter → the new item is the next SIBLING after the whole folded subtree; the fold stays.
    - hidden child
- next item

### B4. Empty items

- top
    - nested
    - Delete this text so the item is empty, then Enter → it outdents to the "top" level (last child).
- Make this item empty, Enter → another empty item (the list doesn't end). Then Shift+Tab on the empty one → the marker goes, a blank line separates the list from the empty line the cursor is on, outside the list; typing there writes a paragraph. (At the end of a note, Enter on the last empty item does the same.)
- p
    - Empty this item, Enter → another empty sibling below it (it has a sibling after it).
    - sibling after

### B5. Tasks and numbers

- [x] done task: cursor after "done", Enter → the new item is "- [ ] task: …" (an open task).
1. first: cursor at the end, Enter → a new "2." and the items below renumber to 3 and 4.
2. second
3. third

### B6. Continuation paragraphs and code after the cursor

- Cursor right after "move", Enter: move| these words and everything below to the new item.
  This continuation line moves too.
  ```js
  const keep = "the code's own   spacing";
  	if (x) y();
  ```
- Expect: "these words…" starts the new item, the continuation line and the code block follow it at its indent; the code lines keep their own spaces and the tab (check in Source mode). Inside the code block, Enter is still the code Enter (A5).

### B7. Shift+Enter

- Cursor after "line", Shift+Enter: line → a new line indented to this item's text (a continuation line, no new bullet). Shift+Enter again on that empty line → a paragraph break: the empty line stays in the item and the next line is indented too.

### B8. Ending a list in the middle

1. one
2. Empty this item, Shift+Tab → it becomes an empty line with a blank line above and below; "three" stays a list after it (numbered on as Obsidian does: 2).
3. three

### B9. Step-aside

- Type [[ here and press Enter with the link popup open → the popup picks the link (no split).
- In a Live Preview table cell, Enter/Shift+Enter behave as Obsidian's.
- With two cursors (Alt+click), Enter is Obsidian's.

### B10. Canvas cards

Open `_test/manual/Outline canvas.canvas` (or make a canvas with this note as a file card and a text card containing a short list: - a / - b / - c). Double-click a card to edit it:
- B2, B4 (Enter on an empty item, Shift+Tab ending the list) and B7 work in the card the same way.
- Ctrl+Z undoes each in one step; Escape still leaves card editing.

## Stage C: Backspace, Delete, Paste

Outline mode on. Check each in Source mode too (the indent is visible there), and Ctrl+Z after each: one step.

### C1. Backspace merges into the item above

- one
- two: cursor at the start of this item (before "two"), Backspace → this text joins the end of "one" (no space added), the cursor at the join.
- prev
- moves its children along: cursor before "moves", Backspace
    - child A
    - child B
- Expect: "moves…" joins "prev"; child A and child B are now children of "prev" (indented under it).

### C2. Merging into the parent, and the last visible item

- parent
    - first child: cursor before "first", Backspace → joins "parent"; "sibling" stays a child of "parent".
    - sibling
- a
    - b
        - c (deepest)
- joins: cursor before "joins", Backspace → this text joins "c (deepest)", the last item above in the document.

### C3. A blank item above is deleted instead

- keep me
- 
- stay: cursor before "stay", Backspace → the empty item above disappears, this item stays where it is (with its child).
    - its child

### C4. Folded item above

- folded: fold this item first (click its arrow)
    - hidden child
- into the folded item: cursor before "into", Backspace → the text joins "folded: …", the fold stays closed (now hiding nothing new), the cursor stays visible.

### C5. First item and checkboxes

Paragraph above the list.

- nothing: cursor before "nothing", Backspace → nothing happens (the first item never merges into the paragraph above).
- [ ] task: cursor right after the checkbox (before "task"), Backspace → the checkbox goes ("- task…"); Backspace again merges into the item above.

### C6. Ordered lists renumber

1. alpha
2. beta: cursor before "beta", Backspace → joins "alpha"; "gamma" becomes 2.
3. gamma

### C7. Invisible indent: continuation and code lines

- item
  Cursor at the start of this continuation line, Backspace → it joins the end of "item" (no leftover spaces).

  Cursor at the start of this paragraph, Backspace → the empty line above goes; again → joins the line above.
- code
  ```py
  x = 1
  y = 2
      z = 3
  ```
- Cursor before "y", Backspace → "x = 1y = 2" on one line at the item indent. Cursor at the start of "z = 3"'s line (column 0, inside the item indent), Backspace → joins with the line above, "    z = 3" keeps its own 4 spaces. Cursor before "x" (first code line), Backspace → nothing (would glue code to the fence).

### C8. Delete pulls the next item in

- Cursor at the end of this line, Delete →
- this next item joins the line above.
- parent with children: cursor at the end, Delete →
    - first child joins the parent's text
        - its own child becomes a child of the parent
- Fold "parent with children" first and repeat → nothing happens.
- Cursor at the end of the very last item of this list, Delete → nothing (the list never swallows the text after it).

### C9. Delete joins continuation / code lines

- start, cursor at the end of this line, Delete →
  the continuation line joins without its indent.
- code
  ```
  aaa
  	bbb (tab-indented)
  ```
- Cursor at the end of "aaa", Delete → "aaa	bbb…" keeps the tab. Cursor at the end of "bbb…", Delete → nothing (the closing fence).

### C10. Paste a list

Copy these three lines (in Source mode, select them; or from a web page with a bulleted list):

- pasted one
    - pasted child
- [ ] pasted task

- Empty this item (delete its text), cursor on it, Ctrl+V → it is replaced by the three items above.
- target with text: Ctrl+V with the cursor anywhere in this line → the three items come after it as siblings.
- target with children: Ctrl+V → they become its first children (before "existing child").
    - existing child
1. numbered target: Ctrl+V → the pasted top-level items become "2." and "3." (the list stays one numbered list), "pasted child" keeps its "-".
2. last number

### C11. Paste paragraphs and headings

Copy these (from the heading down to "Third paragraph."):

#### A heading
Text under it.

Second paragraph.

Third paragraph.

- item: Ctrl+V here → three new sibling items after it: "#### A heading" (with "Text under it." as its continuation line), "Second paragraph.", "Third paragraph.".

### C12. Paste a code block alone

Copy this block with its fence lines:

```js
function f() {
	return 1;
}
```

- Cursor in the middle of this text, Ctrl+V → the code block appears on the lines after this one, indented 2 spaces (inside this item); "return 1;" keeps its tab.
    - a child: the code goes before it (inside the parent's own lines).

### C13. Plain multi-line text

Copy these two lines:

first plain line
second plain line

- Paste with the cursor right after "here": here → "here" + "first plain line", and "second plain line" on the next line indented to this item's text (no new bullet). A single line pastes as usual.

### C14. Step-aside

- Select a few words here and press Backspace → just deletes them.
- In Vim mode (normal mode), Backspace moves left; in insert mode it merges as above.

### C15. Canvas cards

In the canvas from B10 (file card of this note, and a text card with "- a / - b / - c"): while editing a card, C1 (Backspace before "b" → "ab"), C8 (Delete at the end of "a"), C10 (paste a list into an empty item) and C12 work the same; Ctrl+Z undoes each in one step; Backspace on a selected card (not editing) still deletes the card (Canvas's own).

## Stage D: node selection

Outline mode on for the list cases. "Node selected" means the whole lines are highlighted (no text-selection colour inside).

### D1. Expand reaches a node

- parent
    - put the cursor in "alpha" and press Alt+↑ until this item and its child are highlighted whole
        - child of alpha
    - beta
    - gamma
- after

Pressing Alt+↑ once more selects "parent" with all its children; again → the whole list (still node-selected); again → leaves the list (heading semantics).

### D2. Grow and shrink the run of siblings

From D1's "alpha" node: Alt+↓ → alpha + beta; Alt+↓ → + gamma; Alt+↓ again → the parent ("parent" with all its children). Alt+Shift+↓ takes the bottom edge back step by step (to alpha–gamma, then alpha–beta, then alpha). Starting from "gamma" and pressing Alt+↑ grows upwards instead. ↑ / ↓ alone are the editor's: the cursor moves and the selection goes.

### D3. ← / → like a file tree

On the "alpha" node: ← folds it (shows "…"); ← again selects "parent"; → selects its first child "alpha" (folded); → unfolds it; → selects "child of alpha"; ← on that leaf selects "alpha".

### D4. Escape, Backspace / Delete

- one
- two
    - two's child
- three

Select "two" (Alt+↑ until it and its child are highlighted). Escape → cursor at the start of "two". Select it again, Backspace → "two" and its child are gone, the cursor at "three"; Ctrl+Z brings both back in one step. Delete does the same.

1. first
2. second
3. third

Select "first" (Alt+↑ ×2), Delete → "1. second", "2. third".

### D5. Tab / Shift+Tab / move with a node selection

- x
- y
- z

Select "y" (Alt+↑ ×2), Alt+↓ (y + z), Tab → both become children of "x", still highlighted; Shift+Tab → back; Ctrl+↑ → they move above "x", still highlighted.

### D6. Copy / cut at column 0

- outer
    - copy me
        - nested
          ```
          	code with a tab
          ```

Select "copy me" (node), Ctrl+C, paste in a new note → "- copy me" at column 0, "    - nested" one level in, the code fence 6 spaces in (under "nested") and its tab kept. Ctrl+X instead → the node is removed like Backspace (no empty line left in the list).

### D7. Headings (with the Outliner keys on)

#### D7 first

text

#### D7 second

text

#### D7 third

Cursor in "D7 second", Alt+↑ until its heading and text are highlighted → section node. Alt+↓ → + "D7 third"; ← folds them; → unfolds; Escape → the selection goes (Obsidian's), the cursor at its head. List items are node-selected the same way whenever the Outliner keys setting is on.

### D8. Canvas

In the canvas from B10, while editing the text card ("- a / - b / - c") and the file card: D1–D5 work the same; Escape with a node selection leaves the card, as Obsidian does with any selection.

## Stage E: Canvas and Vim

### E1. Canvas cards get everything

- Open `_test/manual/Outline canvas.canvas`. Double-click the text card (left) to edit it, then the file card (right).
- Expect in both: heading guides left of the text, faint H1/H2/H8 labels, the H8 line styled like a small H6, and every key of the stages above.
- Ctrl+P → "Editor Outliner: Indent…" acts on the card.

### E2. Drag handles on Canvas, zoomed

- Zoom the canvas in (Ctrl+scroll) and out. Hover a list item in an edited card: the handle appears left of the fold arrow, inside the card.
- Drag item "c" above "a": it moves; drag sideways to change its depth. The canvas doesn't pan and the card doesn't move.
- Start a drag and press Escape: nothing moves and the card stays in editing.

### E3. Vim mode (Settings → Editor → Vim key bindings; turn it off again afterwards)

- Normal mode on "- ab": Enter moves down, Backspace moves left, Delete deletes a character (all vim's; no merges).
- `V` then `j` on the list below: a vim visual selection, with no whole-line node highlight.
- `i`, then Enter / Backspace at an item's start / paste a list: outline mode's rules. Alt+↑ three times gives a node selection (highlight); Escape goes back to normal mode.

- a
    - b
- c

## Stage F: elsewhere

### F1. Inline code and block delimiters

A line that mentions `%%`, `$$` or `<!--` in inline code opens no comment, math or HTML block:

#### F1 heading after the line above

- Expect: this H4 has its level label and its heading guide; Ctrl+↑ on it moves only this section.

### F2. Other notes to try

- `_test/manual/Headings.md`: H1–H7 sections, code and comments that hide `#` lines, a setext title.
- `_test/manual/Nested lists.md`: tabs, spaces, ordered lists, tasks with continuation lines, a loose list, a callout list.
- `_test/manual/Mixed.md`: paragraphs, a list, code, a table, a quote and a rule as body blocks.
- `_test/manual/Long outline.md`: 20 chapters of sections and lists, for moves, folding and the guides in a long note.

### F3. A popout window, macOS and mobile

- Move this note to a popout window: the keys and the drag handles (with Escape) work there too.
- macOS: Cmd+↑ / ↓ moves an item, a heading section and a paragraph; in frontmatter it still goes to the document start / end.
- Mobile (no drag handles): outline-mode keys with a hardware keyboard; the toolbar's indent / outdent buttons move items and headings with their children.
