<script lang="ts">
	import CryptoPage from '#lib/features/planning-tools/crypto/CryptoPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Crypto - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<CryptoPage vm={data.vm} />
