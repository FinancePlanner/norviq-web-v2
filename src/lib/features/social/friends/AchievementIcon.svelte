<script lang="ts">
	// icon.Icon(achievements.Icon(iconKey))(icon.Props{Class}).
	import { achievementIcon } from './achievement-icons.js';

	let { iconKey, class: className = '' }: { iconKey: string; class?: string } = $props();
	const Glyph = $derived(achievementIcon(iconKey));
</script>

<Glyph class={className} data-lucide="icon" />
