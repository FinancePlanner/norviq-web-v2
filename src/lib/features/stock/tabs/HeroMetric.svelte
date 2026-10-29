<script lang="ts">
	// stock.stockHeroMetric
	let {
		label,
		value,
		sentiment = ''
	}: { label: string; value: string; sentiment?: string } = $props();

	const spoken: Record<string, string> = { '3M': '3 month', '6M': '6 month', YTD: 'year to date' };
	const aria = $derived((spoken[label] || label) + ' ' + value);
</script>

<div class="command-metric" aria-label={aria}>
	<span class="command-metric-label">{label}</span>
	<span class={['command-metric-value', sentiment]}>{value}</span>
</div>
