<script lang="ts">
	// research.MemoSaveButton(id, bookmarked): toggles the bookmark in place.
	// Go posted to /research/memos/{id}/bookmark (a research-domain route);
	// this calls the same backend endpoint through the /api proxy and swaps
	// the label from the card the backend returns.
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';

	let { id, bookmarked }: { id: string; bookmarked: boolean } = $props();

	// Seeded from the prop, then owned here (the swap replaced the button).
	// svelte-ignore state_referenced_locally
	let saved = $state(bookmarked);
	let busy = $state(false);

	async function toggle() {
		if (busy) return;
		busy = true;
		try {
			const res = await fetch(`/api/v1/ai/memos/${id}/bookmark`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				body: JSON.stringify({ bookmarked: !saved })
			});
			// htmx swapped nothing on an error response; neither do we.
			if (res.ok) saved = !!((await res.json()) as { bookmarked?: boolean }).bookmarked;
		} catch {
			/* unchanged */
		} finally {
			busy = false;
		}
	}
</script>

<span id={'memo-save-' + id}>
	<NativeButton class="btn-secondary px-3 py-1 text-xs" data-memo-save="" onclick={toggle}>
		{#if saved}Saved{:else}Save{/if}
	</NativeButton>
</span>
