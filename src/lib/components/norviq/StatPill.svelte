<script lang="ts">
	// components.StatPill(label, value, positive) — a Panel around one metric.
	let {
		label,
		value,
		positive = false
	}: { label: string; value: string; positive?: boolean } = $props();
</script>

<div class="stat-pill glass-card p-4">
	<div class="command-metric">
		<span class="command-metric-label">{label}</span>
		<span class={positive ? 'command-metric-value is-positive' : 'command-metric-value'}
			>{value}</span
		>
	</div>
</div>
