<script lang="ts">
	// components.ChartEmbed(html) — raw HTML passthrough. Note: {@html} does not
	// run <script> tags, so the Go chart snippets (ECharts init scripts) will not
	// boot here; port charts to #lib/charts/* and use this only for static markup.
	let { html = '' }: { html?: string | null } = $props();
</script>

{#if html}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- server-built chart markup, same trust as the Go templ.Raw -->
	{@html html}
{/if}
