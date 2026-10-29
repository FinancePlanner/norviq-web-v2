<script lang="ts">
	import DetailPage from '#lib/features/public/articles/DetailPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<DetailPage vm={data.vm} />
