# Editor Outliner e2e results

Run 2026-11-07T07:33:42.223Z: 1442 checks, 1436 pass, 0 fail, 0 error, 6 needing a decision (DECIDE: the case waits for the user's choice; see CASES.md).

| Group | Pass | Fail | Error | Decide |
|---|---|---|---|---|
| Mode states and the status bar | 57 | 0 | 0 | 0 |
| Enter | 82 | 0 | 0 | 0 |
| Enter on an empty item | 56 | 0 | 0 | 0 |
| Enter with continuation paragraphs and code | 64 | 0 | 0 | 0 |
| Shift+Enter | 52 | 0 | 0 | 0 |
| Shift+Tab ending a list | 40 | 0 | 0 | 2 |
| Backspace | 102 | 0 | 0 | 0 |
| Backspace: the invisible item indent | 50 | 0 | 0 | 0 |
| Delete | 70 | 0 | 0 | 0 |
| Paste | 156 | 0 | 0 | 2 |
| Multi-block items and code-indent rules | 116 | 0 | 0 | 0 |
| Node selection | 146 | 0 | 0 | 0 |
| Move / indent / outdent with nested children | 120 | 0 | 0 | 0 |
| Folding interplay | 56 | 0 | 0 | 0 |
| Ordered lists and tasks | 50 | 0 | 0 | 0 |
| Callouts and quotes | 40 | 0 | 0 | 0 |
| Tab- vs space-indented lists | 36 | 0 | 0 | 0 |
| Loose lists (blank lines between items) | 20 | 0 | 0 | 0 |
| Undo | 16 | 0 | 0 | 2 |
| Step-aside | 53 | 0 | 0 | 0 |
| Edge cases of the note | 54 | 0 | 0 | 0 |

## Failures

### DECIDE ST9 [lanes / lp]: Typing after ending the list writes a paragraph

- status: expected on, got active

### DECIDE P11 [lanes / lp]: A pasted ordered list into a bullet list takes the bullet

text (- expected, + actual):
````
  - - a
  + - a1. x
  - - x
  +   2. y|
  - - y|
````

### DECIDE U9 [lanes / lp]: Typing right after an Enter undoes separately from it

text (- expected, + actual):
````
    - a
  - - 
````

### DECIDE ST9 [lanes / source]: Typing after ending the list writes a paragraph

- status: expected on, got active

### DECIDE P11 [lanes / source]: A pasted ordered list into a bullet list takes the bullet

text (- expected, + actual):
````
  - - a
  + - a1. x
  - - x
  +   2. y|
  - - y|
````

### DECIDE U9 [lanes / source]: Typing right after an Enter undoes separately from it

text (- expected, + actual):
````
    - a
  - - 
````
