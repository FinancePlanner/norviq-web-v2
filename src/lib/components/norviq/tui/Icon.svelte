<script lang="ts">
	// templUI internal/components/icon: the dynamic `icon.Icon("kebab-name")(icon.Props{Class})`
	// call. For a fixed icon, import it from @lucide/svelte directly instead
	// (`icon.ChevronLeft(...)` → `<ChevronLeft class="…" />`).
	import { dev } from '$app/env';
	import type { LucideProps } from '@lucide/svelte';
	import { iconRegistry } from './icon-registry.js';

	interface Props extends LucideProps {
		/** Lucide kebab-case name, exactly as the templ passed it ("trash-2", "circle-alert"). */
		name: string;
		class?: string;
	}

	let { name, class: className = '', ...rest }: Props = $props();

	const Glyph = $derived(iconRegistry[name]);

	$effect(() => {
		if (dev && !Glyph) console.warn(`[norviq Icon] "${name}" is not in icon-registry.ts`);
	});
</script>

{#if Glyph}
	<Glyph class={className} data-lucide="icon" {...rest} />
{/if}
