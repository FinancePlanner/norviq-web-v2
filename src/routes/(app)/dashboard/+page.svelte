<script lang="ts">
	// dashboard.CommandCenterPage (command_center.templ).
	import ConnectAgentPill from '#lib/components/norviq/ConnectAgentPill.svelte';
	import MarketBriefShell from '#lib/features/dashboard/market-brief/MarketBriefShell.svelte';
	import OverviewAttentionPanel from '#lib/features/dashboard/command-center/OverviewAttentionPanel.svelte';
	import InvestableCapacityHero from '#lib/features/dashboard/command-center/InvestableCapacityHero.svelte';
	import ActionQueuePanel from '#lib/features/dashboard/command-center/ActionQueuePanel.svelte';
	import LedgerPanel from '#lib/features/dashboard/command-center/LedgerPanel.svelte';
	import QuickExpenseModal from '#lib/features/dashboard/command-center/QuickExpenseModal.svelte';
	import AssetSearch from '#lib/features/dashboard/command-center/AssetSearch.svelte';
	import MCPStatusWidget from '#lib/features/dashboard/panels/MCPStatusWidget.svelte';
	import TerminalSummaryCard from '#lib/features/dashboard/panels/TerminalSummaryCard.svelte';
	import TaxPanel from '#lib/features/dashboard/panels/TaxPanel.svelte';
	import GuidedStartCard from '#lib/features/auth-onboarding/guided-start/GuidedStartCard.svelte';
	import XPCardShell from '#lib/features/social/friends/XPCardShell.svelte';
	import { commandGreeting } from '#lib/features/dashboard/command-center/overview.js';

	let { data } = $props();
	const vm = $derived(data.vm);
</script>

<svelte:head>
	<title>Dashboard - Norviq</title>
	<meta name="keywords" content="Norviq dashboard" />
	<meta name="description" content="Your Norviq financial dashboard." />
</svelte:head>

<div class="app-page-content vigil-deck-page overview-page overview-modern-page command-center-page">
	<header class="cc-header">
		<h1 class="text-title1 font-semibold tracking-tight text-balance">{commandGreeting(vm.overview)}</h1>
		<div class="overview-hero-search flex flex-col gap-3">
			<div class="flex lg:justify-end">
				<ConnectAgentPill />
			</div>
			<AssetSearch />
		</div>
	</header>
	<MarketBriefShell src="/dashboard/market-brief" />
	<GuidedStartCard vm={data.guidedStart} />
	<OverviewAttentionPanel vm={vm.overview} />
	<InvestableCapacityHero vm={vm.overview} />
	<section class="cc-rail cc-rail-now cc-modules" aria-label="Needs you now">
		<ActionQueuePanel queue={vm.queue} />
		{#if data.social.enabled && data.social.leaderboards}
			<XPCardShell />
		{/if}
		{#await data.mcpStatus}
			<MCPStatusWidget />
		{:then status}
			<MCPStatusWidget vm={status} />
		{/await}
		{#await data.terminalSummary}
			<TerminalSummaryCard />
		{:then summary}
			<TerminalSummaryCard vm={summary} />
		{/await}
		{#await data.taxPanel}
			<TaxPanel />
		{:then tax}
			<TaxPanel vm={tax} />
		{/await}
	</section>
	<section class="cc-rail cc-rail-ledger" aria-label="Activity ledger">
		<LedgerPanel ledger={vm.ledger} />
	</section>
	<nav class="cc-more-links" aria-label="More dashboard views">
		<a href="/dashboard/pulse" class="link-tint text-subhead font-semibold">Open pulse</a>
		<a href="/dashboard/activity" class="link-tint text-subhead font-semibold">Full activity</a>
	</nav>
	<QuickExpenseModal />
</div>
