<script lang="ts">
	// groups.templ tile(group, size).
	import { tile } from './view.js';

	let { group, size }: { group: { emoji: string; name: string }; size: string } = $props();
</script>

<span class={'groups-tile shrink-0 ' + size} aria-hidden="true">{tile(group)}</span>
