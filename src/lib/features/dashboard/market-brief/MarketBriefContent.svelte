<script lang="ts">
	// dashboard.MarketBriefContent: the brief itself, below its title. Shared by
	// the card (MarketBriefCard) and the brief's public page (/brief/{date}/{slot}).
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import Badge from '#lib/components/norviq/tui/Badge.svelte';
	import { t } from '#lib/i18n/context.svelte.js';
	import { directionKey, directionMarker, itemMarker, type MarketBriefItemVM, type MarketBriefVM } from './types.js';

	let { vm }: { vm: MarketBriefVM } = $props();
</script>

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
