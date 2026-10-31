<script lang="ts">
	// templUI internal/components/copybutton: copies the value (inputs) or text of
	// the element with id `targetId`, then swaps the clipboard glyph for a check
	// for 2s (copybutton.js).
	import Check from '@lucide/svelte/icons/check';
	import Clipboard from '@lucide/svelte/icons/clipboard';
	import { cn } from '#lib/utils.js';
	import Button from './Button.svelte';

	let {
		id,
		targetId,
		class: className,
		...rest
	}: {
		id?: string;
		/** Required: id of the element to copy from (value for inputs, text otherwise). */
		targetId: string;
		class?: string;
		/** templUI's Attrs: extra attributes for the inner <button> (aria-label, data-*). */
		[attr: string]: unknown;
	} = $props();

	const uid = $props.id();
	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function fallbackCopy(text: string): boolean {
		const area = document.createElement('textarea');
		area.value = text;
		area.style.position = 'fixed';
		area.style.top = '-9999px';
		area.style.left = '-9999px';
		document.body.appendChild(area);
		area.focus();
		area.select();
		let ok = false;
		try {
			ok = document.execCommand('copy');
		} catch (err) {
			console.error('CopyButton: Fallback copy error', err);
		}
		area.remove();
		return ok;
	}

	async function copy() {
		const target = document.getElementById(targetId) as (HTMLElement & { value?: string }) | null;
		if (!target) {
			console.error(`CopyButton: Element with id '${targetId}' not found`);
			return;
		}
		const text = (target.value !== undefined ? target.value : target.textContent || '').trim();
		let ok = false;
		if (navigator.clipboard && window.isSecureContext) {
			try {
				await navigator.clipboard.writeText(text);
				ok = true;
			} catch (err) {
				console.error('CopyButton: Failed to copy text', err);
				ok = fallbackCopy(text);
			}
		} else {
			ok = fallbackCopy(text);
		}
		if (!ok) return;
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 2000);
	}
</script>

<div data-copy-button data-target-id={targetId} class="inline-block">
	<Button
		id={id || `copybutton-${uid}`}
		class={cn('h-7 w-7 text-muted-foreground hover:text-accent-foreground', className)}
		size="icon"
		variant="ghost"
		type="button"
		onclick={copy}
		{...rest}
	>
		<span data-copy-icon-clipboard style:display={copied ? 'none' : undefined}
			><Clipboard class="size-4" /></span
		>
		<span
			data-copy-icon-check
			class={copied ? undefined : 'hidden'}
			style:display={copied ? 'inline' : undefined}><Check class="size-4" /></span
		>
	</Button>
</div>
