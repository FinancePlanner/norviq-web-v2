<script lang="ts">
	// components.ProGateHero(featureName)
	let { featureName }: { featureName: string } = $props();
</script>

<div class="pro-gate-hero glass-card p-8 md:p-10 text-center">
	<span class="pro-badge">Pro</span>
	<h1 class="mt-4 text-3xl font-bold md:text-4xl">{featureName}</h1>
	<p class="mx-auto mt-3 max-w-lg text-base text-muted-foreground">
		Get full clarity on your net worth and make better decisions with Norviq Pro.
	</p>
</div>
