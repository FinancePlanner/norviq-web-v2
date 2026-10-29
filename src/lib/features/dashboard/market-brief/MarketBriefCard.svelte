<script lang="ts">
	// dashboard.MarketBriefCard + MarketBriefContent + marketBriefToggles.
	// `onnavigate(url)` replaces the toggles' hx-get swap into the shell.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import GhostButton from '#lib/components/norviq/GhostButton.svelte';
	import Badge from '#lib/components/norviq/tui/Badge.svelte';
	import { t } from '#lib/i18n/context.svelte.js';
	import { capture } from '#lib/analytics/index.js';
	import { directionKey, directionMarker, itemMarker, marketBriefTitleKey, type MarketBriefItemVM, type MarketBriefVM } from './types.js';

	let { vm, onnavigate }: { vm: MarketBriefVM; onnavigate?: (url: string) => void } = $props();

	const subtitle = $derived(vm.tradingDate + (vm.generatedAt ? ' · ' + t('Updated at') + ' ' + vm.generatedAt + ' ' + t('(Lisbon time)') : ''));

	// assets/share.js data-share-native: the OS share sheet where there is one;
	// otherwise the link navigates to the brief's page.
	function share(e: MouseEvent) {
		if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;
		e.preventDefault();
		let props: Record<string, unknown> = {};
		try {
			props = JSON.parse(vm.shareProps || '{}') ?? {};
		} catch {
			/* keep {} */
		}
		capture('market_brief_shared', { ...props, channel: 'native' });
		navigator.share({ title: vm.shareTitle, url: vm.shareNativeURL }).catch(() => {});
	}
</script>

{#snippet toggles()}
	<div class="flex items-center gap-1">
		{#if vm.previousURL}
			<GhostButton class="h-8 px-2 text-footnote" aria-label={t('Show the previous market brief')} onclick={() => onnavigate?.(vm.previousURL)}>
				{t('Previous')}
			</GhostButton>
		{/if}
		{#if vm.latestURL}
			<GhostButton class="h-8 px-2 text-footnote" aria-label={t('Show the latest market brief')} onclick={() => onnavigate?.(vm.latestURL)}>
				{t('Latest')}
			</GhostButton>
		{/if}
		{#if vm.shareURL}
			<GhostButton
				href={vm.shareURL}
				class="h-8 px-2 text-footnote"
				data-sveltekit-reload
				data-share-native
				data-share-channel="native"
				data-share-url={vm.shareNativeURL}
				data-share-title={vm.shareTitle}
				data-share-event="market_brief_shared"
				data-share-props={vm.shareProps}
				aria-label={t('Share this market brief')}
				onclick={share}
			>
				{t('Share')}
			</GhostButton>
		{/if}
	</div>
{/snippet}

{#snippet item(marker: string, it: MarketBriefItemVM)}
	<li class="nq-row items-start" data-kind={it.kind}>
		<span class="nq-row-icon text-subhead font-semibold" aria-hidden="true">{marker}</span>
		<div class="nq-row-body">
			<p class="text-subhead">{it.text}</p>
			{#if it.tickers.length > 0}
				<ul class="mt-2 flex flex-wrap gap-1" role="list" aria-label={t('Tickers')}>
					{#each it.tickers as ticker (ticker)}
						<li><Badge variant="outline" class="tabular-nums">{'$' + ticker}</Badge></li>
					{/each}
				</ul>
			{/if}
			{#if it.sourceHost}
				<p class="nq-row-subtitle">{t('Source:')} {it.sourceHost}</p>
			{/if}
		</div>
	</li>
{/snippet}

<vigil.Panel class="market-brief-card" titleID="market-brief-title">
	<vigil.PanelHeader
		id="market-brief-title"
		title={t(marketBriefTitleKey(vm.slot))}
		desc={subtitle}
		trailing={vm.latestURL || vm.previousURL || vm.shareURL ? toggles : undefined}
	/>
	{#if vm.degraded}
		<p class="text-footnote text-muted-foreground" role="note">{t('Limited sources')}</p>
	{/if}
	{#if vm.greeting}
		<p class="mt-2 text-subhead">{vm.greeting}</p>
	{/if}
	{#each vm.groups as group (group.id)}
		<section class="mt-4" data-group={group.id}>
			<h3 class="text-subhead font-semibold">
				{group.title}
				<span aria-hidden="true">{directionMarker(group.tone)}</span>
				<span class="sr-only">({t(directionKey(group.tone))})</span>
			</h3>
			<vigil.InsetList class="market-brief-quotes">
				{#each group.rows as row, i (i)}
					{#snippet flag()}<span class="text-subhead">{row.flag}</span>{/snippet}
					{#snippet trailing()}
						<vigil.RowTrailing value={row.level} caption={directionMarker(row.direction) + ' ' + row.change} />
						<span class="sr-only">{t(directionKey(row.direction))}</span>
					{/snippet}
					<vigil.ListRow icon={flag} title={row.name} subtitle={row.symbol} {trailing} />
				{/each}
			</vigil.InsetList>
		</section>
	{/each}
	{#if vm.notes.length > 0}
		<section class="mt-4" aria-label={t('Highlights')}>
			<vigil.InsetList class="market-brief-notes">
				{#each vm.notes as note, i (i)}
					{@render item(itemMarker(note.kind), note)}
				{/each}
			</vigil.InsetList>
		</section>
	{/if}
	{#if vm.stories.length > 0}
		<section class="mt-4" aria-label={t('Stories')}>
			<ol class="nq-list market-brief-stories" role="list">
				{#each vm.stories as story, i (i)}
					{@render item(`${i + 1}.`, story)}
				{/each}
			</ol>
		</section>
	{/if}
	<p class="mt-3 text-footnote text-muted-foreground">{t('AI-written from market data. Not financial advice.')}</p>
</vigil.Panel>
