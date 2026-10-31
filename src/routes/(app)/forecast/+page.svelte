<script lang="ts">
	// automation.ForecastPage(vm) + ForecastResults(run) — norviq-web
	// internal/pages/automation/page.templ. Plain form posts, as in Go:
	// POST /forecast is this page's default action; /forecast/{id},
	// /forecast/{id}/run and /forecast/{id}/delete are +server.ts handlers.
	import { CheckboxField, Field, SelectField, SubmitButton } from '#lib/components/norviq/index.js';
	import type { Option } from '#lib/components/norviq/types.js';
	import * as table from '#lib/components/norviq/tui/table/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { formatFloat } from '#lib/format.js';
	import {
		forecastAction,
		forecastSubmitLabel,
		forecastValue,
		money
	} from '#lib/features/planning-tools/forecast/view.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);

	// portfolioOptions(vm.Portfolios, selectedPortfolio, "Choose portfolio"). Go
	// compared the forecast's portfolioListId string with uuid.String() (lower case).
	const portfolioOptions = $derived<Option[]>([
		{ value: '', label: 'Choose portfolio' },
		...vm.portfolios.map((p) => {
			const id = p.id.toLowerCase();
			return {
				value: id,
				label: p.name,
				selected: vm.editing != null && vm.editing.portfolioListId === id
			};
		})
	]);

	const run = $derived(vm.run);
	const currency = $derived(run?.assumptions.baseCurrency ?? '');

	function confirmDelete(event: SubmitEvent) {
		if (!confirm('Delete this forecast and its runs?')) event.preventDefault();
	}
</script>

<svelte:head>
	<title>Net worth forecast - Norviq</title>
	<meta name="keywords" content="Portfolio holdings" />
	<meta name="description" content="View and manage your stock, ETF, and crypto positions." />
</svelte:head>

