<script lang="ts">
	// components.ProGateOverlay(featureName) — the inline lock card.
	import Lock from '@lucide/svelte/icons/lock';
	import PrimaryButton from './PrimaryButton.svelte';

	let { featureName }: { featureName: string } = $props();
</script>

<div class="pro-gate-overlay pro-gate-card glass-card">
	<div class="pro-gate-lock" aria-hidden="true"><Lock class="h-8 w-8" data-lucide="icon" /></div>
	<p class="pro-gate-eyebrow">Pro feature</p>
	<h2 class="pro-gate-title">{featureName}</h2>
	<p class="pro-gate-desc">Subscribe to unlock this feature.</p>
	<p class="pro-gate-terms">
		Price and trial terms are shown on the subscription page, before any purchase.
	</p>
	<PrimaryButton href="/settings/subscription" class="pro-gate-cta mt-6 inline-flex px-8"
		>See plans</PrimaryButton
	>
</div>
