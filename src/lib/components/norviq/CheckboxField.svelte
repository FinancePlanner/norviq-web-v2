<script lang="ts">
	// components.CheckboxField — templUI checkbox + label (description nested in
	// the label), data-nq-control="checkbox". `checked` is bindable.
	import type { HTMLInputAttributes } from 'svelte/elements';
	import * as form from './tui/form/index.js';
	import Checkbox from './tui/Checkbox.svelte';
	import { controlID } from './types.js';

	type Props = Omit<HTMLInputAttributes, 'type'> & {
		label?: string;
		description?: string;
		checked?: boolean;
		wrapperClass?: string;
	};

	let {
		id,
		name,
		label = '',
		description = '',
		checked = $bindable(false),
		class: className,
		wrapperClass,
		...rest
	}: Props = $props();

	const cid = $derived(controlID(id, name));
</script>

<form.ItemFlex class={wrapperClass}>
	<Checkbox
		bind:checked
		id={cid || undefined}
		{name}
		class={className}
		data-nq-control="checkbox"
		{...rest}
	/>
	{#if label}
		<form.Label for={cid || undefined}>
			{label}
			{#if description}
				<form.Description>{description}</form.Description>
			{/if}
		</form.Label>
	{/if}
</form.ItemFlex>
