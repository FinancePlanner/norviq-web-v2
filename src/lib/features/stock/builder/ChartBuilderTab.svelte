<!--
	ChartBuilderTab (pages/stock/chart_builder.templ). The Alpine x-data state
	is $state here; the form's hx-get to /portfolio/{symbol}/builder/chart is a
	fetch of the same URL (now JSON), rendered by ChartBuilderResult in
	#chart-builder-results. The query is built with FormData from the form, so
	it carries exactly what htmx serialized (checked, enabled controls in DOM
	order, both growth values, the hidden limit).
-->
<script lang="ts">
	import { CheckboxField, Field, NativeButton, SubmitButton } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import ChartBuilderResult from './ChartBuilderResult.svelte';
	import {
		chartBuilderChartPath,
		chartBuilderFormatLabel,
		type ChartBuilderMetricVM,
		type ChartBuilderResultVM,
		type ChartBuilderTabVM
	} from './types.js';

	let { vm, symbol }: { vm: ChartBuilderTabVM; symbol: string } = $props();

	const maxMetrics = 20;

	// chartBuilderAlpineData: the initial x-data.
	const initial = () => {
		const selected: string[] = [];
		const ttmUnsupported: string[] = [];
		for (const group of vm.groups) {
			for (const metric of group.metrics) {
				if (metric.selected) selected.push(metric.key);
				if (!metric.supportsTTM) ttmUnsupported.push(metric.key);
			}
		}
		return { selected, ttmUnsupported };
	};
	const init = initial();
	let selected = $state<string[]>(init.selected);
	const ttmUnsupported = $derived(initial().ttmUnsupported);
	let period = $state('annual');
	let chartType = $state('bar');
	let showGrowth = $state(true);
	let compare = $state('');
	// x-model.debounce.150ms="metricQuery"
	let metricQueryInput = $state('');
	let metricQuery = $state('');
	$effect(() => {
		const q = metricQueryInput;
		const t = setTimeout(() => (metricQuery = q), 150);
		return () => clearTimeout(t);
	});

	function metricVisible(metric: ChartBuilderMetricVM): boolean {
		const searchText = (metric.label + ' ' + metric.key).toLowerCase();
		return !metricQuery || searchText.includes(metricQuery.toLowerCase());
	}

	function metricDisabled(metric: ChartBuilderMetricVM): boolean {
		return (!metric.supportsTTM && period === 'ttm') || (!selected.includes(metric.key) && selected.length >= maxMetrics);
	}

	function toggleMetric(key: string, checked: boolean) {
		if (checked) {
			if (!selected.includes(key)) selected = [...selected, key];
		} else {
			selected = selected.filter((k) => k !== key);
		}
	}

	// hx-get + hx-target="#chart-builder-results" + hx-indicator. Like htmx,
	// a non-2xx answer (or a network error) leaves the results untouched, and a
	// submit while a request is in flight is queued (htmx's default "queue last").
	let result = $state<ChartBuilderResultVM | null>(null);
	let loading = $state(false);
	let queued: string | null = null;

	async function request(query: string) {
		loading = true;
		try {
			const res = await fetch(chartBuilderChartPath(symbol) + '?' + query, {
				headers: { accept: 'application/json' }
			});
			if (res.ok) result = (await res.json()) as ChartBuilderResultVM;
		} catch {
			/* htmx:sendError: nothing is swapped */
		} finally {
			loading = false;
		}
		if (queued !== null) {
			const next = queued;
			queued = null;
			void request(next);
		}
	}

	function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		const form = event.currentTarget as HTMLFormElement;
		const params = new URLSearchParams();
		for (const [key, value] of new FormData(form)) {
			if (typeof value === 'string') params.append(key, value);
		}
		const query = params.toString();
		if (loading) {
			queued = query;
			return;
		}
		void request(query);
	}
</script>

