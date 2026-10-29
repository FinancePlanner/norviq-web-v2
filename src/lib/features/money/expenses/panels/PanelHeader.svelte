<script lang="ts">
	// The shared header of every planner modal panel (modals.templ): title plus
	// the × that closes #expense-action-dialog.
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import { closeDialog } from '#lib/components/norviq/tui/dialog/index.js';

	let { title }: { title: string } = $props();
</script>

<div class="portfolio-form-header">
	<h2 id="expense-action-title" class="text-xl font-semibold">{title}</h2>
	<NativeButton
		class="portfolio-form-close"
		data-tui-dialog-close=""
		data-tui-dialog-target="expense-action-dialog"
		aria-label="Close"
		onclick={() => closeDialog('expense-action-dialog')}
	>
		<span aria-hidden="true">×</span>
	</NativeButton>
</div>
