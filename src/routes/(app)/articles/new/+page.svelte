<script lang="ts">
	import ComposePage from '#lib/features/public/articles/ComposePage.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const vm = $derived(form?.vm ?? data.vm);
</script>

<ComposePage {vm} />
