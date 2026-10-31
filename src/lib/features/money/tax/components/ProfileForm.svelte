<script lang="ts">
	// tax.profileForm (POST /tax/profile → /tax?/profile).
	import { enhance } from '$app/forms';
	import { Field, SelectField, SubmitButton, withSpinner } from '#lib/components/norviq/index.js';
	import { profileValue, staticOptions, taxationMode } from '../helpers.js';
	import type { TaxPageViewModel } from '../types.js';

	let { vm }: { vm: TaxPageViewModel } = $props();
</script>

<form method="POST" action="/tax?/profile" use:enhance={withSpinner()} class="glass-card p-6">
	<input type="hidden" name="jurisdiction" value={vm.jurisdiction} /><input
		type="hidden"
		name="taxYear"
		value={vm.taxYear}
	/>
	<h2 class="text-xl font-semibold">Tax profile</h2>
	{#if vm.jurisdiction === 'PT'}
		<label class="field-label mt-4"
			>Securities taxation
			<SelectField
				name="capitalGainsTaxationMode"
				class="mt-2"
				options={staticOptions(
					taxationMode(vm),
					['jurisdiction_default', 'Use legal default'],
					['autonomous', '28% autonomous taxation'],
					['aggregate_with_income', 'Aggregate with income']
				)}
			/>
		</label>
		<p class="mt-2 text-xs text-muted-foreground">
			Aggregation can enable eligible five-year loss carryforwards. Short-term gains at the top
			income band may be aggregated by law.
		</p>
	{/if}
	{#if vm.jurisdiction === 'DE'}
		<div class="mt-4 rounded-lg border border-black/10 bg-warning/70 p-4">
			<p class="text-sm font-semibold">German capital income</p>
			<div class="mt-3 grid gap-4 sm:grid-cols-2">
				<Field
					name="remainingCapitalIncomeAllowance"
					label="Remaining saver allowance"
					type="number"
					value={profileValue(vm, 'remainingAllowance')}
					placeholder="Leave blank if unknown"
					class="mt-2"
					step="0.01"
					min="0"
				/>
				<SelectField
					name="churchTaxRate"
					label="Church tax"
					class="mt-2"
					options={[
						{ value: '', label: 'None', selected: profileValue(vm, 'churchTax') === '' },
						{ value: '8', label: '8%', selected: profileValue(vm, 'churchTax') === '8.00' },
						{ value: '9', label: '9%', selected: profileValue(vm, 'churchTax') === '9.00' }
					]}
				/>
			</div>
			<p class="mt-2 text-xs text-muted-foreground">
				Enter only the allowance still unused across all banks and brokers. German securities use
				FIFO separately per depot.
			</p>
		</div>
	{/if}
	<div class="mt-4 grid gap-4 sm:grid-cols-2">
		<SelectField
			name="filingStatus"
			label="Filing status"
			class="mt-2"
			options={staticOptions(
				profileValue(vm, 'filing'),
				['single', 'Single'],
				['married_joint', 'Married jointly'],
				['married_separate', 'Married separately'],
				['domestic_partnership', 'Domestic partnership']
			)}
		/>
		<Field
			name="reportingCurrency"
			label="Reporting currency"
			value={profileValue(vm, 'currency')}
			class="mt-2"
			maxlength={3}
		/>
		<Field
			name="primaryName"
			label="Primary taxpayer"
			value={profileValue(vm, 'primary')}
			required
			class="mt-2"
		/>
		<Field
			name="partnerName"
			label="Spouse or partner"
			value={profileValue(vm, 'partner')}
			placeholder="Optional for single filers"
			class="mt-2"
		/>
		<Field
			name="income"
			label="Estimated taxable income"
			type="number"
			value={profileValue(vm, 'income')}
			required
			class="mt-2"
			step="0.01"
			min="0"
		/>
		<Field
			name="marginalRate"
			label="Marginal rate (%)"
			type="number"
			value={profileValue(vm, 'marginal')}
			class="mt-2"
			step="0.01"
			min="0"
			max="100"
		/>
		<Field
			name="shortTermRate"
			label="Short-term rate (%)"
			type="number"
			value={profileValue(vm, 'short')}
			class="mt-2"
			step="0.01"
			min="0"
			max="100"
		/>
		<Field
			name="longTermRate"
			label="Long-term rate (%)"
			type="number"
			value={profileValue(vm, 'long')}
			class="mt-2"
			step="0.01"
			min="0"
			max="100"
		/>
		<Field
			name="priorShortLoss"
			label="Short-term carryover"
			type="number"
			value={profileValue(vm, 'shortLoss')}
			class="mt-2"
			step="0.01"
		/>
		<Field
			name="priorLongLoss"
			label="Long-term carryover"
			type="number"
			value={profileValue(vm, 'longLoss')}
			class="mt-2"
			step="0.01"
		/>
	</div>
	<h3 class="mt-6 font-semibold">Account classification</h3>
	<div class="mt-3 space-y-3">
		{#each vm.context.accounts as account (account.id)}
			<div class="rounded-lg border border-current/10 p-4">
				<input type="hidden" name="account_id" value={account.id} />
				<p class="font-medium">{account.displayName}</p>
				<p class="text-xs text-muted-foreground">{account.broker} · {account.baseCurrency}</p>
				<div class="mt-3 grid gap-3 sm:grid-cols-3">
					<SelectField
						name={'owner_' + account.id}
						label="Owner"
						class="mt-1"
						options={[
							{
								value: 'primary',
								label: 'Primary',
								selected: account.ownerMemberId == null || account.ownerMemberId === 'primary'
							},
							{ value: 'partner', label: 'Partner', selected: account.ownerMemberId === 'partner' }
						]}
					/>
					<SelectField
						name={'wrapper_' + account.id}
						label="Wrapper"
						class="mt-1"
						options={staticOptions(
							account.wrapper,
							['taxable', 'Taxable'],
							['traditional_ira', 'Traditional IRA'],
							['roth_ira', 'Roth IRA'],
							['pension', 'Pension'],
							['tax_exempt', 'Tax exempt'],
							['country_specific', 'Country-specific']
						)}
					/>
					{#if vm.jurisdiction === 'DE'}
						<label class="field-label"
							>Lot matching<input type="hidden" name={'lot_' + account.id} value="fifo" /><span
								class="field-input mt-1 block">FIFO per depot</span
							></label
						>
					{:else}
						<SelectField
							name={'lot_' + account.id}
							label="Lot matching"
							class="mt-1"
							options={staticOptions(
								account.lotSelectionMethod,
								['jurisdiction_default', 'Jurisdiction default'],
								['fifo', 'FIFO'],
								['lifo', 'LIFO'],
								['specific_id', 'Specific ID']
							)}
						/>
					{/if}
				</div>
			</div>
		{/each}
	</div>
	<SubmitButton class="mt-5">Save profile</SubmitButton>
</form>
