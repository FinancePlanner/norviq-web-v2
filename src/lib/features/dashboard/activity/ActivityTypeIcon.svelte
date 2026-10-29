<script lang="ts">
	// dashboard.ActivityTypeIcon(kind)
	import Icon from '#lib/components/norviq/tui/Icon.svelte';

	let { kind }: { kind: string } = $props();

	const name = $derived(
		kind === 'portfolio' ? 'briefcase' : kind === 'expense' ? 'credit-card' : kind === 'news' ? 'newspaper' : 'circle'
	);
</script>

<Icon {name} class="dash-icon dash-icon-sm" />
