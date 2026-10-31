<script lang="ts" module>
	export type InputType =
		| 'text'
		| 'password'
		| 'email'
		| 'number'
		| 'tel'
		| 'url'
		| 'search'
		| 'date'
		| 'datetime-local'
		| 'time'
		| 'file'
		| 'color'
		| 'week'
		| 'month';
</script>

<script lang="ts">
	// templUI internal/components/input: <div class="relative w-full"><input …/>[password toggle]</div>.
	// `value` is bindable (replaces Alpine x-model). The templUI password toggle
	// renders unless noTogglePassword is set; Field always sets it, like the Go web.
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.js';
	import Button from './Button.svelte';

	type Props = Omit<HTMLInputAttributes, 'type' | 'value'> & {
		type?: InputType;
		value?: string | number | null;
		hasError?: boolean;
		fileAccept?: string;
		noTogglePassword?: boolean;
		ref?: HTMLInputElement | null;
	};

	const uid = $props.id();
	let {
		id,
		type = 'text',
		value = $bindable(),
		class: className,
		hasError = false,
		fileAccept,
		noTogglePassword = false,
		disabled = false,
		readonly = false,
		required = false,
		ref = $bindable(null),
		...rest
	}: Props = $props();

	const inputId = $derived(id || uid);
	const withToggle = $derived(type === 'password' && !noTogglePassword);
	let revealed = $state(false);
	const effectiveType = $derived(withToggle && revealed ? 'text' : type);

	const cls = $derived(
		cn(
			'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm',
			'dark:bg-input/30',
			'selection:bg-primary selection:text-primary-foreground',
			'placeholder:text-muted-foreground',
			'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
			'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
			'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
			'aria-invalid:ring-destructive/20 aria-invalid:border-destructive dark:aria-invalid:ring-destructive/40',
			hasError && 'border-destructive ring-destructive/20 dark:ring-destructive/40',
			withToggle && 'pr-8',
			className
		)
	);
</script>

<div class="relative w-full">
	{#if type === 'file'}
		<input
			bind:this={ref}
			id={inputId}
			type="file"
			accept={fileAccept || undefined}
			{disabled}
			{readonly}
			{required}
			aria-invalid={hasError ? 'true' : undefined}
			class={cls}
			{...rest}
		/>
	{:else}
		<input
			bind:this={ref}
			id={inputId}
			type={effectiveType}
			bind:value
			{disabled}
			{readonly}
			{required}
			aria-invalid={hasError ? 'true' : undefined}
			class={cls}
			{...rest}
		/>
	{/if}
	{#if withToggle}
		<Button
			size="icon"
			variant="ghost"
			class="absolute top-1/2 right-0 -translate-y-1/2 cursor-pointer opacity-50"
			data-tui-input-toggle-password={inputId}
			onclick={() => (revealed = !revealed)}
		>
			<span class={['icon-open', revealed ? 'hidden' : 'block']}><Eye class="size-[18px]" /></span>
			<span class={['icon-closed', revealed ? 'block' : 'hidden']}
				><EyeOff class="size-[18px]" /></span
			>
		</Button>
	{/if}
</div>
