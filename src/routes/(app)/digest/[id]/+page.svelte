<script lang="ts">
	// One weekly digest. The email's ?s=<anchor> scrolls to that section.
	import { onMount } from 'svelte';
	import { EmptyState } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);

	onMount(() => {
		if (!data.focus) return;
		document
			.getElementById('digest-' + data.focus)
			?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	});
</script>

<svelte:head>
	<title>{t('Weekly digest')} - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page digest-page">
	<vigil.ModernPageHeader
		title={vm.headline}
		subtitle={t('Week of %s to %s', vm.periodStart, vm.periodEnd)}
	/>
	{#if vm.narrative}
		<p class="nq-panel-desc mt-4">{vm.narrative}</p>
	{/if}
	{#if vm.sections.length === 0}
		<EmptyState
			title={t('Nothing to report this week')}
			description={t('Your next digest will show holdings, budget and upcoming earnings.')}
		/>
	{:else}
		{#each vm.sections as section (section.anchor)}
			<vigil.Panel
				id={'digest-' + section.anchor}
				class={'digest-section mt-6 p-6' + (data.focus === section.anchor ? ' is-focus' : '')}
				titleID={'digest-' + section.anchor + '-title'}
			>
				<h2 id={'digest-' + section.anchor + '-title'} class="nq-panel-title">
					{t(section.title)}
				</h2>
				<ul class="mt-3 space-y-1">
					{#each section.lines as line, i (i)}
						<li class="text-sm">{line}</li>
					{/each}
				</ul>
			</vigil.Panel>
		{/each}
	{/if}
	<p class="nq-panel-desc mt-6 text-xs">
		{t("Numbers come from your holdings' closing prices and your budget. Not investment advice.")}
	</p>
</div>

<style>
	:global(.digest-section) {
		scroll-margin-top: 5rem;
	}
	:global(.digest-section.is-focus) {
		outline: 1px solid var(--color-gold, #b08a3e);
		outline-offset: 2px;
	}
</style>
