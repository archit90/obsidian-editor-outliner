# Editor Outliner: outline mode end-to-end cases

Generated from `cases.mjs` by `node e2e/run.mjs --catalogue`; edit the cases there. `run.mjs` runs them in a real Obsidian (see its header). Results of the last run: `results.md`.

Notation:
- `|` is the cursor; `⟦` … `⟧` a selection from its anchor `⟦` to its head `⟧` (brackets would clash with task boxes and links). A case with a table writes the cursor as `‸`. Several `|` are several cursors.
- Keys are CodeMirror-style names sent as real key events (`Shift-Tab`, `Alt-Shift-ArrowUp`, `Ctrl-z`); paste / copy / cut are ClipboardEvents with a DataTransfer on the editor's content, unless the keys say `Ctrl-v` / `Ctrl-c`.
- Expected `= Obsidian` means: the same text and selection as the same keys with outline mode off (the key steps aside). `unchanged` means the setup text and selection stay.
- Unless a case says otherwise: outline mode on, Live Preview and Source mode, in an Editor Lanes card, Obsidian set to indent with tabs (tab size 4). Cases marked *everywhere* also run in a normal tab and in Canvas text and file cards.
- After every case whose text changed (outline mode on, one key), one `Ctrl-z` must restore the setup text (the `~undo` result).
- Source: the SPEC.md line (section 7) or the Logseq rule (editor.cljs / paste.cljs) the expectation comes from.

| Group | Cases |
|---|---|
| Mode states and the status bar | 21 |
| Enter | 19 |
| Enter on an empty item | 12 |
| Enter with continuation paragraphs and code | 17 |
| Shift+Enter | 13 |
| Shift+Tab ending a list | 12 |
| Backspace | 28 |
| Backspace: the invisible item indent | 17 |
| Delete | 19 |
| Paste | 43 |
| Multi-block items and code-indent rules | 35 |
| Node selection | 49 |
| Move / indent / outdent with nested children | 31 |
| Folding interplay | 14 |
| Ordered lists and tasks | 13 |
| Callouts and quotes | 11 |
| Tab- vs space-indented lists | 9 |
| Loose lists (blank lines between items) | 6 |
| Undo | 9 |
| Step-aside | 28 |
| Edge cases of the note | 15 |
| **Total** | 421 |

## Mode states and the status bar

### M1. Cursor in an item: active

When: *everywhere*.

Setup:
````
para

- a|
- b
````

Keys: 

Expected: (see checks)
Status bar item: active.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M2. Cursor in a paragraph: on, idle

When: *everywhere*.

Setup:
````
pa|ra

- a
````

Keys: 

Expected: (see checks)
Status bar item: on.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M3. Continuation line of an item: active


Setup:
````
- a
  co|nt
- b
````

Keys: 

Expected: (see checks)
Status bar item: active.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M4. Blank line between items: idle


Setup:
````
- a
|
- b
````

Keys: 

Expected: (see checks)
Status bar item: on.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M5. Empty line after the list: idle


Setup:
````
- a
|
para
````

Keys: 

Expected: (see checks)
Status bar item: on.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M6. Selection from an item into the paragraph below: idle


Setup:
````
- ⟦a

pa⟧ra
````

Keys: 

Expected: (see checks)
Status bar item: on.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M7. Selection across two lists: idle


Setup:
````
- ⟦a

para

- b⟧
````

Keys: 

Expected: (see checks)
Status bar item: on.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M8. Selection across items of one list: active


Setup:
````
- ⟦a
	- b
- c⟧
````

Keys: 

Expected: (see checks)
Status bar item: active.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M9. Outline mode off: faint

When: outline mode **off**.

Setup:
````
- a|
````

Keys: 

