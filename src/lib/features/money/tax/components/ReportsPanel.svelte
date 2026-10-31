<script lang="ts">
	// tax.reportsPanel (Workpapers). Generate posts to /tax?/reports (Go: hx-post="/tax/reports").
	import { enhance } from '$app/forms';
	import {
		EmptyState,
		NativeButton,
		SelectField,
		withSpinner
	} from '#lib/components/norviq/index.js';
	import { staticOptions, workpaperDescription } from '../helpers.js';
	import type { TaxPageViewModel } from '../types.js';
	import ReportRow from './ReportRow.svelte';

	let { vm }: { vm: TaxPageViewModel } = $props();
</script>

<section class="mt-10">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h2 class="text-2xl font-semibold">Workpapers</h2>
			<p class="opacity-60">{workpaperDescription(vm.isPro)}</p>
		</div>
		{#if vm.isPro}
			<div class="flex flex-wrap gap-2">
				<form method="POST" action="/tax?/reports" use:enhance={withSpinner()} class="flex gap-2">
					<input type="hidden" name="taxYear" value={vm.taxYear} /><input
						type="hidden"
						name="jurisdiction"
						value={vm.jurisdiction}
					/><input type="hidden" name="format" value="pdf" /><SelectField
						name="kind"
						aria-label="Report kind"
						options={staticOptions(
							'',
							['transaction_workpaper', 'Transaction workpaper'],
							['form_8949', 'Form 8949 workpaper'],
							['schedule_d_summary', 'Schedule D summary'],
							['country_capital_gains', 'Country capital gains']
						)}
					/><NativeButton type="submit" class="btn-secondary">Generate PDF</NativeButton>
				</form>
				<form method="POST" action="/tax?/reports" use:enhance={withSpinner()}>
					<input type="hidden" name="taxYear" value={vm.taxYear} /><input
						type="hidden"
						name="jurisdiction"
						value={vm.jurisdiction}
					/><input type="hidden" name="kind" value="transaction_workpaper" /><input
						type="hidden"
						name="format"
						value="csv"
					/><NativeButton type="submit" class="btn-secondary">Generate CSV</NativeButton>
				</form>
			</div>
		{:else}
			<a href="/settings/subscription" class="btn-secondary">Unlock exports</a>
		{/if}
	</div>
	<div class="mt-4 space-y-3">
		{#if vm.reports.length === 0}
			<EmptyState
				title="No reports generated yet"
				description="Generate a tax report from your holdings to see it listed here."
			/>
		{/if}
		{#each vm.reports as report (report.id)}
			<ReportRow {report} isPro={vm.isPro} />
		{/each}
	</div>
</section>
