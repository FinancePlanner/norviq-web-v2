<script lang="ts">
	// components.SubmitButton — primary submit; stamps data-nq-submit so the
	// css/loading.css spinner applies (form.htmx-request, see withSpinner, or `loading`).
	import type { ComponentProps } from 'svelte';
	import NorviqButton from './NorviqButton.svelte';

	let { ref = $bindable(null), ...props }: Omit<ComponentProps<typeof NorviqButton>, 'kind' | 'submit' | 'type'> =
		$props();
</script>

<NorviqButton bind:ref kind="primary" submit {...props} />
