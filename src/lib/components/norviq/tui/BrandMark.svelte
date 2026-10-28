<script lang="ts" module>
	// templUI-adjacent internal/components/brandicon: third-party brand marks
	// (lucide ships no brand icons). Same normalisation as brandicon.build: strip
	// width/height/style from the root <svg>, drop <title>, add class +
	// aria-hidden/focusable. Unknown names render nothing (templ.NopComponent).
	import anthropic from './marks/anthropic.svg?raw';
	import claude from './marks/claude.svg?raw';
	import cursor from './marks/cursor.svg?raw';
	import hermes from './marks/hermes.svg?raw';
	import openai from './marks/openai.svg?raw';

	const marks: Record<string, string> = { anthropic, claude, cursor, hermes, openai };

	export function hasBrandMark(name: string): boolean {
		return name in marks;
	}

	function build(raw: string, cls: string): string {
		const open = raw.indexOf('>');
		if (!raw.startsWith('<svg') || open === -1) return '';
		let head = raw.slice(0, open);
		const body = raw.slice(open).replace(/<title>[\s\S]*?<\/title>/g, '');
		head = head.replace(/\s(?:width|height)="[^"]*"/g, '').replace(/\sstyle="[^"]*"/g, '');
		if (cls) head += ` class="${cls.replace(/"/g, '&quot;')}"`;
		head += ' aria-hidden="true" focusable="false"';
		return head + body;
	}
</script>

<script lang="ts">
	let { name, class: className = '' }: { name: string; class?: string } = $props();
	const svg = $derived(marks[name] ? build(marks[name], className) : '');
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- bundled, trusted SVG files -->
{@html svg}
