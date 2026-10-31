<script lang="ts">
	// Workspace: the region row actions re-render (create form, table, footer).
	// Go swapped #terminal-workspace's outerHTML; a new `vm` re-creates it here
	// the same way (keyed on `version`), while a cell edit only updates its row
	// and the footer.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import CreateForm from './CreateForm.svelte';
	import TerminalRow from './TerminalRow.svelte';
	import SampleRow from './SampleRow.svelte';
	import Footer from './Footer.svelte';
	import type { FooterVM, WorkspaceVM } from '../types.js';

	let { vm, onworkspace }: { vm: WorkspaceVM; onworkspace: (vm: WorkspaceVM) => void } = $props();

	// Overridden by cell edits (Go: the footer's out-of-band swap).
	let footer = $derived<FooterVM>(vm.footer);
	// Rows a cell edit found deleted elsewhere (Go: the empty answer swapped the row away).
	let gone = $state<string[]>([]);
	const rows = $derived(vm.rows.filter((r) => !gone.includes(r.id)));
</script>

{#if vm.loadError}
	<section id="terminal-workspace" aria-label="Terminal scenarios">
		<vigil.Panel class="p-5">
			<p role="alert" class="text-subhead">
				Terminal sizing is unavailable right now. Try again shortly.
			</p>
		</vigil.Panel>
	</section>
{:else}
	<section id="terminal-workspace" class="space-y-4" aria-label="Terminal scenarios">
		{#if vm.notice}
			<p role="alert" class="text-footnote text-destructive">{vm.notice}</p>
		{/if}
		<CreateForm vm={vm.create} {onworkspace} />
		<vigil.DataTable class="terminal-table">
			<thead>
				<tr>
					<th scope="col">Ticker</th>
					<th scope="col">Shares outstanding</th>
					<th scope="col">Terminal share count</th>
					<th scope="col">Terminal market cap</th>
					<th scope="col" class="terminal-calc"
						>Terminal share price<span class="sr-only"> (calculated)</span></th
					>
					<th scope="col">Value wanted</th>
					<th scope="col" class="terminal-calc"
						>Shares needed<span class="sr-only"> (calculated)</span></th
					>
					<th scope="col">Owned</th>
					<th scope="col" class="terminal-calc"
						>Progress<span class="sr-only"> (calculated)</span></th
					>
					<th scope="col" class="terminal-calc"
						>Still needed<span class="sr-only"> (calculated)</span></th
					>
					<th scope="col"><span class="sr-only">Actions</span></th>
				</tr>
			</thead>
			{#if vm.showSample && vm.sample}
				<SampleRow row={vm.sample} {onworkspace} />
			{/if}
			{#each rows as row (row.id)}
				<TerminalRow
					{row}
					onfooter={(f) => (footer = f)}
					ongone={() => (gone = [...gone, row.id])}
					{onworkspace}
				/>
			{/each}
		</vigil.DataTable>
		<!-- Assumptions vs results: inputs keep their field borders, results sit on a
		     shaded read-only surface. Nothing here changes how a value is computed. -->
		<p class="terminal-calc-legend text-footnote text-muted-foreground">
			<span class="terminal-calc-swatch" aria-hidden="true"></span>
			Shaded columns are calculated from your inputs.
		</p>
		{#if vm.rows.length === 0 && !vm.showSample}
			<p class="text-subhead text-muted-foreground">
				No scenarios yet. Add one to see how many shares your target takes.
			</p>
		{/if}
		<Footer vm={footer} />
	</section>
{/if}

<style>
	/* :global because the cells live in TerminalRow / SampleRow. Scoped to the
	   terminal table so no other DataTable picks the shading up. */
	:global(.terminal-table .terminal-calc) {
		background: color-mix(in srgb, var(--color-elevated-card) 70%, transparent);
	}
	:global(.terminal-table th.terminal-calc) {
		color: var(--muted-foreground);
	}
	.terminal-calc-legend {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	/* A flat bar, not a bordered square: a square read as a checkbox. */
	.terminal-calc-swatch {
		width: 1.25rem;
		height: 0.625rem;
		flex: none;
		border-radius: 0.125rem;
		background: var(--color-elevated-card);
	}
</style>
