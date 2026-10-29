<script lang="ts">
	// pages/portfolio/position_modals.templ: EditPositionPanel, SellPositionPanel
	// and PriceAlertPanel — whichever the last position action answered. The
	// form posts go through `onsubmit(form, method, url)`, the hx-delete
	// buttons through `onrequest(method, url)` after the same confirm prompt.
	import { Field, FormErrorBanner, NativeButton, ProGateOverlay, SelectField, SubmitButton, TextareaField, VaultTextField } from '#lib/components/norviq/index.js';
	import { closeDialog } from '#lib/components/norviq/tui/dialog/index.js';
	import { alertRangeQuery } from './client.js';
	import type { PositionActionResult } from './types.js';

	type Panel = Exclude<PositionActionResult, { redirect: string } | { panel: 'add' }>;
	type Method = 'POST' | 'PUT' | 'DELETE';

	let {
		result,
		onsubmit,
		onrequest
	}: {
		result: Panel;
		onsubmit: (form: HTMLFormElement, method: Method, url: string) => void;
		onrequest: (method: Method, url: string) => void;
	} = $props();

	const close = () => closeDialog('position-action-dialog');

	function submitWith(method: Method, url: string) {
		return (e: SubmitEvent) => {
			e.preventDefault();
			onsubmit(e.currentTarget as HTMLFormElement, method, url);
		};
	}

	function confirmed(message: string, method: Method, url: string) {
		if (window.confirm(message)) onrequest(method, url);
	}
</script>

{#snippet header(title: string)}
	<div class="portfolio-form-header">
		<h2 id="position-action-title" class="text-xl font-semibold">{title}</h2>
		<NativeButton class="portfolio-form-close" aria-label="Close" onclick={close}>
			<span aria-hidden="true">×</span>
		</NativeButton>
	</div>
{/snippet}

<div id="position-action-panel" class="vigil-modal-body">
	{#if result.panel === 'edit'}
		{@const form = result.form}
		{@render header('Edit ' + form.symbol)}
		<form class="portfolio-form mt-6 space-y-6" onsubmit={submitWith('PUT', '/portfolio/positions/' + form.id)}>
			{#if form.error !== ''}
				<FormErrorBanner message={form.error} />
			{/if}
			<input type="hidden" name="range" value={form.range} />
			<input type="hidden" name="symbol" value={form.symbol} />
			<section class="portfolio-form-section glass-card p-4">
				<h3 class="portfolio-form-section-title vigil-modal-section-title">Stock</h3>
				<p class="text-lg font-semibold">{form.symbol}</p>
			</section>
			<section class="portfolio-form-section glass-card space-y-4 p-4">
				<h3 class="portfolio-form-section-title">Position</h3>
				<SelectField
					id="edit-category"
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
				<VaultTextField label="Shares" name="shares" placeholder="10" value={form.shares} required />
				<VaultTextField label="Buy price" name="buy_price" placeholder="150.00" value={form.buyPrice} required />
				<Field id="edit-buy-date" name="buy_date" label="Buy date" type="date" value={form.buyDate} required wrapperClass="space-y-2" />
			</section>
			<section class="portfolio-form-section glass-card p-4">
				<h3 class="portfolio-form-section-title">Notes</h3>
				<TextareaField id="edit-notes" name="notes" value={form.notes} placeholder="Optional notes" class="min-h-[88px] resize-y" />
			</section>
			<div class="portfolio-form-actions">
				<button
					type="button"
					class="portfolio-form-cancel text-danger"
					onclick={() => confirmed('Delete this position from your portfolio?', 'DELETE', '/portfolio/positions/' + form.id + '?range=' + form.range)}
				>Delete position</button>
				<NativeButton class="portfolio-form-cancel" onclick={close}>Cancel</NativeButton>
				<SubmitButton class="portfolio-form-save">Save changes</SubmitButton>
			</div>
		</form>
	{:else if result.panel === 'sell'}
		{@const form = result.form}
		{@render header('Sell ' + form.symbol)}
		<form class="portfolio-form mt-6 space-y-6" onsubmit={submitWith('POST', '/portfolio/positions/' + form.id + '/sell')}>
			{#if form.error !== ''}
				<FormErrorBanner message={form.error} />
			{/if}
			<input type="hidden" name="range" value={form.range} />
			<input type="hidden" name="symbol" value={form.symbol} />
			<input type="hidden" name="max_shares" value={form.maxShares} />
			<p class="text-sm text-muted-foreground">You hold {form.maxShares} shares of {form.symbol}.</p>
			<section class="portfolio-form-section glass-card space-y-4 p-4">
				<VaultTextField label="Shares to sell" name="shares" placeholder={form.maxShares} value={form.shares} required />
				<VaultTextField label="Sell price" name="sell_price" placeholder="150.00" value={form.sellPrice} required />
				<Field id="sell-date" name="sell_date" label="Sell date" type="date" value={form.sellDate} required wrapperClass="space-y-2" />
			</section>
			<div class="portfolio-form-actions">
				<NativeButton class="portfolio-form-cancel" onclick={close}>Cancel</NativeButton>
				<SubmitButton class="portfolio-form-save">Confirm sell</SubmitButton>
			</div>
		</form>
	{:else if result.panel === 'alert'}
		{@const form = result.form}
		{#if form.showProGate}
			{@render header('Price alert')}
			<div class="mt-6">
				<ProGateOverlay featureName="Price alerts" />
			</div>
		{:else}
			{@render header((form.targetID !== '' ? 'Edit alert · ' : 'Add alert · ') + form.symbol)}
			<form class="portfolio-form mt-6 space-y-6" onsubmit={submitWith('POST', '/portfolio/positions/' + form.stockID + '/alert')}>
				{#if form.error !== ''}
					<FormErrorBanner message={form.error} />
				{/if}
				<input type="hidden" name="range" value={form.range} />
				<input type="hidden" name="target_id" value={form.targetID} />
				<section class="portfolio-form-section glass-card space-y-4 p-4">
					<VaultTextField label="Target price" name="target_price" placeholder="200.00" value={form.targetPrice} required />
					<SelectField
						id="alert-direction"
						name="direction"
						label="Notify when price is"
						required
						options={[
							{ value: 'above', label: 'Above target', selected: form.direction === 'above' },
							{ value: 'below', label: 'Below target', selected: form.direction === 'below' }
						]}
						wrapperClass="space-y-2"
					/>
				</section>
				<div class="portfolio-form-actions">
					{#if form.targetID !== ''}
						<NativeButton
							class="portfolio-form-cancel"
							onclick={() =>
								confirmed('Remove price alert for ' + form.symbol + '?', 'DELETE', '/portfolio/targets/' + form.targetID + alertRangeQuery(form.range))}
						>
							Remove alert
						</NativeButton>
					{/if}
					<NativeButton class="portfolio-form-cancel" onclick={close}>Cancel</NativeButton>
					<SubmitButton class="portfolio-form-save">Save alert</SubmitButton>
				</div>
			</form>
		{/if}
	{:else if result.panel === 'pro-gate'}
		<ProGateOverlay featureName={result.featureName} />
	{/if}
</div>
