// The ⌘K palette's open state. ⌘K (AppShell), "Search and commands" in the
// sidebar and the top bars' search buttons open it. `everOpened` mounts the
// lazily loaded palette on the first opening and keeps it mounted after.
export const palette = $state({ open: false, everOpened: false });

// Where focus goes back to when the palette closes: the button, or the field
// ⌘K was pressed in.
let opener: HTMLElement | null = null;

export function openPalette() {
	if (palette.open) return;
	// No document (and no HTMLElement) during SSR.
	const el = typeof document === 'undefined' ? null : document.activeElement;
	opener = el && el instanceof HTMLElement ? el : null;
	palette.everOpened = true;
	palette.open = true;
}

/** Marks the palette closed and returns focus to whatever opened it. */
export function closePalette() {
	if (!palette.open) return;
	palette.open = false;
	const el = opener;
	opener = null;
	if (el?.isConnected) el.focus();
}
