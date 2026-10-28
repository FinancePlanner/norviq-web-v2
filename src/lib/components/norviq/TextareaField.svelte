<script lang="ts">
	// components.TextareaField — labelled templUI textarea with data-nq-control="textarea".
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import * as form from './tui/form/index.js';
	import Textarea from './tui/Textarea.svelte';
	import { controlID } from './types.js';

	type Props = Omit<HTMLTextareaAttributes, 'value'> & {
		label?: string;
		value?: string | null;
		description?: string;
		error?: string;
		autoResize?: boolean;
		wrapperClass?: string;
		ref?: HTMLTextAreaElement | null;
	};

	let {
		id,
		name,
		label = '',
		value = $bindable(),
		description = '',
		error = '',
		required = false,
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
	<Textarea
		bind:ref
		bind:value
		id={cid || undefined}
		{name}
		hasError={error !== ''}
		class={className}
		data-nq-control="textarea"
		required={required || undefined}
		{...rest}
	/>
	{#if description}
		<form.Description>{description}</form.Description>
	{/if}
	{#if error}
		<form.Message variant="error">{error}</form.Message>
	{/if}
</form.Item>
