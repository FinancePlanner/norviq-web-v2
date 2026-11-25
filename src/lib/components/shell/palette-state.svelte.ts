// The ⌘K palette's open state. "Search and commands" in the sidebar opens it;
// the palette itself (and its key binding) lands in DS 2.0 P3 Task 4.
export const palette = $state({ open: false });

export function openPalette() {
	palette.open = true;
}
