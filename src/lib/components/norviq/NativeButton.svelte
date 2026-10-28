<script lang="ts">
	// components.NativeButton — a raw <button> whose page CSS supplies layout and
	// skin (clickable rows, action chips). type defaults to "button"; a submit
	// gets data-nq-submit so the form spinner still applies.
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	let {
		type = 'button',
		id,
		disabled = false,
		children,
		ref = $bindable(null),
		...rest
	}: HTMLButtonAttributes & { children?: Snippet; ref?: HTMLButtonElement | null } = $props();
</script>

<button
	bind:this={ref}
	type={type || 'button'}
	id={id || undefined}
	{disabled}
	data-nq-submit={type === 'submit' ? 'true' : undefined}
	{...rest}>{@render children?.()}</button
>
