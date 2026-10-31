<script lang="ts">
	// dashboard.RecentSpendCard(items): the iOS "Recent spend" sub-list, the
	// pillar initial in the icon disc.
	import { t } from '#lib/i18n/context.svelte.js';
	import InsetList from '#lib/components/norviq/vigil/InsetList.svelte';
	import ListRow from '#lib/components/norviq/vigil/ListRow.svelte';
	import Panel from '#lib/components/norviq/vigil/Panel.svelte';
	import PanelHeader from '#lib/components/norviq/vigil/PanelHeader.svelte';
	import RowTrailing from '#lib/components/norviq/vigil/RowTrailing.svelte';
	import type { RecentSpendItemVM } from '../types.js';

	let { items }: { items: RecentSpendItemVM[] | null | undefined } = $props();
</script>

<Panel class="recent-spend-panel" titleID="recent-spend-title">
	<PanelHeader id="recent-spend-title" title={t('Recent spend')}>
		{#snippet trailing()}<a href="/expenses">{t('Expenses')}</a>{/snippet}
	</PanelHeader>
	{#if items && items.length > 0}
		<InsetList class="recent-spend-list">
			{#each items as item, i (i)}
				<ListRow title={item.title} subtitle={item.date}>
					{#snippet icon()}<span class="text-footnote font-semibold">{item.pillarBadge}</span
						>{/snippet}
					{#snippet trailing()}<RowTrailing value={item.amount} />{/snippet}
				</ListRow>
			{/each}
		</InsetList>
	{:else}
		<p class="text-subhead text-muted-foreground">{t('No recent expenses')}</p>
	{/if}
</Panel>
