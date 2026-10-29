<script lang="ts">
	// tax.advanceLumpSumInputPanel (DE, POST /tax/funds/annual-inputs → /tax?/fundAnnualInputs).
	import { enhance } from '$app/forms';
	import { CheckboxField, Field, SelectField, SubmitButton, withSpinner } from '#lib/components/norviq/index.js';
	import { accountOptions, fundLotGroups, goSprint, instrumentOptions, isoDate, profileValue } from '../helpers.js';
	import type { TaxPageViewModel } from '../types.js';

	let { vm }: { vm: TaxPageViewModel } = $props();

	const groups = $derived(fundLotGroups(vm));
</script>

<section class="glass-card mt-6 p-6">
	<p class="text-footnote font-semibold text-muted-foreground">Germany · InvStG §18</p>
	<h2 class="mt-2 text-xl font-semibold">Annual fund values</h2>
	<p class="mt-2 max-w-3xl text-sm text-muted-foreground">
		Provide complete year values from the fund or broker statement. Allocated amounts reduce each corresponding lot's disposal basis as those
		units are sold.
	</p>
	{#if groups.length > 0}
		<div class="mt-5 space-y-4">
			{#each groups as group (group.accountID + ':' + group.instrumentID)}
				<form method="POST" action="/tax?/fundAnnualInputs" use:enhance={withSpinner()} class="rounded-lg border border-current/10 p-4">
					<input type="hidden" name="accountId" value={group.accountID} /><input
						type="hidden"
						name="instrumentId"
						value={group.instrumentID}
					/><input type="hidden" name="currency" value={group.currency} />
					<div class="flex flex-wrap items-end justify-between gap-3">
						<div>
							<p class="font-semibold">{group.symbol}</p>
							<p class="text-xs text-muted-foreground">{group.accountName}</p>
						</div>
						<Field
							name="calculationYear"
							label="Calculation year"
							type="number"
							value={String(vm.taxYear)}
							required
							class="mt-1 w-28"
							min="2025"
							max="2026"
						/>
					</div>
					<div class="mt-4 space-y-3">
						{#each group.lots as lot (lot.id)}
							<div class="grid gap-3 rounded-xl bg-black/[0.025] p-3 sm:grid-cols-2 lg:grid-cols-6">
								<CheckboxField
									name="lot_id"
									label="Use lot"
									value={lot.id}
									description={'Opened ' + isoDate(lot.openedAt)}
									wrapperClass="field-label"
								/>
								<Field
									name={'quantity_' + lot.id}
									label="Quantity"
									type="number"
									value={goSprint(lot.originalQuantity)}
									class="mt-1"
									step="any"
									min="0"
								/>
								<Field name={'beginning_' + lot.id} label="Beginning value" type="number" class="mt-1" step="0.01" min="0" />
								<Field name={'ending_' + lot.id} label="Ending value" type="number" class="mt-1" step="0.01" min="0" />
								<Field name={'distributions_' + lot.id} label="Distributions" type="number" value="0" class="mt-1" step="0.01" min="0" />
								<Field
									name={'acquisition_' + lot.id}
									label="Acquisition month"
									type="number"
									placeholder="Held Jan 1"
									class="mt-1"
									min="1"
									max="12"
								/>
							</div>
						{/each}
					</div>
					<SubmitButton class="mt-4">Calculate selected lots</SubmitButton>
				</form>
			{/each}
		</div>
	{:else}
		<form
			method="POST"
			action="/tax?/fundAnnualInputs"
			use:enhance={withSpinner()}
			class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
		>
			<label class="field-label"
				>Account
				<SelectField name="accountId" required class="mt-2" options={accountOptions(vm, '', 'Choose account')} />
			</label>
			<label class="field-label"
				>Fund or ETF
				<SelectField name="instrumentId" required class="mt-2" options={instrumentOptions(vm, 'Choose instrument')} />
			</label>
			<Field
				name="calculationYear"
				label="Calculation year"
				type="number"
				value={String(vm.taxYear)}
				required
				class="mt-2"
				min="2025"
				max="2026"
			/>
			<Field name="beginningMarketValue" label="Beginning market value" type="number" required class="mt-2" step="0.01" min="0" />
			<Field name="endingMarketValue" label="Ending market value" type="number" required class="mt-2" step="0.01" min="0" />
			<Field name="distributions" label="Distributions" type="number" value="0" required class="mt-2" step="0.01" min="0" />
			<Field
				name="acquisitionMonth"
				label="Acquisition month"
				type="number"
				placeholder="Blank if held on Jan 1"
				class="mt-2"
				min="1"
				max="12"
			/>
			<input type="hidden" name="currency" value={profileValue(vm, 'currency')} />
			<div class="flex items-end"><SubmitButton class="w-full">Calculate and save</SubmitButton></div>
		</form>
	{/if}
</section>
