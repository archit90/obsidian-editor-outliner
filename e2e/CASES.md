# Editor Outliner: end-to-end cases

Generated from `cases.mjs` (outline mode, groups M … X) and `cases-deep.mjs` (everything else, groups KI … WH; `TEST-CASES.md` is their catalogue with statuses) by `node e2e/run.mjs --catalogue`; edit the cases there. `run.mjs` runs them in a real Obsidian (see its header). Results of the last run: `results.md`.

Notation:
- `|` is the cursor; `⟦` … `⟧` a selection from its anchor `⟦` to its head `⟧` (brackets would clash with task boxes and links). A case with a table writes the cursor as `‸`. Several `|` are several cursors.
- Keys are CodeMirror-style names sent as real key events (`Shift-Tab`, `Alt-Shift-ArrowUp`, `Ctrl-z`); paste / copy / cut are ClipboardEvents with a DataTransfer on the editor's content, unless the keys say `Ctrl-v` / `Ctrl-c`.
- Expected `= Obsidian` means: the same text and selection as the same keys with outline mode off (the key steps aside). `unchanged` means the setup text and selection stay.
- Unless a case says otherwise: outline mode on, Live Preview and Source mode, in an Editor Lanes card, Obsidian set to indent with tabs (tab size 4). Cases marked *everywhere* also run in a normal tab and in Canvas text and file cards.
- After every case whose text changed (outline mode on, one key), one `Ctrl-z` must restore the setup text (the `~undo` result).
- Source: the SPEC.md line (section 7) or the Logseq rule (editor.cljs / paste.cljs) the expectation comes from.

| Group | Cases |
|---|---|
| Enter | 19 |
| Enter on an empty item | 12 |
| Enter with continuation paragraphs and code | 17 |
| Shift+Enter | 13 |
| Shift+Tab ending a list | 14 |
| Backspace | 28 |
| Backspace: the invisible item indent | 17 |
| Delete | 19 |
| Paste | 45 |
| Multi-block items and code-indent rules | 37 |
| Node selection | 48 |
| Move / indent / outdent with nested children | 31 |
| Folding interplay | 14 |
| Ordered lists and tasks | 19 |
| Callouts and quotes | 11 |
| Tab- vs space-indented lists | 9 |
| Loose lists (blank lines between items) | 6 |
| Undo | 9 |
| Step-aside | 22 |
| Edge cases of the note | 15 |
| Indent / outdent outside outline mode | 28 |
| Move outside outline mode | 25 |
| Expand / shrink selection | 35 |
| Node selection: headings and details | 11 |
| Folding commands | 14 |
| Heading guides, level labels and H7+ styling | 13 |
| Drag handles (real mouse drags) | 15 |
| Where it works and settings | 9 |
| Vim mode: the outliner keys | 8 |
| Item node selection: more cases | 16 |
| **Total** | 579 |

## Enter

### E1. Split in the middle of the text

When: *everywhere*.

Setup:
````
- one t|wo
- three
````

Keys: Enter

Expected: 
````
- one t
- |wo
- three
````

Source: SPEC.md §7 Outline mode → Enter; Logseq editor.cljs keydown-new-block / insert-new-block!

### E2. Spaces around the split go


Setup:
````
- one | two
````

Keys: Enter

Expected: 
````
- one
- |two
````

Source: SPEC.md §7 Outline mode → Enter; Logseq editor.cljs keydown-new-block / insert-new-block!

### E3. At the end: an empty next sibling


Setup:
````
- a|
- b
````

Keys: Enter

Expected: 
````
- a
- |
- b
````

Source: SPEC.md §7 Outline mode → Enter; Logseq editor.cljs keydown-new-block / insert-new-block!

### E4. A selection within the line is replaced


Setup:
````
- ab⟦cd⟧ef
````

Keys: Enter

Expected: 
````
- ab
- |ef
````

Source: SPEC.md §7 Outline mode → Enter; Logseq editor.cljs keydown-new-block / insert-new-block!

### E5. At the start of a non-empty item: an empty item above, the cursor stays


Setup:
````
- a
- |b
	- c
````

Keys: Enter

Expected: 
````
- a
- 
- |b
	- c
````

Source: SPEC.md §7 Outline mode → Enter; Logseq editor.cljs keydown-new-block / insert-new-block!

### E6. In the marker counts as the start


Setup:
````
|- b
````

Keys: Enter

Expected: 
````
- 
- |b
````

Source: SPEC.md §7 Outline mode → Enter; Logseq editor.cljs keydown-new-block / insert-new-block!

### E7. Unfolded children: the new item is the first child


Setup:
````
- a|b
	- c
	- d
- e
````

Keys: Enter

Expected: 
````
- a
	- |b
	- c
	- d
- e
````

Source: SPEC.md §7 Outline mode → Enter (unfolded children); Logseq: has children and not collapsed → first child

### E8. The first child takes the children's bullet (numbered)


Setup:
````
- a|
	1. x
	2. y
````

Keys: Enter

Expected: 
````
- a
	1. |
	2. x
	3. y
````

Source: SPEC.md §7 Outline mode → Enter; Logseq editor.cljs keydown-new-block / insert-new-block!

### E9. The first child takes the children's bullet (*)


Setup:
````
1. a|
	* x
````

Keys: Enter

Expected: 
````
1. a
	* |
	* x
````

Source: SPEC.md §7 Outline mode → Enter; Logseq editor.cljs keydown-new-block / insert-new-block!

### E10. Bullet character * kept


Setup:
````
* a|
````

Keys: Enter

Expected: 
````
* a
* |
````

Source: SPEC.md §7 Outline mode → Enter; Logseq editor.cljs keydown-new-block / insert-new-block!

### E11. Bullet + and its wide gap kept


Setup:
````
+   a|
````

Keys: Enter

Expected: 
````
+   a
+   |
````

Source: SPEC.md §7 Outline mode → Enter; Logseq editor.cljs keydown-new-block / insert-new-block!

### E12. Nested tab-indented item: sibling at its indent


Setup:
````
- p
	- a|
- q
````

Keys: Enter

Expected: 
````
- p
	- a
	- |
- q
````

Source: SPEC.md §7 Outline mode → Enter; Logseq editor.cljs keydown-new-block / insert-new-block!

### E13. Space-indented list keeps spaces in an editor set to tabs


Setup:
````
- p
    - a|b
        - c
````

Keys: Enter

Expected: 
````
- p
    - a
        - |b
        - c
````

Source: SPEC.md §7 Outline mode → Enter; Logseq editor.cljs keydown-new-block / insert-new-block!

### E14. At the start of an item with children: empty item above


Setup:
````
- |a
	- c
````

Keys: Enter

Expected: 
````
- 
- |a
	- c
````

Source: SPEC.md §7 Outline mode → Enter; Logseq editor.cljs keydown-new-block / insert-new-block!

### E15. Trailing spaces before the cursor go


Setup:
````
- a   |
````

Keys: Enter

Expected: 
````
- a
- |
````

Source: SPEC.md §7 Outline mode → Enter; Logseq editor.cljs keydown-new-block / insert-new-block!

### E16. Unicode text and an emoji


Setup:
````
- héllo wörld 日本|語 🎉
````

Keys: Enter

Expected: 
````
- héllo wörld 日本
- |語 🎉
````

Source: SPEC.md §7 Outline mode → Enter; Logseq editor.cljs keydown-new-block / insert-new-block!

### E17. Very deep nesting (8 levels)


Setup:
````
- 1
	- 2
		- 3
			- 4
				- 5
					- 6
						- 7
							- 8|
````

Keys: Enter

Expected: 
````
- 1
	- 2
		- 3
			- 4
				- 5
					- 6
						- 7
							- 8
							- |
````

Source: SPEC.md §7 Outline mode → Enter; Logseq editor.cljs keydown-new-block / insert-new-block!

### E18. Item only a marker, the whole note: Enter ends the list


Setup:
````
- |
````

Keys: Enter

Expected: 
````
|
````

Source: SPEC.md §7 Outline mode → Enter (the last empty top-level item ends the list)

### E19. At the end of a note: Enter on a nested empty item outdents it, the next Enter leaves the list


Setup:
````
- a
	- |
````

Keys: Enter, Enter, x

Expected: 
````
- a

x|
````

Source: SPEC.md §7 Outline mode → Enter (the last empty top-level item ends the list)

## Enter on an empty item

### EE1. Nested last child: outdents

When: *everywhere*.

Setup:
````
- p
	- a
	- |
- q
````

Keys: Enter

Expected: 
````
- p
	- a
- |
- q
````

Source: SPEC.md §7 Outline mode → Enter (Empty item); Logseq: keydown-new-block on a blank block (outdent / new block)

### EE2. Deeper nested last child: one level out


Setup:
````
- p
	- a
		- |
````

Keys: Enter

Expected: 
````
- p
	- a
	- |
````

Source: SPEC.md §7 Outline mode → Enter (Empty item); Logseq: keydown-new-block on a blank block (outdent / new block)

### EE3. Nested empty task outdents, keeps its box


Setup:
````
- p
	- [ ] |
````

Keys: Enter

Expected: 
````
- p
- [ ] |
````

Source: SPEC.md §7 Outline mode → Enter (Empty item); Logseq: keydown-new-block on a blank block (outdent / new block)

### EE4. Logical outdenting: a last child lands the same

When: settings {"logicalOutdent":true}.

Setup:
````
- p
	- |
- q
````

Keys: Enter

Expected: 
````
- p
- |
- q
````

Source: SPEC.md §7 Outline mode → Enter (Empty item); Logseq: keydown-new-block on a blank block (outdent / new block)

### EE5. Nested with a sibling after: another empty item


Setup:
````
- p
	- |
	- b
````

Keys: Enter

Expected: 
````
- p
	- 
	- |
	- b
````

Source: SPEC.md §7 Outline mode → Enter (Empty item); Logseq: keydown-new-block on a blank block (outdent / new block)

### EE6. Top-level with a sibling after: another empty item


Setup:
````
- |
- b
````

Keys: Enter

Expected: 
````
- 
- |
- b
````

Source: SPEC.md §7 Outline mode → Enter (Empty item); Logseq: keydown-new-block on a blank block (outdent / new block)

### EE7. Last top-level item, empty: Enter ends the list (a blank line, then a paragraph line)


Setup:
````
- a
- |
````

Keys: Enter

Expected: 
````
- a

|
````

Source: SPEC.md §7 Outline mode → Enter (Empty item); Logseq: keydown-new-block on a blank block (outdent / new block)

### EE8. Empty item with unfolded children: an empty first child


Setup:
````
- |
	- c
- d
````

Keys: Enter

Expected: 
````
- 
	- |
	- c
- d
````

Source: SPEC.md §7 Outline mode → Enter (Empty item); Logseq: keydown-new-block on a blank block (outdent / new block)

### EE9. Empty nested last child with children outdents with them


Setup:
````
- p
	- |
		- c
````

Keys: Enter

Expected: 
````
- p
- |
	- c
````

Source: SPEC.md §7 Outline mode → Enter (Empty item); Logseq: keydown-new-block on a blank block (outdent / new block)

### EE10. Renumbers after an outdent


Setup:
````
1. a
	1. x
	2. |
2. b
````

Keys: Enter

Expected: 
````
1. a
	1. x
2. |
3. b
````

Source: SPEC.md §7 Outline mode → Enter (Empty item); Logseq: keydown-new-block on a blank block (outdent / new block)

### EE11. Empty task, last top-level: Enter ends the list like any last empty item


Setup:
````
- [ ] |
````

Keys: Enter

Expected: 
````
|
````

Source: SPEC.md §7 Outline mode → Enter (Empty item); Logseq: keydown-new-block on a blank block (outdent / new block)

### EE12. Empty nested item in a callout outdents


Setup:
````
> - p
>   - |
````

Keys: Enter

Expected: 
````
> - p
> - |
````

Source: SPEC.md §7 Outline mode → Enter (Empty item); Logseq: keydown-new-block on a blank block (outdent / new block)

## Enter with continuation paragraphs and code

### EB1. Text after the cursor and the continuation line move


Setup:
````
- one| two
  cont
- b
````

Keys: Enter

Expected: 
````
- one
- |two
  cont
- b
````

