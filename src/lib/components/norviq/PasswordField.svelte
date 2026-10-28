<script lang="ts">
	// components.PasswordField(label, name, placeholder, autocomplete, required) —
	// password Field with the Show/Hide toggle. autocomplete is required:
	// "current-password" on sign-in, "new-password" on sign-up/change.
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Field from './Field.svelte';
	import PasswordToggle from './PasswordToggle.svelte';

	type Props = {
		label: string;
		name: string;
		placeholder?: string;
		autocomplete: HTMLInputAttributes['autocomplete'];
		required?: boolean;
		value?: string | null;
		error?: string;
		id?: string;
	};

	let { label, name, placeholder = '', autocomplete, required = false, value = $bindable(), error = '', id }: Props =
		$props();
	let visible = $state(false);
</script>

<div class="space-y-2">
	<div class="relative">
		<Field
			bind:value
			{id}
			{name}
			{label}
			type={visible ? 'text' : 'password'}
			placeholder={placeholder || undefined}
			{required}
			{autocomplete}
			{error}
			class="pr-12"
		/>
		<PasswordToggle bind:visible />
	</div>
</div>
