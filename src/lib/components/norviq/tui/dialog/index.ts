// templUI internal/components/dialog: `import * as dialog from '#lib/components/norviq/tui/dialog/index.js'`
// then <dialog.Dialog id="x" bind:open>, <dialog.Trigger for="x">, <dialog.Content class="…">,
// <dialog.Header>, <dialog.Title>, <dialog.Description>, <dialog.Footer>, <dialog.Close>.
// openDialog/closeDialog/toggleDialog/isDialogOpen replace window.tui.dialog.*.
export { default as Dialog } from './Dialog.svelte';
export { default as Trigger } from './Trigger.svelte';
export { default as Content } from './Content.svelte';
export { default as Close } from './Close.svelte';
export { default as Header } from './Header.svelte';
export { default as Footer } from './Footer.svelte';
export { default as Title } from './Title.svelte';
export { default as Description } from './Description.svelte';
export {
	openDialog,
	closeDialog,
	toggleDialog,
	isDialogOpen,
	CLOSE_DURATION_MS
} from './dialog.svelte.js';
