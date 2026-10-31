<script lang="ts">
	// templUI internal/components/badge.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	type Variant = 'default' | 'secondary' | 'destructive' | 'outline';
	let {
		variant = 'default',
		class: className,
		children,
		...rest
	}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant; children?: Snippet } = $props();

	const variants: Record<Variant, string> = {
		destructive:
			'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
		outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
		secondary:
			'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
		default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90'
	};
</script>

<span
	class={cn(
		'inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3',
		'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
		'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
		'overflow-hidden transition-[color,box-shadow]',
		variants[variant] ?? variants.default,
		className
	)}
	{...rest}>{@render children?.()}</span
>
