<script lang="ts">
	// assistant.WatchCard: the contract's standing-task card. It is a
	// create_watch pending action, so its buttons go through the same
	// confirm/cancel routes as any other action; kind=watch (plus the proposal,
	// Go's hx-vals) makes the handler answer with a WatchResult.
	import PrimaryButton from '#lib/components/norviq/PrimaryButton.svelte';
	import SecondaryButton from '#lib/components/norviq/SecondaryButton.svelte';
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import type { WatchProposalRow } from '../types.js';

	let {
		actionID,
		watch,
		errorMessage = '',
		busy = false,
		onanswer
	}: {
		actionID: string;
		watch: WatchProposalRow;
		errorMessage?: string;
		/** hx-disabled-elt="closest .muse-watch-controls button". */
		busy?: boolean;
		onanswer: (verb: 'confirm' | 'cancel') => void;
	} = $props();
</script>

<div id={'assistant-action-' + actionID} class="assistant-action muse-watch-card" data-watch-card>
	<p class="muse-watch-kicker">Standing task</p>
	<p class="muse-watch-title">{watch.title}</p>
	<p class="muse-watch-schedule">
		<span class="muse-watch-icon" aria-hidden="true">
			<Icon name="calendar-clock" class="size-4" />
		</span>
		<span>{watch.scheduleHuman}</span>
	</p>
	{#if watch.spec !== ''}
		<p class="muse-watch-spec">{watch.spec}</p>
	{/if}
	{#if errorMessage !== ''}
		<p class="muse-watch-error" role="alert">{errorMessage}</p>
	{/if}
	<div class="muse-watch-controls">
		<PrimaryButton class="muse-watch-confirm" data-watch-confirm="true" disabled={busy} onclick={() => onanswer('confirm')}>
			Confirm
		</PrimaryButton>
		<SecondaryButton class="muse-watch-dismiss" data-watch-dismiss="true" disabled={busy} onclick={() => onanswer('cancel')}>
			Not now
		</SecondaryButton>
	</div>
</div>
