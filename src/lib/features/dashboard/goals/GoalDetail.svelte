<script lang="ts">
	// goals.goalDetail(item, suggestions) with whatIf, WhatIfResult,
	// suggestionList and projectionTable.
	import { enhance } from '$app/forms';
	import { Field, SecondarySubmitButton, SubmitButton, withSpinner } from '#lib/components/norviq/index.js';
	import { formatFloat } from '#lib/format.js';
	import type { PlanningGoalOverviewItem, PlanningGoalSuggestion, PlanningGoalWhatIfResponse } from './types.js';
	import { driftLabel, money, percent, sampled, trajectoryPoints } from './view.js';

	let { item, suggestions }: { item: PlanningGoalOverviewItem; suggestions: PlanningGoalSuggestion[] } = $props();

	// The hx-post swap target (#what-if-result). Failures leave it untouched,
	// as htmx did for Go's non-2xx plain-text errors.
	let whatIf = $state<PlanningGoalWhatIfResponse | null>(null);

	const returnPct = $derived(item.goal.expectedAnnualReturn * 100);
</script>

{#snippet detailMetric(label: string, value: string)}
	<div>
		<p class="text-footnote text-muted-foreground">{label}</p>
		<p class="mt-1 text-lg font-semibold tabular-nums">{value}</p>
	</div>
{/snippet}

<section class="mt-10 space-y-6" id="goal-detail">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-footnote font-semibold text-muted-foreground">Selected goal</p>
			<h2 class="mt-2 text-2xl font-semibold">{item.goal.name}</h2>
		</div>
		<a class="btn-secondary" href={'/goals/' + item.id + '/report.pdf'} data-sveltekit-reload>Export goal PDF</a>
	</div>
	<div class="glass-card p-6">
		<div class="grid gap-4 sm:grid-cols-4">
			{@render detailMetric('Progress', percent(item.progress.percentComplete))}
			{@render detailMetric('Projected', money(item.progress.projectedValueAtTarget, item.goal.baseCurrency))}
			{@render detailMetric('Planned / month', money(item.progress.plannedMonthlyContribution, item.goal.baseCurrency))}
			{@render detailMetric('Observed / month', money(item.progress.observedMonthlyContribution, item.goal.baseCurrency))}
		</div>
		<div class="mt-6 overflow-hidden rounded-lg border p-3">
			<svg
				viewBox="0 0 1000 280"
				class="h-64 w-full"
				preserveAspectRatio="none"
				role="img"
				aria-label="Planned and projected goal trajectory"
				><polyline
					points={trajectoryPoints(item.progress.trajectory, false)}
					fill="none"
					stroke="currentColor"
					stroke-width="3"
					stroke-dasharray="10 8"
					opacity=".35"
				></polyline><polyline
					points={trajectoryPoints(item.progress.trajectory, true)}
					fill="none"
					stroke="#10b981"
					stroke-width="5"
				></polyline></svg
			>
			<div class="flex gap-5 text-xs text-muted-foreground">
				<span>— — Planned</span><span class="text-success">—— Projected</span>
			</div>
		</div>
	</div>
	<div class="grid gap-6 xl:grid-cols-2">
		<div class="glass-card p-6">
			<h3 class="text-lg font-semibold">What-if simulator</h3>
			<p class="mt-1 text-sm text-muted-foreground">Adjust contribution or return inside the transparent risk guardrail.</p>
			<form
				class="mt-5 space-y-4"
				method="POST"
				action="?/whatIf"
				use:enhance={withSpinner(() => async ({ result }) => {
					if (result.type === 'success' && result.data?.whatIf) whatIf = result.data.whatIf as PlanningGoalWhatIfResponse;
				})}
			>
				<input type="hidden" name="goalId" value={item.id} />
				<Field
					name="monthlyContribution"
					label="Monthly contribution"
					type="number"
					value={formatFloat(item.progress.plannedMonthlyContribution, 0)}
					class="mt-2 w-full"
					wrapperClass="block text-sm font-medium"
					min="0"
					step="25"
				/>
				<Field
					name="expectedAnnualReturn"
					label="Expected annual return (%)"
					type="number"
					value={formatFloat(returnPct, 1)}
					class="mt-2 w-full"
					wrapperClass="block text-sm font-medium"
					min={formatFloat(returnPct - 1, 1)}
					max={formatFloat(returnPct + 1, 1)}
					step="0.1"
				/>
				<SubmitButton>Run scenario</SubmitButton>
			</form>
			<div id="what-if-result" class="mt-4">
				{#if whatIf}
					<div class="rounded-lg bg-success/10 p-4 text-sm">
						<p class="font-semibold">Scenario result</p>
						<p class="mt-1">
							{money(whatIf.scenario.projectedValueAtTarget, whatIf.scenario.currency)} projected at target · {driftLabel(
								whatIf.scenario.driftState,
								whatIf.scenario.driftMonths
							)}
						</p>
						<p class="mt-2 text-xs text-muted-foreground">
							Baseline: {money(whatIf.baseline.projectedValueAtTarget, whatIf.baseline.currency)}
						</p>
					</div>
				{/if}
			</div>
		</div>
		<div class="glass-card p-6">
			<h3 class="text-lg font-semibold">Adjustment options</h3>
			<p class="mt-1 text-sm text-muted-foreground">Accepting prepares a draft. It never changes a budget or places trades.</p>
			<div class="mt-5 space-y-3">
				{#if suggestions.length === 0}
					<p class="text-sm text-muted-foreground">No adjustment is needed right now.</p>
				{/if}
				{#each suggestions as suggestion (suggestion.id)}
					<div class="rounded-lg border p-4">
						<p class="font-semibold">{suggestion.title}</p>
						<p class="mt-1 text-sm text-muted-foreground">{suggestion.explanation}</p>
						<form class="mt-3" method="POST" action="?/accept" use:enhance={withSpinner()}>
							<input type="hidden" name="goalId" value={item.id} />
							<input type="hidden" name="suggestionId" value={suggestion.id} />
							<SecondarySubmitButton class="text-sm">Prepare review draft</SecondarySubmitButton>
						</form>
					</div>
				{/each}
			</div>
		</div>
	</div>
	<div class="glass-card overflow-hidden">
		<div class="p-6">
			<h3 class="text-lg font-semibold">Projection table</h3>
			<p class="mt-1 text-sm text-muted-foreground">
				Sampled monthly values; full deterministic history remains available to the API and report.
			</p>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead class="border-y bg-black/5 dark:bg-white/5"
					><tr><th class="p-3">Date</th><th class="p-3">Planned</th><th class="p-3">Actual</th><th class="p-3">Projected</th></tr></thead
				>
				<tbody>
					{#each sampled(item.progress.trajectory) as point, i (i)}
						<tr class="border-b"
							><td class="p-3">{point.date}</td><td class="p-3 tabular-nums">{money(point.plannedValue, item.goal.baseCurrency)}</td><td
								class="p-3 tabular-nums"
								>{#if point.actualValue !== null && point.actualValue !== undefined}{money(
										point.actualValue,
										item.goal.baseCurrency
									)}{:else}<span class="opacity-40">—</span>{/if}</td
							><td class="p-3 tabular-nums">{money(point.projectedValue, item.goal.baseCurrency)}</td></tr
						>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>
