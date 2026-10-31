<script lang="ts">
	// components.VaultTextField(label, name, inputType, placeholder, value, required) —
	// legacy positional text field; delegates to Field with wrapperClass "space-y-2".
	// Prefer <Field> in new markup.
	import Field from './Field.svelte';
	import type { InputType } from './tui/Input.svelte';

	type Props = {
		label: string;
		name: string;
		inputType?: InputType;
		placeholder?: string;
		value?: string | number | null;
		required?: boolean;
	};

	let {
		label,
		name,
		inputType = 'text',
		placeholder = '',
		value = $bindable(),
		required = false
	}: Props = $props();
</script>

<Field
	bind:value
	{name}
	{label}
	type={inputType}
	placeholder={placeholder || undefined}
	{required}
	wrapperClass="space-y-2"
/>
