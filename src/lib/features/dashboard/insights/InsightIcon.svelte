<script lang="ts">
	// dashboard.InsightIcon(kind)
	import Icon from '#lib/components/norviq/tui/Icon.svelte';

	let { kind }: { kind: string } = $props();

	const name = $derived(
		kind === 'savings'
			? 'trending-up'
			: kind === 'streak'
				? 'flame'
				: kind === 'watchlist'
					? 'star'
					: kind === 'cash'
						? 'banknote'
						: 'circle'
	);
</script>

<Icon {name} class="dash-icon" />
