<script lang="ts">
	// icon.Icon(achievements.Icon(iconKey))(icon.Props{Class}).
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import { achievementIcon } from '#lib/features/achievements/icons.js';

	let { iconKey, class: className = '' }: { iconKey: string; class?: string } = $props();
</script>

<Icon name={achievementIcon(iconKey)} class={className} />