{#snippet radio(name: string, value: string, label: string, current: string, set: (v: string) => void, onchange?: () => void)}
	<label class="cursor-pointer">
		<input
			type="radio"
			{name}
			{value}
			class="sr-only"
			checked={current === value}
			onchange={() => {
				set(value);
				onchange?.();
			}}
		/>
		<span
			class={[
				'block rounded-lg px-2 py-2 text-center text-xs font-semibold transition',
				current === value ? 'bg-[var(--color-surface)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)]'
			]}>{label}</span
		>
	</label>
{/snippet}

<div class="mt-6 space-y-4">
	<vigil.Panel class="p-5 md:p-6">
		<div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
			<div>
				<p class="text-footnote font-semibold text-[var(--muted-foreground)]">Financial explorer</p>
				<h2 class="mt-1 text-2xl font-semibold tracking-tight">Build a {symbol} chart</h2>
				<p class="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
					Combine statement line items, ratios, growth metrics, and derived cash-flow measures on one timeline.
				</p>
			</div>
			<a href="/chart-builder" class="btn-secondary inline-flex w-auto items-center px-4 py-2 text-sm">Choose another stock</a>
		</div>
	</vigil.Panel>

	{#if vm.error !== ''}
		<section class="glass-card p-6" role="alert">
			<p class="font-semibold">Metric catalog unavailable</p>
			<p class="mt-2 text-sm text-[var(--color-danger)]">{vm.error}</p>
		</section>
	{:else if vm.groups.length === 0}
		<section class="glass-card p-6">
			<p class="text-sm text-[var(--muted-foreground)]">No chart metrics are available right now.</p>
		</section>
	{:else}
		<form class="vigil-command-split is-aside-first items-start" {onsubmit}>
			<vigil.CommandSplitAside>
				<vigil.Panel class="p-4 md:p-5 lg:sticky lg:top-4">
					<div class="flex items-center justify-between gap-3">
						<div>
							<h3 class="font-semibold">Metrics</h3>
							<p class="mt-1 text-xs text-[var(--muted-foreground)]"><span>{selected.length}</span> of 20 selected</p>
						</div>
						<NativeButton class="text-xs font-semibold text-[var(--color-tint)]" onclick={() => (selected = [])}>
							Clear
						</NativeButton>
					</div>
					<label class="mt-4 block">
						<span class="sr-only">Filter metrics</span>
						<Field type="search" placeholder="Search metrics" bind:value={metricQueryInput} aria-label="Search metrics" />
					</label>
					<div class="mt-4 max-h-[36rem] space-y-3 overflow-y-auto pr-1">
						{#each vm.groups as group, index (group.key + ':' + index)}
							<details class="rounded-lg border border-[var(--border)] bg-[var(--color-elevated-card)]" open={index < 2}>
								<summary class="cursor-pointer px-3 py-3 text-sm font-semibold">{group.label}</summary>
								<div class="space-y-1 border-t border-[var(--border)] p-2">
									{#each group.metrics as metric, m (metric.key + ':' + m)}
										{@const disabled = metricDisabled(metric)}
										<label
											class={[
												'flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 text-sm transition hover:bg-[var(--color-surface)]',
												disabled && 'opacity-45 cursor-not-allowed'
											]}
											style:display={metricVisible(metric) ? undefined : 'none'}
										>
											<input
												type="checkbox"
												name="metrics"
												value={metric.key}
												class="mt-0.5 h-4 w-4 rounded accent-[var(--color-tint)]"
												checked={selected.includes(metric.key)}
												onchange={(e) => toggleMetric(metric.key, e.currentTarget.checked)}
												{disabled}
											/>
											<span class="min-w-0 flex-1">
												<span class="block leading-5">{metric.label}</span>
												<span class="mt-0.5 block text-footnote text-[var(--muted-foreground)]">
													{chartBuilderFormatLabel(metric.format)}
													{#if !metric.supportsTTM}
														<span> · no TTM</span>
													{/if}
												</span>
											</span>
										</label>
									{/each}
								</div>
							</details>
						{/each}
					</div>
				</vigil.Panel>
			</vigil.CommandSplitAside>
			<div class="vigil-command-split-main min-w-0 space-y-4">
				<vigil.Panel class="p-5 md:p-6">
					<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
						<fieldset>
							<legend class="text-footnote font-semibold text-[var(--muted-foreground)]">Period</legend>
							<div class="mt-2 grid grid-cols-3 rounded-xl bg-[var(--color-elevated-card)] p-1">
								{@render radio('period', 'annual', 'Annual', period, (v) => (period = v))}
								{@render radio('period', 'quarter', 'Quarterly', period, (v) => (period = v))}
								{@render radio(
									'period',
									'ttm',
									'TTM',
									period,
									(v) => (period = v),
									() => (selected = selected.filter((key) => !ttmUnsupported.includes(key)))
								)}
							</div>
						</fieldset>

						<fieldset>
							<legend class="text-footnote font-semibold text-[var(--muted-foreground)]">Chart</legend>
							<div class="mt-2 grid grid-cols-2 rounded-xl bg-[var(--color-elevated-card)] p-1">
								{@render radio('chartType', 'bar', 'Bar', chartType, (v) => (chartType = v))}
								{@render radio('chartType', 'line', 'Line', chartType, (v) => (chartType = v))}
							</div>
						</fieldset>

						<Field
							name="compare"
							label="Compare"
							description="Up to 3 tickers"
							placeholder="MSFT, GOOG"
							class="mt-2"
							wrapperClass="block"
							maxlength={32}
							bind:value={compare}
						/>

						<label class="flex min-h-[4.5rem] items-center gap-3 rounded-lg border border-[var(--border)] px-4 py-3">
							<input type="hidden" name="growth" value="false" />
							<CheckboxField name="growth" value="true" bind:checked={showGrowth} />
							<span>
								<span class="block text-sm font-semibold">Growth table</span>
								<span class="block text-[11px] text-[var(--muted-foreground)]">YoY, total, CAGR</span>
							</span>
						</label>
					</div>

					<input type="hidden" name="limit" value={period === 'annual' ? 10 : 20} />
					<div class="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-5">
						<SubmitButton class="px-7" disabled={selected.length === 0}>Build chart</SubmitButton>
						<!-- hx-indicator: htmx's injected .htmx-indicator opacity rule, inline. -->
						<span
							id="chart-builder-loading"
							class={['htmx-indicator text-sm text-[var(--muted-foreground)]', loading && 'htmx-request']}
							style:opacity={loading ? 1 : 0}
							style:transition="opacity 200ms ease-in"
							role="status">Building aligned series…</span
						>
						<p class="basis-full text-xs text-[var(--muted-foreground)]">
							Peer data is aligned to {symbol} by fiscal year and quarter; unmatched periods remain blank.
						</p>
					</div>
				</vigil.Panel>
				<div id="chart-builder-results" aria-live="polite">
					{#if result}
						<ChartBuilderResult {result} />
					{:else}
						<vigil.Panel class="p-8 text-center">
							<p class="text-sm font-semibold">Ready to build</p>
							<p class="mt-2 text-sm text-[var(--muted-foreground)]">
								Revenue and free cash flow are selected. Adjust the controls, then build your chart.
							</p>
						</vigil.Panel>
					{/if}
				</div>
			</div>
		</form>
	{/if}
</div>
