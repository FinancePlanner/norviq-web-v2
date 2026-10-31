<script lang="ts">
	// tax.marketAdmissionPanel (ES) and tax.fundClassificationPanel (DE).
	// Go posted to /tax/instruments/{id}/market-admission | fund-classification;
	// here /tax?/marketAdmission&id=… | /tax?/fundClassification&id=….
	import { enhance } from '$app/forms';
	import {
		CheckboxField,
		SecondarySubmitButton,
		SelectField,
		withSpinner
	} from '#lib/components/norviq/index.js';
	import {
		fundClassification,
		listingExchange,
		marketInstruments,
		staticOptions
	} from '../helpers.js';
	import type { TaxPageViewModel } from '../types.js';

	let { vm, kind }: { vm: TaxPageViewModel; kind: 'market-admission' | 'fund-classification' } =
		$props();

	const instruments = $derived(marketInstruments(vm));
</script>

{#if kind === 'fund-classification'}
	<section class="glass-card mt-8 p-6">
		<p class="text-footnote font-semibold text-muted-foreground">Germany · InvStG §20</p>
		<h2 class="mt-2 text-xl font-semibold">Fund partial exemptions</h2>
		<p class="mt-2 max-w-3xl text-sm text-muted-foreground">
			Classify only funds and ETFs using their legal fund documentation. Unknown classifications
			remain excluded from automated estimates.
		</p>
		<div class="mt-5 grid gap-3 lg:grid-cols-2">
			{#if instruments.length === 0}
				<p class="rounded-lg border border-current/10 p-4 text-sm text-muted-foreground">
					No investment instruments are available for classification.
				</p>
			{/if}
			{#each instruments as instrument (instrument.id)}
				<form
					method="POST"
					action="/tax?/fundClassification&id={instrument.id}"
					use:enhance={withSpinner()}
					class="rounded-lg border border-current/10 p-4"
				>
					<input type="hidden" name="jurisdiction" value={vm.jurisdiction} /><input
						type="hidden"
						name="taxYear"
						value={vm.taxYear}
					/>
					<p class="font-semibold">{instrument.symbol}</p>
					<div class="mt-3 flex gap-2">
						<SelectField
							name="classification"
							class="flex-1"
							options={staticOptions(
								fundClassification(instrument),
								['unknown', 'Unknown'],
								['equity', 'Equity fund · 30%'],
								['mixed', 'Mixed fund · 15%'],
								['real_estate', 'Real-estate fund · 60%'],
								['foreign_real_estate', 'Foreign real-estate fund · 80%'],
								['other', 'Other fund · 0%']
							)}
						/><SecondarySubmitButton>Save</SecondarySubmitButton>
					</div>
				</form>
			{/each}
		</div>
	</section>
{:else}
	<section class="glass-card mt-8 p-6">
		<p class="text-footnote font-semibold text-muted-foreground">Spain · homogeneous securities</p>
		<h2 class="mt-2 text-xl font-semibold">Market admission</h2>
		<p class="mt-2 max-w-3xl text-sm text-muted-foreground">
			Listed securities use the two-month reacquisition window. Unlisted securities use one year.
			Verify the status against a broker statement, regulator registry, or official issuer listing;
			routing exchange codes are not sufficient.
		</p>
		<div class="mt-5 grid gap-3 lg:grid-cols-2">
			{#if instruments.length === 0}
				<p class="rounded-lg border border-current/10 p-4 text-sm text-muted-foreground">
					No investment instruments are available for classification.
				</p>
			{/if}
			{#each instruments as instrument (instrument.id)}
				<form
					method="POST"
					action="/tax?/marketAdmission&id={instrument.id}"
					use:enhance={withSpinner()}
					class="rounded-lg border border-current/10 p-4"
				>
					<input type="hidden" name="jurisdiction" value={vm.jurisdiction} /><input
						type="hidden"
						name="taxYear"
						value={vm.taxYear}
					/>
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="font-semibold">{instrument.symbol}</p>
							<p class="text-xs text-muted-foreground">
								Primary listing: {listingExchange(instrument)}
							</p>
						</div>
						{#if instrument.marketAdmissionStatus === 'unknown'}
							<span class="rounded-full bg-warning px-2.5 py-1 text-xs text-warning">Review</span>
						{/if}
					</div>
					<div class="mt-3 flex gap-2">
						<SelectField
							name="status"
							class="flex-1"
							options={staticOptions(
								instrument.marketAdmissionStatus,
								['unknown', 'Unknown'],
								['regulated', 'Listed / regulated'],
								['unlisted', 'Unlisted']
							)}
						/><SecondarySubmitButton>Save</SecondarySubmitButton>
					</div>
					<CheckboxField
						name="verified"
						label="I verified this status against a broker statement or official listing."
						value="true"
						wrapperClass="mt-3 items-start text-xs text-muted-foreground"
						required
					/>
				</form>
			{/each}
		</div>
	</section>
{/if}
