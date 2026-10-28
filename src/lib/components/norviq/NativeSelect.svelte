<script lang="ts">
	// components.NativeSelect — a bare <select> with no wrapper, for selects that
	// must stay a direct child of a grid. No .field-input: only `class`.
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import type { Option } from './types.js';

	type Props = Omit<HTMLSelectAttributes, 'value'> & {
		options: Option[];
		value?: string | null;
		ref?: HTMLSelectElement | null;
	};

	let {
		id,
		name,
		options,
		required = false,
		disabled = false,
		value = $bindable(),
		class: className,
		ref = $bindable(null),
		...rest
	}: Props = $props();
</script>

<select
	bind:this={ref}
	bind:value
	id={id || undefined}
	name={name || undefined}
	class={className}
	disabled={disabled || undefined}
	required={required || undefined}
	data-nq-control="select"
	{...rest}
>
	{#each options as opt, i (i)}
		<option value={opt.value} selected={opt.selected || undefined} disabled={opt.disabled || undefined} {...opt.attrs}
			>{opt.label}</option
		>
	{/each}
</select>
