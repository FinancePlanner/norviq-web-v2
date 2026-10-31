<script lang="ts">
	// research.MemoSaveButton(id, bookmarked): toggles the bookmark in place by
	// posting bookmarked=!current to /research/memos/{id}/bookmark, like Go's hx-vals.
	import { untrack } from 'svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import type { PositionMemoCard } from './types.js';

	let { id, bookmarked }: { id: string; bookmarked: boolean } = $props();

	// Seeded from the prop, then owned here (Go's swap replaced the button).
	let saved = $state(untrack(() => bookmarked));
	let busy = $state(false);

	async function toggle() {
		if (busy) return;
		busy = true;
		try {
			const res = await fetch(`/research/memos/${id}/bookmark`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'application/json'
				},
				body: new URLSearchParams({ bookmarked: String(!saved) })
			});
			// htmx swapped nothing on an error response; neither do we.
			if (res.ok) saved = !!((await res.json()) as PositionMemoCard).bookmarked;
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
