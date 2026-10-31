<script lang="ts">
	// crypto.Page(vm) — internal/pages/crypto/page.templ (overview, news,
	// portfolio) with the Markets/Bubbles body from markets.templ.
	import { preloadData } from '$app/navigation';
	import {
		CardHeader,
		EmptyState,
		NativeButton,
		SegmentedControl
	} from '#lib/components/norviq/index.js';
	import type { SegmentItem } from '#lib/components/norviq/types.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import * as dialog from '#lib/components/norviq/tui/dialog/index.js';
	import CryptoHoldingPanel from './CryptoHoldingPanel.svelte';
	import CryptoMarkets from './CryptoMarkets.svelte';
	import type { AssetRow, HoldingFormVM, NewsRow, PageViewModel } from './types.js';

	let { vm }: { vm: PageViewModel } = $props();

	const cryptoTabs: SegmentItem[] = [
		{ label: 'Overview', path: '/crypto' },
		{ label: 'Markets', path: '/crypto/market' },
		{ label: 'Bubbles', path: '/crypto/bubbles' },
		{ label: 'News', path: '/crypto/news' },
		{ label: 'Portfolio', path: '/crypto/portfolio' }
	];

	// ---- #crypto-action-dialog: hx-get the holding form into #crypto-action-panel ----
	type PanelState =
		| { kind: 'empty' }
		| { kind: 'panel'; vm: HoldingFormVM; seq: number }
		| { kind: 'error'; message: string };
	let dialogOpen = $state(false);
	let panel = $state<PanelState>({ kind: 'empty' });
	let panelSeq = 0;

	async function openPanel(href: string) {
		const seq = ++panelSeq;
		dialogOpen = true;
		panel = { kind: 'empty' };
		const result = await preloadData(href);
		if (seq !== panelSeq) return;
		if (result.type === 'redirect') {
			window.location.assign(result.location);
			return;
		}
		const pageData =
			result.type === 'loaded' ? (result.data as { vm?: HoldingFormVM } | undefined) : undefined;
		if (result.type !== 'loaded' || result.status >= 400 || !pageData?.vm) {
			panel = { kind: 'error', message: 'Failed to render form' };
			return;
		}
		panel = { kind: 'panel', vm: pageData.vm, seq };
	}
</script>

