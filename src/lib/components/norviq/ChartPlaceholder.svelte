<script lang="ts">
	// components.ChartPlaceholder(label)
	let { label = '' }: { label?: string } = $props();
</script>

<div class="chart-placeholder glass-card p-4 md:p-5">
	{#if label}
		<p class="chart-placeholder-label">{label}</p>
	{/if}
	<div class="chart-placeholder-body">
		<svg
			viewBox="0 0 400 120"
			class="w-full opacity-30"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<path
				d="M0,90 Q50,70 100,75 T200,45 T300,55 T400,20"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			></path>
			<path
				d="M0,90 Q50,70 100,75 T200,45 T300,55 T400,20 V120 H0 Z"
				fill="currentColor"
				opacity="0.08"
			></path>
		</svg>
	</div>
</div>
