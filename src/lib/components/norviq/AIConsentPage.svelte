<script lang="ts">
	// components.AIConsentPage(next) — full-page variant.
	import AIConsentCard from './AIConsentCard.svelte';

	let { next }: { next: string } = $props();
</script>

<div class="app-page-content vigil-document-page settings-modern-page ai-consent-page">
	<AIConsentCard {next} dismissible={false} notNowHref="/dashboard" />
</div>
