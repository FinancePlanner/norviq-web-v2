<script lang="ts">
	// Suggestion: an AI answer in a row's details. It never writes: Accept
	// sends the row PATCH with the suggested values, the same as typing them.
	import PrimaryButton from '#lib/components/norviq/PrimaryButton.svelte';
	import GhostButton from '#lib/components/norviq/GhostButton.svelte';
	import { SuggestionState, type SuggestionVM } from '../types.js';

	let {
		vm,
		onaccept,
		ondismiss
	}: { vm: SuggestionVM; onaccept: (vals: Record<string, string>) => void; ondismiss: () => void } =
		$props();
</script>

{#snippet dismissSuggestion()}
	<GhostButton onclick={ondismiss}>Dismiss</GhostButton>
{/snippet}

<div data-terminal-suggestion class="space-y-2 rounded-xl border border-border p-3">
	{#if vm.state === SuggestionState.Ready}
		<p class="text-footnote font-semibold">{vm.heading}</p>
		<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-subhead">
			{#each vm.lines as line, i (i)}
				<dt class="text-muted-foreground">{line.label}</dt>
				<dd class="tabular-nums">{line.value}</dd>
			{/each}
		</dl>
		{#each vm.notes as note, i (i)}
			<p class="text-footnote">{note}</p>
		{/each}
		{#if vm.rationale}
			<p class="text-footnote">{vm.rationale}</p>
		{/if}
		{#if vm.asOf}
			<p class="text-footnote text-muted-foreground">As of {vm.asOf}</p>
		{/if}
		{#if vm.sources.length > 0}
			<ul class="space-y-1 text-footnote">
				{#each vm.sources as source, i (i)}
					<li>
						<a href={source} target="_blank" rel="noopener noreferrer" class="link-tint break-all"
							>{source}</a
						>
					</li>
				{/each}
			</ul>
		{/if}
		<p class="text-footnote text-muted-foreground">
			An AI suggestion. Check it against the sources before you accept it.
		</p>
		<div class="flex gap-2">
			{#if vm.acceptVals}
				{@const vals = vm.acceptVals}
				<PrimaryButton onclick={() => onaccept(vals)}>Accept</PrimaryButton>
			{/if}
			{@render dismissSuggestion()}
		</div>
	{:else if vm.state === SuggestionState.Upgrade}
		<p class="text-subhead font-semibold">AI lookups are a Pro feature.</p>
		<p class="text-footnote text-muted-foreground">The table and autobuys stay free.</p>
		<PrimaryButton href="/settings/subscription">See plans</PrimaryButton>
	{:else}
		<p role="alert" class="text-footnote">{vm.message}</p>
		{@render dismissSuggestion()}
	{/if}
</div>
