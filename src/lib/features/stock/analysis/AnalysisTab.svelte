<!--
	templ AnalysisTab(vm DetailViewModel) and its sub-templates
	(norviq-web internal/pages/stock/analysis.templ). Strings are English
	literals in Go too (no i18n.T).
-->
<script lang="ts">
	import { EmptyState, SectionCard } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import GrowthSparkline from '#lib/charts/GrowthSparkline.svelte';
	import { formatFloat } from '#lib/format.js';
	import type { ConsensusBucketVM } from '../types.js';
	import { analysisScrollSpy } from './scroll-spy.js';
	import type { AnalysisTabVM } from './types.js';

	// symbol is part of the tab contract; the Go template never printed it.
	let { vm }: { vm: AnalysisTabVM; symbol: string } = $props();

	const spy = $state({ active: '' });
	const isActive = (id: string) => spy.active === id;

	function consensusBucketClass(label: string): string {
		switch (label) {
			case 'Strong buy':
			case 'Buy':
				return 'buy';
			case 'Strong sell':
			case 'Sell':
				return 'sell';
			default:
				return 'hold';
		}
	}

	// growthTone vocabulary → KPI / sparkline class.
	function metricToneClass(tone: string): string {
		switch (tone) {
			case 'positive':
				return 'fin-tone-positive';
			case 'negative':
				return 'fin-tone-negative';
			default:
				return '';
		}
	}

	// growthTone vocabulary → metric cell class.
	function metricSentimentClass(tone: string): string {
		switch (tone) {
			case 'positive':
				return 'is-positive';
			case 'negative':
				return 'is-negative';
			default:
				return '';
		}
	}

	const cls = (...parts: string[]) => parts.filter(Boolean).join(' ');
	const positive = (buckets: ConsensusBucketVM[]) => buckets.filter((b) => b.count > 0);
</script>

