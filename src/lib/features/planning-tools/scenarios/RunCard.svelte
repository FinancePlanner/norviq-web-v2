<script lang="ts">
	// scenarios.RunCard + RunCardContent + ImpactMetrics (page.templ). An active
	// run (queued/running) polled GET /scenarios/runs/{id} every 2s and swapped
	// itself (hx-trigger="every 2s"); here a TanStack query polls the same URL,
	// now JSON, until the run settles. "Cancel run" was hx-delete on that URL,
	// swapping in the returned card; a failed request left the card as it was.
	import { untrack } from 'svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import { NativeButton } from '#lib/components/norviq/index.js';
	import { formatFloat } from '#lib/format.js';
	import { deleteRequest } from './client.js';
	import type { ScenarioRun } from './types.js';
	import {
		formatOptionalMoney,
		formatOptionalMonths,
		formatOptionalPercent,
		isActive,
		optionalNumber,
		resultJSON,
		uid
	} from './view.js';

	let { run: initial }: { run: ScenarioRun } = $props();

	let run = $state(untrack(() => initial));
	const id = $derived(uid(run.id));
	const active = $derived(isActive(run));
	let cancelling = $state(false);

	const poll = createQuery(() => ({
		queryKey: ['scenario-run', id],
		queryFn: async (): Promise<ScenarioRun> => {
			const res = await fetch(`/scenarios/runs/${id}`, { headers: { accept: 'application/json' } });
			if (!res.ok) throw new Error(`scenario run ${res.status}`);
			return (await res.json()) as ScenarioRun;
		},
		enabled: active,
		refetchInterval: 2000,
		retry: false
	}));

	$effect(() => {
		const next = poll.data;
		if (next) untrack(() => (run = next));
	});

	async function cancel() {
		cancelling = true;
		const result = await deleteRequest<ScenarioRun>(`/scenarios/runs/${id}`);
		cancelling = false;
		if (result?.kind === 'ok') run = result.data;
	}

	const progress = $derived(run.progress * 100);
</script>

{#snippet metric(label: string, value: string)}
	<div class="rounded-lg border p-3">
		<p class="text-footnote font-semibold text-muted-foreground">{label}</p>
		<p class="mt-1 text-sm font-semibold tabular-nums">{value}</p>
	</div>
{/snippet}

<article id={'scenario-run-' + id} class="glass-card p-5">
	<div class="flex items-start justify-between gap-4">
		<div>
			<p class="font-semibold capitalize">{run.state}</p>
			<p class="mt-1 text-xs text-muted-foreground">Engine {run.engineVersion} · seed {run.seed}</p>
		</div>
		<p class="tabular-nums">{formatFloat(progress, 0)}%</p>
	</div>
	<div class="mt-4 h-1.5 overflow-hidden rounded-full bg-black/10">
		<div class="h-full rounded-full bg-success" style="width: {formatFloat(progress, 1)}%"></div>
	</div>
	{#if active}
		<NativeButton class="mt-4 text-sm font-medium text-danger" disabled={cancelling} onclick={cancel}>Cancel run</NativeButton>
	{/if}
	{#if run.errorMessage != null}
		<p class="mt-4 text-sm text-danger">{run.errorMessage}</p>
	{/if}
	{#if run.result != null}
		{@const result = run.result}
		<div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
			{@render metric('Portfolio Δ', formatOptionalPercent(optionalNumber(result, 'portfolio_change_percent')))}
			{@render metric('Max drawdown', formatOptionalPercent(optionalNumber(result, 'maximum_drawdown')))}
			{@render metric('Goal delay', formatOptionalMonths(optionalNumber(result, 'goal_delay_months')))}
			{@render metric('Contribution Δ', formatOptionalMoney(optionalNumber(result, 'contribution_delta')))}
			{@render metric('Recovery', formatOptionalMonths(optionalNumber(result, 'recovery_months')))}
			{@render metric('Expense cut', formatOptionalMoney(optionalNumber(result, 'expense_impact_monthly')))}
		</div>
		<a class="mt-4 inline-flex text-sm font-medium text-success" href={'/scenarios/runs/' + id + '/report.pdf'} data-sveltekit-reload
			>Download private PDF</a
		>
		<details class="mt-4">
			<summary class="cursor-pointer text-sm font-medium">Inspect result</summary>
			<pre class="mt-3 max-h-80 overflow-auto rounded-lg bg-black/5 p-4 text-xs">{resultJSON(run.result)}</pre>
		</details>
	{/if}
</article>
