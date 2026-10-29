<script lang="ts">
	// pages/portfolio/subpages.templ EarningsPage (earningsBody and helpers).
	import { CardHeader, EmptyStateInline, ProGateWrap } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import VisualizerCard from '#lib/features/portfolio/earningsviz/VisualizerCard.svelte';
	import type { EarningsDayVM } from '#lib/features/portfolio/analytics/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);

	function cellClass(day: EarningsDayVM): string {
		let cls = 'earnings-calendar-cell';
		if (day.isToday) cls += ' earnings-calendar-cell-today';
		if (day.hasEvents) cls += ' earnings-calendar-cell-active';
		return cls;
	}
</script>

<svelte:head>
	<title>Earnings - Norviq</title>
	<meta name="keywords" content="Portfolio holdings" />
	<meta name="description" content="View and manage your stock, ETF, and crypto positions." />
</svelte:head>

{#snippet marketEarningsCalendarLink()}
	<a href="/markets/earnings" class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted" data-markets-earnings-link>Market earnings calendar</a>
{/snippet}

<ProGateWrap isPro={data.isPro} featureName="Earnings calendar">
	<vigil.CanvasPage pageClass="portfolio-earnings-page earnings-modern-page" title="Earnings calendar" subtitle={vm.monthLabel} actions={marketEarningsCalendarLink}>
		<VisualizerCard vm={vm.visualizer} />
		<vigil.CommandSplit class="earnings-modern-layout">
			<vigil.CommandSplitMain>
				<section class="earnings-calendar-panel" aria-label={vm.monthLabel}>
					<div class="earnings-calendar-weekdays" aria-hidden="true">
						<span>Sun</span>
						<span>Mon</span>
						<span>Tue</span>
						<span>Wed</span>
						<span>Thu</span>
						<span>Fri</span>
						<span>Sat</span>
					</div>
					<div class="earnings-calendar-grid">
						{#each vm.calendarDays as day, i (i)}
							{#if !day.inMonth}
								<div class="earnings-calendar-cell earnings-calendar-cell-pad" aria-hidden="true"></div>
							{:else}
								<div class={cellClass(day)}>
									<span class="earnings-calendar-day">{day.day}</span>
									{#if day.symbols.length > 0}
										<span class="earnings-calendar-symbols">
											{#each day.symbols as symbol, j (j)}
												{#if j > 0}
													<span aria-hidden="true">·</span>
												{/if}
												<span>{symbol}</span>
											{/each}
											{#if day.eventCount > day.symbols.length}
												<span class="earnings-calendar-more">+{day.eventCount - day.symbols.length}</span>
											{/if}
										</span>
									{:else if day.hasEvents}
										<span class="earnings-calendar-dot" aria-label={`${day.eventCount} events`}></span>
									{/if}
								</div>
							{/if}
						{/each}
					</div>
				</section>
			</vigil.CommandSplitMain>
			<vigil.CommandSplitAside>
				<div class="earnings-upcoming-panel">
					<CardHeader title="Upcoming" desc="Nearest reported events for tracked symbols." />
					{#if vm.upcoming.length > 0}
						<ul class="earnings-upcoming-list vigil-dense-list">
							{#each vm.upcoming as event, i (i)}
								<a href={event.detailURL} class="earnings-upcoming-row">
									<div class="earnings-upcoming-main">
										<span class="earnings-upcoming-symbol">{event.symbol}</span>
										<span class="earnings-upcoming-date">{event.date}</span>
									</div>
									{#if event.epsEstimate !== ''}
										<p class="earnings-upcoming-eps">EPS est. {event.epsEstimate}</p>
									{/if}
									{#if event.hasPortfolio}
										<span class="earnings-portfolio-badge">In portfolio</span>
									{/if}
								</a>
							{/each}
						</ul>
					{:else}
						<EmptyStateInline title="No earnings scheduled" description="Dates for your portfolio symbols will appear here." />
					{/if}
				</div>
			</vigil.CommandSplitAside>
		</vigil.CommandSplit>
	</vigil.CanvasPage>
</ProGateWrap>
