<script lang="ts">
	// Port of pages/expenses/import.templ ImportSummaryPanel (post-commit).
	import { PrimaryButton } from '#lib/components/norviq/index.js';
	import type { ImportSummaryVM } from './vm.js';

	let { vm }: { vm: ImportSummaryVM } = $props();
</script>

<section class="glass-card">
	<h3>{`${vm.imported} expenses imported`}</h3>
	{#if vm.skipped > 0}
		<p class="field-hint">{`${vm.skipped} skipped.`}</p>
	{/if}
	{#if vm.failed > 0}
		<p class="field-hint">{`${vm.failed} could not be written.`}</p>
	{/if}
	{#if vm.createdCategories.length > 0}
		<p class="field-hint">New categories were created for you.</p>
	{/if}
	{#each vm.months as month (month)}
		<a class="btn-secondary" href={'/expenses?month=' + month}>{month}</a>
	{/each}
	<PrimaryButton href="/expenses" fullWidth>Back to expenses</PrimaryButton>
</section>
