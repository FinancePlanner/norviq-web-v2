<script lang="ts">
	import FeedPage from '#lib/features/public/articles/FeedPage.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<FeedPage vm={data.vm} />
