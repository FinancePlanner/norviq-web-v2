<script lang="ts">
	// markets.EarningsCalendarPage
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { earningsEmptyMessage, scopeIsMine } from '#lib/features/insights/markets/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
	const mine = $derived(scopeIsMine(vm));
</script>

<svelte:head>
	<title>Earnings calendar - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet actions()}
	<a
		href={vm.prevHref}
		class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
		rel="prev">← Previous week</a
	>
	<a href={vm.thisWeekHref} class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
		>This week</a
	>
	<a
		href={vm.nextHref}
		class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
		rel="next">Next week →</a
	>
{/snippet}

<vigil.CanvasPage
	pageClass="markets-earnings-page"
	title="Earnings calendar"
	subtitle={vm.weekLabel}
	{actions}
>
	<nav
		class="markets-earnings-scope flex flex-wrap items-center gap-2"
		aria-label="Earnings calendar scope"
	>
		<a
			href={vm.allHref}
			class={['rounded-full border px-3 py-1 text-sm', !mine && 'bg-muted font-semibold']}
			aria-current={!mine ? 'page' : undefined}
		>
			All companies
		</a>
		<a
			href={vm.mineHref}
			class={['rounded-full border px-3 py-1 text-sm', mine && 'bg-muted font-semibold']}
			aria-current={mine ? 'page' : undefined}
		>
			My symbols
		</a>
	</nav>
	{#if vm.loadError}
		<p class="mt-4 text-sm text-muted-foreground">
			The calendar is unavailable right now. Try again shortly.
		</p>
	{:else if vm.rowCount === 0}
		<p class="mt-4 text-sm text-muted-foreground">{earningsEmptyMessage(vm)}</p>
	{/if}
	<div class="markets-earnings-week mt-6 grid gap-4 md:grid-cols-5">
		{#each vm.days as day (day.isoDate)}
			<section
				class={['markets-earnings-day glass-card p-4', day.isToday && 'markets-earnings-day-today']}
				aria-label={day.label + ' ' + day.dateLabel}
			>
				<header class="flex items-baseline justify-between gap-2">
					<h2 class="text-sm font-semibold">{day.label}</h2>
					<time class="text-xs text-muted-foreground" datetime={day.isoDate}>{day.dateLabel}</time>
				</header>
				{#if day.rows.length === 0}
					<p class="mt-3 text-xs text-muted-foreground">No reports</p>
				{:else}
					<ul class="mt-3 space-y-3">
						{#each day.rows as row, i (i)}
							<li class="markets-earnings-row border-t pt-3 first:border-t-0 first:pt-0">
								<a href={row.detailURL} class="text-sm font-semibold hover:underline"
									>{row.symbol}</a
								>
								{#if row.isMine}
									<span class="ml-2 rounded-full border px-2 py-0.5 text-xs font-medium">Yours</span
									>
								{/if}
								{#if row.company}
									<p class="truncate text-xs text-muted-foreground" title={row.company}>
										{row.company}
									</p>
								{/if}
								<dl class="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
									<div class="flex gap-1">
										<dt>EPS est.</dt>
										<dd class="tabular-nums">{row.epsEstimate}</dd>
									</div>
									<div class="flex gap-1">
										<dt>Rev. est.</dt>
										<dd class="tabular-nums">{row.revenueEstimate}</dd>
									</div>
								</dl>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/each}
	</div>
</vigil.CanvasPage>
