<script lang="ts">
	import CoinPage from '#lib/features/planning-tools/crypto/CoinPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.vm.symbol} - Crypto - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<CoinPage vm={data.vm} />
