<script lang="ts">
	// reports.DeepDiveIndexPage
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { Icon, SegmentedControl } from '#lib/components/norviq/index.js';
	import { reportTabs } from '#lib/features/insights/reports/cards.js';

	// Go asked for "pie-chart" and "bar-chart-3", which its icon set does not
	// carry (the lookup errors). These are the same Lucide glyphs under their
	// current names.
	const cards = [
		{ title: 'Calendar Performance', desc: 'Analyze historical returns by day and month.', href: '/reports/deep-dive/calendar', icon: 'calendar' },
		{ title: 'Sector Allocation', desc: 'Breakdown of exposure across market sectors.', href: '/reports/deep-dive/sectors', icon: 'chart-pie' },
		{ title: 'Winners vs. Losers', desc: 'Compare top performing assets against laggards.', href: '/reports/deep-dive/winners', icon: 'trending-up' },
		{ title: 'Stock Scorecard', desc: 'Comprehensive metrics for individual holdings.', href: '/reports/deep-dive/scorecard', icon: 'clipboard-list' },
		{ title: 'Contribution Analysis', desc: 'See which assets drove your portfolio returns.', href: '/reports/deep-dive/contribution', icon: 'chart-column' },
		{ title: 'Currency Split', desc: 'View portfolio exposure by fiat currency.', href: '/reports/deep-dive/currency', icon: 'coins' },
		{ title: 'Notes Quality', desc: 'Analyze the depth and recency of your research.', href: '/reports/deep-dive/notes', icon: 'book-open' },
		{ title: 'Volatility Snapshot', desc: 'Understand portfolio risk and beta.', href: '/reports/deep-dive/volatility', icon: 'activity' }
	];
</script>

<svelte:head>
	<title>Deep Dive Reports - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-deck-page reports-page reports-modern-page">
	<vigil.ModernPageHeader title="Deep Dive" />
	<div>
		<SegmentedControl items={reportTabs()} activePath="/reports/deep-dive" />
	</div>

	<div class="mt-8">
		<vigil.CommandDeck class="is-3col">
			{#each cards as c (c.href)}
				<a href={c.href} class="glass-card p-6 card-hover flex flex-col items-start text-left">
					<div class="p-3 bg-card rounded-xl mb-4 text-[var(--color-primary)]">
						<Icon name={c.icon} class="h-6 w-6" />
					</div>
					<h3 class="text-lg font-bold">{c.title}</h3>
					<p class="text-sm text-muted-foreground mt-2">{c.desc}</p>
				</a>
			{/each}
		</vigil.CommandDeck>
	</div>
</div>
