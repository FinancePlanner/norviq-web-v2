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
		secondary: 'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
		default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90'
	};
</script>

<span
	class={cn(
		'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none',
		'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
		'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
		'transition-[color,box-shadow] overflow-hidden',
		variants[variant] ?? variants.default,
		className
	)}
	{...rest}>{@render children?.()}</span
>
