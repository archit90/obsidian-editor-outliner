// The parts of @codemirror/language this plugin uses. Obsidian ships the module at runtime (it's external in
// the build), but it isn't installed here, so it's typed by hand from its 6.x API.
declare module "@codemirror/language" {
  import type { EditorState, Facet, StateEffectType } from "@codemirror/state";
  import type { DecorationSet } from "@codemirror/view";
  export const indentUnit: Facet<string, string>;
  export const foldEffect: StateEffectType<{ from: number; to: number }>;
  export const unfoldEffect: StateEffectType<{ from: number; to: number }>;
  export function foldedRanges(state: EditorState): DecorationSet;
  export function foldable(state: EditorState, lineStart: number, lineEnd: number): { from: number; to: number } | null;
}
