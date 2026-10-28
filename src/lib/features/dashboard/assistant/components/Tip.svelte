<script lang="ts">
	// assistant.Tip. Dismiss deletes the tip and removes the card (Go swapped
	// the empty 200 body over it); a failed dismiss leaves it in place.
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import type { TipRow } from '../types.js';

	let { tip }: { tip: TipRow } = $props();

	let dismissed = $state(false);

	async function dismiss() {
		try {
			const res = await fetch(`/assistant/tips/${tip.id}`, { method: 'DELETE' });
			if (res.ok) dismissed = true;
		} catch {
			/* unchanged */
		}
	}
</script>

{#if !dismissed}
	<div id={'assistant-tip-' + tip.id} class="assistant-tip">
		<strong class="text-sm">{tip.title}</strong>
		<p>{tip.body}</p>
		<div class="assistant-tip-actions">
			{#if tip.actionPath !== ''}
				<a href={tip.actionPath}>Review</a>
			{/if}
			<NativeButton onclick={dismiss}>Dismiss</NativeButton>
		</div>
	</div>
{/if}