Source: SPEC.md §7 Outline mode → Enter (the item's own lines below the cursor move)

### EB2. Moved lines re-indent to a first child's content column


Setup:
````
- a|b
  cont
	- c
````

Keys: Enter

Expected: 
````
- a
	- |b
	  cont
	- c
````

Source: SPEC.md §7 Outline mode → Enter (the item's own lines below the cursor move)

### EB3. At the end of the marker line: the next paragraph line becomes the text


Setup:
````
- a|
  cont
  more
````

Keys: Enter

Expected: 
````
- a
- |cont
  more
````

Source: SPEC.md §7 Outline mode → Enter (the item's own lines below the cursor move)

### EB4. Leading blank lines go


Setup:
````
- a|

  second
- b
````

Keys: Enter

Expected: 
````
- a
- |second
- b
````

Source: SPEC.md §7 Outline mode → Enter (the item's own lines below the cursor move)

### EB5. Split in a continuation line


Setup:
````
- a
  co|nt
  more
````

Keys: Enter

Expected: 
````
- a
  co
- |nt
  more
````

Source: SPEC.md §7 Outline mode → Enter (the item's own lines below the cursor move)

### EB6. At the start of a continuation line: it and the rest move


Setup:
````
- a
  |cont
````

Keys: Enter

Expected: 
````
- a
- |cont
````

Source: SPEC.md §7 Outline mode → Enter (the item's own lines below the cursor move)

### EB7. In the item indent of a continuation line counts as its start


Setup:
````
- a
|  cont
````

Keys: Enter

Expected: 
````
- a
- |cont
````

Source: SPEC.md §7 Outline mode → Enter (the item's own lines below the cursor move)

### EB8. A later paragraph moves, its blank line dropped


Setup:
````
- a

  |second
  more
````

Keys: Enter

Expected: 
````
- a
- |second
  more
````

Source: SPEC.md §7 Outline mode → Enter (the item's own lines below the cursor move)

### EB9. A code block after the cursor moves, its whitespace byte for byte


Setup:
````
- a|
  ```js
  if (x)
  	  y();

  ```
- b
````

Keys: Enter

Expected: 
````
- a
- |
  ```js
  if (x)
  	  y();

  ```
- b
````

Source: SPEC.md §7 Outline mode → Enter (the item's own lines below the cursor move)

### EB10. Code moving into a first child gains the child's indent


Setup:
````
- a|b
  ```
    x
  ```
	- c
````

Keys: Enter

Expected: 
````
- a
	- |b
	  ```
	    x
	  ```
	- c
````

Source: SPEC.md §7 Outline mode → Enter (the item's own lines below the cursor move)

### EB11. A code block before the cursor stays


Setup:
````
- a
  ```
  x
  ```
  af|ter
````

Keys: Enter

Expected: 
````
- a
  ```
  x
  ```
  af
- |ter
````

Source: SPEC.md §7 Outline mode → Enter (the item's own lines below the cursor move)

### EB12. In a code block in an item: the code Enter (item indent kept)


Setup:
````
- a
  ```
  x|
  ```
````

Keys: Enter

Expected: 
````
- a
  ```
  x
  |
  ```
````

Source: SPEC.md §7 Multi-block items → Code-indent rules → Enter

### EB13. On an opening fence line: the code Enter


Setup:
````
- a
  ```|
  ```
````

Keys: Enter

Expected: 
````
- a
  ```
  |
  ```
````

Source: SPEC.md §7 Multi-block items → Code-indent rules → Enter

### EB14. A whitespace line left by Shift+Enter goes from the first part


Setup:
````
- a
  |
- b
````

Keys: Enter

Expected: 
````
- a
- |
- b
````

Source: SPEC.md §7 Outline mode → Enter (the item's own lines below the cursor move)

### EB15. Task: continuation re-indents to the content column after the bullet


Setup:
````
- [ ] a|b
  cont
	- c
````

Keys: Enter

Expected: 
````
- [ ] a
	- [ ] |b
	  cont
	- c
````

Source: SPEC.md §7 Outline mode → Enter (the item's own lines below the cursor move)

### EB16. $$ math in an item: Enter steps aside


Setup:
````
- a
  $$
  x|
  $$
````

Keys: Enter

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (Enter steps aside on a code, $$ or %% line)

### EB17. %% comment in an item: Enter steps aside


Setup:
````
- a
  %%
  x|
  %%
````

Keys: Enter

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (Enter steps aside on a code, $$ or %% line)

## Shift+Enter

### SE1. New line in the same item at its content column

When: *everywhere*.

Setup:
````
- one| two
- b
````

Keys: Shift-Enter

Expected: 
````
- one
  |two
- b
````

Source: SPEC.md §7 Outline mode → Shift+Enter; Logseq: soft line break in the same block

### SE2. Ordered item: content column after the number


Setup:
````
1. a|
````

Keys: Shift-Enter

Expected: 
````
1. a
   |
````

Source: SPEC.md §7 Outline mode → Shift+Enter; Logseq: soft line break in the same block

### SE3. Nested tab-indented item


Setup:
````
- p
	- a|
````

Keys: Shift-Enter

Expected: 
````
- p
	- a
	  |
````

Source: SPEC.md §7 Outline mode → Shift+Enter; Logseq: soft line break in the same block

### SE4. On an empty continuation line: a paragraph break


Setup:
````
- a
  |
````

Keys: Shift-Enter

Expected: 
````
- a
  
  |
````

Source: SPEC.md §7 Outline mode → Shift+Enter; Logseq: soft line break in the same block

### SE5. In a continuation line


Setup:
````
- a
  b|c
````

Keys: Shift-Enter

Expected: 
````
- a
  b
  |c
````

Source: SPEC.md §7 Outline mode → Shift+Enter; Logseq: soft line break in the same block

### SE6. Typing after it stays in the item


Setup:
````
- a|
- b
````

Keys: Shift-Enter, type "more"

Expected: 
````
- a
  more|
- b
````

Source: SPEC.md §7 Outline mode → Shift+Enter; Logseq: soft line break in the same block

### SE7. Shift+Enter then Enter: the whitespace line goes, a new item


Setup:
````
- a|
````

Keys: Shift-Enter, Enter

Expected: 
````
- a
- |
````

Source: SPEC.md §7 Outline mode → Shift+Enter; Logseq: soft line break in the same block

### SE8. Task: content column after the bullet


Setup:
````
- [ ] a|
````

Keys: Shift-Enter

Expected: 
````
- [ ] a
  |
````

Source: SPEC.md §7 Outline mode → Shift+Enter; Logseq: soft line break in the same block

### SE9. Whitespace after the cursor goes


Setup:
````
- a|   b
````

Keys: Shift-Enter

Expected: 
````
- a
  |b
````

Source: SPEC.md §7 Outline mode → Shift+Enter; Logseq: soft line break in the same block

### SE10. Space-indented nested item


Setup:
````
- p
    - a|
````

Keys: Shift-Enter

Expected: 
````
- p
    - a
      |
````

Source: SPEC.md §7 Outline mode → Shift+Enter; Logseq: soft line break in the same block

### SE11. In a code block in an item: steps aside


Setup:
````
- a
  ```
  x|
  ```
````

Keys: Shift-Enter

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Shift+Enter; Logseq: soft line break in the same block

### SE12. Outside lists: Obsidian's


Setup:
````
te|xt
````

Keys: Shift-Enter

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Shift+Enter; Logseq: soft line break in the same block

### SE13. With children: the new line goes before them (own lines)


Setup:
````
- a|
	- c
````

Keys: Shift-Enter

Expected: 
````
- a
  |
	- c
````

Source: SPEC.md §7 Outline mode → Shift+Enter; Logseq: soft line break in the same block

## Shift+Tab ending a list

### ST1. Empty last top-level item becomes an empty paragraph line, a blank line after the list

When: *everywhere*.

Setup:
````
- a
- |
````

Keys: Shift-Tab

Expected: 
````
- a

|
````

Source: SPEC.md §7 Outline mode → Shift+Tab on an empty top-level item ends the list

### ST2. Empty task


Setup:
````
- a
- [ ] |
````

Keys: Shift-Tab

Expected: 
````
- a

|
````

Source: SPEC.md §7 Outline mode → Shift+Tab on an empty top-level item ends the list

### ST3. In the middle: blank lines around it, the items after stay a list (numbered as Obsidian does)


Setup:
````
1. one
2. |
3. three
````

Keys: Shift-Tab

Expected: 
````
1. one

|

2. three
````

Obsidian numbers a list on across blank lines, and the plugin numbers as Obsidian does.

Source: SPEC.md §7 Outline mode → Shift+Tab on an empty top-level item ends the list

### ST4. First item: a blank line before the items after it


Setup:
````
- |
- b
````

Keys: Shift-Tab

Expected: 
````
|

- b
````

Source: SPEC.md §7 Outline mode → Shift+Tab on an empty top-level item ends the list

### ST5. Bullets in the middle


Setup:
````
- a
- |
- c
````

Keys: Shift-Tab

Expected: 
````
- a

|

- c
````

Source: SPEC.md §7 Outline mode → Shift+Tab on an empty top-level item ends the list

### ST6. Nested empty item: the outdent, not the end


Setup:
````
- a
	- |
````

Keys: Shift-Tab

Expected: 
````
- a
- |
````

Source: SPEC.md §7 Outline mode → Shift+Tab on an empty top-level item ends the list

### ST7. Non-empty top-level item: nothing (a list stays a list)


Setup:
````
- a
- b|
````

Keys: Shift-Tab

Expected: unchanged

Source: SPEC.md §7 Indent / outdent → A list always stays a list

### ST8. Empty top-level item with children: nothing


Setup:
````
- |
	- c
````

Keys: Shift-Tab

Expected: unchanged

Source: SPEC.md §7 Outline mode → Shift+Tab on an empty top-level item ends the list

### ST9. Typing after ending the list writes a paragraph outside it


Setup:
````
- a
- |
````

Keys: Shift-Tab, type "x"

Expected: 
````
- a

x|
````

Source: SPEC.md §7 Outline mode → Shift+Tab on an empty top-level item ends the list

### ST10. Enter after ending the list is Obsidian's


Setup:
````
- a
- |
````

Keys: Shift-Tab, Enter

Expected: 
````
- a


|
````

Source: SPEC.md §7 Outline mode → Shift+Tab on an empty top-level item ends the list

### ST13. Loose list (a blank line already there): no second blank line


Setup:
````
- a

- |
````

Keys: Shift-Tab

Expected: 
````
- a

|
````

Source: SPEC.md §7 Outline mode → Shift+Tab on an empty top-level item ends the list

### ST14. Typing after ending a list in the middle: a paragraph, the rest still a list


Setup:
````
- a
- |
- c
````

Keys: Shift-Tab, type "x"

Expected: 
````
- a

x|

- c
````

Source: SPEC.md §7 Outline mode → Shift+Tab on an empty top-level item ends the list

### ST15. Blank line already below: none added


Setup:
````
- a
- |

- c
````

Keys: Shift-Tab

Expected: 
````
- a

|

- c
````

Source: SPEC.md §7 Outline mode → Shift+Tab on an empty top-level item ends the list

### ST11. Blank line between items: Shift+Tab never reaches Obsidian's outdent


Setup:
````
- p
	- a
|
	- b
````

Keys: Shift-Tab

Expected: unchanged

Source: SPEC.md §7 Indent / outdent → A list always stays a list

## Backspace

### B1. At the start of an item: merges into the previous sibling

When: *everywhere*.

Setup:
````
- one
- |two
````

Keys: Backspace

Expected: 
````
- one|two
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B2. From the start of the marker


Setup:
````
- one
|- two
````

Keys: Backspace

Expected: 
````
- one|two
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B3. From inside a child's indent: merges into the parent


Setup:
````
- one
	|- two
````

Keys: Backspace

Expected: 
````
- one|two
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B4. First child merges into its parent


Setup:
````
- p
	- |c
	- d
````

Keys: Backspace

Expected: 
````
- p|c
	- d
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B5. Into the last visible descendant of the previous sibling


Setup:
````
- a
	- b
		- c
- |d
````

Keys: Backspace

Expected: 
````
- a
	- b
		- c|d
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B6. Its children become the target's, after its own


Setup:
````
- a
	- b
- |c
	- d
	- e
````

Keys: Backspace

Expected: 
````
- a
	- b|c
		- d
		- e
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B7. Merging into the parent: the children go where the item was


Setup:
````
- p
	- |c
		- x
	- d
````

Keys: Backspace

Expected: 
````
- p|c
	- x
	- d
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B8. The children keep their structure


Setup:
````
- a
- |b
	- c
		- d
````

Keys: Backspace

Expected: 
````
- a|b
	- c
		- d
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B9. Continuation paragraphs and code re-indent to the target, code bytes kept


Setup:
````
- a
    - |b
      more

      ```
      	x  y
      ```
````

Keys: Backspace

Expected: 
````
- a|b
  more

  ```
  	x  y
  ```
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B10. A blank previous item is deleted instead


Setup:
````
- a
- 
- |b
	- c
````

Keys: Backspace

Expected: 
````
- a
- |b
	- c
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B11. A blank previous item goes with its blank lines


Setup:
````
- a

- 

- |b
````

Keys: Backspace

Expected: 
````
- a

- |b
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B12. An empty parent isn't deleted: the child merges into it


Setup:
````
- 
	- |b
````

Keys: Backspace

Expected: 
````
- |b
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B13. Blank lines between the two go


Setup:
````
- a

- |b
````

Keys: Backspace

Expected: 
````
- a|b
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B14. First item with text: nothing


Setup:
````
para

- |a
- b
````

Keys: Backspace

Expected: unchanged

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B15. First item, empty, no children: Obsidian's Backspace


Setup:
````
- |
- b
````

Keys: Backspace

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B16. First item, empty, with children: nothing


Setup:
````
- |
	- c
````

Keys: Backspace

Expected: unchanged

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B17. Right after a task's checkbox: the checkbox goes


Setup:
````
- a
- [ ] |b
````

Keys: Backspace

Expected: 
````
- a
- |b
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B18. Checkbox, then a second Backspace merges


Setup:
````
- a
- [ ] |b
````

Keys: Backspace, Backspace

Expected: 
````
- a|b
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B19. Cursor before the checkbox: merges, the checkbox goes


Setup:
````
- a
- |[ ] b
````

Keys: Backspace

Expected: 
````
- a|b
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B20. Target ends with a code block: the text goes on a new line


Setup:
````
- a
  ```
  x
  ```
- |b
````

Keys: Backspace

Expected: 
````
- a
  ```
  x
  ```
  |b
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B21. Target ends with a quote: the text goes on a new line


Setup:
````
- a
  > q
- |b
````

Keys: Backspace

Expected: 
````
- a
  > q
  |b
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B22. Inside the text: Obsidian's


Setup:
````
- a
- b|c
````

Keys: Backspace

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B23. With a selection: Obsidian's


Setup:
````
- a
- ⟦bc⟧
````

Keys: Backspace

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B24. First item of a second list (after a paragraph): nothing


Setup:
````
- a

para

- |b
````

Keys: Backspace

Expected: unchanged

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B25. First item right under a heading: nothing


Setup:
````
# H
- |a
````

Keys: Backspace

Expected: unchanged

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B26. First item after frontmatter: nothing


Setup:
````
---
a: 1
---
- |b
````

Keys: Backspace

Expected: unchanged

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B27. Unicode: merges at the join


Setup:
````
- 日本
- |🎉x
````

Keys: Backspace

Expected: 
````
- 日本|🎉x
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

### B28. Merged item's continuation follows the target's own lines


Setup:
````
- a
  amore
- |b
  bmore
````

Keys: Backspace

Expected: 
````
- a
  amore|b
  bmore
````

Source: SPEC.md §7 Outline mode → Backspace; Logseq editor.cljs keydown-backspace-handler / delete-block!

## Backspace: the invisible item indent

### BI1. Start of a continuation line's text: joins the line above


Setup:
````
- a
  |b
````

Keys: Backspace

Expected: 
````
- a|b
````

Source: SPEC.md §7 Outline mode → Backspace (The item indent is invisible)

### BI2. Anywhere in its indent


Setup:
````
- a
|  b
````

Keys: Backspace

Expected: 
````
- a|b
````

Source: SPEC.md §7 Outline mode → Backspace (The item indent is invisible)

### BI3. Joins a continuation line above


Setup:
````
- a
  x
  |b
````

Keys: Backspace

Expected: 
````
- a
  x|b
````

Source: SPEC.md §7 Outline mode → Backspace (The item indent is invisible)

### BI4. An empty line above (a paragraph break) just goes


Setup:
````
- a

  |b
````

Keys: Backspace

Expected: 
````
- a
  |b
````

Source: SPEC.md §7 Outline mode → Backspace (The item indent is invisible)

### BI5. Code line: joins without the item indent, the code's own kept


Setup:
````
- a
  ```
  x
  |	y
  ```
````

Keys: Backspace

Expected: 
````
- a
  ```
  x|	y
  ```
````

Source: SPEC.md §7 Outline mode → Backspace (The item indent is invisible)

### BI6. Code line's own indentation is text: Obsidian's


Setup:
````
- a
  ```
  x
    |y
  ```
````

Keys: Backspace

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Backspace (The item indent is invisible)

### BI7. First code line: nothing (would glue code to the fence)


Setup:
````
- a
  ```
  |x
  ```
````

Keys: Backspace

Expected: unchanged

Source: SPEC.md §7 Outline mode → Backspace (The item indent is invisible)

### BI8. Closing fence line: nothing


Setup:
````
- a
  ```
  x
  |```
````

Keys: Backspace

Expected: unchanged

Source: SPEC.md §7 Outline mode → Backspace (The item indent is invisible)

### BI9. Opening fence line: nothing


Setup:
````
- a
  |```
  x
  ```
````

Keys: Backspace

Expected: unchanged

Source: SPEC.md §7 Outline mode → Backspace (The item indent is invisible)

### BI10. Continuation right under a code block: nothing


Setup:
````
- a
  ```
  x
  ```
  |after
````

Keys: Backspace

Expected: unchanged

Source: SPEC.md §7 Outline mode → Backspace (The item indent is invisible)

### BI11. Code line after an empty code line: joins it


Setup:
````
- a
  ```

  |x
  ```
````

Keys: Backspace

Expected: 
````
- a
  ```
  |x
  ```
````

Source: SPEC.md §7 Outline mode → Backspace (The item indent is invisible)

### BI12. Past the indent: Obsidian's


Setup:
````
- a
  b|c
````

Keys: Backspace

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Backspace (The item indent is invisible)

### BI13. Whitespace-only line after the item: joins it


Setup:
````
- a
  |
````

Keys: Backspace

Expected: 
````
- a|
````

Source: SPEC.md §7 Outline mode → Backspace (The item indent is invisible)

### BI14. $$ line in an item: Obsidian's


Setup:
````
- a
  $$
  |x
  $$
````

Keys: Backspace

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Backspace (The item indent is invisible)

### BI15. Quote line in the item: steps aside


Setup:
````
- a
  > |q
````

Keys: Backspace

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Backspace (The item indent is invisible)

### BI16. Continuation right under a quote: nothing


Setup:
````
- a
  > q
  |b
````

Keys: Backspace

Expected: unchanged

Source: SPEC.md §7 Outline mode → Backspace (The item indent is invisible)

### BI17. Tab-indented item's continuation


Setup:
````
- p
	- a
	  |b
````

Keys: Backspace

Expected: 
````
- p
	- a|b
````

Source: SPEC.md §7 Outline mode → Backspace (The item indent is invisible)

## Delete

### D1. At the end of an item: the next sibling merges in

When: *everywhere*.

Setup:
````
- one|
- two
````

Keys: Delete

Expected: 
````
- one|two
````

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D2. Children showing: the first child merges in


Setup:
````
- p|
	- c
		- x
	- d
````

Keys: Delete

Expected: 
````
- p|c
	- x
	- d
````

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D3. The next item's children come under this item


Setup:
````
- a|
- b
	- c
````

Keys: Delete

Expected: 
````
- a|b
	- c
````

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D4. Last child pulls in the parent's next sibling and its children


Setup:
````
- a
	- b|
- c
	- d
````

Keys: Delete

Expected: 
````
- a
	- b|c
		- d
````

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D5. Last item of the list: nothing


Setup:
````
- a
- b|

para
````

Keys: Delete

Expected: unchanged

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D6. Last item at the end of the note: nothing


Setup:
````
- a
- b|
````

Keys: Delete

Expected: unchanged

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D7. From the end of the last own line


Setup:
````
- a
  more|
- b
  cont
````

Keys: Delete

Expected: 
````
- a
  more|b
  cont
````

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D8. Elsewhere in the text: Obsidian's


Setup:
````
- a|b
- c
````

Keys: Delete

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D9. End of the marker line with a continuation below: joins it without its indent


Setup:
````
- a|
  b
- c
````

Keys: Delete

Expected: 
````
- a|b
- c
````

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D10. End of a continuation line: joins the next


Setup:
````
- a
  x|
  b
````

Keys: Delete

Expected: 
````
- a
  x|b
````

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D11. An empty line below just goes


Setup:
````
- a|

  b
````

Keys: Delete

Expected: 
````
- a|
  b
````

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D12. Code line: joins the next, its own indent kept


Setup:
````
- a
  ```
  x|
  	 y
  ```
````

Keys: Delete

Expected: 
````
- a
  ```
  x|	 y
  ```
````

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D13. Last code line before the fence: nothing


Setup:
````
- a
  ```
  x|
  ```
  b
````

Keys: Delete

Expected: unchanged

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D14. Marker line before a fence: nothing


Setup:
````
- a|
  ```
  x
  ```
````

Keys: Delete

Expected: unchanged

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D15. Whitespace-only line after the item: nothing


Setup:
````
- a
  |
- b
````

Keys: Delete

Expected: unchanged

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D16. With a selection: Obsidian's


Setup:
````
- ⟦a⟧
- b
````

Keys: Delete

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D17. Blank lines between the items go


Setup:
````
- a|

- b
````

Keys: Delete

Expected: 
````
- a|b
````

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D18. The next item's checkbox goes


Setup:
````
- a|
- [ ] b
````

Keys: Delete

Expected: 
````
- a|b
````

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

### D19. Unicode


Setup:
````
- 日本|
- 🎉
````

Keys: Delete

Expected: 
````
- 日本|🎉
````

Source: SPEC.md §7 Outline mode → Delete; Logseq editor.cljs keydown-delete-handler / delete-and-update

## Paste

### P1. A list replaces an empty item

When: *everywhere*.

Setup:
````
- a
- |
- c
````

Keys: paste (text/plain)

Expected: 
````
- a
- x
- y|
- c
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P2. Next siblings after the subtree, wherever the cursor is


Setup:
````
- a|bc
- d
````

Keys: paste (text/plain)

Expected: 
````
- abc
- x
	- y|
- d
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P3. Cursor at the start: still after the item


Setup:
````
- |abc
````

Keys: paste (text/plain)

Expected: 
````
- abc
- x|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P4. Unfolded children: the pasted items become the first children


Setup:
````
- p|
	- c
````

Keys: paste (text/plain)

Expected: 
````
- p
	- x
	- y|
	- c
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P5. Empty item with children, one block: replaced, it keeps the children


Setup:
````
- |
	- c
````

Keys: paste (text/plain)

Expected: 
````
- x|
	- c
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P6. Empty item with children, two blocks: they become its first children


Setup:
````
- |
	- c
````

Keys: paste (text/plain)

Expected: 
````
- 
	- x
	- y|
	- c
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P7. The pasted tree re-indents to the target


Setup:
````
- a
	- b|
````

Keys: paste (text/plain)

Expected: 
````
- a
	- b
	- x
		- y
			- z|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P8. Code in pasted items byte for byte beyond the item indent


Setup:
````
- a
	- b|
````

Keys: paste (text/plain)

Expected: 
````
- a
	- b
	- x
	  ```
	  	if (a)  b;
	    c
	  ```|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P9. Top-level items take the target's bullet; checkboxes kept; children keep theirs


Setup:
````
* a|
````

Keys: paste (text/plain)

Expected: 
````
* a
* x
* [ ] y
	+ z|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P10. Into an ordered list: numbered and renumbered


Setup:
````
1. a|
2. b
````

Keys: paste (text/plain)

Expected: 
````
1. a
2. x
3. y|
4. b
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P11. A pasted numbered list becomes items with the bullet target's marker


Setup:
````
- a|
````

Keys: paste (text/plain)

Expected: 
````
- a
- x
- y|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P11b. A pasted 1) list into a numbered list: the target's numbers


Setup:
````
1. a|
2. b
````

Keys: paste (text/plain)

Expected: 
````
1. a
2. x
3. y|
4. b
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P11c. A pasted numbered list replaces an empty item


Setup:
````
- a
- |
````

Keys: paste (text/plain)

Expected: 
````
- a
- x
	1. x1
- y|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P12. Paragraphs separated by blank lines become items


Setup:
````
- a|
````

Keys: paste (text/plain)

Expected: 
````
- a
- one
  two
- three|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P13. A heading becomes an item with its #, a paragraph under it joins it


Setup:
````
- |
````

Keys: paste (text/plain)

Expected: 
````
- # T
  body
- x|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P14. A selection in the line goes first


Setup:
````
- ⟦abc⟧
- d
````

Keys: paste (text/plain)

Expected: 
````
- x|
- d
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P15. Into a callout list


Setup:
````
> - a|
````

Keys: paste (text/plain)

Expected: 
````
> - a
> - x
> 	- y|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P16. Into a lazy (unclean) item: Obsidian's


Setup:
````
- a
lazy|
````

Keys: paste (text/plain)

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P17. Selection across lines: Obsidian's


Setup:
````
- ⟦a
- b⟧
````

Keys: paste (text/plain)

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P18. Outside lists: Obsidian's


Setup:
````
para|
````

Keys: paste (text/plain)

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P19. A code block alone goes into the item, after the cursor's line


Setup:
````
- a|b
	- c
````

Keys: paste (text/plain)

Expected: 
````
- ab
  ```js
    x
  ```|
	- c
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P20. Code alone keeps its indentation relative to its fence


Setup:
````
- a|
````

Keys: paste (text/plain)

Expected: 
````
- a
  ```
  	x
    y
  ```|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P21. Code alone with blank lines around it


Setup:
````
- a|
````

Keys: paste (text/plain)

Expected: 
````
- a
  ```
  x
  ```|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P22. Code alone on a fence line: after the code block


Setup:
````
- a
  ```|
  q
  ```
````

Keys: paste (text/plain)

Expected: 
````
- a
  ```
  q
  ```
  ```
  x
  ```|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P23. One line of plain text: Obsidian's


Setup:
````
- a|
````

Keys: paste (text/plain)

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P24. Multi-line plain text: later lines get the item indent, common indent removed


Setup:
````
- a|b
- c
````

Keys: paste (text/plain)

Expected: 
````
- aone
  two
    three|b
- c
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P25. Plain text replaces a selection in a continuation line


Setup:
````
- a
  x⟦yy⟧z
````

Keys: paste (text/plain)

Expected: 
````
- a
  xone
  two|z
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P26. Plain text with a trailing newline: the cursor on an indented line


Setup:
````
	- a|
````

Keys: paste (text/plain)

Expected: 
````
	- aone
	  two
	  |
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P27. HTML list (browser copy) is converted and becomes items


Setup:
````
- a|
````

Keys: paste (text/plain + text/html)

Expected: 
````
- a
- x
- y|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P28. HTML with Auto convert HTML off: the plain text, multi-line rule

When: Obsidian config {"autoConvertHtml":false}.

Setup:
````
- a|
````

Keys: paste (text/plain + text/html)

Expected: 
````
- ax
  y|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P29. HTML with an image: Obsidian's


Setup:
````
- a|
````

Keys: paste (text/plain + text/html)

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P30. Text/markdown wins over plain text


Setup:
````
- a|
````

Keys: paste (text/plain + text/markdown)

Expected: 
````
- a
- x
- y|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P31. Obsidian's own copy (HTML marked <!-- obsidian -->): its plain text


Setup:
````
- a|
````

Keys: paste (text/plain + text/html)

Expected: 
````
- a
- x
- y|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P32. A URL list: Obsidian's


Setup:
````
- a|
````

Keys: paste (text/plain + text/uri-list)

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P33. CRLF line ends paste like LF


Setup:
````
- a|
````

Keys: paste (text/plain)

Expected: 
````
- a
- x
- y|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P34. On a $$ line: Obsidian's


Setup:
````
- a
  $$|
  x
  $$
````

Keys: paste (text/plain)

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P35. On a fence line, not a code block alone: Obsidian's


Setup:
````
- a
  ```|
  q
  ```
````

Keys: paste (text/plain)

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P36. The whitespace line Shift+Enter left goes


Setup:
````
- a
  |
````

Keys: paste (text/plain)

Expected: 
````
- a
- x|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P37. Real Ctrl+V from the system clipboard


Setup:
````
- a
- |
````

Keys: {"writeClip":"- x\n- y"}, Ctrl-v

Expected: 
````
- a
- x
- y|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P38. A table pasted (one block, no blank line): multi-line text in the item


Setup:
````
- a‸
````

Keys: paste (text/plain)

Expected: 
````
- a| h |
  | --- |
  | c |‸
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P39. In a heading: Obsidian's


Setup:
````
# H|
- a
````

Keys: paste (text/plain)

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P40. Folded target: the items go after its subtree, the fold stays

When: folded lines (0-based) 0.

Setup:
````
- p|
	- c
- d
````

Keys: paste (text/plain)

Expected: 
````
- p
	- c
- x|
- d
````
Folded lines after: 0.

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P41. Multi-line plain text into an empty note: Obsidian's


Setup:
````
|
````

Keys: paste (text/plain)

Expected: = Obsidian

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P42. Pasted tasks keep their state


Setup:
````
- a|
````

Keys: paste (text/plain)

Expected: 
````
- a
- [x] done
- [ ] open|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

### P43. A paragraph and a code block: separate items (code below an empty text line)


Setup:
````
- a|
````

Keys: paste (text/plain)

Expected: 
````
- a
- text
- 
  ```
  x
  ```|
````

Source: SPEC.md §7 Outline mode → Paste; Logseq paste.cljs paste-text-or-blocks-aux / editor.cljs paste-blocks

## Multi-block items and code-indent rules

### MB1. Insert code block in item: after the item's own lines, before children

When: *everywhere*.

Setup:
````
- a|
	- c
````

Keys: command editor-outliner:insert-code-block

Expected: 
````
- a
  ```
  |
  ```
	- c
````

Source: SPEC.md §7 Multi-block items

### MB2. Insert Dataview query in a nested item


Setup:
````
- p
	- a|
````

Keys: command editor-outliner:insert-dataview

Expected: 
````
- p
	- a
	  ```dataview
	  |
	  ```
````

Source: SPEC.md §7 Multi-block items

### MB3. Insert from a continuation line


Setup:
````
- a
  co|nt
	- c
````

Keys: command editor-outliner:insert-code-block

Expected: 
````
- a
  cont
  ```
  |
  ```
	- c
````

Source: SPEC.md §7 Multi-block items

### MB4. Insert in an ordered item: numbered as Obsidian does


Setup:
````
1. a|
2. b
````

Keys: command editor-outliner:insert-code-block

Expected: 
````
1. a
   ```
   |
   ```
1. b
````

Obsidian's numbering reads the empty line of a code block in an item as the end of the list, so the next item starts again at 1 (also when the block is typed by hand); the plugin numbers as Obsidian does.

Source: SPEC.md §7 Indent / outdent → Renumbering (numbered as Obsidian does)

### MB5. Insert in a callout item


Setup:
````
> [!note]
> - a|
````

Keys: command editor-outliner:insert-code-block

Expected: 
````
> [!note]
> - a
>   ```
>   |
>   ```
````

Source: SPEC.md §7 Multi-block items

### MB6. Insert isn't offered outside an item's own lines


Setup:
````
pa|ra
````

Keys: 

Expected: (see checks)
The command's check says it doesn't apply.

Source: SPEC.md §7 Multi-block items

### MB7. Enter in code keeps the item indent plus the code's own indent


Setup:
````
- a
  ```py
  def g():
      x = 1|
  ```
````

Keys: Enter

Expected: 
````
- a
  ```py
  def g():
      x = 1
      |
  ```
````

Source: SPEC.md §7 Multi-block items

### MB8. Enter in code in a tab-indented item


Setup:
````
	- a
	  ```
	  	x|
	  ```
````

Keys: Enter

Expected: 
````
	- a
	  ```
	  	x
	  	|
	  ```
````

Source: SPEC.md §7 Multi-block items

### MB9. Enter in code drops whitespace right after the cursor


Setup:
````
- a
  ```
  x|  y
  ```
````

Keys: Enter

Expected: 
````
- a
  ```
  x
  |y
  ```
````

Source: SPEC.md §7 Multi-block items

### MB10. Enter in code in a callout item keeps > and the indent


Setup:
````
> - a
>   ```
>     x|
>   ```
````

Keys: Enter

Expected: 
````
> - a
>   ```
>     x
>     |
>   ```
````

Source: SPEC.md §7 Multi-block items

### MB12. Enter on a code line below the item indent: the item indent


Setup:
````
- a
  ```
x|
  ```
````

Keys: Enter

Expected: 
````
- a
  ```
x
  |
  ```
````

Source: SPEC.md §7 Multi-block items

### MB13. Copy code lines: the item indent goes


Setup:
````
- a
  ```js
  ⟦let a;
    b();⟧
  ```
````

Keys: copy

Expected: (see checks)
Clipboard text:
````
let a;
  b();
````

Source: SPEC.md §7 Multi-block items

### MB14. Copy the whole block with fences


Setup:
````
- a
  ⟦```js
  let a;
    b();
  ```⟧
````

Keys: copy

Expected: (see checks)
Clipboard text:
````
```js
let a;
  b();
```
````

Source: SPEC.md §7 Multi-block items

### MB15. Copy part of one code line: unchanged


Setup:
````
- a
  ```
  ⟦let⟧ a;
  ```
````

Keys: copy

Expected: (see checks)
Clipboard text:
````
let
````

Source: SPEC.md §7 Multi-block items

### MB16. Cut code lines: same clipboard, the lines go


Setup:
````
- a
  ```js
  ⟦let a;
    b();⟧
  ```
````

Keys: cut

Expected: 
````
- a
  ```js
  |
  ```
````
Clipboard text:
````
let a;
  b();
````

Source: SPEC.md §7 Multi-block items

### MB17. Copy from past the indent: the first line as is


Setup:
````
- a
  ```
  le⟦t a;
    b⟧();
  ```
````

Keys: copy

Expected: (see checks)
Clipboard text:
````
t a;
  b
````

Source: SPEC.md §7 Multi-block items

### MB18. Copy keeps the code's own tabs and spaces


Setup:
````
- a
  ```
  ⟦	 x
   	y⟧
  ```
````

Keys: copy

Expected: (see checks)
Clipboard text:
````
	 x
 	y
````

Source: SPEC.md §7 Multi-block items

### MB19. Copy in a callout: > and the indent go


Setup:
````
> - a
>   ```
>   ⟦x
>     y⟧
>   ```
````

Keys: copy

Expected: (see checks)
Clipboard text:
````
x
  y
````

Source: SPEC.md §7 Multi-block items

### MB21. Real Ctrl+C of code lines


Setup:
````
- a
  ```js
  ⟦let a;
    b();⟧
  ```
````

Keys: Ctrl-c, {"readClip":true}

Expected: (see checks)
Clipboard text:
````
let a;
  b();
````

Source: SPEC.md §7 Multi-block items

### MB22. Paste into code: later lines get the item indent, an empty line none


Setup:
````
- a
  ```
  q|
  ```
````

Keys: paste (text/plain)

Expected: 
````
- a
  ```
  qx
    y

  z|
  ```
````

Source: SPEC.md §7 Multi-block items

### MB23. Paste ending in a newline into code


Setup:
````
- a
  ```
  q|
  ```
````

Keys: paste (text/plain)

Expected: 
````
- a
  ```
  qx
  y
  |
  ```
````

Source: SPEC.md §7 Multi-block items

### MB24. Paste at column 0 inside the indent: the last line gets none

When: Source mode only.

Setup:
````
- a
  ```
|  q
  ```
````

Keys: paste (text/plain)

Expected: 
````
- a
  ```
x
|  q
  ```
````

Source mode: in Live Preview the item indent of a code line is hidden and the cursor never rests in it (MB38).

Source: SPEC.md §7 Multi-block items

### MB26. Paste one line into code: Obsidian's


Setup:
````
- a
  ```
  q|
  ```
````

Keys: paste (text/plain)

Expected: = Obsidian

Source: SPEC.md §7 Multi-block items

### MB27. Paste HTML into code: the plain text, no conversion


Setup:
````
- a
  ```
  q|
  ```
````

Keys: paste (text/plain + text/html)

Expected: 
````
- a
  ```
  qa
  b|
  ```
````

Source: SPEC.md §7 Multi-block items

### MB28. Paste a list into code: still the code rule


Setup:
````
- a
  ```
  q|
  ```
````

Keys: paste (text/plain)

Expected: 
````
- a
  ```
  q- x
  - y|
  ```
````

Source: SPEC.md §7 Multi-block items

### MB29. Paste into code in a callout item


Setup:
````
> - a
>   ```
>   q|
>   ```
````

Keys: paste (text/plain)

Expected: 
````
> - a
>   ```
>   q1
>
>   2|
>   ```
````

Source: SPEC.md §7 Multi-block items

### MB30. Tab on an item with code: the code's own whitespace kept


Setup:
````
- one
- tw|o
  ```
  plain
  	tabbed
   	  mixed
  ```
````

Keys: Tab

Expected: 
````
- one
	- tw|o
	  ```
	  plain
	  	tabbed
	   	  mixed
	  ```
````

Source: SPEC.md §7 Indent / outdent → Whitespace

### MB31. Shift+Tab back: byte for byte as before


Setup:
````
- one
	- tw|o
	  ```
	  plain
	  	tabbed
	   	  mixed
	  ```
````

Keys: Shift-Tab

Expected: 
````
- one
- tw|o
  ```
  plain
  	tabbed
   	  mixed
  ```
````

Source: SPEC.md §7 Indent / outdent → Whitespace

### MB32. Move up with code: untouched


Setup:
````
- one
- tw|o
  ```
  	x
  ```
````

Keys: Ctrl-ArrowUp

Expected: 
````
- tw|o
  ```
  	x
  ```
- one
````

Source: SPEC.md §7 Multi-block items

### MB33. Tab inside a code block in an item: Obsidian's


Setup:
````
- a
  ```
  x|
  ```
````

Keys: Tab

Expected: = Obsidian

Source: SPEC.md §7 Keys (Tab falls through inside code blocks)

### MB34. Shift+Tab in code that would leave the item: nothing


Setup:
````
- a
  ```
  	|x
  ```
````

Keys: Shift-Tab

Expected: unchanged

Source: SPEC.md §7 Indent / outdent (Obsidian's Shift+Tab only while the line stays inside the item)

### MB35. Shift+Tab in code that stays in the item: Obsidian's


Setup:
````
- a
  ```
          |x
  ```
````

Keys: Shift-Tab

Expected: = Obsidian

Source: SPEC.md §7 Indent / outdent

### MB36. Live Preview: a code block in an item sits under the item's text (its item indent hidden)

When: *everywhere*; Live Preview only.

Setup:
````
- a
	- b
	  ```
	  x|x
	  ```
````

Keys: 

Expected: (see checks)
Every line of the block starts where the item's text does.

Source: SPEC.md §7 Multi-block items

### MB37. Source mode: the code block in an item is shown as written

When: Source mode only.

Setup:
````
- a
  ```
  x|x
  ```
````

Keys: 

Expected: (see checks)
No code line is moved or has its indent hidden.

Source: SPEC.md §7 Multi-block items

### MB38. Live Preview, outline mode off: Home twice then typing keeps the item indent (the cursor never rests in it)

When: Live Preview only.

Setup:
````
- a
  ```
  x|x
  ```
````

Keys: Home, Home, Z

Expected: 
````
- a
  ```
  Z|xx
  ```
````

Source: SPEC.md §7 Multi-block items

### MB39. Live Preview: Backspace at a code line's start joins it to the line above

When: Live Preview only.

Setup:
````
- a
  ```
  xx
  |yy
  ```
````

Keys: Backspace

Expected: 
````
- a
  ```
  xx|yy
  ```
````

Source: SPEC.md §7 Multi-block items

### MB40. Live Preview: ← at a code line's start goes to the end of the line above

When: Live Preview only.

Setup:
````
- a
  ```
  xx
  |yy
  ```
````

Keys: ArrowLeft

Expected: 
````
- a
  ```
  xx|
  yy
  ```
````

Source: SPEC.md §7 Multi-block items

## Node selection

### N1. Whole item lines selected by hand: a node selection, highlighted

When: *everywhere*.

Setup:
````
- a
⟦	- b
		- c⟧
- d
````

Keys: 

Expected: (see checks)
Node-selected (highlighted) lines: 1, 2.

Source: SPEC.md §7 Node selection

### N3. The item's own lines without its children: no node selection


Setup:
````
- a
⟦	- b⟧
		- c
- d
````

Keys: 

Expected: (see checks)
Node-selected (highlighted) lines: none.

Source: SPEC.md §7 Node selection

### N4. Selection reaching past the list: none


Setup:
````
⟦- a
- b

para⟧
````

Keys: 

Expected: (see checks)
Node-selected (highlighted) lines: none.

Source: SPEC.md §7 Node selection

### N5. Expand down reaches the node (word → line → item with subtree)


Setup:
````
- parent
	- al|pha
		- child
	- beta
````

Keys: Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown

Expected: 
````
- parent
⟦	- alpha
		- child⟧
	- beta
````
Node-selected (highlighted) lines: 1, 2.

Source: SPEC.md §7 Expand / shrink selection

### N6. Expand up from the first child: at the edge, the parent with its subtree


Setup:
````
- parent
	- al|pha
		- child
	- beta
- after
````

Keys: Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp

Expected: 
````
⟧- parent
	- alpha
		- child
	- beta⟦
- after
````
Node-selected (highlighted) lines: 0, 1, 2, 3.

Source: SPEC.md §7 Expand / shrink selection

### N7. Alt+↓ on a selected item adds the next sibling

When: *everywhere*.

Setup:
````
- a
⟦- b⟧
- c
- d
````

Keys: Alt-ArrowDown

Expected: 
````
- a
⟦- b
- c⟧
- d
````
Node-selected (highlighted) lines: 1, 2.

Source: SPEC.md §7 Node selection

### N8. Alt+↓ past the last sibling: the parent, the whole list


Setup:
````
- a
⟦- b
- c⟧
````

Keys: Alt-ArrowDown

Expected: 
````
⟦- a
- b
- c⟧
````

Source: SPEC.md §7 Node selection

### N9. Alt+Shift+↓ on a hand-made run: the bottom edge back toward the anchor


Setup:
````
- a
⟦- b
- c⟧
- d
````

Keys: Alt-Shift-ArrowDown

Expected: 
````
- a
⟦- b⟧
- c
- d
````
Node-selected (highlighted) lines: 1.

Source: SPEC.md §7 Node selection

### N7b. Plain ↓ with a node selection just moves the cursor (no extending)


Setup:
````
- a
⟦- b⟧
- c
````

Keys: ArrowDown

Expected: 
````
- a
- b|
- c
````

Source: SPEC.md §7 Node selection

### N10. Alt+↑ adds the sibling above


Setup:
````
- a
- b
⟦- c⟧
````

Keys: Alt-ArrowUp

Expected: 
````
- a
⟧- b
- c⟦
````
Node-selected (highlighted) lines: 1, 2.

Source: SPEC.md §7 Node selection

### N11. Alt+↑ at the first sibling: the parent, the whole list


Setup:
````
⟦- a⟧
- b
````

Keys: Alt-ArrowUp

Expected: 
````
⟧- a
- b⟦
````

Source: SPEC.md §7 Node selection

### N12. Alt+↓ over a sibling with a subtree, nested


Setup:
````
- p
⟦	- a
		- a1⟧
	- b
- q
````

Keys: Alt-ArrowDown

Expected: 
````
- p
⟦	- a
		- a1
	- b⟧
- q
````

Source: SPEC.md §7 Node selection

### N13. Alt+Shift+↓ undoes an Alt+↓ step


Setup:
````
- a
⟦- b⟧
- c
````

Keys: Alt-ArrowDown, Alt-Shift-ArrowDown

Expected: 
````
- a
⟦- b⟧
- c
````

Source: SPEC.md §7 Node selection

### N14. ← folds the selected node


Setup:
````
- a
⟦- b
	- c⟧
- d
````

Keys: ArrowLeft

Expected: 
````
- a
- b
	- c
- d
````
Folded lines after: 1.

Source: SPEC.md §7 Node selection

### N15. ← on a leaf: selects the parent


Setup:
````
- p
⟦	- a⟧
- q
````

Keys: ArrowLeft

Expected: 
````
⟦- p
	- a⟧
- q
````

Source: SPEC.md §7 Node selection

### N16. ← on a top-level leaf: nothing


Setup:
````
⟦- a⟧
- b
````

Keys: ArrowLeft

Expected: unchanged

Source: SPEC.md §7 Node selection

### N17. ← on a folded node: selects the parent

When: folded lines (0-based) 1.

Setup:
````
- p
⟦	- a
		- c⟧
- q
````

Keys: ArrowLeft

Expected: 
````
⟦- p
	- a
		- c⟧
- q
````
Folded lines after: 1.

Source: SPEC.md §7 Node selection

### N18. → unfolds a folded node

When: folded lines (0-based) 1.

Setup:
````
- a
⟦- b
	- c⟧
- d
````

Keys: ArrowRight

Expected: 
````
- a
- b
	- c
- d
````
Folded lines after: none.

Source: SPEC.md §7 Node selection

### N19. → selects the first child


Setup:
````
⟦- a
	- b
	- c⟧
````

Keys: ArrowRight

Expected: 
````
- a
⟦	- b⟧
	- c
````

Source: SPEC.md §7 Node selection

### N20. → without children: nothing


Setup:
````
⟦- a⟧
- b
````

Keys: ArrowRight

Expected: unchanged

Source: SPEC.md §7 Node selection

### N21. Escape is Obsidian's: it clears the selection, the cursor at its head

When: in lanes, tab.

Setup:
````
- one
⟦- two
	- c⟧
- three
````

Keys: Escape

Expected: 
````
- one
- two
	- c|
- three
````

In a Canvas card Escape leaves the card (N47); in a hover popover it closes it, as Obsidian does.

Source: SPEC.md §7 Node selection

### N22. Backspace removes the nodes with their subtrees

When: *everywhere*.

Setup:
````
- one
⟦- two
	- c⟧
- three
````

Keys: Backspace

Expected: 
````
- one
- |three
````

Source: SPEC.md §7 Node selection

### N23. Delete removes them too


Setup:
````
- one
⟦- two
	- c⟧
- three
````

Keys: Delete

Expected: 
````
- one
- |three
````

Source: SPEC.md §7 Node selection

### N24. Removing the last sibling: the cursor to the end of the line above


Setup:
````
- a
⟦- b⟧
````

Keys: Backspace

Expected: 
````
- a|
````

Source: SPEC.md §7 Node selection

### N25. Removing the first of an ordered list renumbers


Setup:
````
⟦1. first⟧
2. second
3. third
````

Keys: Delete

Expected: 
````
1. |second
2. third
````

Source: SPEC.md §7 Node selection

### N26. The blank line after the list stays when the last item goes


Setup:
````
- a
⟦- b⟧

para
````

Keys: Backspace

Expected: 
````
- a|

para
````

Source: SPEC.md §7 Node selection

### N27. A whole list between paragraphs takes one blank line with it


Setup:
````
p

⟦- a
- b⟧

q
````

Keys: Backspace

Expected: 
````
p|

q
````

Source: SPEC.md §7 Node selection

### N28. Blank lines before the next sibling go with the node


Setup:
````
- a
⟦- b⟧

- c
````

Keys: Backspace

Expected: 
````
- a
- |c
````

Source: SPEC.md §7 Node selection

### N29. Everything


Setup:
````
⟦- a
- b⟧
````

Keys: Backspace

Expected: 
````
|
````

Source: SPEC.md §7 Node selection

### N30. Copy at column 0


Setup:
````
- outer
⟦	- copy me
		- nested⟧
````

Keys: copy

Expected: (see checks)
Clipboard text:
````
- copy me
	- nested
````

Source: SPEC.md §7 Node selection

### N31. Copy keeps relative indent and code bytes


Setup:
````
- a
⟦    - b
      text
      ```
      	 x
      ```
        - c
    - d⟧
````

Keys: copy

Expected: (see checks)
Clipboard text:
````
- b
  text
  ```
  	 x
  ```
    - c
- d
````

Source: SPEC.md §7 Node selection

### N32. Copy in a callout drops the > prefix


Setup:
````
> [!note]
⟦> - a
>     - b⟧
````

Keys: copy

Expected: (see checks)
Clipboard text:
````
- a
    - b
````

Source: SPEC.md §7 Node selection

### N33. Copy of a selection that took the line break


Setup:
````
- a
⟦- b
⟧- c
````

Keys: copy

Expected: (see checks)
Clipboard text:
````
- b

````

Source: SPEC.md §7 Node selection

### N34. Real Ctrl+C at column 0


Setup:
````
- outer
⟦	- copy me
		- nested⟧
````

Keys: Ctrl-c, {"readClip":true}

Expected: (see checks)
Clipboard text:
````
- copy me
	- nested
````

Source: SPEC.md §7 Node selection

### N35. Cut: the column-0 text, the nodes removed like Backspace


Setup:
````
- one
⟦	- two
		- c⟧
- three
````

Keys: cut

Expected: 
````
- one|
- three
````
Clipboard text:
````
- two
	- c
````

Source: SPEC.md §7 Node selection

### N36. Tab on a node selection: indents, still node-selected


Setup:
````
- x
⟦- y
- z⟧
````

Keys: Tab

Expected: 
````
- x
⟦	- y
	- z⟧
````
Node-selected (highlighted) lines: 1, 2.

Source: SPEC.md §7 Node selection

### N37. Shift+Tab on a node selection


Setup:
````
- x
⟦	- y
	- z⟧
````

Keys: Shift-Tab

Expected: 
````
- x
⟦- y
- z⟧
````
Node-selected (highlighted) lines: 1, 2.

Source: SPEC.md §7 Node selection

### N38. Ctrl+↑ on a node selection: moves, still selected


Setup:
````
- x
⟦- y
- z⟧
````

Keys: Ctrl-ArrowUp

Expected: 
````
⟦- y
- z⟧
- x
````
Node-selected (highlighted) lines: 0, 1.

Source: SPEC.md §7 Node selection

### N39. Typing replaces the selection (Obsidian's)


Setup:
````
- a
⟦- b⟧
- c
````

Keys: type "x"

Expected: 
````
- a
x|
- c
````

Source: SPEC.md §7 Node selection

### N40. Heading section: node selection with the Outliner keys


Setup:
````
#### A

text

⟦#### B

text⟧

#### C

end
````

Keys: 

Expected: (see checks)
Node-selected (highlighted) lines: 4, 5, 6.

Source: SPEC.md §7 Node selection

### N41. Heading: Alt+↓ adds the next section


Setup:
````
#### A

text

⟦#### B

text⟧

#### C

end
````

Keys: Alt-ArrowDown

Expected: 
````
#### A

text

⟦#### B

text

#### C

end⟧
````

Source: SPEC.md §7 Node selection

### N42. Heading ← folds the section


Setup:
````
# A

⟦## B
x⟧

## C
y
````

Keys: ArrowLeft

Expected: (see checks)
Folded lines after: 2.

Source: SPEC.md §7 Node selection

### N43. Heading Backspace removes the section and the blank lines before the next


Setup:
````
# A

⟦## B
x⟧

## C

# D
````

Keys: Backspace

Expected: 
````
# A

## |C

# D
````

Source: SPEC.md §7 Node selection

### N44. Heading Escape: cleared, the cursor at the head


Setup:
````
# A

⟦## B
x⟧

## C
````

Keys: Escape

Expected: 
````
# A

## B
x|

## C
````

Source: SPEC.md §7 Node selection

### N45. Several cursors: the keys step aside


Setup:
````
- a
⟦- b⟧
- c|
````

Keys: Backspace

Expected: = Obsidian

Source: SPEC.md §7 Node selection

### N47. Canvas: Escape with a node selection leaves the card, as with any selection

When: in canvas-text, canvas-file.

Setup:
````
- one
⟦- two⟧
- three
````

Keys: Escape

Expected: (see checks)
The card is no longer being edited.

Source: SPEC.md §7 Node selection

### N48. Node selection in a list under a heading: item nodes


Setup:
````
# A
⟦- x
- y⟧
````

Keys: 

Expected: (see checks)
Node-selected (highlighted) lines: 1, 2.

Source: SPEC.md §7 Node selection

### N49. Expand up from a whole list: its section


Setup:
````
# A
- x|
- y
````

Keys: Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp

Expected: 
````
⟧# A
- x
- y⟦
````
Node-selected (highlighted) lines: 0, 1, 2.

Source: SPEC.md §7 Expand / shrink selection (whole list → section heading + body)

## Move / indent / outdent with nested children

### MV1. Move up an item with children

When: *everywhere*.

Setup:
````
- a
- b
- c|
	- c1
	- c2
- d
- e
````

Keys: Ctrl-ArrowUp

Expected: 
````
- a
- c|
	- c1
	- c2
- b
- d
- e
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV2. Move down an item with children


Setup:
````
- a
- b
- c|
	- c1
	- c2
- d
- e
````

Keys: Ctrl-ArrowDown

Expected: 
````
- a
- b
- d
- c|
	- c1
	- c2
- e
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV3. Indent an item with children

When: *everywhere*.

Setup:
````
- a
- b
- c|
	- c1
	- c2
- d
````

Keys: Tab

Expected: 
````
- a
- b
	- c|
		- c1
		- c2
- d
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV4. First child up: the last child of the parent's previous sibling


Setup:
````
- a
	- a1
- b
	- b1|
	- b2
````

Keys: Ctrl-ArrowUp

Expected: 
````
- a
	- a1
	- b1|
- b
	- b2
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV5. Last child down: the first child of the parent's next sibling


Setup:
````
- a
	- a1|
- b
	- b1
````

Keys: Ctrl-ArrowDown

Expected: 
````
- a
- b
	- a1|
	- b1
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV6. First child up, the previous sibling has no children


Setup:
````
- a
- b
	- b1|
````

Keys: Ctrl-ArrowUp

Expected: 
````
- a
	- b1|
- b
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV7. First child of the first item up: nothing


Setup:
````
- a
	- a1|
	- a2
````

Keys: Ctrl-ArrowUp

Expected: unchanged

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV8. Last child of the last item down: nothing


Setup:
````
- a
- b
	- b1|
````

Keys: Ctrl-ArrowDown

Expected: unchanged

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV9. Grandchild, parent is a first child: up does nothing (no jump further away)


Setup:
````
- x
	- x1
- a
	- a1
		- g|
````

Keys: Ctrl-ArrowUp

Expected: unchanged

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV10. Grandchild, parent is a last child: down does nothing


Setup:
````
- a
	- a1
		- g|
- b
	- b1
````

Keys: Ctrl-ArrowDown

Expected: unchanged

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV11. Nested: 3rd of 5 up


Setup:
````
- p
	- 1
	- 2
	- 3|
		- 3a
	- 4
	- 5
````

Keys: Ctrl-ArrowUp

Expected: 
````
- p
	- 1
	- 3|
		- 3a
	- 2
	- 4
	- 5
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV12. Outdent in place: the following siblings become its children


Setup:
````
- p
	- 1
	- 2
	- 3|
		- 3a
	- 4
	- 5
````

Keys: Shift-Tab

Expected: 
````
- p
	- 1
	- 2
- 3|
	- 3a
	- 4
	- 5
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV13. Logical outdenting: after the parent's subtree

When: settings {"logicalOutdent":true}.

Setup:
````
- p
	- 1
	- 2|
	- 3
````

Keys: Shift-Tab

Expected: 
````
- p
	- 1
	- 3
- 2|
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV14. Move down past a sibling with children


Setup:
````
- a|
- b
	- b1
- c
````

Keys: Ctrl-ArrowDown

Expected: 
````
- b
	- b1
- a|
- c
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV15. Indent matches the existing children's indent


Setup:
````
- a
    - a1
- |b
````

Keys: Tab

Expected: 
````
- a
    - a1
    - |b
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV16. Indent the first item: nothing


Setup:
````
- |a
- b
````

Keys: Tab

Expected: unchanged

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV17. Outdent a top-level item: nothing


Setup:
````
- a
- |b
````

Keys: Shift-Tab

Expected: unchanged

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV18. Alt+PageUp isn't a move key: Obsidian's


Setup:
````
- a
- b|
````

Keys: Alt-PageUp

Expected: = Obsidian

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV19. Move keeps a fold inside the moved node

When: folded lines (0-based) 2.

Setup:
````
- a
- b
- |c
	- c1
````

Keys: Ctrl-ArrowUp

Expected: 
````
- a
- |c
	- c1
- b
````
Folded lines after: 1.

Source: SPEC.md §7 Folding (folds inside moved nodes survive)

### MV20. Indent keeps a fold

When: folded lines (0-based) 1.

Setup:
````
- a
- |b
	- b1
````

Keys: Tab

Expected: 
````
- a
	- |b
		- b1
````
Folded lines after: 1.

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV21. Move up across a blank line keeps it


Setup:
````
- a

- |b
````

Keys: Ctrl-ArrowUp

Expected: 
````
- |b

- a
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV22. Indent renumbers: a one-item list starts at 1


Setup:
````
1. a
2. |b
3. c
````

Keys: Tab

Expected: 
````
1. a
	1. |b
2. c
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV23. Indent in a space-indented list keeps spaces


Setup:
````
- a
    - x
- |b
````

Keys: Tab

Expected: 
````
- a
    - x
    - |b
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV24. Several cursors: Tab is Obsidian's


Setup:
````
- a
- |b
- |c
````

Keys: Tab

Expected: = Obsidian

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV25. Move heading sections


Setup:
````
# A

x

# |B

y
````

Keys: Ctrl-ArrowUp

Expected: 
````
# |B

y

# A

x
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV26. Move a body block


Setup:
````
# H

para1

pa|ra2
````

Keys: Ctrl-ArrowUp

Expected: 
````
# H

pa|ra2

para1
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV27. Tab in a paragraph: Obsidian's


Setup:
````
pa|ra
````

Keys: Tab

Expected: = Obsidian

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV28. Move in a callout


Setup:
````
> - a
> - |b
````

Keys: Ctrl-ArrowUp

Expected: 
````
> - |b
> - a
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV29. Outdent from deep nesting (10 levels)


Setup:
````
- 1
	- 2
		- 3
			- 4
				- 5
					- 6
						- 7
							- 8
								- 9
									- |10
````

Keys: Shift-Tab

Expected: 
````
- 1
	- 2
		- 3
			- 4
				- 5
					- 6
						- 7
							- 8
								- 9
								- |10
````

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV30. Top-level items stop at the list's edge


Setup:
````
para

- |a
- b
````

Keys: Ctrl-ArrowUp

Expected: unchanged

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV31. Shift+Tab with an autocomplete popup open in a list: eaten, no Obsidian outdent


Setup:
````
- p
	- a|
````

Keys: type "[[", wait 400 ms, Shift-Tab

Expected: (see checks)
Text matches `^- p\n\t- a\[\[`.

Source: SPEC.md §7 Indent / outdent → A list always stays a list

## Folding interplay

### F1. Enter on a folded item: the next sibling after its subtree, the fold stays

When: *everywhere*; folded lines (0-based) 0.

Setup:
````
- a|b
	- c
		- c1
- e
````

Keys: Enter

Expected: 
````
- a
	- c
		- c1
- |b
- e
````
Folded lines after: 0.

Source: SPEC.md §7 Outline mode (every key keeps folds) / Enter, Backspace, Delete, Paste on folded items

### F2. Enter on a folded nested item

When: folded lines (0-based) 1.

Setup:
````
- p
	- a|
		- x
	- b
````

Keys: Enter

Expected: 
````
- p
	- a
		- x
	- |
	- b
````
Folded lines after: 1.

Source: SPEC.md §7 Outline mode (every key keeps folds) / Enter, Backspace, Delete, Paste on folded items

### F3. Enter at the start of a folded item: an empty item above, the fold moves along

When: folded lines (0-based) 0.

Setup:
````
- |a
	- c
````

Keys: Enter

Expected: 
````
- 
- |a
	- c
````
Folded lines after: 1.

Source: SPEC.md §7 Outline mode (every key keeps folds) / Enter, Backspace, Delete, Paste on folded items

### F4. Empty nested last child with folded children outdents with them, folded

When: folded lines (0-based) 1.

Setup:
````
- p
	- |
		- c
````

Keys: Enter

Expected: 
````
- p
- |
	- c
````
Folded lines after: 1.

Source: SPEC.md §7 Outline mode (every key keeps folds) / Enter, Backspace, Delete, Paste on folded items

### F5. Empty top-level item with folded children: another empty item after the subtree

When: folded lines (0-based) 0.

Setup:
````
- |
	- c
- d
````

Keys: Enter

Expected: 
````
- 
	- c
- |
- d
````
Folded lines after: 0.

Source: SPEC.md §7 Outline mode (every key keeps folds) / Enter, Backspace, Delete, Paste on folded items

### F6. Backspace merges into a folded previous item, which stays folded

When: folded lines (0-based) 0.

Setup:
````
- a
	- b
- |c
	- d
````

Keys: Backspace

Expected: 
````
- a|c
	- b
	- d
````
Folded lines after: 0.

Source: SPEC.md §7 Outline mode (every key keeps folds) / Enter, Backspace, Delete, Paste on folded items

### F7. Folded previous item with own lines below its marker: nothing

When: folded lines (0-based) 0.

Setup:
````
- a
  more
	- b
- |c
````

Keys: Backspace

Expected: unchanged
Folded lines after: 0.

Source: SPEC.md §7 Outline mode (every key keeps folds) / Enter, Backspace, Delete, Paste on folded items

### F8. Delete on a folded item: nothing

When: folded lines (0-based) 0.

Setup:
````
- p|
	- c
````

Keys: Delete

Expected: unchanged
Folded lines after: 0.

Source: SPEC.md §7 Outline mode (every key keeps folds) / Enter, Backspace, Delete, Paste on folded items

### F9. Delete pulls in a folded next item and its children

When: folded lines (0-based) 1.

Setup:
````
- a|
- b
	- b1
````

Keys: Delete

Expected: 
````
- a|b
	- b1
````

Source: SPEC.md §7 Outline mode (every key keeps folds) / Enter, Backspace, Delete, Paste on folded items

### F10. Enter on another item keeps an unrelated fold

When: folded lines (0-based) 0.

Setup:
````
- a
	- a1
- b|
````

Keys: Enter

Expected: 
````
- a
	- a1
- b
- |
````
Folded lines after: 0.

Source: SPEC.md §7 Outline mode (every key keeps folds) / Enter, Backspace, Delete, Paste on folded items

### F11. Backspace below a folded item keeps the fold

When: folded lines (0-based) 0.

Setup:
````
- a
	- a1
- b
- |c
````

Keys: Backspace

Expected: 
````
- a
	- a1
- b|c
````
Folded lines after: 0.

Source: SPEC.md §7 Outline mode (every key keeps folds) / Enter, Backspace, Delete, Paste on folded items

### F12. Paste of several items after a folded sibling keeps the fold

When: folded lines (0-based) 0.

Setup:
````
- a
	- a1
- b|
````

Keys: paste (text/plain)

Expected: 
````
- a
	- a1
- b
- x
- y|
````
Folded lines after: 0.

Source: SPEC.md §7 Outline mode (every key keeps folds) / Enter, Backspace, Delete, Paste on folded items

### F13. Fold command folds the item at the cursor


Setup:
````
- a|
	- c
````

Keys: command editor-outliner:fold

Expected: (see checks)
Folded lines after: 0.

Source: SPEC.md §7 Folding

### F14. Ctrl+Z after Enter on a folded item restores the text

When: folded lines (0-based) 0.

Setup:
````
- a|b
	- c
- e
````

Keys: Enter, Ctrl-z

Expected: 
````
- ab
	- c
- e
````

Source: SPEC.md §7 Keys (undo restores the text, not folds)

## Ordered lists and tasks

### O1. A task's new item is an open task


Setup:
````
- [x] done| more
````

Keys: Enter

Expected: 
````
- [x] done
- [ ] |more
````

Source: SPEC.md §7 Outline mode → Enter (Marker), renumbering

### O2. A task with children: the first child is a task with the children's bullet


Setup:
````
- [ ] a|
	* x
````

Keys: Enter

Expected: 
````
- [ ] a
	* [ ] |
	* x
````

Source: SPEC.md §7 Outline mode → Enter (Marker), renumbering

### O3. An empty item above a task is an open task


Setup:
````
- [x] |done
````

Keys: Enter

Expected: 
````
- [ ] 
- [x] |done
````

Source: SPEC.md §7 Outline mode → Enter (Marker), renumbering

### O4. Ordered: renumbered after a new item


Setup:
````
1. a|
2. b
3. c
````

Keys: Enter

Expected: 
````
1. a
2. |
3. b
4. c
````

Source: SPEC.md §7 Outline mode → Enter (Marker), renumbering

### O5. Ordered: empty item above, renumbered


Setup:
````
1. a
2. |b
````

Keys: Enter

Expected: 
````
1. a
2. 
3. |b
````

Source: SPEC.md §7 Outline mode → Enter (Marker), renumbering

### O6. 1) style


Setup:
````
3) a|
4) b
````

Keys: Enter

Expected: 
````
3) a
4) |
5) b
````

Source: SPEC.md §7 Outline mode → Enter (Marker), renumbering

### O7. Renumbering past 9 keeps the cursor on the text


Setup:
````
1. x0
2. x1
3. x2
4. x3
5. x4
6. x5
7. x6
8. x7
9. |x8
````

Keys: Enter

Expected: 
````
1. x0
2. x1
3. x2
4. x3
5. x4
6. x5
7. x6
8. x7
9. 
10. |x8
````

Source: SPEC.md §7 Outline mode → Enter (Marker), renumbering

### O8. Backspace merge renumbers


Setup:
````
1. a
2. |b
3. c
````

Keys: Backspace

Expected: 
````
1. a|b
2. c
````

Source: SPEC.md §7 Outline mode → Enter (Marker), renumbering

### O9. Delete merge renumbers


Setup:
````
1. a|
2. b
3. c
````

Keys: Delete

Expected: 
````
1. a|b
2. c
````

Source: SPEC.md §7 Outline mode → Enter (Marker), renumbering

### O10. Task with a done box: Backspace after the box removes it


Setup:
````
- a
- [x] |b
````

Keys: Backspace

Expected: 
````
- a
- |b
````

Source: SPEC.md §7 Outline mode → Enter (Marker), renumbering

### O11. 1. and 1) items count as one list (as in Obsidian)


Setup:
````
1. a
2. b|
3) c
````

Keys: Enter

Expected: 
````
1. a
2. b
3. |
4) c
````

Source: SPEC.md §7 Indent / outdent → Renumbering (numbered as Obsidian does)

### O12. Ordered children: Backspace merge renumbers the children


Setup:
````
1. a
	1. x
2. |b
	1. y
````

Keys: Backspace

Expected: 
````
1. a
	1. x|b
		1. y
````

b merges into the item just above (x), so b's children become x's children.

Source: SPEC.md §7 Outline mode → Enter (Marker), renumbering

### O13. Ordered list starting at 5


Setup:
````
5. a|
6. b
````

Keys: Enter

Expected: 
````
5. a
6. |
7. b
````

Source: SPEC.md §7 Outline mode → Enter (Marker), renumbering

### O14. Move up in a numbered list renumbers


Setup:
````
1. a
2. b|
````

Keys: Ctrl-ArrowUp

Expected: 
````
1. b|
2. a
````

Source: SPEC.md §7 Indent / outdent → Renumbering (numbered as Obsidian does)

### O15. Outdent a numbered child: numbered into the parent list


Setup:
````
1. a
	1. |x
2. b
````

Keys: Shift-Tab

Expected: 
````
1. a
2. |x
3. b
````

Source: SPEC.md §7 Indent / outdent → Renumbering (numbered as Obsidian does)

### O16. Node delete in the middle of a numbered list


Setup:
````
1. a
⟦2. b⟧
3. c
````

Keys: Backspace

Expected: 
````
1. a
2. |c
````

Source: SPEC.md §7 Indent / outdent → Renumbering (numbered as Obsidian does)

### O17. Enter past 9: the marker grows, the cursor stays on the text


Setup:
````
8. a
9. b|
10. c
````

Keys: Enter

Expected: 
````
8. a
9. b
10. |
11. c
````

Source: SPEC.md §7 Indent / outdent → Renumbering (numbered as Obsidian does)

### O18. Merge renumbers a list that starts at 3


Setup:
````
3. a
4. |b
5. c
````

Keys: Backspace

Expected: 
````
3. a|b
4. c
````

Source: SPEC.md §7 Indent / outdent → Renumbering (numbered as Obsidian does)

### O19. Shift+Enter in a numbered item: nothing renumbered


Setup:
````
1. a|
2. b
````

Keys: Shift-Enter

Expected: 
````
1. a
   |
2. b
````

Source: SPEC.md §7 Indent / outdent → Renumbering (numbered as Obsidian does)

## Callouts and quotes

### Q1. Enter in a callout list


Setup:
````
> [!note]
> - a|b
>   cont
````

Keys: Enter

Expected: 
````
> [!note]
> - a
> - |b
>   cont
````

Source: SPEC.md §7 Outline mode (lists in callouts keep the > prefix)

### Q2. Enter at the end of a marker line before a callout paragraph


Setup:
````
> - a|
>
>   second
````

Keys: Enter

Expected: 
````
> - a
> - |second
````

Source: SPEC.md §7 Outline mode (lists in callouts keep the > prefix)

### Q3. Shift+Enter in a callout


Setup:
````
> - a|
````

Keys: Shift-Enter

Expected: 
````
> - a
>   |
````

Source: SPEC.md §7 Outline mode (lists in callouts keep the > prefix)

### Q4. Ending a list in a callout keeps the >


Setup:
````
> [!note]
> - a
> - |
````

Keys: Shift-Tab

Expected: 
````
> [!note]
> - a
>
>|
````

Source: SPEC.md §7 Outline mode (lists in callouts keep the > prefix)

### Q5. Backspace in a callout keeps the prefix


Setup:
````
> - a
> - |b
>   more
````

Keys: Backspace

Expected: 
````
> - a|b
>   more
````

Source: SPEC.md §7 Outline mode (lists in callouts keep the > prefix)

### Q6. Delete in a callout


Setup:
````
> - a|
> - b
````

Keys: Delete

Expected: 
````
> - a|b
````

Source: SPEC.md §7 Outline mode (lists in callouts keep the > prefix)

### Q7. A plain quote's list


Setup:
````
> - a|
````

Keys: Enter

Expected: 
````
> - a
> - |
````

Source: SPEC.md §7 Outline mode (lists in callouts keep the > prefix)

### Q8. Nested quote's list


Setup:
````
> > - a|
````

Keys: Enter

Expected: 
````
> > - a
> > - |
````

Source: SPEC.md §7 Outline mode (lists in callouts keep the > prefix)

### Q9. Enter on a quote line inside an item: steps aside


Setup:
````
- a
  > q|uote
````

Keys: Enter

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (lists in callouts keep the > prefix)

### Q10. Lists separated by a paragraph in a callout are separate: no merge across


Setup:
````
> - a
>
> para
>
> - |b
````

Keys: Backspace

Expected: unchanged

Source: SPEC.md §7 Outline mode (lists in callouts keep the > prefix)

### Q11. Callout nested item Enter at end: sibling


Setup:
````
> [!tip]
> - p
>   - a|
````

Keys: Enter

Expected: 
````
> [!tip]
> - p
>   - a
>   - |
````

Source: SPEC.md §7 Outline mode (lists in callouts keep the > prefix)

## Tab- vs space-indented lists

### W1. Space list: Shift+Enter in a nested item


Setup:
````
- p
    - a|
````

Keys: Shift-Enter

Expected: 
````
- p
    - a
      |
````

Source: SPEC.md §7 Indent / outdent → Whitespace (a list keeps its own style)

### W2. Space list: Backspace re-indents children with spaces


Setup:
````
- a
    - b
- |c
    - d
````

Keys: Backspace

Expected: 
````
- a
    - b|c
        - d
````

Source: SPEC.md §7 Indent / outdent → Whitespace (a list keeps its own style)

### W3. Space list: pasted children take the list's spaces


Setup:
````
- a
    - b|
````

Keys: paste (text/plain)

Expected: 
````
- a
    - b
    - x
        - y|
````

Source: SPEC.md §7 Indent / outdent → Whitespace (a list keeps its own style)

### W4. Editor set to spaces: a new first child uses the children's indent

When: Obsidian config {"useTab":false}.

Setup:
````
- a|b
    - c
````

Keys: Enter

Expected: 
````
- a
    - |b
    - c
````

Source: SPEC.md §7 Indent / outdent → Whitespace (a list keeps its own style)

### W5. Editor set to spaces: a tab list keeps tabs on indent

When: Obsidian config {"useTab":false}.

Setup:
````
- a
	- x
- |b
````

Keys: Tab

Expected: 
````
- a
	- x
	- |b
````

Source: SPEC.md §7 Indent / outdent → Whitespace (a list keeps its own style)

### W6. Editor set to spaces: paste children into a flat list get spaces

When: Obsidian config {"useTab":false}.

Setup:
````
- a|
````

Keys: paste (text/plain)

Expected: 
````
- a
- x
    - y|
````

Source: SPEC.md §7 Indent / outdent → Whitespace (a list keeps its own style)

### W7. Two-space list: Enter keeps two spaces


Setup:
````
- a
  - b|
````

Keys: Enter

Expected: 
````
- a
  - b
  - |
````

Source: SPEC.md §7 Indent / outdent → Whitespace (a list keeps its own style)

### W8. Two-space list: Tab matches the existing indent


Setup:
````
- a
  - x
- |b
````

Keys: Tab

Expected: 
````
- a
  - x
  - |b
````

Source: SPEC.md §7 Indent / outdent → Whitespace (a list keeps its own style)

### W9. Space list: empty nested last child outdents


Setup:
````
- p
    - a
    - |
````

Keys: Enter

Expected: 
````
- p
    - a
- |
````

Source: SPEC.md §7 Indent / outdent → Whitespace (a list keeps its own style)

## Loose lists (blank lines between items)

### L1. Enter at the end of an item in a loose list


Setup:
````
- a|

- b
````

Keys: Enter

Expected: 
````
- a
- |

- b
````

Source: SPEC.md §7 Outline mode (blank lines between items are idle; merges drop them)

### L2. Enter at the end of the last item of a loose list


Setup:
````
- a

- b|
````

Keys: Enter

Expected: 
````
- a

- b
- |
````

Source: SPEC.md §7 Outline mode (blank lines between items are idle; merges drop them)

### L3. Move keeps the blank lines


Setup:
````
- a

- |b

- c
````

Keys: Ctrl-ArrowDown

Expected: 
````
- a

- c

- |b
````

Source: SPEC.md §7 Outline mode (blank lines between items are idle; merges drop them)

### L4. Status on the blank line between loose items: idle


Setup:
````
- a
|
- b
````

Keys: 

Expected: (see checks)

Source: SPEC.md §7 Outline mode (blank lines between items are idle; merges drop them)

### L5. Enter on the blank line between loose items: Obsidian's


Setup:
````
- a
|
- b
````

Keys: Enter

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (blank lines between items are idle; merges drop them)

### L6. Delete across a blank line merges


Setup:
````
- a|


- b
````

Keys: Delete

Expected: 
````
- a|b
````

Source: SPEC.md §7 Outline mode (blank lines between items are idle; merges drop them)

## Undo

### U1. Two Enters, two Ctrl+Z: back to the start


Setup:
````
- a|b
- c
````

Keys: Enter, Enter, Ctrl-z, Ctrl-z

Expected: 
````
- ab
- c
````

Source: SPEC.md §7 Outline mode (every key is one undo step)

### U2. Redo after undo


Setup:
````
- a|b
- c
````

Keys: Enter, Ctrl-z, Ctrl-Shift-z

Expected: 
````
- a
- b
- c
````

Source: SPEC.md §7 Outline mode (every key is one undo step)

### U3. Undo a merge with children


Setup:
````
- a
	- b
- |c
	- d
````

Keys: Backspace, Ctrl-z

Expected: 
````
- a
	- b
- c
	- d
````

Source: SPEC.md §7 Outline mode (every key is one undo step)

### U4. Undo a list paste


Setup:
````
- a|
````

Keys: paste (text/plain), Ctrl-z

Expected: 
````
- a
````

Source: SPEC.md §7 Outline mode (every key is one undo step)

### U5. Undo a node removal


Setup:
````
- one
⟦- two
	- c⟧
- three
````

Keys: Backspace, Ctrl-z

Expected: 
````
- one
- two
	- c
- three
````

Source: SPEC.md §7 Outline mode (every key is one undo step)

### U6. Undo ending a list


Setup:
````
- a
- |
````

Keys: Shift-Tab, Ctrl-z

Expected: 
````
- a
- 
````

Source: SPEC.md §7 Outline mode (every key is one undo step)

### U7. Undo an Enter outdent of an empty item


Setup:
````
- p
	- |
````

Keys: Enter, Ctrl-z

Expected: 
````
- p
	- 
````

Source: SPEC.md §7 Outline mode (every key is one undo step)

### U8. Undo insert code block


Setup:
````
- a|
````

Keys: command editor-outliner:insert-code-block, Ctrl-z

Expected: 
````
- a
````

Source: SPEC.md §7 Outline mode (every key is one undo step)

### U9. Typing right after an Enter joins its undo step (as for Obsidian's own Enter)


Setup:
````
- a|
````

Keys: Enter, type "x", Ctrl-z

Expected: 
````
- a
````

CodeMirror joins typing within 0.5 s to the adjacent change in its history, so one Ctrl+Z undoes the Enter and the typed text together, as with Obsidian's own Enter. Kept by the user's decision.

Source: SPEC.md §7 Outline mode (undo steps)

## Step-aside

### SA1. Autocomplete popup open: Enter picks the suggestion


Setup:
````
- a|
- b
````

Keys: type "[[", wait 400 ms, Enter

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA2. Autocomplete popup open: Shift+Enter is Obsidian's


Setup:
````
- a|
- b
````

Keys: type "[[", wait 400 ms, Shift-Enter

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA3. Several cursors: Enter is Obsidian's


Setup:
````
- a|
	- c|
````

Keys: Enter

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA4. Several cursors: Backspace is Obsidian's


Setup:
````
- a
- |b
- c
- |d
````

Keys: Backspace

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA5. Several cursors: Delete is Obsidian's


Setup:
````
- a|
- b
- c|
- d
````

Keys: Delete

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA6. Several cursors: paste is Obsidian's


Setup:
````
- a|
- b|
````

Keys: paste (text/plain)

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA7. Several cursors: Shift+Tab on empty items isn't the list end


Setup:
````
- a
- |
- b
- |
````

Keys: Shift-Tab

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA8. Read-only editor: nothing changes

When: Live Preview only.

Setup:
````
- a|b
- c
````

Keys: Enter

Expected: = Obsidian
The editor is read-only (harness check).

Obsidian's own Enter (list continuation) ignores the read-only facet and still splits; the plugin must step aside, so the result equals outline mode off.

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA9. Live Preview table cell: Enter is Obsidian's

When: Live Preview only.

Setup:
````
para‸

| h1 | h2 |
| --- | --- |
| - a | b |

end
````

Keys: wait 500 ms, {"click":"const w = cm.dom.querySelector('td .table-cell-wrapper'); w.scrollIntoView({block: 'center'}); await new Promise(r => setTimeout(r, 150)); const r = w.getBoundingClientRect(); return [r.x + r.width - 3, r.y + r.height / 2];"}, (click into the cell, cursor at its end), Enter, wait 200 ms, Escape

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA10. IME composition: Enter steps aside


Setup:
````
- a|
- b
````

Keys: IME composition "か", Enter

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA11. IME composition: Backspace steps aside


Setup:
````
- a
- |b
````

Keys: IME composition "か", Backspace

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA18. Idle in a paragraph: Enter is Obsidian's


Setup:
````
te|xt
````

Keys: Enter

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA19. Idle on the blank line after a list: Enter is Obsidian's


Setup:
````
- a
|
````

Keys: Enter

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA20. Heading line: Enter is Obsidian's


Setup:
````
# He|ading
- a
````

Keys: Enter

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA21. Selection over several lines in a list: Enter is Obsidian's


Setup:
````
- a⟦b
- c⟧d
````

Keys: Enter

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA22. An unclean item (lazy continuation): Enter is Obsidian's


Setup:
````
- a|
lazy
````

Keys: Enter

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA23. Empty note: Enter is Obsidian's


Setup:
````
|
````

Keys: Enter

Expected: = Obsidian

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA24. Empty note: Backspace


Setup:
````
|
````

Keys: Backspace

Expected: unchanged

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA25. Vim normal mode: Backspace is vim's (moves left), no merge

When: Live Preview only; Obsidian config {"vimMode":true}.

Setup:
````
- a
- |b
````

Keys: wait 200 ms, Backspace

Expected: 
````
- a
- b
````

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA26. Vim insert mode: Backspace merges

When: Live Preview only; Obsidian config {"vimMode":true}.

Setup:
````
- a
- |b
````

Keys: wait 200 ms, i, Backspace

Expected: 
````
- a|b
````

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA27. Vim normal mode: Enter is vim's (no split)

When: Live Preview only; Obsidian config {"vimMode":true}.

Setup:
````
- a|b
- c
````

Keys: wait 200 ms, Enter

Expected: 
````
- ab
- c
````

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA28. Changes don't open autocomplete: Enter after [[x]] doesn't pop a suggest


Setup:
````
- [[e2e]]|
````

Keys: Enter

Expected: 
````
- [[e2e]]
- |
````
No suggest popup is open.

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

## Edge cases of the note

### X1. List at the very end of the note with a trailing newline


Setup:
````
para

- a|

````

Keys: Enter

Expected: 
````
para

- a
- |

````

Source: SPEC.md §7 Outline mode

### X2. List at the very start of the note


Setup:
````
- a|

para
````

Keys: Enter

Expected: 
````
- a
- |

para
````

Source: SPEC.md §7 Outline mode

### X3. Frontmatter before the list


Setup:
````
---
title: x
---
- a|
````

Keys: Enter

Expected: 
````
---
title: x
---
- a
- |
````

Source: SPEC.md §7 Outline mode

### X4. List directly under a heading


Setup:
````
# H
- a|
- b
````

Keys: Enter

Expected: 
````
# H
- a
- |
- b
````

Source: SPEC.md §7 Outline mode

### X5. Paste blocks into the first item after frontmatter


Setup:
````
---
a: 1
---
- |
````

Keys: paste (text/plain)

Expected: 
````
---
a: 1
---
- x
- y|
````

Source: SPEC.md §7 Outline mode

### X6. Delete at the end of the last item before a heading: nothing


Setup:
````
- a
- b|
# H
````

Keys: Delete

Expected: unchanged

Source: SPEC.md §7 Outline mode

### X7. Backspace at the start of the first item at the start of the note: nothing


Setup:
````
- |a
- b
````

Keys: Backspace

Expected: unchanged

Source: SPEC.md §7 Outline mode

### X8. Shift+Tab ending the only item of the note


Setup:
````
- |
````

Keys: Shift-Tab

Expected: 
````
|
````

Source: SPEC.md §7 Outline mode

### X9. Item with a link and inline code: split keeps them whole


Setup:
````
- see [[note]] and `co|de`
````

Keys: Enter

Expected: 
````
- see [[note]] and `co
- |de`
````

Source: SPEC.md §7 Outline mode

### X10. Very long item: split in the middle


Setup:
````
- word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word|
````

Keys: Enter

Expected: 
````
- word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word word
- |
````

Source: SPEC.md §7 Outline mode

### X11. Emoji at the split (surrogate pair kept whole)


Setup:
````
- a🎉|b
````

Keys: Enter

Expected: 
````
- a🎉
- |b
````

Source: SPEC.md §7 Outline mode

### X12. Right-to-left text


Setup:
````
- שלום| עולם
````

Keys: Enter

Expected: 
````
- שלום
- |עולם
````

Source: SPEC.md §7 Outline mode

### X13. A list after a code block (not in an item)


Setup:
````
```
- not a list
```
- a|
````

Keys: Enter

Expected: 
````
```
- not a list
```
- a
- |
````

Source: SPEC.md §7 Outline mode

### X14. A dash in a code block outside lists: Enter is Obsidian's


Setup:
````
```
- no|t a list
```
````

Keys: Enter

Expected: = Obsidian

Source: SPEC.md §7 Outline mode

### X15. Setext underline under a list item's paragraph isn't a heading


Setup:
````
- a|

para
---
````

Keys: Enter

Expected: 
````
- a
- |

para
---
````

Source: SPEC.md §7 Outline mode

## Indent / outdent outside outline mode

### KI1. Tab indents an item with its subtree under the previous sibling

When: *everywhere*.

Setup:
````
- a
- b|
	- c
- d
````

Keys: Tab

Expected: 
````
- a
	- b|
		- c
- d
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI2. Shift+Tab outdents in place, the following siblings become its children

When: *everywhere*.

Setup:
````
- a
	- b|
	- c
````

Keys: Shift-Tab

Expected: 
````
- a
- b|
	- c
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI3. Logical outdenting: after the parent's subtree, the siblings stay

When: settings {"logicalOutdent":true}.

Setup:
````
- a
	- b|
	- c
- d
````

Keys: Shift-Tab

Expected: 
````
- a
	- c
- b|
- d
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI4. Shift+Tab on a top-level item: nothing (a list stays a list)


Setup:
````
- a
- b|
````

Keys: Shift-Tab

Expected: unchanged

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI5. Tab on the first item: nothing


Setup:
````
- a|
- b
````

Keys: Tab

Expected: unchanged

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI6. Heading Tab demotes the section, sub-headings too

When: *everywhere*.

Setup:
````
# A
## B|
body
### C
## D
````

Keys: Tab

Expected: 
````
# A
### B|
body
#### C
## D
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI7. Heading Shift+Tab promotes in place: the following siblings become its sub-sections

When: *everywhere*.

Setup:
````
# A
## B
### C|
c
### D
````

Keys: Shift-Tab

Expected: 
````
# A
## B
## C|
c
### D
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI8. Heading Shift+Tab, logical outdenting: after the parent's section

When: settings {"logicalOutdent":true}.

Setup:
````
# A
## B
### C|
c
### D
## E
````

Keys: Shift-Tab

Expected: 
````
# A
## B
### D

## C|
c

## E
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI9. H1 can't be promoted: a notice, nothing changes


Setup:
````
# A|
## B
````

Keys: Shift-Tab

Expected: unchanged
A notice says an H1 can't be outdented.

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI10. H6 demoted to H7: a notice that Obsidian shows it as text


Setup:
````
###### F|
````

Keys: Tab

Expected: 
````
####### F|
````
A notice says the heading is now deeper than H6.

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI11. H7 promoted back to H6: no notice


Setup:
````
####### F|
````

Keys: Shift-Tab

Expected: 
````
###### F|
````
No notice.

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI12. Tab in a body paragraph: Obsidian's


Setup:
````
# H
pa|ra
````

Keys: Tab

Expected: = Obsidian (the same keys with outline mode and the Outliner keys off)

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI13. Shift+Tab in a body paragraph: Obsidian's


Setup:
````
# H
	pa|ra
````

Keys: Shift-Tab

Expected: = Obsidian (the same keys with outline mode and the Outliner keys off)

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI14. Tab in a code block in an item: Obsidian's


Setup:
````
- a
  ```
  co|de
  ```
````

Keys: Tab

Expected: = Obsidian (the same keys with outline mode and the Outliner keys off)

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI15. Selection over a heading and the list above it: headings (the section covering both)


Setup:
````
# A
- ⟦x
## B⟧
b
````

Keys: Tab

Expected: 
````
## A
- ⟦x
### B⟧
b
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI16. Several items selected indent together


Setup:
````
- a
- ⟦b
- c⟧
````

Keys: Tab

Expected: 
````
- a
	- ⟦b
	- c⟧
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI17. A selection from a child to its parent's next sibling acts on the parent's siblings


Setup:
````
- a
- b
	- ⟦x
- c⟧
````

Keys: Tab

Expected: 
````
- a
	- b
		- ⟦x
	- c⟧
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI18. An ordered list renumbers after an indent


Setup:
````
1. a
2. b|
3. c
````

Keys: Tab

Expected: 
````
1. a
	1. b|
2. c
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI19. Indent in a callout keeps the > prefix


Setup:
````
> - a
> - b|
````

Keys: Tab

Expected: 
````
> - a
> 	- b|
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI20. Editor set to spaces: a new child level is 4 spaces

When: Obsidian config {"useTab":false}.

Setup:
````
- a
- b|
````

Keys: Tab

Expected: 
````
- a
    - b|
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI21. Editor set to spaces, tab-indented list: tabs stay

When: Obsidian config {"useTab":false}.

Setup:
````
- a
	- b
- c
- d|
````

Keys: Tab

Expected: 
````
- a
	- b
- c
	- d|
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI22. Indent command from the palette on a heading

When: *everywhere*.

Setup:
````
# A
## B|
````

Keys: command editor-outliner:indent

Expected: 
````
# A
### B|
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI23. Outdent command from the palette on a nested item

When: *everywhere*.

Setup:
````
- a
	- b|
````

Keys: command editor-outliner:outdent

Expected: 
````
- a
- b|
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI24. Outliner keys off: Tab in a list is Obsidian's, the command still indents with the subtree

When: settings {"keys":false}.

Setup:
````
- a
- b|
	- c
````

Keys: command editor-outliner:indent

Expected: 
````
- a
	- b|
		- c
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI25. Several cursors on headings: Tab is Obsidian's


Setup:
````
# A|
# B|
````

Keys: Tab

Expected: = Obsidian (the same keys with outline mode and the Outliner keys off)

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI26. Selection over several lines with its head in an item's code block: the items indent


Setup:
````
- a
- ⟦b
  ```
  co⟧de
  ```
````

Keys: Tab

Expected: 
````
- a
	- ⟦b
	  ```
	  co⟧de
	  ```
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI27. Two Tabs in quick succession: two undo steps


Setup:
````
- a
	- b
- c|
````

Keys: Tab, Tab, Ctrl-z

Expected: 
````
- a
	- b
	- c|
````

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

### KI28. Tab with the [[ autocomplete open in a list: Obsidian's (the popup)


Setup:
````
- a
- b|
````

Keys: type "[[", wait 400 ms, Tab

Expected: (see checks)
Text matches `^- a\n- b\[\[`.

Tab with a suggestion open is Obsidian's: it may accept the suggestion; the list item must not be indented.

Source: SPEC.md §7 → Indent / outdent; Which hierarchy a command acts on

## Move outside outline mode

### KM1. An item moves down past its sibling with its children

When: *everywhere*.

Setup:
````
- a|
	- a1
- b
````

Keys: Ctrl-ArrowDown

Expected: 
````
- b
- a|
	- a1
````

Source: SPEC.md §7 → Move up / down

### KM2. A last child moves down into the parent's next sibling, as its first child


Setup:
````
- a
	- x|
- b
	- y
````

Keys: Ctrl-ArrowDown

Expected: 
````
- a
- b
	- x|
	- y
````

Source: SPEC.md §7 → Move up / down

### KM3. Heading section moves down past its sibling, sub-sections included

When: *everywhere*.

Setup:
````
## A|
a
### A1
## B
b
````

Keys: Ctrl-ArrowDown

Expected: 
````
## B
b

## A|
a
### A1
````

Source: SPEC.md §7 → Move up / down

### KM-C1. Ctrl+↓ (Cmd+↓ on macOS) moves the item at the cursor with its children

When: *everywhere*.

Setup:
````
- a|
	- a1
- b
````

Keys: Ctrl-ArrowDown

Expected: 
````
- b
- a|
	- a1
````

Source: SPEC.md §7 → Move up / down

### KM-C2. Ctrl+↑ moves a heading section up past its sibling


Setup:
````
# A
a

# B|
b
````

Keys: Ctrl-ArrowUp

Expected: 
````
# B|
b

# A
a
````

Source: SPEC.md §7 → Move up / down

### KM-C3. Ctrl+↓ moves a body paragraph past the next block


Setup:
````
# H
para1|

para2
````

Keys: Ctrl-ArrowDown

Expected: 
````
# H
para2

para1|
````

Source: SPEC.md §7 → Move up / down

### KM-C4. Ctrl+↓ with a node selection moves the selected items; the selection follows and stays a node selection

When: *everywhere*.

Setup:
````
- a
- b|
	- b1
- c
````

Keys: Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown, Ctrl-ArrowDown

Expected: 
````
- a
- c
⟦- b
	- b1⟧
````
Node-selected (highlighted) lines: 2, 3.

Source: SPEC.md §7 → Move up / down

### KM-C5. Ctrl+↓ with a text selection over two sibling items moves both whole items


Setup:
````
- a
- ⟦b
- c⟧
- d
````

Keys: Ctrl-ArrowDown

Expected: (see checks)
Text matches `^- a\n- d\n- b\n- c$`.

Source: SPEC.md §7 → Move up / down

### KM-C6. Ctrl+↓ at the last top-level item: nothing


Setup:
````
- a
- b|
````

Keys: Ctrl-ArrowDown

Expected: unchanged

Source: SPEC.md §7 → Move up / down

### KM-C7. Ctrl+↑ in frontmatter: Obsidian's key


Setup:
````
---
a: 1|
---
- x
````

Keys: Ctrl-ArrowUp

Expected: = Obsidian

Source: SPEC.md §7 → Move up / down

### KM4. Heading at its last sibling: nothing (no jump into the parent's sibling)


Setup:
````
# P
## A|
# Q
## B
````

Keys: Ctrl-ArrowDown

Expected: unchanged

Source: SPEC.md §7 → Move up / down

### KM5. Heading moves up past its sibling


Setup:
````
# A
a

# B|
b
````

Keys: Ctrl-ArrowUp

Expected: 
````
# B|
b

# A
a
````

Source: SPEC.md §7 → Move up / down

### KM6. Body paragraph swaps with the next block

When: *everywhere*.

Setup:
````
# H
para1|

para2
````

Keys: Ctrl-ArrowDown

Expected: 
````
# H
para2

para1|
````

Source: SPEC.md §7 → Move up / down

### KM7. Body block at the end of its body: nothing (never past a sub-heading)


Setup:
````
# H
para|
## S
s
````

Keys: Ctrl-ArrowDown

Expected: unchanged

Source: SPEC.md §7 → Move up / down

### KM8. Paragraph swaps with a whole list below it


Setup:
````
# H
para|

- a
- b

end
````

Keys: Ctrl-ArrowDown

Expected: 
````
# H
- a
- b

para|

end
````

Source: SPEC.md §7 → Move up / down

### KM9. Code block in the body moves as one block


Setup:
````
# H
x

```
co|de
```
````

Keys: Ctrl-ArrowUp

Expected: 
````
# H
```
co|de
```

x
````

Source: SPEC.md §7 → Move up / down

### KM10. Table moves as one block

When: Source mode only.

Setup:
````
# H
| a | b |
| - | - |
| 1 | 2‸ |

para
````

Keys: Ctrl-ArrowDown

Expected: 
````
# H
para

| a | b |
| - | - |
| 1 | 2‸ |
````

Source mode: in Live Preview the cursor would be in the table cell's own editor (a nested editor).

Source: SPEC.md §7 → Move up / down

### KM11. Text before the first heading: blocks swap there


Setup:
````
p1|

p2

# H
````

Keys: Ctrl-ArrowDown

Expected: 
````
p2

p1|

# H
````

Source: SPEC.md §7 → Move up / down

### KM12. Alt+PageDown isn't a move key: Obsidian's


Setup:
````
# A|
# B
````

Keys: Alt-PageDown

Expected: = Obsidian

Source: SPEC.md §7 → Move up / down

### KM13. Move keeps a folded sub-section folded

When: folded lines (0-based) 1.

Setup:
````
# A|
## A1
x
# B
````

Keys: Ctrl-ArrowDown

Expected: 
````
# B

# A|
## A1
x
````
Folded lines after: 3.

Source: SPEC.md §7 → Move up / down

### KM14. An item with a continuation paragraph and code moves whole


Setup:
````
- a|

  more
  ```
  c
  ```
- b
````

Keys: Ctrl-ArrowDown

Expected: 
````
- b
- a|

  more
  ```
  c
  ```
````

Source: SPEC.md §7 → Move up / down

### KM15. Move down command from the palette

When: *everywhere*.

Setup:
````
# H
para1|

para2
````

Keys: command editor-outliner:move-down

Expected: 
````
# H
para2

para1|
````

Source: SPEC.md §7 → Move up / down

### KM16. Several cursors: the move keys are Obsidian's


Setup:
````
# A|
# B|
````

Keys: Ctrl-ArrowDown

Expected: = Obsidian (the same keys with outline mode and the Outliner keys off)

Source: SPEC.md §7 → Move up / down

### KM17. Move a heading: one Ctrl+Z restores


Setup:
````
# A|
# B
````

Keys: Ctrl-ArrowDown, Ctrl-z

Expected: 
````
# A|
# B
````

Source: SPEC.md §7 → Move up / down

### KM18. Move in a space-indented list keeps the spaces


Setup:
````
- a
    - x
    - y|
````

Keys: Ctrl-ArrowUp

Expected: 
````
- a
    - y|
    - x
````

Source: SPEC.md §7 → Move up / down

## Expand / shrink selection

### XS1. Word

When: *everywhere*.

Setup:
````
hello wor|ld here
````

Keys: Alt-ArrowDown

Expected: 
````
hello ⟦world⟧ here
````

Source: SPEC.md §7 → Expand / shrink selection

### XS2. Wiki link: inside, then whole


Setup:
````
see [[No|te a]] x
````

Keys: Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown

Expected: 
````
see ⟦[[Note a]]⟧ x
````

Source: SPEC.md §7 → Expand / shrink selection

### XS3. Bold: inside, then whole


Setup:
````
a **bo|ld it** b
````

Keys: Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown

Expected: 
````
a ⟦**bold it**⟧ b
````

Source: SPEC.md §7 → Expand / shrink selection

### XS4. Markdown link: its text, then the whole link


Setup:
````
a [li|nk text](http://x.y) b
````

Keys: Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown

Expected: 
````
a ⟦[link text](http://x.y)⟧ b
````

Source: SPEC.md §7 → Expand / shrink selection

### XS5. Inline code, highlight, strike, math


Setup:
````
`co|de x` ==m y== ~~s z~~ $a b$
````

Keys: Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown

Expected: 
````
⟦`code x`⟧ ==m y== ~~s z~~ $a b$
````

Source: SPEC.md §7 → Expand / shrink selection

### XS6. Sentence


Setup:
````
One two. Th|ree four. Five.
````

Keys: Alt-ArrowDown, Alt-ArrowDown

Expected: 
````
One two. ⟦Three four.⟧ Five.
````

Source: SPEC.md §7 → Expand / shrink selection

### XS7. Line text without the marker, then the whole line


Setup:
````
- item te|xt
- b
````

Keys: Alt-ArrowDown, Alt-ArrowDown

Expected: 
````
- ⟦item text⟧
- b
````

Source: SPEC.md §7 → Expand / shrink selection

### XS8. Item: the paragraph (marker line and continuation lines), then its own lines


Setup:
````
- a
  b|b
  cc

  dd
	- kid
````

Keys: Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown

Expected: 
````
⟦- a
  bb
  cc⟧

  dd
	- kid
````

Source: SPEC.md §7 → Expand / shrink selection

### XS9. Item: own lines, then with its subtree


Setup:
````
- a
  b|b

  dd
	- kid
````

Keys: Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown

Expected: 
````
⟦- a
  bb

  dd
	- kid⟧
````

Source: SPEC.md §7 → Expand / shrink selection

### XS10. Code block in an item: the code lines, then the block with its fences


Setup:
````
- a
  ```
  x|x
  yy
  ```
````

Keys: Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown

Expected: 
````
- a
⟦  ```
  xx
  yy
  ```⟧
````

Source: SPEC.md §7 → Expand / shrink selection

### XS11. Code block in a body: the code lines, then the block with its fences


Setup:
````
# H
```
x|x
yy
```
````

Keys: Alt-ArrowDown, Alt-ArrowDown

Expected: 
````
# H
```
⟦xx
yy⟧
```
````

Consistency with a code block in an item (the spec's chain names the code-lines step for fenced code blocks).

Source: SPEC.md §7 → Expand / shrink selection

### XS12. Paragraph under headings: the paragraph, its section, the parent section, then the note's top level without frontmatter

When: Source mode only.

Setup:
````
---
a: 1
---
intro

# A
## B
b|b
### C
c
## D
````

Keys: Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp

Expected: 
````
---
a: 1
---
⟧intro

# A
## B
bb
### C
c
## D⟦
````

Source: SPEC.md §7 → Expand / shrink selection

### XS13. A paragraph, then (at the edge) its section with the subsections


Setup:
````
# A
## B
b|b
### C
c
## D
````

Keys: Alt-ArrowUp, Alt-ArrowUp

Expected: 
````
# A
⟧## B
bb
### C
c⟦
## D
````

Source: SPEC.md §7 → Expand / shrink selection

### XS14. Shrink goes back step by step


Setup:
````
# A
- one tw|o
````

Keys: Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, Alt-Shift-ArrowDown, Alt-Shift-ArrowDown

Expected: 
````
# A
- one ⟦two⟧
````

Source: SPEC.md §7 → Expand / shrink selection

### XS15. Shrink back to the cursor


Setup:
````
# A
- one tw|o
````

Keys: Alt-ArrowUp, Alt-ArrowUp, Alt-Shift-ArrowDown, Alt-Shift-ArrowDown

Expected: 
````
# A
- one tw|o
````

Source: SPEC.md §7 → Expand / shrink selection

### XS16. Another selection change forgets the steps: Shrink does nothing


Setup:
````
- one tw|o three
````

Keys: Alt-ArrowDown, Alt-ArrowDown, Shift-ArrowLeft, Alt-Shift-ArrowDown

Expected: 
````
- ⟦one two thre⟧e
````

Source: SPEC.md §7 → Expand / shrink selection

### XS17. List in a callout: the item, then at the list's edge the whole list


Setup:
````
> [!note] T
> - a
> - b|
> 
> para
````

Keys: Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown

Expected: 
````
> [!note] T
⟦> - a
> - b⟧
> 
> para
````

Consistency: a list's whole-list step also inside a callout.

Source: SPEC.md §7 → Expand / shrink selection

### XS-S1. Expand up: the item, the sibling above, then at the edge the parent

When: *everywhere*.

Setup:
````
- p
	- a
	- b|
	- c
- q
````

Keys: Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp

Expected: 
````
⟧- p
	- a
	- b
	- c⟦
- q
````

Source: SPEC.md §7 → Expand / shrink selection

### XS-S2. Expand past the siblings reaches the parent; Shrink goes back step by step to the cursor


Setup:
````
- p
	- a
	- b|
	- c
- q
````

Keys: Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, Alt-Shift-ArrowDown, Alt-Shift-ArrowDown, Alt-Shift-ArrowDown, Alt-Shift-ArrowDown

Expected: 
````
- p
	- a
	- b|
	- c
- q
````

Source: SPEC.md §7 → Expand / shrink selection

### XS-S3. Expand up: a heading section, then the section above


Setup:
````
# A
## B
b
## C|
c
# D
````

Keys: Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp

Expected: 
````
# A
⟧## B
b
## C
c⟦
# D
````

Source: SPEC.md §7 → Expand / shrink selection

### XS-S4. Alt+↓ grows the bottom edge, Alt+↑ the top; Alt+Shift+↑ takes the top edge back

When: *everywhere*.

Setup:
````
- p
	- a
	- b|
	- c
- q
````

Keys: Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowUp, Alt-Shift-ArrowUp

Expected: 
````
- p
	- a
⟧	- b
	- c⟦
- q
````

Source: SPEC.md §7 → Expand / shrink selection

### XS-S5. Alt+Shift+↓ with nothing to shrink, or with several cursors: nothing (never Obsidian's copy line)

When: *everywhere*.

Setup:
````
ab|c
de|f
````

Keys: Alt-Shift-ArrowDown, Alt-Shift-ArrowUp

Expected: unchanged

Source: SPEC.md §7 → Expand / shrink selection

### XS-S6. Alt+Shift+↑ with no Expand before it: nothing


Setup:
````
- a|
- b
````

Keys: Alt-Shift-ArrowUp

Expected: unchanged

Source: SPEC.md §7 → Expand / shrink selection

### XS-D1. Alt+↓ through a whole list: the list then counts as one block, so its next sibling comes in

When: *everywhere*.

Setup:
````
para

- a|
- b

end
````

Keys: Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown

Expected: 
````
para

⟦- a
- b

end⟧
````

Source: SPEC.md §7 → Expand / shrink selection

### XS-D2. Alt+↑ stops at the note's top level


Setup:
````
- a|
- b
````

Keys: Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp

Expected: 
````
⟧- a
- b⟦
````

Source: SPEC.md §7 → Expand / shrink selection

### XS-D3. At the edge the parent, then the parent's siblings

When: *everywhere*.

Setup:
````
- p
	- a|
- q
````

Keys: Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowDown

Expected: 
````
⟦- p
	- a
- q⟧
````
Node-selected (highlighted) lines: 0, 1, 2.

Source: SPEC.md §7 → Expand / shrink selection

### XS-D4. Alt+Shift+↑ past a parent step goes back to the run below


Setup:
````
- p
	- a|
- q
````

Keys: Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowDown, Alt-Shift-ArrowUp

Expected: 
````
- p
⟧	- a⟦
- q
````

Source: SPEC.md §7 → Expand / shrink selection

### XS-D5. Shrink retraces to the cursor, then does nothing


Setup:
````
- one tw|o
````

Keys: Alt-ArrowDown, Alt-Shift-ArrowDown, Alt-Shift-ArrowDown

Expected: 
````
- one tw|o
````

Source: SPEC.md §7 → Expand / shrink selection

### XS-D6. Under a heading its blocks and subsections are siblings; at the edge the section


Setup:
````
# A
x|
## B
b
````

Keys: Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown

Expected: 
````
⟦# A
x
## B
b⟧
````

Source: SPEC.md §7 → Expand / shrink selection

### XS-D7. A top-level section: Alt+↑ at the first one stops


Setup:
````
# A
a|
# B
b
````

Keys: Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp

Expected: 
````
⟧# A
a⟦
# B
b
````

Source: SPEC.md §7 → Expand / shrink selection

### XS18. Expand reaches the item, a node selection (highlighted)

When: *everywhere*.

Setup:
````
- a
	- b|
- c
````

Keys: Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp

Expected: 
````
⟧- a
	- b⟦
- c
````
Node-selected (highlighted) lines: 0, 1.

Source: SPEC.md §7 → Expand / shrink selection

### XS19. Expand / Shrink selection down commands from the palette

When: *everywhere*.

Setup:
````
hello wor|ld
````

Keys: command editor-outliner:expand-selection-down, command editor-outliner:expand-selection-down, command editor-outliner:shrink-selection-down

Expected: 
````
hello ⟦world⟧
````

Source: SPEC.md §7 → Expand / shrink selection

### XS20. Several cursors: Alt+↑ is Obsidian's (the cursors stay)


Setup:
````
ab|c
de|f
````

Keys: Alt-ArrowUp

Expected: = Obsidian (the same keys with outline mode and the Outliner keys off)

Source: SPEC.md §7 → Expand / shrink selection

### XS21. Frontmatter: word, line, then nothing more

When: Source mode only.

Setup:
````
---
key: va|lue
---
# H
````

Keys: Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown

Expected: 
````
---
⟦key: value⟧
---
# H
````

Source mode: Live Preview shows frontmatter as the properties editor.

Source: SPEC.md §7 → Expand / shrink selection

### XS22. Paragraph in a callout: the paragraph, then at its edge the callout

When: Source mode only.

Setup:
````
# H
> [!note] T
> one
> tw|o
>
> - x
````

Keys: Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp

Expected: 
````
# H
⟧> [!note] T
> one
> two
>
> - x⟦
````

Source mode: in Live Preview a callout is a widget unless the cursor is in it.

Source: SPEC.md §7 → Expand / shrink selection

## Node selection: headings and details

### NS1. Heading → selects the first sub-section


Setup:
````
# |A
a
## B
b
## C
````

Keys: Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, ArrowRight

Expected: 
````
# A
a
⟦## B
b⟧
## C
````
Node-selected (highlighted) lines: 2, 3.

Source: SPEC.md §7 → Node selection

### NS2. Heading ← on a folded section selects the parent

When: folded lines (0-based) 1.

Setup:
````
# A
⟦## B
b⟧
## C
````

Keys: ArrowLeft

Expected: 
````
⟦# A
## B
b
## C⟧
````

Source: SPEC.md §7 → Node selection

### NS3. Heading node selection made backwards is anchored at the last section: Alt+Shift+↑ takes the first off


Setup:
````
# A
⟧## B
b
## C
c⟦
````

Keys: Alt-Shift-ArrowUp

Expected: 
````
# A
## B
b
⟧## C
c⟦
````
Node-selected (highlighted) lines: 3, 4.

Source: SPEC.md §7 → Node selection

### NS4. Heading copy: the sections as they are


Setup:
````
# A
⟦## B
b
### C⟧
## D
````

Keys: copy

Expected: (see checks)
Clipboard text:
````
## B
b
### C
````

Source: SPEC.md §7 → Node selection

### NS5. Outliner keys off: no heading node selection

When: settings {"keys":false}.

Setup:
````
# A
⟦## B
b⟧
## C
````

Keys: 

Expected: (see checks)
Node-selected (highlighted) lines: none.

Source: SPEC.md §7 → Node selection

### NS6. Heading Tab on a node selection: demoted, still selected


Setup:
````
# A
⟦## B
b⟧
## C
````

Keys: Tab

Expected: 
````
# A
⟦### B
b⟧
## C
````
Node-selected (highlighted) lines: 1, 2.

Source: SPEC.md §7 → Node selection

### NS7. Heading Ctrl+↓ on a node selection: moved, still selected


Setup:
````
# A
⟦## B
b⟧
## C
````

Keys: Ctrl-ArrowDown

Expected: 
````
# A
## C

⟦## B
b⟧
````
Node-selected (highlighted) lines: 3, 4.

Source: SPEC.md §7 → Node selection

### NS8. Heading Delete removes the section


Setup:
````
# A
⟦## B
b⟧

## C
````

Keys: Delete

Expected: 
````
# A
## |C
````

Source: SPEC.md §7 → Node selection

### NS9. Item node selection ending at the start of the next line: Alt+↓ carries on from it


Setup:
````
⟦- a
	- b
⟧- c
````

Keys: Alt-ArrowDown

Expected: 
````
⟦- a
	- b
- c⟧
````
Node-selected (highlighted) lines: 0, 1, 2.

Source: SPEC.md §7 → Node selection

### NS10. Item node selection in Source mode is highlighted too

When: in lanes, tab; Source mode only.

Setup:
````
- a
⟦- b⟧
- c
````

Keys: 

Expected: (see checks)
Node-selected (highlighted) lines: 1.

Source: SPEC.md §7 → Node selection

### NS11. Highlight hides the text selection (class on the editor)

When: *everywhere*.

Setup:
````
- a
⟦- b⟧
- c
````

Keys: 

Expected: (see checks)
The editor has the eo-node-selection class.

Source: SPEC.md §7 → Node selection

## Folding commands

### FC1. Fold the heading at the cursor

When: *everywhere*.

Setup:
````
# A
a|
## B
b
````

Keys: command editor-outliner:fold

Expected: (see checks)
Folded lines after: 0.

Source: SPEC.md §7 → Folding

### FC2. Unfold it

When: *everywhere*; folded lines (0-based) 0.

Setup:
````
# A|
a
## B
b
````

Keys: command editor-outliner:unfold

Expected: (see checks)
Folded lines after: none.

Source: SPEC.md §7 → Folding

### FC3. Fold children of a heading: its sub-sections


Setup:
````
# A|
a
## B
b
## C
c
````

Keys: command editor-outliner:fold-children

Expected: (see checks)
Folded lines after: 2, 4.

Source: SPEC.md §7 → Folding

### FC4. Unfold a heading and everything under it

When: folded lines (0-based) 2, 4.

Setup:
````
# A|
a
## B
b
## C
c
````

Keys: command editor-outliner:unfold-subtree

Expected: (see checks)
Folded lines after: none.

Source: SPEC.md §7 → Folding

### FC5. Fold headings to level 2


Setup:
````
# A
a
## B
b
### B1
x
## C
c
````

Keys: command editor-outliner:fold-to-level-2

Expected: (see checks)
Folded lines after: 2, 6.

Source: SPEC.md §7 → Folding

### FC6. Fold headings to level 1


Setup:
````
# A
a
## B
b
# C
c
````

Keys: command editor-outliner:fold-to-level-1

Expected: (see checks)
Folded lines after: 0, 4.

Source: SPEC.md §7 → Folding

### FC7. Unfold all (an item and a heading folded)

When: folded lines (0-based) 2, 4.

Setup:
````
# A
a
- x
	- y
# C
c
````

Keys: command editor-outliner:unfold-all

Expected: (see checks)
Folded lines after: none.

Source: SPEC.md §7 → Folding

### FC8. Fold a list item at the cursor (the deepest item)


Setup:
````
- a
	- b|
		- c
- d
````

Keys: command editor-outliner:fold

Expected: (see checks)
Folded lines after: 1.

Source: SPEC.md §7 → Folding

### FC9. Fold children of an item


Setup:
````
- a|
	- b
		- c
	- d
		- e
````

Keys: command editor-outliner:fold-children

Expected: (see checks)
Folded lines after: 1, 3.

Source: SPEC.md §7 → Folding

### FC10. H7 can't fold: a notice


Setup:
````
####### A|
x
````

Keys: command editor-outliner:fold

Expected: (see checks)
Folded lines after: none.
A notice says nothing can fold here.

Source: SPEC.md §7 → Folding

### FC11. Fold heading off in Obsidian's settings: a notice

When: Obsidian config {"foldHeading":false}.

Setup:
````
# A|
x
````

Keys: command editor-outliner:fold

Expected: (see checks)
Folded lines after: none.
A notice names the Fold heading setting.

Source: SPEC.md §7 → Folding

### FC12. Text before the first heading, not in a list: a notice, nothing folds


Setup:
````
pa|ra

# A
x
````

Keys: command editor-outliner:fold

Expected: (see checks)
Folded lines after: none.
A notice says nothing can fold here.

Consistency: everywhere else nothing to fold gives the notice.

Source: SPEC.md §7 → Folding

### FC13. Fold children: a leaf item has none, a notice


Setup:
````
- a|
- b
````

Keys: command editor-outliner:fold-children

Expected: (see checks)
Folded lines after: none.
A notice says nothing can fold here.

Source: SPEC.md §7 → Folding

### FC14. Fold an item, then Ctrl+↓ moves it folded

When: folded lines (0-based) 0.

Setup:
````
- a|
	- a1
- b
````

Keys: Ctrl-ArrowDown

Expected: 
````
- b
- a|
	- a1
````
Folded lines after: 1.

Source: SPEC.md §7 → Folding

## Heading guides, level labels and H7+ styling

### G1. One guide per section with content; same depth same x, outermost leftmost, 10px apart

When: *everywhere*.

Setup:
````
# A
a
## B
b
## C
c
### D
d
# E
e
````

Keys: 

Expected: (see checks)
5 guides at 3 x positions, 10 px apart.

Source: SPEC.md §7 → Heading guides; Heading level labels; Outline model (H7+)

### G2. A guide runs from under its heading to the section's last non-blank line


Setup:
````
# A
a

b


# E
````

Keys: 

Expected: (see checks)
The guide's top is the heading line's bottom, its bottom the last non-blank line's bottom.

Source: SPEC.md §7 → Heading guides; Heading level labels; Outline model (H7+)

### G3. Guides use Obsidian's indentation-guide colour


Setup:
````
# A
a
````

Keys: 

Expected: (see checks)
The guide's background is var(--indentation-guide-color).

Source: SPEC.md §7 → Heading guides; Heading level labels; Outline model (H7+)

### G4. Heading guides off: no guides

When: settings {"headingGuides":false}.

Setup:
````
# A
a
````

Keys: 

Expected: (see checks)
No guide.

Source: SPEC.md §7 → Heading guides; Heading level labels; Outline model (H7+)

### G5. Level labels in Live Preview: H2 after a heading off the cursor line, none on it

When: *everywhere*; Live Preview only.

Setup:
````
# A
## B
text|
````

Keys: 

Expected: (see checks)
::after reads H1 and H2.

Source: SPEC.md §7 → Heading guides; Heading level labels; Outline model (H7+)

### G6. No label on the line being edited

When: *everywhere*; Live Preview only.

Setup:
````
# A
## B|
text
````

Keys: 

Expected: (see checks)
::after H1 on line 0, none on the cursor's line.

Source: SPEC.md §7 → Heading guides; Heading level labels; Outline model (H7+)

### G7. No labels in Source mode

When: in lanes, tab; Source mode only.

Setup:
````
# A
## B
text|
````

Keys: 

Expected: (see checks)
No ::after content.

Source: SPEC.md §7 → Heading guides; Heading level labels; Outline model (H7+)

### G8. H7+ lines: styled as a heading, labelled H7 / H9

When: *everywhere*; Live Preview only.

Setup:
````
####### Seven
######### Nine
text|
````

Keys: 

Expected: (see checks)
eo-deep-heading on both, labels H7 and H9.

Source: SPEC.md §7 → Heading guides; Heading level labels; Outline model (H7+)

### G9. Style headings beyond H6 off: no H7 styling (the label stays)

When: Live Preview only; settings {"deepHeadings":false}.

Setup:
````
####### Seven
text|
````

Keys: 

Expected: (see checks)
No eo-deep-heading class; ::after H7.

Source: SPEC.md §7 → Heading guides; Heading level labels; Outline model (H7+)

### G10. Heading level labels off: none

When: Live Preview only; settings {"levelLabels":false}.

Setup:
````
# A
text|
````

Keys: 

Expected: (see checks)
No ::after content.

Source: SPEC.md §7 → Heading guides; Heading level labels; Outline model (H7+)

### G11. Not headings: setext, in a callout, in code, 4-space indented

When: in lanes, tab; Source mode only.

Setup:
````
Setext
===

> # In callout

```
# in code
```

    # indented

text|
````

Keys: 

Expected: (see checks)
No line has the plugin's heading classes.

Source: SPEC.md §7 → Heading guides; Heading level labels; Outline model (H7+)

### G12. Typing a # turns a line into a heading: label and guide follow

When: Live Preview only.

Setup:
````
a|
b
````

Keys: Home, type "# ", ArrowDown

Expected: (see checks)
Line 0 is labelled H1 and has a guide.

Source: SPEC.md §7 → Heading guides; Heading level labels; Outline model (H7+)

### G13. The label is not selectable and not part of the text

When: Live Preview only.

Setup:
````
# A
text|
````

Keys: 

Expected: (see checks)
user-select none; the line's text is unchanged.

Source: SPEC.md §7 → Heading guides; Heading level labels; Outline model (H7+)

## Drag handles (real mouse drags)

### DG1. Drag an item down, straight: same depth

When: in lanes, tab, canvas-text, canvas-file.

Setup:
````
- a|
- b
- c
````

Keys: drag line 0 by its handle to before line 2

Expected: 
````
- b
- a
- c
````

Source: SPEC.md §7 → Drag handles

### DG2. Drag an item sideways right: it becomes a child

When: in lanes, tab, canvas-text, canvas-file.

Setup:
````
- a|
- b
- c
````

Keys: drag line 2 by its handle to before line 3, 60px sideways

Expected: 
````
- a
- b
	- c
````

Source: SPEC.md §7 → Drag handles

### DG3. Drag an item with children: the subtree moves


Setup:
````
- a|
	- a1
- b
````

Keys: drag line 0 by its handle to before line 3

Expected: 
````
- b
- a
	- a1
````

Source: SPEC.md §7 → Drag handles

### DG4. Drag a heading section down: sub-sections move with it

When: in lanes, tab, canvas-text, canvas-file.

Setup:
````
# A|
## A1
x
# B
b
````

Keys: drag line 0 by its handle to before line 5

Expected: 
````
# B
b

# A
## A1
x
````

Source: SPEC.md §7 → Drag handles

### DG5. Drag a heading sideways right: one level deeper, sub-headings shift


Setup:
````
# A|
a
# B
## B1
b
````

Keys: drag line 2 by its handle to before line 2, 30px sideways

Expected: 
````
# A
a
## B
### B1
b
````

Source: SPEC.md §7 → Drag handles

### DG6. Drag a body block below the next one

When: in lanes, tab, canvas-text.

Setup:
````
# H|
p1

p2

p3
````

Keys: drag line 1 by its handle to before line 5

Expected: 
````
# H
p2

p1

p3
````

Source: SPEC.md §7 → Drag handles

### DG7. Escape during a drag cancels it

When: in lanes, tab, canvas-text.

Setup:
````
- a|
- b
- c
````

Keys: drag line 0 by its handle to before line 3, Escape before releasing

Expected: 
````
- a|
- b
- c
````

Source: SPEC.md §7 → Drag handles

### DG8. A click on the handle does nothing


Setup:
````
- a|
- b
````

Keys: click the drag handle of line 1

Expected: 
````
- a|
- b
````

Source: SPEC.md §7 → Drag handles

### DG9. Canvas: a drag doesn't move the card or pan the canvas

When: in canvas-text, canvas-file.

Setup:
````
- a|
- b
- c
````

Keys: drag line 0 by its handle to before line 3

Expected: 
````
- b
- c
- a
````
The card's position and the canvas's pan and zoom are unchanged.

Source: SPEC.md §7 → Drag handles

### DG10. Drag an item into another list of the same section


Setup:
````
# H|
- a
- b

para

- x
- y
````

Keys: drag line 1 by its handle to before line 7

Expected: 
````
# H
- b

para

- x
- a
- y
````

Source: SPEC.md §7 → Drag handles

### DG11. The handle sits left of the text; in a Canvas card left of the fold arrow's room

When: in lanes, tab, canvas-text, canvas-file, popover.

Setup:
````
- a|
- b
````

Keys: 

Expected: (see checks)
The handle is fully inside the editor and at least 10 px left of the text.

Source: SPEC.md §7 → Drag handles

### DG12. Drag handles off: no handle

When: settings {"dragHandles":false}.

Setup:
````
- a|
- b
````

Keys: 

Expected: (see checks)
No handle element.

Source: SPEC.md §7 → Drag handles

### DG13. Drag a nested item sideways left: one level out


Setup:
````
- a|
	- b
- c
````

Keys: drag line 1 by its handle to before line 1, -60px sideways

Expected: 
````
- a
- b
- c
````

Source: SPEC.md §7 → Drag handles

### DG14. Drag in Source mode

When: in lanes, tab; Source mode only.

Setup:
````
- a|
- b
- c
````

Keys: drag line 0 by its handle to before line 2

Expected: 
````
- b
- a
- c
````

Source: SPEC.md §7 → Drag handles

### DG15. Drag keeps a fold inside the dragged item

When: folded lines (0-based) 1.

Setup:
````
- a|
	- a1
		- a2
- b
````

Keys: drag line 0 by its handle to before line 4

Expected: 
````
- b
- a
	- a1
		- a2
````
Folded lines after: 2.

Source: SPEC.md §7 → Drag handles

## Where it works and settings

### WH1. Popover editor: outline mode Enter splits

When: in popover.

Setup:
````
- one| two
````

Keys: Enter

Expected: 
````
- one
- |two
````

Source: SPEC.md §7 → Where it works; Settings; Keys

### WH2. Popover editor: Tab indents with the subtree

When: in popover.

Setup:
````
- a
- b|
	- c
````

Keys: Tab

Expected: 
````
- a
	- b|
		- c
````

Source: SPEC.md §7 → Where it works; Settings; Keys

### WH4. Reading view: the outliner commands aren't offered

When: in tab; Live Preview only.

Setup:
````
## A|
x
````

Keys: 

Expected: (see checks)
None of the editor commands is available in Reading view.

Source: SPEC.md §7 → Where it works; Settings; Keys

### WH7. No Obsidian hotkey sits on a plugin key (Alt+↑/↓, Alt+Shift+↑/↓, Ctrl+↑/↓, Tab)


Setup:
````
x|
````

Keys: 

Expected: (see checks)
No Obsidian or plugin hotkey uses those keys.

Source: SPEC.md §7 → Where it works; Settings; Keys

### WH9. Settings survive a plugin reload


Setup:
````
x|
````

Keys: 

Expected: (see checks)
logicalOutdent is still on after disable / enable.

Source: SPEC.md §7 → Where it works; Settings; Keys

### WH10. Ctrl+Shift+V (paste as plain text) of a list: items, as Ctrl+V


Setup:
````
- a|
````

Keys: {"writeClip":"- x\n- y"}, Ctrl-Shift-v

Expected: 
````
- a
- x
- y|
````

Source: SPEC.md §7 → Where it works; Settings; Keys

### WH11. A Dataview query in a nested item renders in Live Preview and Reading view

When: in tab; Live Preview only.

Setup:
````
- a
	- b
	  ```dataview
	  LIST FROM "_test"
	  ```

para|
````

Keys: wait 1500 ms

Expected: (see checks)
A rendered Dataview block in Live Preview and in Reading view.

Source: SPEC.md §7 → Where it works; Settings; Keys

### WH12. IME composition: Tab steps aside (Obsidian's)


Setup:
````
- a
- b|
````

Keys: IME composition "か", Tab

Expected: = Obsidian (the same keys with outline mode and the Outliner keys off)

Source: SPEC.md §7 → Where it works; Settings; Keys

### WH13. IME composition: Alt+↑ steps aside


Setup:
````
- a
- b|
````

Keys: IME composition "か", Alt-ArrowUp

Expected: = Obsidian (the same keys with outline mode and the Outliner keys off)

Source: SPEC.md §7 → Where it works; Settings; Keys

## Vim mode: the outliner keys

### VM1. Normal mode: Tab demotes a heading

When: in lanes, tab, canvas-text; Live Preview only; Obsidian config {"vimMode":true}.

Setup:
````
# A
## |B
````

Keys: wait 200 ms, Tab

Expected: 
````
# A
### B
````

Source: SPEC.md §7 → Where it works (Obsidian's Vim mode)

### VM2. Normal mode: Shift+Tab outdents a nested item

When: Live Preview only; Obsidian config {"vimMode":true}.

Setup:
````
- a
	- |b
	- c
````

Keys: wait 200 ms, Shift-Tab

Expected: 
````
- a
- b
	- c
````

Source: SPEC.md §7 → Where it works (Obsidian's Vim mode)

### VM3. Normal mode: Ctrl+↓ moves a heading section

When: Live Preview only; Obsidian config {"vimMode":true}.

Setup:
````
# |A
# B
````

Keys: wait 200 ms, Ctrl-ArrowDown

Expected: 
````
# B

# A
````

Source: SPEC.md §7 → Where it works (Obsidian's Vim mode)

### VM4. Normal mode: Alt+↑ selects, vim is in visual mode, no node highlight

When: Live Preview only; Obsidian config {"vimMode":true}.

Setup:
````
- a
- b|b
- c
````

Keys: wait 200 ms, Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp

Expected: (see checks)
Node-selected (highlighted) lines: none.
vim is in visual mode with a non-empty selection.

Source: SPEC.md §7 → Where it works (Obsidian's Vim mode)

### VM5. Visual line mode over whole items: no node selection

When: Live Preview only; Obsidian config {"vimMode":true}.

Setup:
````
- |a
- b
- c
````

Keys: wait 200 ms, V, j

Expected: (see checks)
Node-selected (highlighted) lines: none.
vim is in visual mode.

Source: SPEC.md §7 → Where it works (Obsidian's Vim mode)

### VM6. Insert mode: Expand reaches a node selection, highlighted

When: in lanes, tab, canvas-text; Live Preview only; Obsidian config {"vimMode":true}.

Setup:
````
- a
- b|b
- c
````

Keys: wait 200 ms, i, Alt-ArrowUp, Alt-ArrowUp

Expected: (see checks)
Node-selected (highlighted) lines: 1.

Source: SPEC.md §7 → Where it works (Obsidian's Vim mode)

### VM7. Insert mode, node selection: Escape is vim's (normal mode)

When: Live Preview only; Obsidian config {"vimMode":true}.

Setup:
````
- a
- b|b
- c
````

Keys: wait 200 ms, i, Alt-ArrowUp, Alt-ArrowUp, Escape

Expected: (see checks)
Node-selected (highlighted) lines: none.
vim is out of insert mode.

Source: SPEC.md §7 → Where it works (Obsidian's Vim mode)

### VM8. Insert mode: Enter splits the item

When: Live Preview only; Obsidian config {"vimMode":true}.

Setup:
````
- one| two
````

Keys: wait 200 ms, i, Enter

Expected: 
````
- one
- two
````

Source: SPEC.md §7 → Where it works (Obsidian's Vim mode)

## Item node selection: more cases

### NO1. Whole item lines: highlighted

When: *everywhere*.

Setup:
````
- a
⟦	- b
		- c⟧
- d
````

Keys: 

Expected: (see checks)
Node-selected (highlighted) lines: 1, 2.

Source: SPEC.md §7 → Node selection (list items, with the Outliner keys on)

### NO2. Alt+↓ adds the next sibling

When: *everywhere*.

Setup:
````
⟦- a⟧
- b
- c
````

Keys: Alt-ArrowDown

Expected: 
````
⟦- a
- b⟧
- c
````
Node-selected (highlighted) lines: 0, 1.

Source: SPEC.md §7 → Node selection (list items, with the Outliner keys on)

### NO3. Alt+Shift+↓ takes the bottom sibling back off

When: *everywhere*.

Setup:
````
⟦- a
- b⟧
- c
````

Keys: Alt-Shift-ArrowDown

Expected: 
````
⟦- a⟧
- b
- c
````
Node-selected (highlighted) lines: 0.

Source: SPEC.md §7 → Node selection (list items, with the Outliner keys on)

### NO4. ← folds the node


Setup:
````
⟦- a
	- b⟧
- c
````

Keys: ArrowLeft

Expected: (see checks)
Folded lines after: 0.

Source: SPEC.md §7 → Node selection (list items, with the Outliner keys on)

### NO5. ← on a leaf selects the parent

When: *everywhere*.

Setup:
````
- a
⟦	- b⟧
- c
````

Keys: ArrowLeft

Expected: 
````
⟦- a
	- b⟧
- c
````

Source: SPEC.md §7 → Node selection (list items, with the Outliner keys on)

### NO6. → unfolds a folded node

When: *everywhere*; folded lines (0-based) 0.

Setup:
````
⟦- a
	- b⟧
- c
````

Keys: ArrowRight

Expected: (see checks)
Folded lines after: none.

Source: SPEC.md §7 → Node selection (list items, with the Outliner keys on)

### NO7. → selects the first child

When: *everywhere*.

Setup:
````
⟦- a
	- b⟧
- c
````

Keys: ArrowRight

Expected: 
````
- a
⟦	- b⟧
- c
````
Node-selected (highlighted) lines: 1.

Source: SPEC.md §7 → Node selection (list items, with the Outliner keys on)

### NO8. Backspace removes the nodes, one undo step

When: *everywhere*.

Setup:
````
- a
⟦- b
	- b1⟧
- c
````

Keys: Backspace

Expected: 
````
- a
- |c
````

Source: SPEC.md §7 → Node selection (list items, with the Outliner keys on)

### NO9. Delete removes the nodes

When: *everywhere*.

Setup:
````
- a
⟦- b⟧
- c
````

Keys: Delete

Expected: 
````
- a
- |c
````

Source: SPEC.md §7 → Node selection (list items, with the Outliner keys on)

### NO10. Copy gives the nodes at column 0

When: *everywhere*.

Setup:
````
- a
⟦	- b
		- c⟧
````

Keys: copy

Expected: (see checks)
Clipboard text:
````
- b
	- c
````

Source: SPEC.md §7 → Node selection (list items, with the Outliner keys on)

### NO11. Cut gives them at column 0 and removes them

When: *everywhere*.

Setup:
````
- a
⟦	- b⟧
- c
````

Keys: cut

Expected: 
````
- a|
- c
````
Clipboard text:
````
- b
````

Source: SPEC.md §7 → Node selection (list items, with the Outliner keys on)

### NO12. Escape clears (Obsidian's): the cursor at the head

When: in lanes, tab.

Setup:
````
- a
⟦- b⟧
- c
````

Keys: Escape

Expected: 
````
- a
- b|
- c
````

Source: SPEC.md §7 → Node selection (list items, with the Outliner keys on)

### NO13. Tab indents, still node-selected

When: *everywhere*.

Setup:
````
- a
⟦- b⟧
````

Keys: Tab

Expected: 
````
- a
⟦	- b⟧
````
Node-selected (highlighted) lines: 1.

Source: SPEC.md §7 → Node selection (list items, with the Outliner keys on)

### NO14. Ctrl+↑ moves, still node-selected

When: *everywhere*.

Setup:
````
- a
⟦- b⟧
````

Keys: Ctrl-ArrowUp

Expected: 
````
⟦- b⟧
- a
````
Node-selected (highlighted) lines: 0.

Source: SPEC.md §7 → Node selection (list items, with the Outliner keys on)

### NO15. Expand to the item, Alt+↓, Backspace

When: *everywhere*.

Setup:
````
- a|
- b
- c
````

Keys: Alt-ArrowDown, Alt-ArrowDown, Alt-ArrowDown, Backspace

Expected: 
````
- |c
````

Source: SPEC.md §7 → Node selection (list items, with the Outliner keys on)

### NO16. Outliner keys off: no item node selection

When: *everywhere*; settings {"keys":false}.

Setup:
````
- a
⟦- b⟧
- c
````

Keys: 

Expected: (see checks)
Node-selected (highlighted) lines: none.

Source: SPEC.md §7 → Node selection (list items, with the Outliner keys on)
