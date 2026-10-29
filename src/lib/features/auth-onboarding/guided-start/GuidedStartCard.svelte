<script lang="ts">
	// guidedstart.Card(vm): the dashboard "Get started" card. Build `vm` with
	// guidedCardVM() / loadGuidedCard() in the dashboard load.
	import { onMount, untrack } from 'svelte';
	import { capture } from '#lib/analytics/index.js';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import { COMPLETION, HEADLINE, STEPS, allDone, progressLabel, stepLine, stepTitle, type CardVM, type Step } from './guide.js';

	let { vm: vmIn }: { vm: CardVM } = $props();

	let vm = $state<CardVM>(untrack(() => vmIn));
	let hidden = $state(false);

	onMount(() => {
		if (vm.fireCardShown) capture('guided_start_card_shown', {});
		if (vm.fireCompleted) capture('guided_start_completed', {});
	});

	function rowLabel(i: number, step: Step, done: boolean) {
		return `Step ${i + 1} of ${STEPS.length}, ${stepTitle(step)}, ${done ? 'Done' : 'Not started'}`;
	}

	async function dismiss() {
		hidden = true;
		try {
			const res = await fetch('/guided-start/dismiss', { method: 'POST', headers: { Accept: 'application/json' } });
			const body = (await res.json()) as { ok: boolean; card?: CardVM };
			if (body.ok) {
				capture('guided_start_dismissed', {});
				return;
			}
			if (body.card) vm = body.card;
		} catch {
			vm = { ...vm, message: "Couldn't hide that just now — try again in a moment." };
		}
		hidden = false;
	}
</script>

{#if vm.visible && !hidden}
	<section id="guided-start-card" class="dash-panel guided-start-card p-5 md:p-6" aria-labelledby="guided-start-title">
		<header class="flex items-start justify-between gap-4">
			<div>
				<p class="dash-panel-label">{progressLabel(vm.progress.count)}</p>
				<h2 id="guided-start-title" class="mt-2 text-xl font-semibold">{HEADLINE}</h2>
			</div>
			<NativeButton class="dash-btn dash-btn-ghost guided-start-dismiss" aria-label={'Hide ' + HEADLINE} onclick={dismiss}>
				<span aria-hidden="true">×</span>
			</NativeButton>
		</header>
		<ol class="guided-start-steps mt-4 space-y-2">
			{#each STEPS as step, i (step)}
				<li>
					<a
						href={'/guided-start/start?step=' + step}
						data-sveltekit-reload
						class={['guided-start-row', vm.progress.done[step] && 'is-done', vm.progress.next === step && 'is-next']}
						aria-label={rowLabel(i, step, vm.progress.done[step])}
						title={stepLine(step)}
					>
						<span class="guided-start-marker" aria-hidden="true">
							{#if vm.progress.done[step]}✓{:else}{i + 1}{/if}
						</span>
						<span class="guided-start-title">{stepTitle(step)}</span>
					</a>
				</li>
			{/each}
		</ol>
		{#if allDone(vm.progress)}
			<p class="mt-4 text-sm font-semibold">{COMPLETION}</p>
		{/if}
		{#if vm.message}
			<p class="mt-3 text-sm text-muted-foreground" role="status">{vm.message}</p>
		{/if}
	</section>
{/if}
