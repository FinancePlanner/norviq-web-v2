<script lang="ts">
	// dashboard.MarketBriefCard + marketBriefToggles (content in MarketBriefContent).
	// `onnavigate(url)` replaces the toggles' hx-get swap into the shell.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import GhostButton from '#lib/components/norviq/GhostButton.svelte';
	import MarketBriefContent from './MarketBriefContent.svelte';
	import { t } from '#lib/i18n/context.svelte.js';
	import { capture } from '#lib/analytics/index.js';
	import {
		briefSummaryRows,
		directionKey,
		directionMarker,
		directionToneClass,
		marketBriefTitleKey,
		type MarketBriefVM
	} from './types.js';

	let { vm, onnavigate }: { vm: MarketBriefVM; onnavigate?: (url: string) => void } = $props();

	// Collapsed by default: on the dashboard the brief is context, not the
	// entry point (PRODUCT.md, calm hierarchy). The reader's choice is kept per
	// browser; storage can be missing or blocked, so every access is guarded.
	const OPEN_KEY = 'nq.marketBrief.open';
	let open = $state(false);
	$effect(() => {
		try {
			open = localStorage.getItem(OPEN_KEY) === '1';
		} catch {
			/* stays collapsed */
		}
	});
	function toggle() {
		open = !open;
		try {
			localStorage.setItem(OPEN_KEY, open ? '1' : '0');
		} catch {
			/* not remembered */
		}
	}
	const summary = $derived(briefSummaryRows(vm));

	const subtitle = $derived(
		vm.tradingDate +
			(vm.generatedAt
				? ' · ' + t('Updated at') + ' ' + vm.generatedAt + ' ' + t('(Lisbon time)')
				: '')
	);

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
			<GhostButton
				class="h-8 px-2 text-footnote"
				aria-label={t('Show the previous market brief')}
				onclick={() => onnavigate?.(vm.previousURL)}
			>
				{t('Previous')}
			</GhostButton>
		{/if}
		{#if vm.latestURL}
			<GhostButton
				class="h-8 px-2 text-footnote"
				aria-label={t('Show the latest market brief')}
				onclick={() => onnavigate?.(vm.latestURL)}
			>
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

<vigil.Panel class="market-brief-card" titleID="market-brief-title">
	<vigil.PanelHeader
		id="market-brief-title"
		title={t(marketBriefTitleKey(vm.slot))}
		desc={subtitle}
		trailing={vm.latestURL || vm.previousURL || vm.shareURL ? toggles : undefined}
	/>
	{#if summary.length > 0}
		<p class="market-brief-summary" hidden={open}>
			{#each summary as row, i (i)}
				{#if i > 0}<span class="text-muted-foreground" aria-hidden="true"> · </span>{/if}
				<span class="whitespace-nowrap"
					>{row.name || row.symbol}
					<span class={directionToneClass(row.direction)}
						><span aria-hidden="true">{directionMarker(row.direction)}</span>
						<span class="sr-only">{t(directionKey(row.direction))}</span>
						{row.change}</span
					></span
				>
			{/each}
		</p>
	{/if}
	<div id="market-brief-body" hidden={!open}>
		<MarketBriefContent {vm} />
	</div>
	<button
		type="button"
		class="market-brief-toggle link-tint text-subhead font-semibold"
		aria-expanded={open}
		aria-controls="market-brief-body"
		onclick={toggle}>{open ? t('Hide brief') : t('Read brief')}</button
	>
</vigil.Panel>
