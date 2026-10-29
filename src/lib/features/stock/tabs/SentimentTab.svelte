<script lang="ts">
	// stock.SentimentTab, SentimentDailyPanel, SentimentAggregateHeader, SentimentPostCard
	import { EmptyState, SentimentBadge } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import EChart from '#lib/charts/EChart.svelte';
	import { sentimentHistoryLine } from '#lib/charts/index.js';
	import SentimentLabelBadge from './SentimentLabelBadge.svelte';
	import { notablePostCountLabel } from '../sentiment-labels.js';
	import type { SentimentPostVM, SentimentTabVM } from '../detail.js';

	let { vm }: { vm: SentimentTabVM } = $props();
	const history = $derived(
		vm.history
			? sentimentHistoryLine('sentiment-history-chart', vm.history.labels, vm.history.points)
			: null
	);
</script>

{#snippet postInner(post: SentimentPostVM)}
	<div class="flex items-center justify-between gap-2">
		<div class="flex flex-col">
			{#if post.author !== ''}<span class="text-sm font-semibold">{post.author}</span>{/if}
			{#if post.handle !== ''}<span class="text-xs text-muted-foreground">{'@' + post.handle}</span
				>{/if}
		</div>
		<SentimentLabelBadge label={post.sentimentLabel} />
	</div>
	<p class="mt-2 text-sm leading-snug">{post.text}</p>
{/snippet}

<div class="vigil-dense-list mt-6">
	{#if vm.hasData}
		{#if vm.hasDaily}
			<vigil.Panel class="p-5">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="flex items-center gap-3">
						<SentimentBadge vm={vm.badge} />
						<div>
							<div class="text-sm font-semibold">Retail chatter</div>
							{#if vm.sourceLabel !== ''}<div class="text-xs text-muted-foreground">
									{vm.sourceLabel}
								</div>{/if}
						</div>
					</div>
					<div class="text-xs text-muted-foreground">Measured {vm.asOf}</div>
				</div>
				{#if vm.summary !== ''}<p class="mt-3 text-sm text-muted-foreground">{vm.summary}</p>{/if}
				{#if vm.themes.length > 0}
					<div class="mt-3 flex flex-wrap gap-2">
						{#each vm.themes as theme, i (i)}
							<span
								class={'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ' +
									theme.stanceCSS}
								title={theme.evidence}
							>
								{theme.label}
							</span>
						{/each}
					</div>
				{/if}
				{#if history}
					<div class="mt-4"><EChart {...history} /></div>
				{/if}
			</vigil.Panel>
		{/if}
		{#if vm.posts.length > 0}
			<vigil.Panel class="flex items-center gap-3 p-5">
				<SentimentLabelBadge label={vm.aggregateLabel} />
				<div>
					<div class="text-base font-semibold">{vm.symbol}</div>
					<div class="text-xs text-muted-foreground">{notablePostCountLabel(vm.postCount)}</div>
				</div>
			</vigil.Panel>
			{#each vm.posts as post, i (i)}
				{#if post.url !== ''}
					<a
						href={post.url}
						class="sentiment-card glass-card block p-5 transition hover:brightness-[1.02]"
						target="_blank"
						rel="noopener noreferrer"
					>
						{@render postInner(post)}
					</a>
				{:else}
					<article class="sentiment-card glass-card p-5">{@render postInner(post)}</article>
				{/if}
			{/each}
		{/if}
		<p class="mt-4 text-xs text-muted-foreground">
			Sentiment describes what retail investors are posting, not whether they are right. Not
			investment advice.
		</p>
	{:else}
		<EmptyState
			title="No sentiment yet"
			description="Retail posts for this symbol will appear here once there is chatter to measure."
		/>
	{/if}
</div>