Expected: (see checks)
Status bar item: off.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M10. Whitespace line after an item reaching its content column (Shift+Enter's): active


Setup:
````
- a
  |
````

Keys: 

Expected: (see checks)
Status bar item: active.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M11. Whitespace line not reaching the content column: idle


Setup:
````
	- a
  |
````

Keys: 

Expected: (see checks)
Status bar item: on.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M12. Heading line above a list: idle


Setup:
````
# He|ad
- a
````

Keys: 

Expected: (see checks)
Status bar item: on.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M13. Code block in an item: active


Setup:
````
- a
  ```
  x|
  ```
````

Keys: 

Expected: (see checks)
Status bar item: active.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M14. Frontmatter: idle

When: Source mode only.

Setup:
````
---
ti|tle: x
---
- a
````

Keys: 

Expected: (see checks)
Status bar item: on.

Source mode only: Live Preview shows frontmatter as the Properties widget, which the cursor can't be in.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M15. List in a callout: active


Setup:
````
> [!note]
> - a|
````

Keys: 

Expected: (see checks)
Status bar item: active.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M16. Toggle command turns it off, the status follows

When: *everywhere*.

Setup:
````
- a|
````

Keys: command obsidian-editor-outliner:toggle-outline-mode

Expected: (see checks)
Status bar item: off.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M17. Toggle command turns it on

When: outline mode **off**.

Setup:
````
- a|
````

Keys: command obsidian-editor-outliner:toggle-outline-mode

Expected: (see checks)
Status bar item: active.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M18. Default hotkey Ctrl+Super+O toggles

When: *everywhere*.

Setup:
````
- a|
````

Keys: Ctrl-Meta-o

Expected: (see checks)

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M19. A click on the status bar item toggles


Setup:
````
- a|
````

Keys: (click the status bar item)

Expected: (see checks)

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M20. Moving the cursor out of the list (↓) makes it idle


Setup:
````
- a|

para
````

Keys: ArrowDown

Expected: (see checks)
Status bar item: on.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

### M21. Tooltip says the state


Setup:
````
- a|
````

Keys: 

Expected: (see checks)
The status item's tooltip says “on, active”.

Source: SPEC.md §7 Outline mode (idle / active, status bar item)

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

### E18. Item only a marker, the whole note


Setup:
````
- |
````

Keys: Enter

Expected: 
````
- 
- |
````

Source: SPEC.md §7 Outline mode → Enter (the last top-level item: the list doesn't end)

### E19. Two Enters on an empty last item: still a list


Setup:
````
- a
- |
````

Keys: Enter, Enter

Expected: 
````
- a
- 
- 
- |
````

Source: SPEC.md §7 Outline mode → Enter; Logseq editor.cljs keydown-new-block / insert-new-block!

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

### EE7. Last top-level item: another empty item (the list doesn't end)


Setup:
````
- a
- |
````

Keys: Enter

Expected: 
````
- a
- 
- |
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

### EE11. Empty task, last top-level: another open task


Setup:
````
- [ ] |
````

Keys: Enter

Expected: 
````
- [ ] 
- [ ] |
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
Status bar item: active.

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

### ST1. Empty last top-level item becomes an empty line outside the list

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
Status bar item: on.

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

### ST3. In the middle: the items after stay a list, numbers unchanged


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

Obsidian (1.15, Smart lists) renumbers ordered lists after every change, outline mode off too; the plugin's own rows keep the numbers, Obsidian's renumbering follows. The spec's “ordered ones keep their numbers” holds for the plugin's change only. Obsidian's renumbering is an undo step of its own, so one Ctrl+Z only undoes the renumbering (not checked here).

Source: SPEC.md §7 Outline mode → Shift+Tab on an empty top-level item ends the list

### ST4. First item


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

### ST9. Typing after ending the list writes a paragraph


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
Status bar item: on.

**Needs decision:** After Shift+Tab ends a list at its last item, the empty line sits right under the item, so typing there makes a lazy continuation line of that item (Markdown), not a paragraph: outline mode is active again and the text belongs to “a”. Options: (a) keep it (the user adds a blank line); (b) ending the list at its end leaves a blank line before the cursor line ("- a\n\n|"); (c) like (b) also in the middle of a list.

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

### ST12. Outline mode off: Shift+Tab on an empty top-level item does nothing

When: outline mode **off**.

Setup:
````
- a
- |
````

Keys: Shift-Tab

Expected: unchanged

Source: SPEC.md §7 (off: everything as without it; top-level outdent does nothing)

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

### P11. A pasted ordered list into a bullet list takes the bullet


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

**Needs decision:** Is a pasted ordered list ("1. x\n2. y") Markdown blocks? Today the test is Logseq's regex (bullets and #s only), so it pastes as multi-line text inside the item ("- a1. x\n  2. y"). Options: (a) keep Logseq's test; (b) count ordered markers as list markers too, so they become items.

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

### P30. text/markdown wins over plain text


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

Keys: command obsidian-editor-outliner:insert-code-block

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

Keys: command obsidian-editor-outliner:insert-dataview

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

Keys: command obsidian-editor-outliner:insert-code-block

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

### MB4. Insert in an ordered item: numbers stay


Setup:
````
1. a|
2. b
````

Keys: command obsidian-editor-outliner:insert-code-block

Expected: 
````
1. a
   ```
   |
   ```
1. b
````

Obsidian (1.15, Smart lists) renumbers ordered lists after every change, outline mode off too; the plugin's own rows keep the numbers, Obsidian's renumbering follows. Obsidian's renumbering restarts the list after a code block in an item (the same happens when the block is typed by hand). Obsidian's renumbering is an undo step of its own, so one Ctrl+Z only undoes the renumbering (not checked here).

Source: SPEC.md §7 Multi-block items

### MB5. Insert in a callout item


Setup:
````
> [!note]
> - a|
````

Keys: command obsidian-editor-outliner:insert-code-block

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

### MB11. Code Enter also with outline mode off (an Outliner key)

When: outline mode **off**.

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

### MB20. Copy code with outline mode off: the same

When: outline mode **off**.

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

Source: SPEC.md §7 Multi-block items

### MB25. Paste into code with outline mode off: the same rule

When: outline mode **off**.

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
  y|
  ```
````

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

Keys: Alt-Shift-ArrowUp

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

### N2. Outline mode off: list items are never node-selected

When: outline mode **off**.

Setup:
````
- a
⟦	- b
		- c⟧
- d
````

Keys: 

Expected: (see checks)
Node-selected (highlighted) lines: none.

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

### N5. Expand selection reaches the node (word → line → item with subtree)


Setup:
````
- parent
	- al|pha
		- child
	- beta
````

Keys: Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp

Expected: 
````
- parent
⟦	- alpha
		- child⟧
	- beta
````
Node-selected (highlighted) lines: 1, 2.

Source: SPEC.md §7 Expand / shrink selection

### N6. Expand once more: the parent with its subtree


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
⟦- parent
	- alpha
		- child
	- beta⟧
- after
````
Node-selected (highlighted) lines: 0, 1, 2, 3.

Source: SPEC.md §7 Expand / shrink selection

### N7. ↓ extends by the next sibling

When: *everywhere*.

Setup:
````
- a
⟦- b⟧
- c
- d
````

Keys: ArrowDown

Expected: 
````
- a
⟦- b
- c⟧
- d
````
Node-selected (highlighted) lines: 1, 2.

Source: SPEC.md §7 Node selection

### N8. ↓ past the last sibling: nothing


Setup:
````
- a
⟦- b
- c⟧
````

Keys: ArrowDown

Expected: unchanged

Source: SPEC.md §7 Node selection

### N9. ↑ back toward the anchor shrinks


Setup:
````
- a
⟦- b
- c⟧
- d
````

Keys: ArrowUp

Expected: 
````
- a
⟦- b⟧
- c
- d
````

Source: SPEC.md §7 Node selection

### N10. ↑ from the anchor extends backwards


Setup:
````
- a
- b
⟦- c⟧
````

Keys: ArrowUp

Expected: 
````
- a
⟧- b
- c⟦
````
Node-selected (highlighted) lines: 1, 2.

Source: SPEC.md §7 Node selection

### N11. ↑ at the first sibling: nothing


Setup:
````
⟦- a⟧
- b
````

Keys: ArrowUp

Expected: unchanged

Source: SPEC.md §7 Node selection

### N12. ↓ over a sibling with a subtree, nested


Setup:
````
- p
⟦	- a
		- a1⟧
	- b
- q
````

Keys: ArrowDown

Expected: 
````
- p
⟦	- a
		- a1
	- b⟧
- q
````

Source: SPEC.md §7 Node selection

### N13. Alt+↓ undoes a ↓ step


Setup:
````
- a
⟦- b⟧
- c
````

Keys: ArrowDown, Alt-ArrowDown

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

### N21. Escape: the cursor to the start of the anchor node's text

When: *everywhere*.

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
- |two
	- c
- three
````

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

### N38. Alt+Shift+↑ on a node selection: moves, still selected


Setup:
````
- x
⟦- y
- z⟧
````

Keys: Alt-Shift-ArrowUp

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

### N41. Heading ↓ extends by the next section, also with outline mode off

When: outline mode **off**.

Setup:
````
#### A

text

⟦#### B

text⟧

#### C

end
````

Keys: ArrowDown

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

### N44. Heading Escape


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

## |B
x

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

### N46. Canvas: Escape clears the node selection, the card stays in editing; a second Escape leaves it

When: in canvas-text, canvas-file.

Setup:
````
- one
⟦- two⟧
- three
````

Keys: Escape

Expected: 
````
- one
- |two
- three
````
The card is still being edited.

Source: SPEC.md §7 Node selection

### N47. Canvas: the second Escape leaves the card

When: in canvas-text, canvas-file.

Setup:
````
- one
⟦- two⟧
- three
````

Keys: Escape, Escape

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

### N49. Expand from a whole list leaves it: the section


Setup:
````
# A
- x|
- y
````

Keys: Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp, Alt-ArrowUp

Expected: 
````
⟦# A
- x
- y⟧
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

Keys: Alt-Shift-ArrowUp

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

Keys: Alt-Shift-ArrowDown

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

Keys: Alt-Shift-ArrowUp

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

Keys: Alt-Shift-ArrowDown

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

Keys: Alt-Shift-ArrowUp

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

Keys: Alt-Shift-ArrowUp

Expected: unchanged

Source: SPEC.md §7 Indent / outdent, Move up / down; Logseq move-up-down / indent-outdent

### MV8. Last child of the last item down: nothing


Setup:
````
- a
- b
	- b1|
````

Keys: Alt-Shift-ArrowDown

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

Keys: Alt-Shift-ArrowUp

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

Keys: Alt-Shift-ArrowDown

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

Keys: Alt-Shift-ArrowUp

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

Keys: Alt-Shift-ArrowDown

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

### MV18. Alt+PageUp moves up


Setup:
````
- a
- b|
````

Keys: Alt-PageUp

Expected: 
````
- b|
- a
````

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

Keys: Alt-Shift-ArrowUp

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

Keys: Alt-Shift-ArrowUp

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

Keys: Alt-Shift-ArrowUp

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

Keys: Alt-Shift-ArrowUp

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

Keys: Alt-Shift-ArrowUp

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

Keys: Alt-Shift-ArrowUp

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

Keys: command obsidian-editor-outliner:fold

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

### O11. 1. and 1) runs are separate lists


Setup:
````
1. a
2. b|
1) c
````

Keys: Enter

Expected: 
````
1. a
2. b
3. |
4) c
````

Obsidian (1.15, Smart lists) renumbers ordered lists after every change, outline mode off too; the plugin's own rows keep the numbers, Obsidian's renumbering follows. Obsidian's renumbering doesn't separate 1. and 1) runs. Obsidian's renumbering is an undo step of its own, so one Ctrl+Z only undoes the renumbering (not checked here).

Source: SPEC.md §7 Outline mode → Enter (Marker), renumbering

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

Keys: Alt-Shift-ArrowDown

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
Status bar item: on.

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

Keys: command obsidian-editor-outliner:insert-code-block, Ctrl-z

Expected: 
````
- a
````

Source: SPEC.md §7 Outline mode (every key is one undo step)

### U9. Typing right after an Enter undoes separately from it


Setup:
````
- a|
````

Keys: Enter, type "x", Ctrl-z

Expected: 
````
- a
- 
````

**Needs decision:** Typing within 0.5 s after an outline key joins its undo step (CodeMirror's history joins typing to an adjacent change), so one Ctrl+Z undoes the Enter and the typed text together. Plain Obsidian Enter behaves the same. Options: (a) keep CodeMirror's grouping; (b) isolate every outline key's change in history, so Ctrl+Z after Enter + typing first removes only the typed text.

Source: SPEC.md §7 Outline mode (every key is one undo step)

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

### SA12. Off: Enter continues the list the Obsidian way (children ignored)

When: outline mode **off**.

Setup:
````
- a|
	- c
````

Keys: Enter

Expected: 
````
- a
	- |
	- c
````

Observed: Obsidian 1.15 continues as a first child when the item has children (not the plan's “children ignored”).

Source: Obsidian 1.15 newlineAndIndentContinueMarkdownList

### SA13. Off: Enter on an empty top-level item removes the marker

When: outline mode **off**.

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

Source: Obsidian 1.15 newlineAndIndentContinueMarkdownList

### SA14. Off: Backspace at an item's start is a plain Backspace

When: outline mode **off**.

Setup:
````
- one
- |two
````

Keys: Backspace

Expected: 
````
- one
-|two
````

Source: Obsidian 1.15 (Backspace has no list handling)

### SA15. Off: Delete at an item's end joins the raw lines

When: outline mode **off**.

Setup:
````
- one|
- two
````

Keys: Delete

Expected: 
````
- one|- two
````

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA16. Off: a list pastes as is

When: outline mode **off**.

Setup:
````
- a|
````

Keys: paste (text/plain)

Expected: 
````
- a- x
- y|
````

Source: SPEC.md §7 Outline mode (each key steps aside: popup, IME, several cursors, read-only, nested editor, Vim, off)

### SA17. Off: Shift+Enter is Obsidian's continuation line

When: outline mode **off**.

Setup:
````
- a|
````

Keys: Shift-Enter

Expected: 
````
- a
  |
````

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
