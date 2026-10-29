<script lang="ts">
	// shareCount: the exact and the whole-share figure; roundDown picks one.
	import { terminalView } from '../view.svelte.js';

	let { full, whole }: { full: string; whole: string } = $props();
	const view = terminalView();
</script>

<span style:display={view.roundDown ? 'none' : undefined}>{full}</span>
<span style:display={view.roundDown ? undefined : 'none'}>{whole}</span>
