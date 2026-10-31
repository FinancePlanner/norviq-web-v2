<script lang="ts">
	// components.SecondarySubmitButton — SubmitButton in the secondary skin
	// (still stamps data-nq-submit).
	import type { ComponentProps } from 'svelte';
	import NorviqButton from './NorviqButton.svelte';

	let {
		ref = $bindable(null),
		...props
	}: Omit<ComponentProps<typeof NorviqButton>, 'kind' | 'submit' | 'type'> = $props();
</script>

<NorviqButton bind:ref kind="secondary" submit {...props} />
