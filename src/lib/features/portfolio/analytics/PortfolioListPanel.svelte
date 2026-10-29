<script lang="ts">
	// pages/portfolio/list_modals.templ PortfolioListPanel: create or rename a
	// portfolio list. Go hx-post/hx-put'd and answered HX-Redirect (success) or
	// this panel again with the error; here the allocation page's ?/createList /
	// ?/updateList actions redirect on success and the failure is shown in place.
	// Delete (Go hx-delete swapping #portfolio-lists-panel) is ?/deleteList.
	import { enhance } from '$app/forms';
	import Field from '#lib/components/norviq/Field.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import { withSpinner } from '#lib/components/norviq/form-loading.js';
	import { closeDialog } from '#lib/components/norviq/tui/dialog/index.js';
	import type { ListFormVM } from './types.js';

	const DIALOG = 'list-action-dialog';

	let { vm }: { vm: ListFormVM } = $props();

	// svelte-ignore state_referenced_locally
	let error = $state(vm.error);
	// svelte-ignore state_referenced_locally
	let name = $state(vm.name);

	const action = $derived(vm.isEdit ? `?/updateList&id=${encodeURIComponent(vm.listID)}` : '?/createList');
	const close = () => closeDialog(DIALOG);
</script>

<div id="list-action-panel">
	<div class="portfolio-form-header">
		{#if vm.isEdit}
			<h2 id="list-action-title" class="text-xl font-semibold">Edit portfolio list</h2>
		{:else}
			<h2 id="list-action-title" class="text-xl font-semibold">New portfolio list</h2>
		{/if}
		<NativeButton class="portfolio-form-close" data-tui-dialog-close="" data-tui-dialog-target={DIALOG} aria-label="Close" onclick={close}>
			<span aria-hidden="true">×</span>
		</NativeButton>
	</div>
	{#if error !== ''}
		<p class="mt-4 text-sm text-danger" role="alert">{error}</p>
	{/if}
	<form
		class="portfolio-form mt-6 space-y-6"
		method="POST"
		{action}
		use:enhance={withSpinner(() => async ({ result, update }) => {
			if (result.type === 'failure') {
				const data = (result.data ?? {}) as { listError?: string; name?: string };
				error = data.listError ?? '';
				if (data.name) name = data.name;
				return;
			}
			if (result.type === 'redirect') close();
			await update();
		})}
	>
		<Field id="portfolio-list-name" name="name" label="Name" bind:value={name} required wrapperClass="space-y-2" />
		{#if vm.isDefault}
			<p class="text-sm text-muted-foreground">This is your default list and cannot be deleted.</p>
		{/if}
		<div class="portfolio-form-actions">
			{#if vm.isEdit && vm.canDelete}
				<NativeButton
					type="submit"
					formaction={`?/deleteList&id=${encodeURIComponent(vm.listID)}`}
					formnovalidate
					class="portfolio-form-cancel text-[var(--color-danger)]"
					data-tui-dialog-close=""
					data-tui-dialog-target={DIALOG}
					onclick={(e: MouseEvent) => {
						if (!confirm('Delete this portfolio list?')) {
							e.preventDefault();
							return;
						}
						close();
					}}
				>
					Delete
				</NativeButton>
			{/if}
			<NativeButton class="portfolio-form-cancel" data-tui-dialog-close="" data-tui-dialog-target={DIALOG} onclick={close}>Cancel</NativeButton>
			<SubmitButton class="portfolio-form-save">Save list</SubmitButton>
		</div>
	</form>
</div>
