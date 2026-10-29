<script lang="ts">
	import BriefPage from '#lib/features/public/brief/BriefPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<BriefPage vm={data.vm} />
