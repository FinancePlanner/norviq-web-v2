<script lang="ts">
	// pages/earningsviz/visualizer.templ VisualizerCard. Build `vm` with
	// loadEarningsVisualizerViewModel() (visualizer.server.ts).
	import CardHeader from '#lib/components/norviq/CardHeader.svelte';
	import Field from '#lib/components/norviq/Field.svelte';
	import SelectField from '#lib/components/norviq/SelectField.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import type { FlowMetricVM, VisualizerVM } from './types.js';

	let { vm }: { vm: VisualizerVM } = $props();

	const filingOptions = $derived(vm.filings.map((f) => ({ value: f.value, label: f.label, selected: f.selected })));
</script>

{#snippet flowNode(metric: FlowMetricVM)}
	{#if metric.visible}
		<div class={'earnings-flow-node earnings-flow-node-' + metric.tone} style={'min-height:' + metric.widthPercent}>
			<span>{metric.label}</span>
			<strong>{metric.value}</strong>
			{#if metric.subtext}
				<small>{metric.subtext}</small>
			{/if}
		</div>
	{/if}
{/snippet}

{#snippet breakdownPill(metric: FlowMetricVM)}
	{#if metric.visible}
		<div class="earnings-flow-pill">
			<span>{metric.label}</span>
			<strong>{metric.value}</strong>
		</div>
	{/if}
{/snippet}

<section class="earnings-flow-card glass-card p-5 md:p-6">
	<div class="earnings-flow-header">
		<div>
			<CardHeader title="Earnings visualizer" desc="Income statement flow from revenue to net income." />
		</div>
		<form method="get" action={vm.action} class="earnings-flow-controls">
			<label class="sr-only" for="earnings-flow-symbol">Symbol</label>
			<Field id="earnings-flow-symbol" name="symbol" value={vm.inputSymbol} placeholder="AAPL" class="earnings-flow-input" autocomplete="off" />
			{#if vm.filings.length > 0}
				<label class="sr-only" for="earnings-flow-filing">Filing</label>
				<SelectField id="earnings-flow-filing" name="filing" class="earnings-flow-select" options={filingOptions} />
			{/if}
			<NativeButton type="submit" class="btn-secondary px-4 py-2 text-sm">Generate</NativeButton>
		</form>
	</div>
	{#if vm.hasData}
		<div class="earnings-flow-meta">
			<div>
				<p class="earnings-flow-company">{vm.symbol}</p>
				<p class="text-xs text-muted-foreground">{vm.filingLabel}</p>
			</div>
			{#if vm.eps}
				<div class="earnings-flow-eps">
					<span>EPS</span>
					<strong>{vm.eps}</strong>
				</div>
			{/if}
		</div>
		<div class="earnings-flow-diagram" aria-label={'Income statement flow for ' + vm.symbol}>
			<div class="earnings-flow-column">
				{@render flowNode(vm.revenue)}
			</div>
			<div class="earnings-flow-connector" aria-hidden="true"></div>
			<div class="earnings-flow-stack">
				{@render flowNode(vm.grossProfit)}
				{@render flowNode(vm.costOfRevenue)}
			</div>
			<div class="earnings-flow-connector" aria-hidden="true"></div>
			<div class="earnings-flow-stack">
				{@render flowNode(vm.operatingIncome)}
				{@render flowNode(vm.operatingExpenses)}
			</div>
			<div class="earnings-flow-connector" aria-hidden="true"></div>
			<div class="earnings-flow-stack">
				{@render flowNode(vm.netIncome)}
				{@render flowNode(vm.tax)}
				{@render flowNode(vm.other)}
			</div>
		</div>
		{#if vm.researchDev.visible || vm.sga.visible}
			<div class="earnings-flow-breakdown">
				{@render breakdownPill(vm.researchDev)}
				{@render breakdownPill(vm.sga)}
			</div>
		{/if}
	{:else}
		<div class="earnings-flow-empty">
			<p class="font-semibold">Income statement data unavailable</p>
			{#if vm.error}
				<p class="mt-1 text-sm text-muted-foreground">{vm.error}</p>
			{:else}
				<p class="mt-1 text-sm text-muted-foreground">Enter a symbol to generate the flow.</p>
			{/if}
		</div>
	{/if}
</section>
