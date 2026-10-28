<script lang="ts">
	// templUI internal/components/checkbox: a styled native checkbox with check /
	// minus glyph overlays. `checked` is bindable.
	import Check from '@lucide/svelte/icons/check';
	import Minus from '@lucide/svelte/icons/minus';
	import type { Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	type Props = Omit<HTMLInputAttributes, 'type'> & {
		checked?: boolean;
		group?: string;
		groupParent?: boolean;
		/** Replaces the default check glyph. */
		icon?: Snippet;
		ref?: HTMLInputElement | null;
	};

	let {
		checked = $bindable(false),
		value,
		group,
		groupParent = false,
		icon,
		class: className,
		ref = $bindable(null),
		...rest
	}: Props = $props();
</script>

<div class="relative inline-flex items-center">
	<input
		bind:this={ref}
		bind:checked
		value={value || 'on'}
		data-tui-checkbox-group={group || undefined}
		data-tui-checkbox-parent={groupParent ? 'true' : undefined}
		type="checkbox"
		class={cn(
			'peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs',
			'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring',
			'disabled:cursor-not-allowed disabled:opacity-50',
			'checked:bg-primary checked:text-primary-foreground checked:border-primary',
			'indeterminate:bg-primary indeterminate:text-primary-foreground indeterminate:border-primary',
			'appearance-none cursor-pointer transition-shadow',
			'relative',
			className
		)}
		{...rest}
	/>
	<div
		class="absolute inset-0 pointer-events-none flex items-center justify-center text-primary-foreground opacity-0 peer-checked:opacity-100"
	>
		{#if icon}{@render icon()}{:else}<Check class="size-3.5" />{/if}
	</div>
	<div
		class="absolute inset-0 pointer-events-none flex items-center justify-center text-primary-foreground opacity-0 peer-indeterminate:opacity-100"
	>
		<Minus class="size-3.5" />
	</div>
</div>
