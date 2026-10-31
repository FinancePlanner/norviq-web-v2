<script lang="ts">
	// components.ProGateWrap(isPro, featureName, content): Pro users get the
	// content; everyone else gets it as an aria-hidden preview under the overlay.
	import type { Snippet } from 'svelte';
	import ProGateOverlay from './ProGateOverlay.svelte';

	let { isPro, featureName, children }: { isPro: boolean; featureName: string; children: Snippet } =
		$props();
</script>

{#if isPro}
	{@render children()}
{:else}
	<div class="pro-gate-wrap">
		<div class="pro-gate-preview" aria-hidden="true">
			{@render children()}
		</div>
		<ProGateOverlay {featureName} />
	</div>
{/if}
