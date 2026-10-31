<script lang="ts">
	// dashboard.ActivityPage(vm)
	import { t } from '#lib/i18n/context.svelte.js';
	import ConnectAgentPill from '#lib/components/norviq/ConnectAgentPill.svelte';
	import SelectField from '#lib/components/norviq/SelectField.svelte';
	import CommandSplit from '#lib/components/norviq/vigil/CommandSplit.svelte';
	import CommandSplitAside from '#lib/components/norviq/vigil/CommandSplitAside.svelte';
	import CommandSplitMain from '#lib/components/norviq/vigil/CommandSplitMain.svelte';
	import ModernPageHeader from '#lib/components/norviq/vigil/ModernPageHeader.svelte';
	import Panel from '#lib/components/norviq/vigil/Panel.svelte';
	import PanelHeader from '#lib/components/norviq/vigil/PanelHeader.svelte';
	import ActivityListSection from '#lib/features/dashboard/activity/ActivityListSection.svelte';
	import RecentSpendCard from '#lib/features/dashboard/activity/RecentSpendCard.svelte';
	import FinancialHealthCard from '#lib/features/dashboard/insights/FinancialHealthCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);

	// activityHeaderActions: Go never wired this filter to anything; ported inert.
	const filterOptions = $derived([
		{ value: 'all', label: t('All activity') },
		{ value: 'portfolio', label: t('Portfolio') },
		{ value: 'expenses', label: t('Expenses') }
	]);
</script>

<svelte:head>
	<title>{t('Activity - Norviq')}</title>
	<meta name="keywords" content="Norviq dashboard" />
	<meta name="description" content="Your Norviq financial dashboard." />
</svelte:head>

<div class="app-page-content vigil-canvas-page activity-page activity-modern-page">
	<ModernPageHeader title={t('Activity & Events')}>
		{#snippet actions()}
			<SelectField
				id="activity-filter"
				name="activity_filter"
				aria-label={t('Filter activity')}
				options={filterOptions}
			/>
			<ConnectAgentPill />
		{/snippet}
	</ModernPageHeader>
	<CommandSplit class="activity-modern-layout">
		<CommandSplitMain>
			<Panel class="activity-timeline-panel" titleID="activity-timeline-heading">
				<PanelHeader
					id="activity-timeline-heading"
					title={t('Timeline')}
					desc={t('Latest events, newest first.')}
				/>
				{#if vm.activitiesError}
					<p class="text-subhead text-muted-foreground">
						{t('Activity feed unavailable right now.')}
					</p>
				{:else}
					{#key vm}
						<ActivityListSection
							initial={{
								activities: vm.activities,
								activityLimit: vm.activityLimit,
								hasMoreActivities: vm.hasMoreActivities
							}}
						/>
					{/key}
				{/if}
			</Panel>
		</CommandSplitMain>
		<CommandSplitAside>
			<div class="activity-side-stack space-y-5">
				<FinancialHealthCard health={vm.financialHealth} />
				<RecentSpendCard items={vm.recentSpend} />
			</div>
		</CommandSplitAside>
	</CommandSplit>
</div>
