<script lang="ts">
	import LandingPage from '#lib/features/public/landing/LandingPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<LandingPage vm={data.vm} />
