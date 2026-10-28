<script lang="ts">
	// templUI internal/components/textarea. `value` is bindable; autoResize grows
	// the box to its content (templUI textarea.js behaviour).
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';

	type Props = Omit<HTMLTextareaAttributes, 'value'> & {
		value?: string | null;
		autoResize?: boolean;
		hasError?: boolean;
		ref?: HTMLTextAreaElement | null;
	};

	const uid = $props.id();
	let {
		id,
		value = $bindable(),
		rows,
		autoResize = false,
		hasError = false,
		class: className,
		ref = $bindable(null),
		oninput,
		...rest
	}: Props = $props();

	function fit(el: HTMLTextAreaElement) {
		const minHeight = el.style.minHeight || getComputedStyle(el).minHeight;
		el.style.height = minHeight;
		el.style.height = `${el.scrollHeight}px`;
	}

	function autosize(el: HTMLTextAreaElement) {
		if (!autoResize) return;
		if (!el.style.height || el.style.height === el.style.minHeight) el.style.height = `${el.scrollHeight}px`;
	}
</script>

<textarea
	bind:this={ref}
	id={id || uid}
	data-tui-textarea
	rows={rows && rows > 0 ? rows : undefined}
	aria-invalid={hasError ? 'true' : undefined}
	data-tui-textarea-auto-resize={autoResize ? 'true' : undefined}
	class={cn(
		'flex w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm',
		'min-h-[80px]',
		'dark:bg-input/30',
		'selection:bg-primary selection:text-primary-foreground',
		'placeholder:text-muted-foreground',
		'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
		'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
		'aria-invalid:ring-destructive/20 aria-invalid:border-destructive dark:aria-invalid:ring-destructive/40',
		hasError && 'border-destructive ring-destructive/20 dark:ring-destructive/40',
		autoResize && 'overflow-hidden resize-none',
		className
	)}
	bind:value
	{@attach autosize}
	oninput={(e) => {
		if (autoResize) fit(e.currentTarget);
		oninput?.(e);
	}}
	{...rest}
></textarea>
