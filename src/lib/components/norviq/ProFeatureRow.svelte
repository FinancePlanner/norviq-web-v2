<script lang="ts">
	// components.ProFeatureRow(title, description)
	import Sparkles from '@lucide/svelte/icons/sparkles';

	let { title, description }: { title: string; description: string } = $props();
</script>

<div class="pro-feature-row rounded-lg p-4">
	<div class="flex items-start gap-3">
		<span class="pro-feature-icon" aria-hidden="true"
			><Sparkles class="h-4 w-4" data-lucide="icon" /></span
		>
		<div>
			<p class="font-semibold">{title}</p>
			<p class="mt-1 text-sm text-muted-foreground">{description}</p>
		</div>
	</div>
</div>
