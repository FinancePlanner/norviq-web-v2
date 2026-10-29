<script lang="ts">
	// dashboard.MarketBriefCard + marketBriefToggles (content in MarketBriefContent).
	// `onnavigate(url)` replaces the toggles' hx-get swap into the shell.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import GhostButton from '#lib/components/norviq/GhostButton.svelte';
	import MarketBriefContent from './MarketBriefContent.svelte';
	import { t } from '#lib/i18n/context.svelte.js';
	import { capture } from '#lib/analytics/index.js';
	import { marketBriefTitleKey, type MarketBriefVM } from './types.js';

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

<vigil.Panel class="market-brief-card" titleID="market-brief-title">
	<vigil.PanelHeader
		id="market-brief-title"
		title={t(marketBriefTitleKey(vm.slot))}
		desc={subtitle}
		trailing={vm.latestURL || vm.previousURL || vm.shareURL ? toggles : undefined}
	/>
	<MarketBriefContent {vm} />
</vigil.Panel>
