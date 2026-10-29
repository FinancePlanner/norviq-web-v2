<script lang="ts">
	// pages/portfolio/add_position.templ AddPositionPanel. hx-post
	// /portfolio/positions swapped the panel (with an error) or HX-Redirected;
	// `onsubmit` posts the form and the page applies the answer.
	import { Field, FormErrorBanner, NativeButton, SelectField, SubmitButton, TextareaField, VaultTextField } from '#lib/components/norviq/index.js';
	import { closeDialog } from '#lib/components/norviq/tui/dialog/index.js';
	import type { AddPositionFormVM } from './types.js';

	let { form, onsubmit }: { form: AddPositionFormVM; onsubmit: (form: HTMLFormElement) => void } = $props();

	// addPositionPreviewData (the Alpine x-data)
	// svelte-ignore state_referenced_locally
	let shares = $state(form.shares);
	// svelte-ignore state_referenced_locally
	let price = $state(form.buyPrice);
	$effect.pre(() => {
		shares = form.shares;
		price = form.buyPrice;
	});
	const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
	const addition = $derived(Math.max(0, parseFloat(shares || '0') || 0) * Math.max(0, parseFloat(price || '0') || 0));
	const projected = $derived(form.currentPortfolioValue + addition);
	const weight = $derived(projected > 0 ? (addition / projected) * 100 : 0);

	function submit(e: SubmitEvent) {
		e.preventDefault();
		onsubmit(e.currentTarget as HTMLFormElement);
	}
</script>

<div id="add-position-panel">
	<div class="portfolio-form-header">
		<h2 id="add-position-title" class="text-xl font-semibold">Add Position</h2>
		<NativeButton class="portfolio-form-close" aria-label="Close" onclick={() => closeDialog('add-position-dialog')}>
			<span aria-hidden="true">×</span>
		</NativeButton>
	</div>
	<form id="add-position-form" class="portfolio-form mt-6 space-y-6" onsubmit={submit}>
		{#if form.error !== ''}
			<FormErrorBanner message={form.error} />
		{/if}
		<input type="hidden" name="range" value={form.range} />
		<input type="hidden" name="portfolio" value={form.portfolioID} />
		<input type="hidden" name="current_value" value={form.currentPortfolioValue.toFixed(2)} />
		<section class="portfolio-form-section glass-card p-4">
			<h3 class="portfolio-form-section-title">Stock</h3>
			<VaultTextField label="Symbol" name="symbol" placeholder="e.g. AAPL" value={form.symbol} required />
		</section>
		<section class="portfolio-form-section glass-card space-y-4 p-4">
			<h3 class="portfolio-form-section-title">Position</h3>
			<SelectField
				id="category"
				name="category"
				label="Category"
				required
				options={[
					{ value: 'stock', label: 'Stock', selected: form.category === 'stock' },
					{ value: 'etf', label: 'ETF', selected: form.category === 'etf' },
					{ value: 'crypto', label: 'Crypto', selected: form.category === 'crypto' }
				]}
				wrapperClass="space-y-2"
			/>
			<Field id="shares" name="shares" label="Shares" type="text" bind:value={shares} placeholder="10" required wrapperClass="space-y-2" />
			<Field id="buy_price" name="buy_price" label="Buy price" type="text" bind:value={price} placeholder="150.00" required wrapperClass="space-y-2" />
			<div class="space-y-2">
				<label class="field-label" for="buy_date">Buy date</label>
				<input id="buy_date" name="buy_date" type="date" value={form.buyDate} class="field-input" required />
			</div>
		</section>
		<section class="portfolio-form-section glass-card p-4">
			<h3 class="portfolio-form-section-title">Allocation impact</h3>
			<div class="mt-3 grid gap-3 sm:grid-cols-3">
				<div class="rounded-lg border border-black/5 p-3 dark:border-white/10">
					<p class="text-footnote opacity-45">Added cost</p>
					<p class="mt-1 text-lg font-semibold">{money(addition)}</p>
				</div>
				<div class="rounded-lg border border-black/5 p-3 dark:border-white/10">
					<p class="text-footnote opacity-45">Projected value</p>
					<p class="mt-1 text-lg font-semibold">{money(projected)}</p>
				</div>
				<div class="rounded-lg border border-black/5 p-3 dark:border-white/10">
					<p class="text-footnote opacity-45">New weight</p>
					<p class="mt-1 text-lg font-semibold"><span>{weight.toFixed(1)}</span>%</p>
				</div>
			</div>
			<p class="mt-3 text-xs text-muted-foreground">Preview uses entered cost basis before live market-price movement.</p>
		</section>
		<section class="portfolio-form-section glass-card p-4">
			<h3 class="portfolio-form-section-title">Notes</h3>
			<TextareaField
				id="notes"
				name="notes"
				label="Optional notes"
				value={form.notes}
				placeholder="Optional notes"
				class="min-h-[88px] resize-y"
				wrapperClass="space-y-2"
			/>
		</section>
		<div class="portfolio-form-actions">
			<NativeButton class="portfolio-form-cancel" onclick={() => closeDialog('add-position-dialog')}>Cancel</NativeButton>
			<SubmitButton class="portfolio-form-save">Save</SubmitButton>
		</div>
	</form>
</div>