<div class="app-page-content vigil-deck-page automation-modern-page space-y-6">
	<vigil.ModernPageHeader
		title="Net worth forecast"
		subtitle="Projected from your portfolio, income, spending, cash, and crypto."
	/>
	{#if vm.error !== ''}
		<div class="rounded-xl border border-danger p-4" role="alert">{vm.error}</div>
	{/if}
	<section class="glass-card p-5 md:p-6">
		<div class="flex items-start justify-between gap-4">
			<div>
				<h2 class="text-lg font-semibold">Forecast assumptions</h2>
				{#if vm.defaults}
					<p class="mt-1 text-sm text-muted-foreground">
						Suggested from {vm.defaults.cashFlowSource}: income {money(
							vm.defaults.monthlyIncome,
							vm.defaults.baseCurrency
						)}, spending {money(vm.defaults.monthlySpending, vm.defaults.baseCurrency)}, net flow {money(
							vm.defaults.monthlyNetFlow,
							vm.defaults.baseCurrency
						)}.
					</p>
				{/if}
			</div>
			{#if vm.editing}
				<a class="btn" href="/forecast">Cancel editing</a>
			{/if}
		</div>
		<form class="mt-4 grid gap-4 md:grid-cols-4" method="post" action={forecastAction(vm)}>
			<SelectField
				name="portfolio_id"
				label="Portfolio"
				required
				disabled={vm.editing != null}
				wrapperClass="grid gap-1 text-sm"
				options={portfolioOptions}
			/>
			<Field
				name="name"
				label="Name"
				value={forecastValue(vm, 'name')}
				required
				wrapperClass="grid gap-1 text-sm"
			/>
			<Field
				name="base_currency"
				label="Base currency"
				value={forecastValue(vm, 'baseCurrency')}
				required
				class="tabular-nums"
				wrapperClass="grid gap-1 text-sm"
				minlength={3}
				maxlength={3}
			/>
			<Field
				name="horizon"
				label="Horizon (months)"
				type="number"
				value={forecastValue(vm, 'horizon')}
				required
				wrapperClass="grid gap-1 text-sm"
				min="12"
				max="600"
			/>
			<Field
				name="path_count"
				label="Simulation paths"
				type="number"
				value={forecastValue(vm, 'pathCount')}
				required
				wrapperClass="grid gap-1 text-sm"
				min="100"
				max="10000"
				step="100"
			/>
			<Field
				name="income"
				label="Monthly income override"
				type="number"
				value={forecastValue(vm, 'income')}
				placeholder="Use suggested"
				wrapperClass="grid gap-1 text-sm"
				step="0.01"
				min="0"
			/>
			<Field
				name="spending"
				label="Monthly spending override"
				type="number"
				value={forecastValue(vm, 'spending')}
				placeholder="Use suggested"
				wrapperClass="grid gap-1 text-sm"
				step="0.01"
				min="0"
			/>
			<Field
				name="target"
				label="Target amount"
				type="number"
				value={forecastValue(vm, 'target')}
				wrapperClass="grid gap-1 text-sm"
				step="0.01"
				min="0"
			/>
			<Field
				name="income_growth"
				label="Income growth %"
				type="number"
				value={forecastValue(vm, 'incomeGrowth')}
				wrapperClass="grid gap-1 text-sm"
				step="0.1"
			/>
			<Field
				name="spending_growth"
				label="Spending growth %"
				type="number"
				value={forecastValue(vm, 'spendingGrowth')}
				wrapperClass="grid gap-1 text-sm"
				step="0.1"
			/>
			<Field
				name="inflation"
				label="Inflation %"
				type="number"
				value={forecastValue(vm, 'inflation')}
				wrapperClass="grid gap-1 text-sm"
				step="0.1"
				min="0"
			/>
			<CheckboxField
				name="cash"
				label="Include cash"
				checked={vm.editing == null || vm.editing.includeCash}
				wrapperClass="flex items-center gap-2 text-sm"
			/>
			<CheckboxField
				name="crypto"
				label="Include crypto"
				checked={vm.editing != null && vm.editing.includeCrypto}
				wrapperClass="flex items-center gap-2 text-sm"
			/>
			<div><SubmitButton class="btn-primary">{forecastSubmitLabel(vm)}</SubmitButton></div>
		</form>
	</section>
	<section class="grid gap-4 md:grid-cols-2">
		{#each vm.forecasts as forecast (forecast.id)}
			<article class="glass-card p-5 md:p-6">
				<h2 class="font-semibold">{forecast.name}</h2>
				<p class="text-sm text-muted-foreground">
					{`${forecast.horizonMonths} months · ${forecast.pathCount} simulation paths · ${forecast.baseCurrency}`}
				</p>
				<div class="mt-3 flex flex-wrap gap-2">
					<form method="post" action={'/forecast/' + forecast.id + '/run'}>
						<SubmitButton class="btn-primary">Run now</SubmitButton>
					</form>
					<a class="btn" href={'/forecast?edit=' + forecast.id}>Edit</a>
					<form
						method="post"
						action={'/forecast/' + forecast.id + '/delete'}
						onsubmit={confirmDelete}
					>
						<SubmitButton>Delete</SubmitButton>
					</form>
				</div>
			</article>
		{/each}
	</section>
	{#if run}
		<section class="rounded-lg border p-5">
			<h2 class="text-lg font-semibold">Latest projection</h2>
			<p class="text-sm text-muted-foreground">
				Starting value {money(run.startingValue, currency)}. Income and spending remain separate
				throughout the simulation.
			</p>
			{#if run.targetProbability != null}
				<p class="mt-2 font-semibold">
					Target probability: {formatFloat(run.targetProbability * 100, 1)}%
				</p>
			{/if}
			<div class="mt-4 overflow-x-auto">
				<table.Table class="w-full text-sm">
					<thead
						><tr class="text-left"
							><th>Month</th><th>Income</th><th>Spending</th><th>P10</th><th>P50</th><th>P90</th
							></tr
						></thead
					>
					<tbody>
						{#each run.timeline as point, index (index)}
							{#if index === 0 || index === run.timeline.length - 1 || point.month % 12 === 0}
								<tr class="border-t">
									<td class="py-2">{point.month}</td>
									<td>{money(point.monthlyIncome, currency)}</td>
									<td>{money(point.monthlySpending, currency)}</td>
									{#each point.bands as band, bandIndex (bandIndex)}
										{#if band.percentile === 10 || band.percentile === 50 || band.percentile === 90}
											<td>{money(band.value, currency)}</td>
										{/if}
									{/each}
								</tr>
							{/if}
						{/each}
					</tbody>
				</table.Table>
			</div>
		</section>
	{/if}
</div>
