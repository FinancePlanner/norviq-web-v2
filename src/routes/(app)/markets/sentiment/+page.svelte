<script lang="ts">
	// markets.SentimentPage + markets.SentimentBoard
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import * as card from '#lib/components/norviq/tui/card/index.js';
	import { SentimentBadge } from '#lib/components/norviq/index.js';
	import type { SentimentRowVM } from '#lib/features/insights/markets/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Retail sentiment - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet sentimentCard(title: string, subtitle: string, rows: SentimentRowVM[])}
	<card.Card>
		<card.Header>
			<card.Title>{title}</card.Title>
			<card.Description>{subtitle}</card.Description>
		</card.Header>
		<card.Content>
			{#if rows.length === 0}
				<p class="text-sm text-muted-foreground">Nothing to show yet.</p>
			{:else}
				<ul class="divide-y divide-border">
					{#each rows as row, i (i)}
						<li class="flex items-center justify-between gap-3 py-2">
							<div class="min-w-0">
								<a href={row.detailURL} class="font-semibold hover:underline">{row.symbol}</a>
								<p class="text-xs text-muted-foreground">{row.volumeLabel} · {row.postCount}</p>
							</div>
							<div class="flex items-center gap-2">
								{#if row.hasDelta}
									<span class={['text-xs tabular-nums', row.deltaUp && 'text-emerald-500', !row.deltaUp && 'text-rose-500']}>
										{row.deltaLabel}
									</span>
								{/if}
								<SentimentBadge vm={row.badge} />
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</card.Content>
	</card.Card>
{/snippet}

<div class="app-page-content vigil-deck-page markets-page">
	<vigil.ModernPageHeader title="Retail sentiment" />
	<div id="markets-sentiment">
		{#await data.board}
			<div class="grid gap-4 md:grid-cols-2">
				{#each [0, 1, 2, 3] as i (i)}
					<div class="h-56 animate-pulse rounded-lg bg-muted/40"></div>
				{/each}
			</div>
		{:then vm}
			{#if !vm.hasData}
				<div class="rounded-lg border border-dashed border-border p-8 text-center">
					<p class="text-sm text-muted-foreground">{vm.emptyReason}</p>
				</div>
			{:else}
				<div class="grid gap-4 md:grid-cols-2">
					{@render sentimentCard('Most discussed', 'Loudest relative to their own normal volume.', vm.mostDiscussed)}
					{@render sentimentCard('Biggest swings', 'Largest day-over-day change in tone.', vm.biggestSwings)}
					{@render sentimentCard('Most bullish', 'Where the conversation leans positive.', vm.bullish)}
					{@render sentimentCard('Most bearish', 'Where the conversation leans negative.', vm.bearish)}
				</div>
				<p class="mt-6 text-xs text-muted-foreground">
					Sentiment reflects what retail investors are posting, not whether they are right. It is not investment advice. Measured {vm.asOf}.
				</p>
			{/if}
		{/await}
	</div>
</div>
