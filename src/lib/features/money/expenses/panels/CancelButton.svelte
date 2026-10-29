<script lang="ts">
	import type { Snippet } from 'svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import { closeDialog } from '#lib/components/norviq/tui/dialog/index.js';

	let { children }: { children?: Snippet } = $props();
</script>

<NativeButton
	class="portfolio-form-cancel"
	data-tui-dialog-close=""
	data-tui-dialog-target="expense-action-dialog"
	onclick={() => closeDialog('expense-action-dialog')}
>
	{#if children}{@render children()}{:else}Cancel{/if}
</NativeButton>
