<script lang="ts">
	// dashboard.InsightsPage(vm)
	import { t } from '#lib/i18n/context.svelte.js';
	import ConnectAgentPill from '#lib/components/norviq/ConnectAgentPill.svelte';
	import ModernPageHeader from '#lib/components/norviq/vigil/ModernPageHeader.svelte';
	import AIInsightsSection from '#lib/features/dashboard/insights/AIInsightsSection.svelte';
	import FinancialHealthCard from '#lib/features/dashboard/insights/FinancialHealthCard.svelte';
	import FocusPointsSection from '#lib/features/dashboard/insights/FocusPointsSection.svelte';
	import InsightCardsGrid from '#lib/features/dashboard/insights/InsightCardsGrid.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const vm = $derived(data.vm);
	// After a focus-point action its result replaces the loaded list (Go's
	// #focus-points-body swap).
	const focusPoints = $derived(form?.focusPoints ?? vm.focusPoints);
	const goalsError = $derived(form ? form.goalsError : vm.goalsError);
</script>

<svelte:head>
	<title>{t('Insights - Norviq')}</title>
	<meta name="keywords" content="Norviq dashboard" />
	<meta name="description" content="Your Norviq financial dashboard." />
</svelte:head>

<div class="app-page-content vigil-deck-page insights-page insights-modern-page">
	<ModernPageHeader title={t('Financial Insights')}>
		{#snippet actions()}<ConnectAgentPill />{/snippet}
	</ModernPageHeader>
	<div class="insights-modern-stack">
		{#if !vm.insightsError}
			<div class="insights-command-board">
				<div class="insights-health-wrap">
					<FinancialHealthCard health={vm.financialHealth} />
				</div>
				<InsightCardsGrid cards={vm.insightCards} />
			</div>
		{:else}
			<p class="modern-empty-copy">{t('Insights unavailable right now.')}</p>
		{/if}
		<AIInsightsSection isPro={vm.isPro} ai={data.ai} />
		<FocusPointsSection points={focusPoints} {goalsError} />
	</div>
</div>
