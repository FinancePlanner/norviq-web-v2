<script lang="ts">
	// dashboard.ActivityRow(item, compact): one feed event as a vigil list row.
	// compact (dashboard feed) shows the relative time; the activity page shows
	// the timestamp.
	import ListRow from '#lib/components/norviq/vigil/ListRow.svelte';
	import RowTrailing from '#lib/components/norviq/vigil/RowTrailing.svelte';
	import type { Sentiment } from '#lib/components/norviq/types.js';
	import type { ActivityItemVM } from '../types.js';
	import ActivityTypeIcon from './ActivityTypeIcon.svelte';

	let { item, compact = false }: { item: ActivityItemVM; compact?: boolean } = $props();

	// activityTone: success/danger → the row's positive/negative sentiment.
	const tone: Sentiment = $derived(item.iconTone === 'success' ? 'positive' : item.iconTone === 'danger' ? 'negative' : '');
	const time = $derived(compact ? item.relativeTime : item.timestamp);
</script>

<ListRow {tone} title={item.title} subtitle={item.subtitle}>
	{#snippet icon()}<ActivityTypeIcon kind={item.iconKind} />{/snippet}
	{#snippet trailing()}
		{#if item.hasAmount}
			<RowTrailing value={item.amount} caption={time} sentiment={tone} />
		{:else if time}
			<p class="nq-row-caption">{time}</p>
		{/if}
	{/snippet}
</ListRow>
