<script lang="ts">
	// components.IconButton — square ghost button ("h-9 w-9 p-0 " + class). Pass
	// an accessible name (aria-label). FullWidth is ignored, like the Go wrapper.
	import type { ComponentProps } from 'svelte';
	import NorviqButton from './NorviqButton.svelte';

	let {
		ref = $bindable(null),
		class: className = '',
		fullWidth: _fullWidth,
		...props
	}: Omit<ComponentProps<typeof NorviqButton>, 'kind' | 'submit'> = $props();
</script>

<NorviqButton bind:ref kind="ghost" class={'h-9 w-9 p-0 ' + (className ?? '')} {...props} />
