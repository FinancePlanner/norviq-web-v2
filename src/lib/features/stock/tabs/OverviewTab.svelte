<script lang="ts">
	// stock.OverviewTab and its cards (overview.templ).
	import { CardHeader, NativeButton, TechnicalsStrip } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { staggerOnMount } from '#lib/motion.js';
	import ChartTab from './ChartTab.svelte';
	import HeroCard from './HeroCard.svelte';
	import HeroMetric from './HeroMetric.svelte';
	import PressureCard from './PressureCard.svelte';
	import SentimentLabelBadge from './SentimentLabelBadge.svelte';
	import StatementTable from './StatementTable.svelte';
	import TerminalCard from './TerminalCard.svelte';
	import { notablePostCountLabel } from '../sentiment-labels.js';
	import { openValuation } from '../panels.svelte.js';
	import type { DetailViewModel } from '../detail.js';

	let { vm }: { vm: DetailViewModel } = $props();

	function targetRowClass(scenario: string): string {
		const s = scenario.trim().toLowerCase();
		if (s.includes('bear')) return 'target-bear';
		if (s.includes('bull')) return 'target-bull';
		return 'target-base';
	}
	function deltaBadgeClass(cls: string): string {
		if (cls === 'positive') return 'delta-positive';
		if (cls === 'negative') return 'delta-negative';
		return 'delta-neutral';
	}
	function targetBarWidth(scenario: string): string {
		const s = scenario.trim().toLowerCase();
		if (s.includes('bear')) return '32';
		if (s.includes('bull')) return '88';
		return '58';
	}
</script>

