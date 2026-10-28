// State + registry behind templUI's dialog (dialog.js). Each <Dialog id="…">
// registers itself so an external <Trigger for="…">, <Close for="…"> or code
// (openDialog("add-position-dialog"), the port of window.tui.dialog.open) can
// drive it — the pattern the Go pages use for htmx-loaded dialog panels.
import { getContext, setContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

export const CLOSE_DURATION_MS = 200;

export class DialogState {
	/** Logical open state (what data-tui-dialog-open reports). */
	open = $state(false);
	/** True during the 200ms close animation, before <dialog>.close(). */
	closing = $state(false);
	disableClickAway = false;
	disableESC = false;
	#onchange: (open: boolean) => void;

	constructor(open: boolean, onchange: (open: boolean) => void) {
		this.open = open;
		this.#onchange = onchange;
	}

	show = () => {
		this.closing = false;
		if (!this.open) {
			this.open = true;
			this.#onchange(true);
		}
	};

	hide = () => {
		if (this.open) {
			this.open = false;
			this.#onchange(false);
		}
	};

	toggle = () => (this.open ? this.hide() : this.show());
}

const registry = new SvelteMap<string, DialogState>();
const KEY = Symbol('norviq-dialog');

export function registerDialog(id: string | undefined, state: DialogState): () => void {
	if (!id) return () => {};
	registry.set(id, state);
	return () => {
		if (registry.get(id) === state) registry.delete(id);
	};
}

export function setDialogContext(state: DialogState) {
	setContext(KEY, state);
}

export function getDialogContext(): DialogState | undefined {
	return getContext<DialogState | undefined>(KEY);
}

/** Resolve a dialog by root id, falling back to the enclosing dialog. */
export function resolveDialog(id?: string, fallback?: DialogState): DialogState | undefined {
	return (id ? registry.get(id) : undefined) ?? fallback;
}

export const openDialog = (id: string) => registry.get(id)?.show();
export const closeDialog = (id: string) => registry.get(id)?.hide();
export const toggleDialog = (id: string) => registry.get(id)?.toggle();
export const isDialogOpen = (id: string) => registry.get(id)?.open ?? false;
