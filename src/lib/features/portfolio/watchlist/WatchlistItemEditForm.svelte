<script lang="ts">
	// pages/portfolio/subpages.templ WatchlistItemEditForm. Go hx-patch'd
	// /portfolio/watchlist/items/{id} and swapped the rows panel; the dialog
	// itself stayed open after a save (kept as-is). Here: ?/updateNote, then the
	// page data reloads.
	import { enhance } from '$app/forms';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import TextareaField from '#lib/components/norviq/TextareaField.svelte';
	import { withSpinner } from '#lib/components/norviq/form-loading.js';
	import { closeDialog } from '#lib/components/norviq/tui/dialog/index.js';
	import type { WatchlistItemEditVM } from './types.js';

	const DIALOG = 'watchlist-edit-dialog';

	let { vm }: { vm: WatchlistItemEditVM } = $props();
</script>

<div id="watchlist-edit-panel" class="portfolio-modal-panel glass-card p-6 md:p-8">
	<h2 class="text-lg font-semibold">Edit {vm.symbol}</h2>
	<form
		class="mt-4 space-y-4"
		method="POST"
		action="?/updateNote"
		use:enhance={withSpinner(() => async ({ result, update }) => {
			// Go's htmx swap skipped non-2xx responses: nothing changes on failure.
			if (result.type === 'success') await update({ reset: false });
		})}
	>
		<input type="hidden" name="item_id" value={vm.itemID} />
		<input type="hidden" name="list_id" value={vm.listID} />
		<TextareaField id="watchlist-note" name="note" label="Note" value={vm.note} wrapperClass="space-y-2" rows={4} />
		<div class="portfolio-form-actions">
			<NativeButton class="portfolio-form-cancel" data-tui-dialog-close="" data-tui-dialog-target={DIALOG} onclick={() => closeDialog(DIALOG)}>Cancel</NativeButton>
			<SubmitButton class="portfolio-form-save">Save note</SubmitButton>
		</div>
	</form>
</div>
