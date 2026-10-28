<script lang="ts">
	// Convenience switch kept for (app)/+error.svelte: variant "page" =
	// ProGatePage, "overlay" = ProGateOverlay. For an inline preview use ProGateWrap.
	import ProGateOverlay from './ProGateOverlay.svelte';
	import ProGatePage from './ProGatePage.svelte';

	let { featureName, variant = 'page' }: { featureName: string; variant?: 'page' | 'overlay' } = $props();
</script>

{#if variant === 'overlay'}
	<ProGateOverlay {featureName} />
{:else}
	<ProGatePage {featureName} />
{/if}
