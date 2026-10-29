<script lang="ts">
	// Port of norviq-web internal/pages/achievements/page.templ Page.
	import { EmptyState, FormErrorBanner, ToastBanner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import AchievementCard from '#lib/features/achievements/AchievementCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
</script>

<svelte:head>
	<title>Achievements - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page achievements-page">
	<vigil.ModernPageHeader
		title={t('Achievements')}
		subtitle={t('Milestones you earn by planning, saving and learning. Counts only, never amounts.')}
	/>
	<ToastBanner message={vm.notice ? t(vm.notice) : ''} />
	<FormErrorBanner message={vm.errorMessage ? t(vm.errorMessage) : ''} />
	{#if vm.loadFailed}
		<EmptyState title={t('Could not load achievements')} description={t('Try again in a moment.')} />
	{:else}
		<vigil.MetricStrip>
			<vigil.Metric label={t('Unlocked')} value="{vm.summary.unlocked} / {vm.summary.total}" />
			{#if vm.summary.hiddenRemaining > 0}
				<vigil.Metric label={t('Hidden')} value={t('+%d hidden', vm.summary.hiddenRemaining)} />
			{/if}
		</vigil.MetricStrip>
		{#if vm.showcase.length > 0}
			<section class="achievements-showcase mt-6" aria-labelledby="achievements-showcase-title">
				<h2 id="achievements-showcase-title" class="nq-panel-title">{t('Showcase')}</h2>
				<p class="nq-panel-desc">{t('Pinned achievements friends see on your profile.')}</p>
				<div class="achievements-grid mt-3">
					{#each vm.showcase as card (card.key)}
						<AchievementCard {card} />
					{/each}
				</div>
			</section>
		{/if}
		{#each vm.sections as section (section.key)}
			<section class="achievements-section mt-6" aria-labelledby={'achievements-' + section.key}>
				<h2 id={'achievements-' + section.key} class="nq-panel-title">{section.title}</h2>
				<div class="achievements-grid mt-3">
					{#each section.cards as card (card.key)}
						<AchievementCard {card} />
					{/each}
				</div>
			</section>
		{/each}
	{/if}
</div>