<div class="fin-analysis mt-6">
	{#if vm.hasData}
		<vigil.CommandDeck class="is-2col">
			{#if vm.kpis.length > 0}
				<vigil.Panel class="fin-analysis-kpi-strip p-4 md:p-5">
					<p class="fin-analysis-eyebrow">At a glance</p>
					<div class="fin-analysis-kpi-grid mt-3">
						{#each vm.kpis as kpi, i (i)}
							<div class="fin-analysis-kpi">
								<p class="fin-analysis-kpi-label">{kpi.label}</p>
								<p class={cls('fin-analysis-kpi-value spring-pop', metricToneClass(kpi.tone))} data-motion="spring">{kpi.value}</p>
							</div>
						{/each}
					</div>
				</vigil.Panel>
			{/if}
			{#if vm.dcfBand.hasData}
				{@const band = vm.dcfBand}
				<vigil.Panel class="fin-analysis-dcf p-5 md:p-6">
					<div class="flex flex-wrap items-end justify-between gap-3">
						<div>
							<p class="fin-analysis-eyebrow">Fair value range</p>
							<p class="fin-analysis-dcf-current mt-1 spring-pop" data-motion="spring">{band.currentLabel}</p>
							<p class="fin-analysis-dcf-sub mt-1">
								{#if band.upsideLabel !== ''}{band.upsideLabel}{:else if band.downsideLabel !== ''}{band.downsideLabel}{/if}
							</p>
						</div>
						<div class="fin-analysis-dcf-legend text-right text-xs text-muted-foreground">
							<p>Bear {band.bearLabel}</p>
							<p>Base {band.baseLabel}</p>
							<p>Bull {band.bullLabel}</p>
						</div>
					</div>
					<div class="fin-dcf-track mt-5">
						<div class="fin-dcf-gradient"></div>
						<div class="fin-dcf-marker" style="left: {formatFloat(band.markerPct, 2)}%" aria-hidden="true"></div>
					</div>
					<div class="fin-dcf-labels mt-2 flex justify-between text-[11px] font-semibold text-muted-foreground">
						<span>Bear</span>
						<span>Base</span>
						<span>Bull</span>
					</div>
				</vigil.Panel>
			{/if}
		</vigil.CommandDeck>
		{#if vm.consensus.hasData}
			{@const c = vm.consensus}
			<vigil.Panel class="fin-analysis-consensus p-5 md:p-6">
				<div class="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p class="fin-analysis-eyebrow">Analyst consensus</p>
						<div class="portfolio-metric-row mt-3">
							{@render analysisMetric('Rating', c.consensus)}
							{@render analysisMetric('Coverage', String(c.totalRatings))}
							{@render analysisMetric('Bullish', c.bullishPct)}
						</div>
					</div>
					{#if c.buckets.length > 0}
						<div class="fin-consensus-bar-wrap" aria-hidden="true">
							<div class="fin-consensus-bar">
								{#each positive(c.buckets) as bucket (bucket.label)}
									<div
										class={'fin-consensus-seg fin-consensus-' + consensusBucketClass(bucket.label)}
										style="flex-grow: {bucket.count}"
										title="{bucket.label}: {bucket.count}"
									></div>
								{/each}
							</div>
							<div class="fin-consensus-legend mt-2">
								{#each positive(c.buckets) as bucket (bucket.label)}
									<span class="fin-consensus-legend-item">
										<span class={'fin-consensus-dot fin-consensus-' + consensusBucketClass(bucket.label)}></span>
										{bucket.label} {bucket.count}
									</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</vigil.Panel>
		{/if}
		{#if vm.sections.length > 0}
			<nav class="fin-analysis-nav" aria-label="Analysis sections" {@attach analysisScrollSpy(spy)}>
				{#each vm.sections as section (section.id)}
					<a
						href="#fin-{section.id}"
						class={cls('fin-analysis-nav-link', isActive(section.id) ? 'is-active' : '')}
						aria-current={isActive(section.id) ? 'location' : undefined}
					>
						{section.title}
						{#if section.id !== 'estimates' && section.metrics.length > 0}
							<span class="fin-analysis-nav-count">{section.metrics.length}</span>
						{/if}
					</a>
				{/each}
			</nav>
		{/if}
		{#each vm.sections as section (section.id)}
			{#if section.id === 'estimates'}
				{#if vm.estimates.length > 0}
					<vigil.Panel class="fin-analysis-section p-5 md:p-6" titleID={'fin-' + section.id}>
						{@render sectionHead(section.id, section.title, section.subtitle)}
						<vigil.DataTable class="fin-estimates-wrap mt-4">
							<thead>
								<tr>
									<th scope="col">Period</th>
									<th scope="col" class="text-right">Revenue</th>
									<th scope="col" class="text-right">EPS</th>
									<th scope="col" class="text-right">EBITDA</th>
									<th scope="col" class="text-right">Net income</th>
									<th scope="col" class="text-right">Analysts</th>
								</tr>
							</thead>
							<tbody>
								{#each vm.estimates as row, i (i)}
									<tr>
										<th scope="row">{row.period}</th>
										<td class="text-right vigil-mono tabular-nums">{row.revenue}</td>
										<td class="text-right vigil-mono tabular-nums">{row.eps}</td>
										<td class="text-right vigil-mono tabular-nums">{row.ebitda}</td>
										<td class="text-right vigil-mono tabular-nums">{row.netIncome}</td>
										<td class="text-right vigil-mono tabular-nums">{row.analystsEPS}</td>
									</tr>
								{/each}
							</tbody>
						</vigil.DataTable>
					</vigil.Panel>
				{/if}
			{:else}
				<vigil.Panel class="fin-analysis-section p-5 md:p-6" titleID={'fin-' + section.id}>
					{@render sectionHead(section.id, section.title, section.subtitle)}
					{#if section.growthSparklines.length > 0}
						<div class="fin-growth-sparklines mt-4" aria-label="Multi-year growth trends">
							{#each section.growthSparklines as item (item.label)}
								<div class="fin-growth-sparkline-card">
									<div class="fin-growth-sparkline-head">
										<p class="fin-growth-sparkline-label">{item.label}</p>
										<p class={cls('fin-growth-sparkline-latest', metricToneClass(item.tone))}>{item.latest}</p>
									</div>
									<GrowthSparkline points={item.points} tone={item.tone} />
									<div class="fin-growth-sparkline-years">
										<span>{item.yearStart}</span>
										<span>{item.yearEnd}</span>
									</div>
								</div>
							{/each}
						</div>
					{/if}
					<div class="fin-analysis-metric-grid mt-4">
						{#each section.metrics as metric, i (i)}
							<div class="fin-analysis-metric">
								<p class="command-metric-label">{metric.label}</p>
								<p class={cls('command-metric-value', metricSentimentClass(metric.tone))}>{metric.value}</p>
								{#if metric.hint !== ''}
									<p class="fin-analysis-metric-hint">{metric.hint}</p>
								{/if}
							</div>
						{/each}
					</div>
				</vigil.Panel>
			{/if}
		{/each}
		<p class="fin-analysis-footnote">Figures are trailing or consensus where labeled. Growth rates use fiscal-year comparisons.</p>
	{:else}
		<SectionCard title="Analysis">
			<EmptyState
				title="Analysis unavailable"
				description="Fundamental metrics will populate when market data is available for this symbol."
			/>
		</SectionCard>
	{/if}
</div>

{#snippet sectionHead(id: string, title: string, subtitle: string)}
	<header class="fin-analysis-section-head">
		<h2 id="fin-{id}" class="fin-analysis-section-title">{title}</h2>
		{#if subtitle !== ''}
			<p class="fin-analysis-section-sub">{subtitle}</p>
		{/if}
	</header>
{/snippet}

<!-- analysisMetric(label, value): the consensus row's label/value pair. -->
{#snippet analysisMetric(label: string, value: string)}
	<div class="command-metric">
		<span class="command-metric-label">{label}</span>
		<span class="command-metric-value">{value}</span>
	</div>
{/snippet}
