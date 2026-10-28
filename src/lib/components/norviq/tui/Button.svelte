<script lang="ts" module>
	import { cn } from '#lib/utils.js';

	export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
	export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';
	export type ButtonType = 'button' | 'submit' | 'reset';

	const base = [
		'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all',
		"disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
		'outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
		'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
		'cursor-pointer'
	];

	const variants: Record<ButtonVariant, string> = {
		default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
		destructive:
			'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
		outline:
			'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
		secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
		ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
		link: 'text-primary underline-offset-4 hover:underline'
	};

	const sizes: Record<ButtonSize, string> = {
		default: 'h-9 px-4 py-2 has-[>svg]:px-3',
		sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
		lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
		icon: 'size-9'
	};

	/** The exact class string templUI's button.Button emits (TwMerge of base + variant + size + modifiers + class). */
	export function buttonClass(
		variant: ButtonVariant = 'default',
		size: ButtonSize = 'default',
		fullWidth = false,
		extra?: string | null
	): string {
		return cn(...base, variants[variant] ?? variants.default, sizes[size] ?? sizes.default, fullWidth && 'w-full', extra);
	}

</script>

<script lang="ts">
	// templUI internal/components/button. Renders <a> when href is set and the
	// button is not disabled, else <button> (type defaults to "button").
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Common = {
		variant?: ButtonVariant;
		size?: ButtonSize;
		fullWidth?: boolean;
		href?: string;
		target?: string;
		disabled?: boolean;
		type?: ButtonType;
		form?: string;
		class?: string;
		children?: Snippet;
		ref?: HTMLElement | null;
	};
	// Button attributes plus the few anchor-only ones; a full union with
	// HTMLAnchorAttributes is too large for TypeScript to spread.
	type Props = Common &
		Omit<HTMLButtonAttributes, keyof Common> &
		Pick<HTMLAnchorAttributes, 'rel' | 'download' | 'hreflang' | 'referrerpolicy'>;

	let {
		variant = 'default',
		size = 'default',
		fullWidth = false,
		href,
		target,
		disabled = false,
		type = 'button',
		form,
		class: className,
		children,
		ref = $bindable(null),
		...rest
	}: Props = $props();

	const cls = $derived(buttonClass(variant, size, fullWidth, className));
</script>

{#if href && !disabled}
	<a bind:this={ref} {href} {target} class={cls} {...rest as unknown as HTMLAnchorAttributes}>{@render children?.()}</a>
{:else}
	<button bind:this={ref} class={cls} {type} {form} {disabled} {...rest as HTMLButtonAttributes}>{@render children?.()}</button>
{/if}
