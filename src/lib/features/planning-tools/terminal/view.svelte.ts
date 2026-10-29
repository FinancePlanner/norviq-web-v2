import { getContext, setContext } from 'svelte';

// The page's roundDown flag (Go: x-data on the page root, above every swapped
// region, so a swap never resets it). Display only.
export interface TerminalView {
	roundDown: boolean;
}

const KEY = Symbol('terminal-view');

export function setTerminalView(): TerminalView {
	const view = $state<TerminalView>({ roundDown: false });
	return setContext(KEY, view);
}

export function terminalView(): TerminalView {
	return getContext<TerminalView>(KEY) ?? { roundDown: false };
}
