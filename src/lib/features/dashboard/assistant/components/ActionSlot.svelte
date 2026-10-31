<script lang="ts">
	// assistant.PendingAction plus what replaced it: Go's confirm/cancel
	// buttons hx-posted and swapped #assistant-action-{id} with the answer
	// (ActionResult, WatchResult, or a WatchCard carrying an error). Here the
	// same routes answer with an ActionOutcome and this slot re-renders.
	// A WatchResult's reply joins the transcript through `onreply` (Go's
	// hx-swap-oob="beforeend:#assistant-transcript").
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import type { ActionOutcome, ActionRow, MessageRow } from '../types.js';
	import WatchCard from './WatchCard.svelte';

	let { action, onreply }: { action: ActionRow; onreply: (message: MessageRow) => void } = $props();

	let outcome = $state<ActionOutcome | null>(null);
	let busy = $state(false);

	async function answer(verb: 'confirm' | 'cancel', watch: ActionRow['watch']) {
		const body = new URLSearchParams();
		if (watch) {
			body.set('kind', 'watch');
			body.set('title', watch.title);
			body.set('schedule', watch.scheduleHuman);
			body.set('spec', watch.spec);
			busy = true;
		}
		try {
			const res = await fetch(`/assistant/actions/${action.id}/${verb}`, {
				method: 'POST',
				body,
				headers: { Accept: 'application/json' }
			});
			// htmx swapped nothing on an error response; neither do we.
			if (!res.ok) return;
			const next = (await res.json()) as ActionOutcome;
			outcome = next;
			if (next.kind === 'watchResult' && next.vm.reply) onreply(next.vm.reply);
		} catch {
			/* unchanged */
		} finally {
			busy = false;
		}
	}
</script>

{#if outcome?.kind === 'result'}
	<div id={'assistant-action-' + outcome.vm.id} class="assistant-action">
		<p class="assistant-kicker">
			{#if outcome.vm.success}
				<span>Applied</span>
			{:else}
				<span>Not applied</span>
			{/if}
		</p>
		<p class="mt-2 text-sm font-semibold">{outcome.vm.message}</p>
	</div>
{:else if outcome?.kind === 'watchResult'}
	{@const vm = outcome.vm}
	<div
		id={'assistant-action-' + vm.id}
		class="assistant-action muse-watch-card"
		data-watch-card
		data-watch-state={vm.state}
	>
		<p class="muse-watch-kicker">Standing task</p>
		{#if vm.title !== ''}
			<p class="muse-watch-title">{vm.title}</p>
		{/if}
		<p class="muse-watch-outcome">
			{#if vm.state === 'confirmed' || vm.state === 'existing'}
				<span class="muse-watch-icon" aria-hidden="true">
					<Icon name="circle-check" class="size-4" />
				</span>
			{/if}
			<span>{vm.message}</span>
		</p>
	</div>
{:else if outcome?.kind === 'watchCard'}
	{@const card = outcome}
	<WatchCard
		actionID={card.id}
		watch={card.watch}
		errorMessage={card.error}
		{busy}
		onanswer={(verb) => answer(verb, card.watch)}
	/>
{:else if action.watch}
	{@const watch = action.watch}
	<WatchCard actionID={action.id} {watch} {busy} onanswer={(verb) => answer(verb, watch)} />
{:else}
	<div id={'assistant-action-' + action.id} class="assistant-action">
		<p class="assistant-kicker">Confirmation required</p>
		<p class="mt-2 text-sm font-semibold">{action.summary}</p>
		<p class="mt-1 text-xs text-muted-foreground">Expires {action.expiresAt}</p>
		<div class="assistant-action-controls">
			<NativeButton class="assistant-confirm" onclick={() => answer('confirm', null)}
				>Confirm</NativeButton
			>
			<NativeButton class="assistant-cancel" onclick={() => answer('cancel', null)}
				>Cancel</NativeButton
			>
		</div>
	</div>
{/if}
