<script lang="ts">
	let { pct, label, valid }: { pct: number; label: string; valid: boolean } = $props();
</script>

{#if valid}
	<div class="flex min-w-24 items-center gap-2">
		<div
			class="h-1 flex-1 overflow-hidden rounded-full bg-muted"
			role="progressbar"
			aria-label="Progress"
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={Number(pct.toFixed(0))}
		>
			<div class="h-full rounded-full bg-primary" style={`width:${pct.toFixed(1)}%`}></div>
		</div>
		<span class="text-footnote tabular-nums">{label}</span>
	</div>
{:else}
	<span class="text-muted-foreground">{label}</span>
{/if}
