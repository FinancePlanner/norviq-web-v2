<script lang="ts">
	// Port of norviq-web internal/pages/tax/filing.templ (tax.FilingPage).
	import { enhance } from '$app/forms';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import {
		EmptyState,
		NativeButton,
		ProGateOverlay,
		SelectField,
		withSpinner
	} from '#lib/components/norviq/index.js';
	import { filingMoney, filingTone, yearOptions } from '#lib/features/money/tax/helpers.js';

	let { data } = $props();
	const vm = $derived(data.vm);
</script>

<svelte:head>
	<title>Annual filing pack - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<vigil.DocumentPage
	pageClass="tax-filing-page"
	backHref="/tax?taxYear={vm.taxYear}"
	backLabel="Tax"
	title="Annual filing pack"
	subtitle="Your trades and dividends mapped to your national return."
>
	<form method="get" action="/tax/filing" class="flex flex-wrap items-end gap-3">
		<SelectField
			name="taxYear"
			label="Tax year"
			options={yearOptions(vm.years, vm.taxYear)}
			onchange={(e) => e.currentTarget.form?.requestSubmit()}
		/>
		<NativeButton type="submit" class="btn-secondary">Show</NativeButton>
	</form>
	{#if vm.errorMessage !== ''}
		<p class="mt-6 text-sm text-danger" role="alert">{vm.errorMessage}</p>
	{/if}
	{#if !vm.isPro}
		<div class="mt-8">
			<ProGateOverlay featureName="Annual filing pack" />
			{#if vm.taxPackURL !== ''}
				<p class="mt-4 text-sm text-muted-foreground">
					Not ready for Pro? Buy just the {vm.taxYear} pack:
					<a
						href={vm.taxPackURL}
						rel="noopener"
						target="_blank"
						class="ml-1 underline underline-offset-2">Buy the {vm.taxYear} filing pack</a
					>. It unlocks this page and the PDF/CSV for that year only; the app refreshes once the
					purchase is confirmed.
				</p>
			{/if}
		</div>
	{:else if vm.profileIncomplete}
		<div class="mt-8">
			<EmptyState
				title="Complete your tax profile first"
				description="The {vm.taxYear} pack needs your jurisdiction and reporting currency."
				actionLabel="Open tax profile"
				actionHref="/tax?taxYear={vm.taxYear}#profile"
			/>
		</div>
	{:else if vm.unsupported}
		<div class="mt-8">
			<EmptyState
				title="Not available for your jurisdiction yet"
				description="Portugal (Anexo J) and Germany (Anlage KAP / KAP-INV) are live; other countries follow."
			/>
		</div>
	{:else if vm.preview}
		{@const preview = vm.preview}
		<section class="mt-8" aria-labelledby="filing-summary">
			<h2 id="filing-summary" class="sr-only">Summary</h2>
			<p class="text-sm text-muted-foreground">
				{preview.formName} · {preview.jurisdiction} · rule pack {preview.rulePackVersion}
			</p>
			<div class="mt-4 grid gap-4 sm:grid-cols-3">
				<vigil.Metric
					label="Realised gain"
					value={filingMoney(preview.summary['totalGain'], preview.reportingCurrency)}
					sentiment={filingTone(preview.summary['totalGain'])}
				/>
				<vigil.Metric
					label="Dividends (gross)"
					value={filingMoney(preview.summary['totalDividendsGross'], preview.reportingCurrency)}
				/>
				<vigil.Metric
					label="Tax withheld abroad"
					value={filingMoney(preview.summary['totalWithholding'], preview.reportingCurrency)}
				/>
			</div>
			{#if vm.provisional}
				<p class="mt-4 text-sm text-muted-foreground" role="status">
					Provisional: {vm.taxYear} is not closed yet. The numbers grow as you import trades and dividends;
					file from the final pack next spring.
				</p>
			{/if}
			{#if preview.unsupportedCount > 0}
				<p class="mt-4 text-sm text-warning" role="status">
					{preview.unsupportedCount} row(s) need a manual check — see the last section.
				</p>
			{/if}
		</section>
		{#each preview.sections as section (section.id)}
			<section class="mt-10" aria-labelledby={'filing-' + section.id}>
				<h2 id={'filing-' + section.id} class="text-lg font-semibold">{section.title}</h2>
				{#if section.rows.length === 0}
					<p class="mt-2 text-sm text-muted-foreground">No rows.</p>
				{:else}
					<div class="mt-3 overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr>
									{#each section.columns as column, i (i)}
										<th scope="col" class="px-2 py-1 text-left font-medium text-muted-foreground"
											>{column}</th
										>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each section.rows as row, i (i)}
									<tr class="border-t border-border">
										{#each row as cell, j (j)}
											<td class="px-2 py-1 tabular-nums">{cell}</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
				{#each section.notes as note, i (i)}
					<p class="mt-2 text-xs text-muted-foreground">{note}</p>
				{/each}
			</section>
		{/each}
		<!-- filingGenerate: posts to /tax?/reports (Go: hx-post="/tax/reports") -->
		<section class="mt-12 border-t border-border pt-8">
			<div class="flex flex-wrap gap-2">
				<form method="POST" action="/tax?/reports" use:enhance={withSpinner()}>
					<input type="hidden" name="taxYear" value={vm.taxYear} />
					<input type="hidden" name="jurisdiction" value={vm.jurisdiction} />
					<input type="hidden" name="kind" value="annual_filing_pack" />
					<input type="hidden" name="format" value="pdf" />
					<NativeButton type="submit" class="btn-primary">Generate PDF</NativeButton>
				</form>
				<form method="POST" action="/tax?/reports" use:enhance={withSpinner()}>
					<input type="hidden" name="taxYear" value={vm.taxYear} />
					<input type="hidden" name="jurisdiction" value={vm.jurisdiction} />
					<input type="hidden" name="kind" value="annual_filing_pack" />
					<input type="hidden" name="format" value="csv" />
					<NativeButton type="submit" class="btn-secondary">Generate CSV</NativeButton>
				</form>
			</div>
			<p class="mt-4 max-w-2xl text-xs text-muted-foreground">{preview.disclaimer}</p>
			<p class="mt-1 text-xs text-muted-foreground">
				Generated files appear under Workpapers on the tax page.
			</p>
		</section>
	{/if}
</vigil.DocumentPage>
