<script lang="ts">
	// One quiet panel for the tools that configure or sell something, under the
	// user's own figures. Each row resolves on its own, as the old cards did.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { mcpRow, taxRow, terminalRow, type ToolRow } from './tools.js';
	import type { MCPStatusVM, TaxPanelVM, TerminalSummaryVM } from './types.js';

	let {
		mcp,
		terminal,
		tax
	}: {
		mcp: Promise<MCPStatusVM>;
		terminal: Promise<TerminalSummaryVM>;
		tax: Promise<TaxPanelVM>;
	} = $props();
</script>

{#snippet row(r: ToolRow)}
	<li class="cc-tool-row">
		<div class="min-w-0">
			<p class="cc-tool-title">{r.title}</p>
			<p class="cc-tool-status">{r.status}</p>
		</div>
		<a class="cc-panel-link shrink-0" href={r.href}>{r.action}</a>
	</li>
{/snippet}

{#snippet pending(title: string)}
	<li class="cc-tool-row" aria-busy="true">
		<div class="min-w-0">
			<p class="cc-tool-title">{title}</p>
			<p class="cc-tool-status">Loading…</p>
		</div>
	</li>
{/snippet}

<vigil.Panel class="cc-tools" titleID="cc-tools-title">
	<h2 id="cc-tools-title" class="cc-panel-title">Tools and connections</h2>
	<ul class="cc-tool-list">
		{#await mcp}
			{@render pending('MCP connections')}
		{:then vm}
			{@render row(mcpRow(vm))}
		{/await}
		{#await terminal}
			{@render pending('Terminal sizing')}
		{:then vm}
			{@const r = terminalRow(vm)}
			{#if r}{@render row(r)}{/if}
		{/await}
		{#await tax}
			{@render pending('Tax-loss harvesting')}
		{:then vm}
			{@render row(taxRow(vm))}
		{/await}
	</ul>
</vigil.Panel>
