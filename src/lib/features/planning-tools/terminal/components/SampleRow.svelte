<script lang="ts">
	// SampleRow: the empty-state example — static text, never stored. "Use this
	// row" posts its values to the create route; "Dismiss" sets a cookie.
	import PrimaryButton from '#lib/components/norviq/PrimaryButton.svelte';
	import GhostButton from '#lib/components/norviq/GhostButton.svelte';
	import ShareCount from './ShareCount.svelte';
	import Progress from './Progress.svelte';
	import { SAMPLE_CREATE_VALS } from '../vm.js';
	import { terminalSend } from '../client.js';
	import type { RowVM, WorkspaceVM } from '../types.js';

	let { row, onworkspace }: { row: RowVM; onworkspace: (vm: WorkspaceVM) => void } = $props();

	async function action(url: string, vals: Record<string, string> = {}) {
		const vm = await terminalSend<WorkspaceVM>('POST', url, vals);
		if (vm) onworkspace(vm);
	}
</script>

<tbody id="terminal-sample" class="terminal-row terminal-row-sample">
	<tr>
		<td>
			<span class="font-semibold">{row.ticker}</span>
			<span class="ml-1 rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold">Sample</span>
		</td>
		<td class="tabular-nums text-muted-foreground">{row.sharesOutstandingCompact}</td>
		<td class="tabular-nums">{row.terminalShareCountCompact}</td>
		<td class="tabular-nums">{row.terminalMarketCapCompact}</td>
		<td class="tabular-nums">{row.terminalSharePrice}</td>
		<td class="tabular-nums">{row.valueWantedCompact}</td>
		<td class="tabular-nums">
			<ShareCount full={row.sharesNeeded} whole={row.sharesNeededWhole} />
		</td>
		<td class="tabular-nums">{row.sharesOwned}</td>
		<td>
			<Progress pct={row.progressPct} label={row.progressLabel} valid={row.valid} />
		</td>
		<td class="tabular-nums">
			<ShareCount full={row.stillNeeded} whole={row.stillNeededWhole} />
		</td>
		<td>
			<div class="flex flex-wrap gap-1">
				<PrimaryButton aria-label="Use this row" onclick={() => action('/terminal/positions', SAMPLE_CREATE_VALS)}>Use this row</PrimaryButton>
				<GhostButton aria-label="Dismiss the sample" onclick={() => action('/terminal/sample/dismiss')}>Dismiss</GhostButton>
			</div>
		</td>
	</tr>
</tbody>
