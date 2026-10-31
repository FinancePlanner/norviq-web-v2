<script lang="ts">
	// components.NativeInput — a bare <input> for machinery with no visual surface
	// (hidden file pickers driven from a button). Not for visible controls.
	import type { HTMLInputAttributes } from 'svelte/elements';

	let { ref = $bindable(null), ...rest }: HTMLInputAttributes & { ref?: HTMLInputElement | null } =
		$props();
</script>

<input bind:this={ref} {...rest} />
