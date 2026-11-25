// Opens the Quick Q card from outside it: the desktop top bar's "Ask Q" bumps
// the counter and QuickAssistant opens on each change.
export const quickOpen = $state({ requested: 0 });

export function requestQuickQ() {
	quickOpen.requested += 1;
}