<div class="stock-detail-stack mt-6 space-y-4">
	<!-- The htmx quote poller's anchor; HeroCard runs the poll. -->
	<div id={'stock-quote-refresh-' + vm.symbol} aria-hidden="true"></div>
	<header class="mb-1">
		<h1 class="stock-thesis-title">
			{vm.symbol}{#if vm.companyName !== ''}{' · ' + vm.companyName}{/if}
		</h1>
	</header>
	<TechnicalsStrip vm={vm.technicals} />
	<vigil.CommandSplit class="stock-thesis-split">
		<vigil.CommandSplitMain>
			<HeroCard {vm} />
			<ChartTab chart={vm.chart} />
			{#if vm.hasPosition}
				<section class="stock-section-card glass-card p-6 md:p-8">
					<CardHeader title="Your position" />
					<dl class="stock-detail-grid mt-4">
						<div>
							<dt>Shares</dt>
							<dd>{vm.shares}</dd>
						</div>
						<div>
							<dt>Buy price</dt>
							<dd>{vm.buyPrice}</dd>
						</div>
						<div>
							<dt>Buy date</dt>
							<dd>{vm.buyDate}</dd>
						</div>
						<div>
							<dt>Category</dt>
							<dd>{vm.category}</dd>
						</div>
					</dl>
					{#if vm.notes !== ''}
						<div class="stock-notes mt-4">
							<p class="stock-notes-label">Notes</p>
							<p class="stock-notes-body">{vm.notes}</p>
						</div>
					{/if}
				</section>
			{/if}
		</vigil.CommandSplitMain>
		<vigil.CommandSplitAside>
			<!-- ThesisDriftPanel. Go never loaded sentiment for the overview, so the
			     empty branch is what renders. -->
			<section
				class="stock-section-card glass-card stock-thesis-drift-panel p-6 md:p-8"
				aria-labelledby="thesis-drift-title"
			>
				<p class="command-metric-label">AI drift monitoring</p>
				<h2 id="thesis-drift-title" class="stock-section-title mt-1">Thesis confidence</h2>
				{#if vm.sentiment.hasData}
					<div class="mt-4 flex flex-wrap items-center gap-3">
						<SentimentLabelBadge label={vm.sentiment.aggregateLabel} />
						<p class="text-sm text-muted-foreground">
							{notablePostCountLabel(vm.sentiment.postCount)} · Hermes watch
						</p>
					</div>
					{#if vm.consensus.hasData}
						<p class="mt-3 text-sm">
							Analyst consensus <span class="font-semibold">{vm.consensus.consensus}</span>
							<span class="opacity-60"> · {vm.consensus.totalRatings} ratings</span>
						</p>
					{/if}
					<a href={'/portfolio/' + vm.symbol + '/sentiment'} class="mcp-status-cta mt-4"
						>Open sentiment feed</a
					>
				{:else}
					<p class="mt-3 text-sm text-muted-foreground">
						No live sentiment drift for {vm.symbol} yet. Posts from tracked accounts will surface thesis
						shifts here.
					</p>
					<a href={'/portfolio/' + vm.symbol + '/sentiment'} class="mcp-status-cta mt-4"
						>Monitor sentiment</a
					>
				{/if}
			</section>
			<PressureCard symbol={vm.symbol} />
			<TerminalCard symbol={vm.symbol} />
			{#if vm.hasValuation}
				<section class="stock-section-card glass-card p-6 md:p-8">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<h2 class="stock-section-title">Valuation ranges</h2>
						{#if vm.isPro}
							<NativeButton
								class="btn-secondary px-4 py-2 text-sm"
								onclick={() => openValuation(vm.symbol)}>Edit valuation</NativeButton
							>
						{/if}
					</div>
					<dl class="stock-detail-grid mt-4">
						<div>
							<dt>Bear case</dt>
							<dd class="spring-pop" data-motion="spring">{vm.bearRange}</dd>
						</div>
						<div>
							<dt>Base case</dt>
							<dd class="spring-pop" data-motion="spring">{vm.baseRange}</dd>
						</div>
						<div>
							<dt>Bull case</dt>
							<dd class="spring-pop" data-motion="spring">{vm.bullRange}</dd>
						</div>
						{#if vm.valuationTargetDate !== ''}
							<div>
								<dt>Target date</dt>
								<dd>{vm.valuationTargetDate}</dd>
							</div>
						{/if}
					</dl>
					{#if vm.valuationRationale !== ''}
						<div class="stock-notes mt-4">
							<p class="stock-notes-label">Rationale</p>
							<p class="stock-notes-body">{vm.valuationRationale}</p>
						</div>
					{/if}
				</section>
			{:else if vm.isPro}
				<section class="stock-section-card glass-card p-6 md:p-8">
					<h2 class="stock-section-title">Valuation ranges</h2>
					<p class="mt-2 text-sm text-muted-foreground">
						Add bear, base, and bull price ranges for your thesis.
					</p>
					<NativeButton
						class="btn-secondary mt-4 px-4 py-2 text-sm"
						onclick={() => openValuation(vm.symbol)}>Add valuation</NativeButton
					>
				</section>
			{/if}
			{#if vm.consensus.hasData}
				<section class="stock-section-card glass-card p-6 md:p-8">
					<h2 class="stock-section-title">Analyst consensus</h2>
					{#if vm.consensus.error !== ''}
						<p class="mt-2 text-sm text-[var(--color-danger)]">{vm.consensus.error}</p>
					{:else}
						<p class="mt-1 text-sm text-muted-foreground">
							Recommendation mix from covered analysts
						</p>
						<div class="portfolio-metric-row mt-4">
							<HeroMetric label="Consensus" value={vm.consensus.consensus} />
							<HeroMetric label="Ratings" value={String(vm.consensus.totalRatings)} />
							<HeroMetric label="Bullish" value={vm.consensus.bullishPct} />
						</div>
						<dl class="stock-consensus-list mt-4 space-y-2">
							{#each vm.consensus.buckets as bucket (bucket.label)}
								{#if bucket.count > 0}
									<div class="stock-consensus-row flex items-center justify-between text-sm">
										<dt class="opacity-70">{bucket.label}</dt>
										<dd class="font-semibold">{bucket.count}</dd>
									</div>
								{/if}
							{/each}
						</dl>
					{/if}
				</section>
			{/if}
			{#if vm.targets.length > 0}
				<section class="stock-section-card glass-card card-hover p-6 md:p-8">
					<div class="flex items-baseline justify-between">
						<h2 class="stock-section-title">Scenario targets</h2>
						{#if vm.currentPrice !== '' && vm.currentPrice !== 'Pending'}
							<span class="text-xs text-muted-foreground">vs current {vm.currentPrice}</span>
						{/if}
					</div>
					<div
						class="stock-target-list mt-4 space-y-2"
						{@attach staggerOnMount(':scope > div', 55)}
					>
						{#each vm.targets as target, i (i)}
							<div class={'stock-target-row row-hover ' + targetRowClass(target.scenario)}>
								<div class="stock-target-main">
									<div class="flex items-center gap-2">
										<span class="stock-target-badge">{target.scenario}</span>
										{#if target.targetDate !== ''}<span class="stock-target-date"
												>{target.targetDate}</span
											>{/if}
									</div>
									<p class="stock-target-price spring-pop mt-1" data-motion="spring">
										{target.targetPrice}
									</p>
								</div>
								<div class="stock-target-delta text-right">
									{#if target.delta !== ''}
										<span class={'stock-target-delta-badge ' + deltaBadgeClass(target.deltaClass)}
											>{target.delta}</span
										>
									{/if}
									<div class="stock-target-visual mt-1.5" aria-hidden="true">
										<div class="target-bar">
											<div
												class="target-bar-fill"
												style={'width:' + targetBarWidth(target.scenario) + '%'}
											></div>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}
		</vigil.CommandSplitAside>
	</vigil.CommandSplit>
	{#if vm.hasProfile}
		<section class="stock-section-card glass-card p-6 md:p-8">
			<CardHeader title="Company profile" />
			<dl class="stock-detail-grid mt-4">
				<div>
					<dt>Exchange</dt>
					<dd>{vm.exchange}</dd>
				</div>
				<div>
					<dt>Industry</dt>
					<dd>{vm.industry}</dd>
				</div>
				<div>
					<dt>Country</dt>
					<dd>{vm.country}</dd>
				</div>
				<div>
					<dt>IPO</dt>
					<dd>{vm.ipo}</dd>
				</div>
				<div>
					<dt>Currency</dt>
					<dd>{vm.currency}</dd>
				</div>
				<div>
					<dt>Estimate currency</dt>
					<dd>{vm.estimateCurrency}</dd>
				</div>
				<div>
					<dt>Market cap</dt>
					<dd>{vm.marketCap}</dd>
				</div>
				<div>
					<dt>Shares outstanding</dt>
					<dd>{vm.sharesOutstanding}</dd>
				</div>
			</dl>
			{#if vm.website !== '' && vm.website !== '-'}
				<p class="stock-website mt-4">
					<a href={vm.website} class="link-tint" target="_blank" rel="noopener noreferrer"
						>{vm.website}</a
					>
				</p>
			{/if}
		</section>
	{/if}
	{#if vm.basicFinancials.hasData}
		<section class="stock-section-card glass-card p-6 md:p-8">
			<h2 class="stock-section-title">Key ratios</h2>
			{#if vm.basicFinancials.error !== ''}
				<p class="mt-2 text-sm text-[var(--color-danger)]">{vm.basicFinancials.error}</p>
			{:else}
				<p class="mt-1 text-sm text-muted-foreground">Latest market fundamentals</p>
				<StatementTable rows={vm.basicFinancials.metrics} />
			{/if}
		</section>
	{/if}
</div>
