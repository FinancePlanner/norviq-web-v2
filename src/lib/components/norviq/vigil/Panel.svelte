<script lang="ts">
	// vigil.Panel(class, titleID) { children } — glass command-center panel.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		class: className = '',
		titleID = '',
		children,
		...rest
	}: Omit<HTMLAttributes<HTMLElement>, 'class'> & {
		class?: string;
		titleID?: string;
		children?: Snippet;
	} = $props();
</script>

<section
	class={'glass-card dash-panel ' + className}
	aria-labelledby={titleID || undefined}
	{...rest}
>
	{@render children?.()}
</section>
