<script lang="ts">
	// components.SelectField — labelled native <select class="field-input"> with
	// data-nq-control="select". templUI's combobox path (UseCombobox) is not
	// ported: no Go call site ever enabled it. `value` is bindable; when unbound
	// the options' `selected` flags pick the initial choice.
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';
	import * as form from './tui/form/index.js';
	import { controlID, type Option } from './types.js';

	type Props = Omit<HTMLSelectAttributes, 'value'> & {
		label?: string;
		options: Option[];
		placeholder?: string;
		description?: string;
		error?: string;
		value?: string | string[] | null;
		wrapperClass?: string;
		ref?: HTMLSelectElement | null;
	};

	let {
		id,
		name,
		label = '',
		options,
		placeholder = '',
		description = '',
		error = '',
		required = false,
		disabled = false,
		multiple = false,
		value = $bindable(),
		class: className,
		wrapperClass,
		ref = $bindable(null),
		...rest
	}: Props = $props();

	const cid = $derived(controlID(id, name));
</script>

{#snippet opts()}
	{#if placeholder}
		<option value="">{placeholder}</option>
	{/if}
	{#each options as opt, i (i)}
		<option value={opt.value} selected={opt.selected || undefined} disabled={opt.disabled || undefined} {...opt.attrs}
			>{opt.label}</option
		>
	{/each}
{/snippet}

<form.Item class={wrapperClass}>
	{#if label}
		<form.Label for={cid || undefined} class="field-label" data-nq-label="true">{label}</form.Label>
	{/if}
	{#if multiple}
		<select
			bind:this={ref}
			bind:value
			id={cid || undefined}
			name={name || undefined}
			class={cn('field-input', className)}
			required={required || undefined}
			disabled={disabled || undefined}
			multiple
			data-nq-control="select"
			{...rest}
		>
			{@render opts()}
		</select>
	{:else}
		<select
			bind:this={ref}
			bind:value
			id={cid || undefined}
			name={name || undefined}
			class={cn('field-input', className)}
			required={required || undefined}
			disabled={disabled || undefined}
			data-nq-control="select"
			{...rest}
		>
			{@render opts()}
		</select>
	{/if}
	{#if description}
		<form.Description>{description}</form.Description>
	{/if}
	{#if error}
		<form.Message variant="error">{error}</form.Message>
	{/if}
</form.Item>
