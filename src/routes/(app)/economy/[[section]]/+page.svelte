<script lang="ts">
	// economy.Page(vm) — internal/pages/economy/page.templ. Strings are English
	// literals because the Go templ has no i18n.T calls (pt-PT shows English there too).
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import SegmentedControl from '#lib/components/norviq/SegmentedControl.svelte';
	import CardHeader from '#lib/components/norviq/CardHeader.svelte';
	import { formatFloat } from '#lib/format.js';
	import EconomyNewsSection from '#lib/features/insights/economy/EconomyNewsSection.svelte';
	import EconomyNewsShell from '#lib/features/insights/economy/EconomyNewsShell.svelte';
	import {
		COUNTRY_OPTIONS,
		countryChipClass,
		countryHref,
		moverClass,
		pageSubtitle,
		pageTitle,
		sectionActivePath,
		sectionBasePath,
		sectionTabs
	} from '#lib/features/insights/economy/types.js';

	let { data } = $props();
	const vm = $derived(data.vm);
</script>

<svelte:head>
	<title>{data.title}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-deck-page economy-page economy-modern-page">
	<vigil.ModernPageHeader title={pageTitle(vm.section)} subtitle={pageSubtitle(vm.section)} />
	<div>
		<SegmentedControl
			items={sectionTabs(vm.countryQuery)}
			activePath={sectionActivePath(vm.section, vm.countryQuery)}
		/>
	</div>
	<div class="mt-4 flex flex-wrap gap-2" role="group" aria-label="Country">
		{#each COUNTRY_OPTIONS as opt (opt.code)}
			<a
				href={countryHref(sectionBasePath(vm.section), opt.code)}
				class={countryChipClass(vm.country, opt.code)}
			>
				{opt.code}
				<span class="opacity-60"> {opt.label}</span>
			</a>
		{/each}
	</div>
	{#if vm.errorMessage}
		<div class="glass-card mt-6 p-6" role="alert">
			<p class="font-semibold">Could not load economy data</p>
			<p class="mt-2 text-sm text-muted-foreground">{vm.errorMessage}</p>
		</div>
	{:else}
		{#if vm.coverage.length > 0 || vm.missing.length > 0}
			<div class="mt-4 flex flex-wrap gap-2">
				{#each vm.coverage as tag, i (i)}
					<span class="rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success"
						>{tag}</span
					>
				{/each}
				{#each vm.missing as tag, i (i)}
					<span class="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning"
						>{tag} · limited</span
					>
				{/each}
			</div>
		{/if}
		{#if vm.section === 'personal'}
			{@render personalInflationBody()}
		{:else if vm.section === 'housing'}
			{@render indicatorGrid()}
		{:else if vm.section === 'growth'}
			{@render growthBody()}
		{:else if vm.section === 'fed'}
			{@render fedBody()}
		{:else}
			{@render inflationBody()}
		{/if}
		{#if vm.notes}
			<p class="mt-4 text-sm text-muted-foreground">{vm.notes}</p>
		{/if}
		{#if vm.asOf}
			<p class="mt-2 text-xs opacity-45">As of {vm.asOf} · {vm.source} · updated {vm.updatedAt}</p>
		{/if}
	{/if}
</div>

{#snippet inflationBody()}
	<vigil.CommandDeck class="is-3col mt-6">
		<vigil.Panel class="rounded-lg p-6" titleID="inflation-headline">
			<p class="command-metric-label">Headline · {vm.country}</p>
			<p class="mt-2 text-4xl font-semibold tracking-tight tabular-nums">{vm.headline.nowValue}</p>
			<p class="mt-1 text-sm text-muted-foreground">{vm.headline.name}</p>
			{#if vm.headline.hasOfficial}
				<p class="mt-2 text-sm text-muted-foreground">
					Official {vm.headline.officialValue} · gap {vm.headline.gap}
				</p>
			{/if}
			{#if vm.hasNextPrint}
				<div class="mt-4 border-t border-border pt-3 text-sm">
					<p class="font-semibold">Next print</p>
					{#if vm.nextPrint.daysRemaining}
						<p class="mt-1 text-muted-foreground">{vm.nextPrint.daysRemaining}</p>
					{/if}
					{#if vm.nextPrint.date}
						<p class="text-muted-foreground">{vm.nextPrint.date}</p>
					{/if}
					{#if vm.nextPrint.forecast || vm.nextPrint.consensus}
						<p class="mt-1 text-muted-foreground">
							{#if vm.nextPrint.forecast}Forecast {vm.nextPrint.forecast}{/if}
							{#if vm.nextPrint.consensus}· Street {vm.nextPrint.consensus}{/if}
						</p>
					{/if}
				</div>
			{/if}
		</vigil.Panel>
		{#if vm.gauges.length > 0}
			<vigil.Panel class="rounded-lg p-6" titleID="inflation-gauges">
				<CardHeader title="Gauges" />
				<div
					class="mt-4 divide-y"
					style="border-color: color-mix(in srgb, currentColor 10%, transparent);"
				>
					{#each vm.gauges as g, i (i)}
						<div class="flex items-center justify-between gap-3 py-3">
							<span class="text-sm">{g.name}</span>
							<span class="font-semibold tabular-nums">{g.nowValue}</span>
						</div>
					{/each}
				</div>
			</vigil.Panel>
		{/if}
		{#if vm.movers.length > 0}
			<vigil.Panel class="rounded-lg p-6" titleID="inflation-movers">
				<CardHeader title="Top movers" />
				<div class="mt-4 space-y-3">
					{#each vm.movers as m, i (i)}
						<div class="flex items-center justify-between gap-3 text-sm">
							<span>{m.category}</span>
							<span class={moverClass(m.direction)}>{m.changeYoY} YoY</span>
						</div>
					{/each}
				</div>
			</vigil.Panel>
		{/if}
	</vigil.CommandDeck>
	{#if vm.trend.points}
		<vigil.Panel class="mt-6 rounded-lg p-6" titleID="inflation-trend">
			<CardHeader title="Inflation trend" desc="Official headline rate" />
			<div class="mt-5 overflow-hidden rounded-lg border border-current/10 p-3">
				<div class="mb-2 flex justify-between text-xs text-muted-foreground">
					<span>{vm.trend.maxLabel}</span><span>YoY</span>
				</div>
				<svg
					viewBox="0 0 1000 250"
					class="h-52 w-full"
					preserveAspectRatio="none"
					role="img"
					aria-label="Headline inflation history"
				>
					<polyline
						points={vm.trend.points}
						fill="none"
						stroke="currentColor"
						stroke-width="7"
						stroke-linecap="round"
						stroke-linejoin="round"
					></polyline>
				</svg>
				<div class="mt-2 flex justify-between text-xs text-muted-foreground">
					<span>{vm.trend.startLabel} · {vm.trend.minLabel} low</span><span
						>{vm.trend.endLabel}</span
					>
				</div>
			</div>
		</vigil.Panel>
	{/if}
	{#if vm.components.length > 0}
		<vigil.Panel class="mt-6 rounded-lg p-6" titleID="inflation-components">
			<CardHeader title="Inflation components" desc="What is moving the basket" />
			<div class="mt-4 grid gap-3 sm:grid-cols-2">
				{#each vm.components as component, i (i)}
					<div class="rounded-lg border border-current/10 p-4">
						<div class="flex items-start justify-between gap-3">
							<span class="text-sm font-medium">{component.category}</span><span
								class="font-semibold tabular-nums">{component.rate}</span
							>
						</div>
						{#if component.weight}
							<p class="mt-2 text-xs text-muted-foreground">{component.weight}</p>
						{/if}
					</div>
				{/each}
			</div>
		</vigil.Panel>
	{/if}
	{#if vm.items.length > 0}
		<vigil.Panel class="mt-6 rounded-lg p-6" titleID="inflation-items">
			<CardHeader title="Everyday prices" desc="Tracked essentials" />
			<div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{#each vm.items as item, i (i)}
					<div class="rounded-lg border border-current/10 p-4">
						<p class="text-sm"><span class="mr-1">{item.emoji}</span>{item.name}</p>
						<p class="mt-2 text-lg font-semibold tabular-nums">{item.value}</p>
						{#if item.change}
							<p class="mt-1 text-xs text-muted-foreground">{item.change}</p>
						{/if}
					</div>
				{/each}
			</div>
		</vigil.Panel>
	{/if}
	<!-- economyNewsShell: Go lazy-loaded /economy/news so a provider fetch never blocked the page. -->
	<div id="economy-news-section">
		{#await data.news}
			<EconomyNewsShell />
		{:then news}
			<EconomyNewsSection items={news?.items ?? null} />
		{/await}
	</div>
{/snippet}

{#snippet personalInflationBody()}
	<section class="glass-card mt-6 p-6">
		<p class="text-footnote font-semibold text-muted-foreground">
			Your spending-weighted rate · {vm.country}
		</p>
		{#if vm.personal.hasRate}
			<p class="mt-3 text-5xl font-semibold tracking-tight text-[var(--color-tint)]">
				{vm.personal.rate}
			</p>
			{#if vm.personal.comparison}
				<p class="mt-2 font-medium">{vm.personal.comparison}</p>
			{/if}
		{:else}
			<p class="mt-3 text-2xl font-bold">Not enough mapped spending yet</p>
			<p class="mt-2 text-sm text-muted-foreground">
				Add groceries, housing, utilities, transport, or other everyday expenses to build your rate.
			</p>
		{/if}
		<div class="mt-5 grid gap-3 sm:grid-cols-3">
			<div class="rounded-lg border border-current/10 p-4">
				<p class="text-xs text-muted-foreground">Official inflation</p>
				<p class="mt-1 text-xl font-semibold">{vm.personal.officialRate}</p>
			</div>
			<div class="rounded-lg border border-current/10 p-4">
				<p class="text-xs text-muted-foreground">Average monthly spend</p>
				<p class="mt-1 text-xl font-semibold">{vm.personal.monthlySpend}</p>
			</div>
			{#if vm.personal.annualImpact}
				<div class="rounded-lg border border-current/10 p-4">
					<p class="text-xs text-muted-foreground">Estimated annual price impact</p>
					<p class="mt-1 text-xl font-semibold">{vm.personal.annualImpact}</p>
				</div>
			{/if}
		</div>
	</section>
	<section class="glass-card mt-6 p-6">
		<div class="flex items-center justify-between">
			<h2 class="font-semibold">Expense coverage</h2>
			<span class="font-semibold tabular-nums">{vm.personal.coverage}</span>
		</div>
		<progress
			class="mt-3 h-2 w-full overflow-hidden rounded-full"
			value={formatFloat(vm.personal.coverageValue, 0)}
			max="100"
			aria-label="Mapped expense coverage"
		></progress>
		<p class="mt-3 text-sm text-muted-foreground">
			{`${vm.personal.expenseCount} expenses · ${vm.personal.mappedSpend} of ${vm.personal.totalSpend} mapped over ${vm.personal.periodMonths} months`}
		</p>
	</section>
	{#if vm.personal.components.length > 0}
		<section class="glass-card mt-6 p-6">
			<CardHeader
				title="What drives your rate"
				desc="Official components weighted by your expenses"
			/>
			<div class="mt-4 divide-y divide-current/10">
				{#each vm.personal.components as component, i (i)}
					<div class="flex items-center justify-between gap-4 py-4">
						<div>
							<p class="font-medium">{component.category}</p>
							<p class="mt-1 text-xs text-muted-foreground">
								{component.macroCategory} · {component.weight}
							</p>
						</div>
						<div class="text-right">
							<p class="font-semibold tabular-nums">{component.rate}</p>
							<p class="mt-1 text-xs text-muted-foreground">{component.spend}</p>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}
	<p class="mt-4 text-xs text-muted-foreground">
		Calculated from recorded expenses. Savings, investments, and categories without an official
		match are excluded.
	</p>
{/snippet}

{#snippet growthBody()}
	{#if vm.riskLabel || vm.officialRecession !== null || vm.yieldCurveSpread}
		<section class="glass-card mt-6 p-6">
			<CardHeader title="Risk snapshot" />
			<div class="mt-4 grid gap-3 sm:grid-cols-3">
				{#if vm.riskLabel}
					<div class="rounded-lg border border-current/10 p-4">
						<p class="text-xs text-muted-foreground">Risk label</p>
						<p class="mt-1 text-lg font-semibold capitalize">{vm.riskLabel}</p>
					</div>
				{/if}
				{#if vm.officialRecession !== null}
					<div class="rounded-lg border border-current/10 p-4">
						<p class="text-xs text-muted-foreground">Official recession</p>
						<p class="mt-1 text-lg font-semibold">{vm.officialRecession ? 'Yes' : 'No'}</p>
					</div>
				{/if}
				{#if vm.yieldCurveSpread}
					<div class="rounded-lg border border-current/10 p-4">
						<p class="text-xs text-muted-foreground">10Y–2Y spread</p>
						<p class="mt-1 text-lg font-semibold">{vm.yieldCurveSpread}</p>
					</div>
				{/if}
			</div>
		</section>
	{/if}
	{@render indicatorGrid()}
{/snippet}

{#snippet fedBody()}
	<section class="glass-card mt-6 p-6">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<p class="text-footnote font-semibold text-muted-foreground">{vm.institution}</p>
				<p class="mt-2 text-sm text-muted-foreground">
					Inflation vs {vm.inflationTarget} target · gap {vm.distanceToTarget}
				</p>
			</div>
			{#if vm.stance}
				<span
					class="rounded-full bg-[var(--color-tint)]/15 px-3 py-1 text-xs font-semibold capitalize"
					>{vm.stance}</span
				>
			{/if}
		</div>
		{#if vm.hasMeeting}
			<div class="mt-5 rounded-lg border border-current/10 px-4 py-3">
				<p class="font-semibold">{vm.meeting.label}</p>
				{#if vm.meeting.daysRemaining}
					<p class="mt-1 text-sm text-muted-foreground">{vm.meeting.daysRemaining}</p>
				{/if}
				{#if vm.meeting.hasOdds}
					<div class="mt-3 space-y-2">
						{#each vm.meeting.odds as odd, i (i)}
							<div class="flex justify-between text-sm">
								<span>{odd.move}</span>
								<span class="font-semibold">{odd.probability}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</section>
	{@render indicatorGrid()}
{/snippet}

{#snippet indicatorGrid()}
	<vigil.CommandDeck class="is-2col mt-6">
		{#each vm.indicators as ind, i (i)}
			<!-- Go passes the label as the panel's titleID (aria-labelledby); kept as-is. -->
			<vigil.Panel class="rounded-lg p-5" titleID={ind.label}>
				<p class="command-metric-label">{ind.label}</p>
				{#if ind.covered}
					<p class="mt-2 text-2xl font-bold tabular-nums">{ind.value}</p>
					{#if ind.detail}
						<p class="mt-1 text-sm text-muted-foreground">{ind.detail}</p>
					{/if}
					{#if ind.asOf}
						<p class="mt-2 text-xs opacity-45">{ind.asOf}</p>
					{/if}
				{:else}
					<p class="mt-2 text-sm font-semibold text-muted-foreground">Not covered</p>
					<span
						class="mt-3 inline-flex rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning"
						>limited coverage</span
					>
				{/if}
			</vigil.Panel>
		{/each}
	</vigil.CommandDeck>
{/snippet}