{#snippet assetRow(asset: AssetRow)}
	<div class="flex items-center justify-between gap-3 py-3">
		<div>
			<p class="font-semibold">{asset.symbol}</p>
			<p class="text-sm text-muted-foreground">{asset.name}</p>
		</div>
		<div class="vigil-mono text-right tabular-nums">
			<p class="font-semibold">{asset.price}</p>
			{#if asset.changePct !== ''}
				<p class={'text-sm ' + asset.changeClass}>{asset.changePct}</p>
			{/if}
		</div>
	</div>
{/snippet}

{#snippet newsRow(item: NewsRow)}
	<article
		class="border-b pb-4 last:border-b-0"
		style="border-color: color-mix(in srgb, currentColor 10%, transparent);"
	>
		{#if item.url !== ''}
			<a href={item.url} class="font-semibold text-muted-foreground" target="_blank" rel="noopener"
				>{item.title}</a
			>
		{:else}
			<p class="font-semibold">{item.title}</p>
		{/if}
		{#if item.summary !== ''}
			<p class="mt-1 text-sm text-muted-foreground">{item.summary}</p>
		{/if}
		<p class="mt-2 text-xs text-muted-foreground">{item.source} · {item.date}</p>
	</article>
{/snippet}

<div class="app-page-content vigil-deck-page crypto-page crypto-modern-page">
	<vigil.ModernPageHeader title="Crypto" />
	<div>
		<SegmentedControl items={cryptoTabs} activePath={vm.activePath} />
	</div>
	{#if vm.hasLoadError && vm.tab !== 'news' && vm.tab !== 'portfolio'}
		<div class="glass-card mt-6 p-6" role="alert">
			<p class="font-semibold">Could not load crypto data</p>
			<p class="mt-2 text-sm text-muted-foreground">{vm.errorMessage}</p>
		</div>
	{:else if (vm.tab === 'market' || vm.tab === 'bubbles') && vm.markets}
		<CryptoMarkets view={vm.markets.view} tf={vm.markets.tf} size={vm.markets.size} />
	{:else if vm.tab === 'news'}
		<vigil.Panel class="mt-6 p-6">
			<h2 class="font-semibold">Crypto news</h2>
			{#if vm.news.length === 0}
				<EmptyState title="No headlines yet" description="Check back later for market updates." />
			{:else}
				<div class="vigil-dense-list mt-4">
					{#each vm.news as item, i (i)}
						{@render newsRow(item)}
					{/each}
				</div>
			{/if}
		</vigil.Panel>
	{:else if vm.tab === 'portfolio'}
		<div class="mt-6">
			<vigil.Panel class="p-6">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 class="font-semibold">Crypto portfolio</h2>
						<p class="mt-1 text-sm text-muted-foreground">
							Track quantities and average buy price.
						</p>
					</div>
					<NativeButton
						class="btn-primary w-auto px-5 py-2 text-sm"
						onclick={() => openPanel('/crypto/portfolio/holding')}
					>
						Add holding
					</NativeButton>
				</div>
				<!-- CryptoHoldingsBody -->
				<div id="crypto-holdings-body" class="mt-4">
					{#if vm.holdings.length === 0}
						<EmptyState
							title="No digital assets yet"
							description="Add your first digital asset to track cost basis and portfolio value."
						/>
					{:else}
						<p class="vigil-mono text-2xl font-bold tabular-nums">{vm.portfolioValue}</p>
						<p class="mt-1 text-sm text-muted-foreground">{`${vm.holdingCount} holding(s)`}</p>
						<vigil.InsetList class="crypto-holdings mt-2">
							{#each vm.holdings as row (row.id)}
								<vigil.ListRow title={row.symbol} subtitle={row.name}>
									{#snippet trailing()}
										<div class="flex items-center gap-3">
											<div class="text-right">
												<p class="nq-row-value">{row.quantity}</p>
												<p class="nq-row-caption">Avg {row.avgCost}</p>
											</div>
											<NativeButton
												class="btn-secondary px-3 py-1 text-xs"
												onclick={() => openPanel('/crypto/portfolio/holding/' + row.id)}
											>
												Edit
											</NativeButton>
										</div>
									{/snippet}
								</vigil.ListRow>
							{/each}
						</vigil.InsetList>
					{/if}
				</div>
			</vigil.Panel>
			<dialog.Dialog id="crypto-action-dialog" bind:open={dialogOpen}>
				<dialog.Content class="glass-card vigil-modal-panel border-0 p-6 sm:max-w-2xl md:p-8">
					{#if panel.kind === 'panel'}
						{#key panel.seq}
							<CryptoHoldingPanel vm={panel.vm} onclose={() => (dialogOpen = false)} />
						{/key}
					{:else if panel.kind === 'error'}
						<div id="crypto-action-panel">
							<p class="text-sm text-danger" role="alert">{panel.message}</p>
						</div>
					{:else}
						<div id="crypto-action-panel"></div>
					{/if}
				</dialog.Content>
			</dialog.Dialog>
		</div>
	{:else}
		<div class="crypto-overview-section">
			<vigil.CommandDeck class="is-2col mt-6">
				<vigil.Panel class="p-6">
					<CardHeader title="Your crypto" />
					<p class="vigil-mono mt-2 text-3xl font-bold tabular-nums">{vm.portfolioValue}</p>
					<p class="mt-1 text-sm text-muted-foreground">{`${vm.holdingCount} holding(s)`}</p>
					<a href="/crypto/portfolio" class="btn-secondary mt-4 inline-flex px-4 py-2 text-sm"
						>View portfolio</a
					>
				</vigil.Panel>
				<vigil.Panel class="p-6">
					<CardHeader title="Market snapshot" />
					{#if vm.snapshotFromMarkets}
						<p class="mt-2 text-sm text-muted-foreground">
							Largest coins by market cap, last 24 hours.
						</p>
					{:else}
						<p class="mt-2 text-sm text-muted-foreground">Top assets by coverage in Norviq.</p>
					{/if}
					<div class="vigil-dense-list mt-4">
						{#each vm.assets.slice(0, 5) as asset, i (i)}
							{@render assetRow(asset)}
						{/each}
					</div>
					<a
						href="/crypto/market"
						class="mt-2 inline-flex text-sm font-semibold text-muted-foreground">All markets</a
					>
				</vigil.Panel>
			</vigil.CommandDeck>
			{#if vm.news.length > 0}
				<vigil.Panel class="mt-6 p-6">
					<div class="flex items-center justify-between gap-3">
						<CardHeader title="Latest news" />
						<a href="/crypto/news" class="text-sm font-semibold text-muted-foreground">View all</a>
					</div>
					<div class="vigil-dense-list mt-4">
						{#each vm.news.slice(0, 4) as item, i (i)}
							{@render newsRow(item)}
						{/each}
					</div>
				</vigil.Panel>
			{/if}
		</div>
	{/if}
</div>
