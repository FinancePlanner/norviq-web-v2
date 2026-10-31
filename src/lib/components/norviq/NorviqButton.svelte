<script lang="ts" module>
	import type { ButtonRole } from './types.js';
	import type { ButtonVariant } from './tui/Button.svelte';

	/** components.variantFor: Norviq role → templUI variant. */
	export function variantFor(role: ButtonRole): ButtonVariant {
		return role === 'primary' ? 'default' : role === 'secondary' ? 'secondary' : 'ghost';
	}
</script>

<script lang="ts">
	// components.norviqButton — the shared renderer behind Primary/Secondary/Ghost/
	// Icon/Submit buttons: templUI Button with data-nq-btn={kind} (+ data-nq-submit
	// for submits). Caller attributes are spread last, so they win.
	import type { ComponentProps } from 'svelte';
	import Button, { type ButtonType } from './tui/Button.svelte';

	type Props = Omit<ComponentProps<typeof Button>, 'type' | 'variant' | 'size'> & {
		/** The Norviq role (data-nq-btn): primary | secondary | ghost. */
		kind: ButtonRole;
		type?: ButtonType;
		submit?: boolean;
		/** Adds .htmx-request so css/loading.css shows the submit spinner (see withSpinner). */
		loading?: boolean;
	};

	let {
		kind,
		type,
		submit = false,
		class: className,
		loading = false,
		children,
		ref = $bindable(null),
		...rest
	}: Props = $props();

	const cls = $derived(
		[className, loading && 'htmx-request'].filter(Boolean).join(' ') || undefined
	);
</script>

<Button
	bind:ref
	variant={variantFor(kind)}
	type={submit ? 'submit' : type || 'button'}
	class={cls}
	data-nq-btn={kind}
	data-nq-submit={submit ? 'true' : undefined}
	{...rest}>{@render children?.()}</Button
>
