<script lang="ts">
	import CryptoHoldingPanel from '#lib/features/planning-tools/crypto/CryptoHoldingPanel.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const vm = $derived(form && 'vm' in form && form.vm ? form.vm : data.vm);
</script>

<svelte:head>
	<title>Crypto - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- Opened in a dialog from /crypto/portfolio; reached directly it renders alone. -->
<div class="app-page-content vigil-deck-page crypto-page crypto-modern-page">
	<CryptoHoldingPanel {vm} onclose={() => history.back()} />
</div>
