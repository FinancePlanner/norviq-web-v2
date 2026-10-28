<script lang="ts">
	// components.GhostButton(ButtonProps) — templUI button, data-nq-btn="ghost".
	// Props: id, type (default "button"), href (renders <a>), class, disabled,
	// fullWidth, plus any attribute. Use SubmitButton for submits.
	import type { ComponentProps } from 'svelte';
	import NorviqButton from './NorviqButton.svelte';

	let { ref = $bindable(null), ...props }: Omit<ComponentProps<typeof NorviqButton>, 'kind' | 'submit'> = $props();
</script>

<NorviqButton bind:ref kind="ghost" {...props} />
