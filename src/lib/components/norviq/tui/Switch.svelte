<script lang="ts">
	// templUI internal/components/switch (Go package switchcomp): a hidden native
	// checkbox with role="switch" plus the visual track. `checked` is bindable.
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	type Props = Omit<HTMLInputAttributes, 'type'> & { checked?: boolean; ref?: HTMLInputElement | null };

	const uid = $props.id();
	let {
		id,
		checked = $bindable(false),
		value,
		disabled = false,
		class: className,
		ref = $bindable(null),
		...rest
	}: Props = $props();

	const inputId = $derived(id || uid);
</script>

<label for={inputId} class={cn('inline-flex cursor-pointer items-center gap-2', disabled && 'cursor-not-allowed')}>
	<input
		bind:this={ref}
		id={inputId}
		type="checkbox"
		value={value || 'on'}
		bind:checked
		{disabled}
		class="peer hidden"
		role="switch"
		{...rest}
	/>
	<div
		class={cn(
			'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center',
			'rounded-full border-2 border-transparent',
			'transition-colors',
			'bg-input',
			'peer-checked:bg-primary',
			'peer-focus-visible:outline-none peer-focus-visible:ring-2',
			'peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
			'peer-focus-visible:ring-offset-background',
			'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
			'after:pointer-events-none after:block',
			'after:h-4 after:w-4',
			'after:rounded-full after:bg-background',
			'after:shadow-lg after:ring-0',
			'after:transition-transform',
			"after:content-['']",
			'peer-checked:after:translate-x-4',
			className
		)}
		aria-hidden="true"
	></div>
</label>
