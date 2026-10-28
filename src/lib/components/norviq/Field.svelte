<script lang="ts">
	// components.Field — labelled text-like input (text, email, password, number,
	// tel, url, search, date, datetime-local). Stamps data-nq-control="input" and
	// the data-nq-label bridge; extra attributes go to the <input>, last, so they win.
	import type { HTMLInputAttributes } from 'svelte/elements';
	import * as form from './tui/form/index.js';
	import Input, { type InputType } from './tui/Input.svelte';
	import { controlID } from './types.js';

	type Props = Omit<HTMLInputAttributes, 'type' | 'value'> & {
		label?: string;
		type?: InputType;
		value?: string | number | null;
		description?: string;
		error?: string;
		wrapperClass?: string;
		ref?: HTMLInputElement | null;
	};

	let {
		id,
		name,
		label = '',
		type = 'text',
		value = $bindable(),
		description = '',
		error = '',
		autocomplete,
		class: className,
		wrapperClass,
		ref = $bindable(null),
		...rest
	}: Props = $props();

	const cid = $derived(controlID(id, name));
</script>

<form.Item class={wrapperClass}>
	{#if label}
		<form.Label for={cid || undefined} class="field-label" data-nq-label="true">{label}</form.Label>
	{/if}
	<Input
		bind:ref
		bind:value
		id={cid || undefined}
		{name}
		{type}
		hasError={error !== ''}
		class={className}
		noTogglePassword
		data-nq-control="input"
		autocomplete={autocomplete || undefined}
		{...rest}
	/>
	{#if description}
		<form.Description>{description}</form.Description>
	{/if}
	{#if error}
		<form.Message variant="error">{error}</form.Message>
	{/if}
</form.Item>
