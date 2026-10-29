<script lang="ts">
	// stock.sentimentBadge(label) — the notable-post pill (not components.SentimentBadge).
	import { sentimentBadgeClass, sentimentBadgeText } from '#lib/components/norviq/sentiment.js';

	let { label }: { label: string } = $props();
</script>

<span class={'rounded-full px-3 py-1 text-xs font-semibold ' + sentimentBadgeClass(label)}
	>{sentimentBadgeText(label)}</span
>
