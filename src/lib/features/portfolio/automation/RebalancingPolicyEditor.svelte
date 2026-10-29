<script lang="ts">
	// pages/portfolio/rebalancing.templ rebalancingPolicyEditor + allocationBucketEditor,
	// with Alpine rebalancingEditor() (assets/scripts.js) as component state:
	// "Add group" appends the #rebalance-group-template markup, "+ Add holding"
	// the #rebalance-leaf-template markup, "×" removes a holding row. Group
	// indices never renumber, exactly like Alpine's nextGroup counter.
	import { enhance } from '$app/forms';
	import Field from '#lib/components/norviq/Field.svelte';
	import SelectField from '#lib/components/norviq/SelectField.svelte';
	import NativeSelect from '#lib/components/norviq/NativeSelect.svelte';
	import NativeInput from '#lib/components/norviq/NativeInput.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import CheckboxField from '#lib/components/norviq/CheckboxField.svelte';
	import { withSpinner } from '#lib/components/norviq/form-loading.js';
	import {
		editorAssetThreshold,
		editorBuckets,
		editorFlatFee,
		editorFractional,
		editorGrouping,
		editorMinimumTrade,
		editorName,
		editorTotalThreshold,
		fixed,
		groupingOptionList
	} from './format.js';
	import type { AllocationTargetBucket, AllocationTargetLeaf, RebalancingViewModel } from './types.js';

	let { vm }: { vm: RebalancingViewModel } = $props();

	type LeafRow = { key: number; variant: 'existing' | 'added' | 'template-first'; leaf?: AllocationTargetLeaf };
	type GroupRow = { key: number; variant: 'existing' | 'template'; bucket?: AllocationTargetBucket; leaves: LeafRow[] };

	let seq = 0;
	// The editor is keyed on the view model by the page, so this seeds once per render of the server state.
	// svelte-ignore state_referenced_locally
	let groups: GroupRow[] = $state(
		editorBuckets(vm).map((bucket) => ({
			key: seq++,
			variant: 'existing',
			bucket,
			leaves: (bucket.leaves ?? []).map((leaf) => ({ key: seq++, variant: 'existing', leaf }))
		}))
	);

	function addGroup() {
		groups.push({ key: seq++, variant: 'template', leaves: [{ key: seq++, variant: 'template-first' }] });
	}
	function addLeaf(group: number) {
		groups[group].leaves.push({ key: seq++, variant: 'added' });
	}
	function removeLeaf(group: number, key: number) {
		groups[group].leaves = groups[group].leaves.filter((l) => l.key !== key);
	}

	const kindOptions = (kind?: string) => [
		{ value: 'security', label: 'Security', selected: kind === 'security' },
		{ value: 'cash', label: 'Cash', selected: kind === 'cash' }
	];
	const action = $derived(`/portfolio/rebalancing?portfolio=${encodeURIComponent(vm.selected!.id)}&/model`);
</script>

<section class="glass-card p-5 md:p-6" aria-labelledby="policy-title">
	<div>
		<h2 id="policy-title" class="text-lg font-semibold">Allocation policy</h2>
		<p class="mt-1 text-sm text-muted-foreground">Nested leaf targets make each proposed trade deterministic.</p>
	</div>
	<form method="POST" {action} use:enhance={withSpinner()} class="mt-5 space-y-4">
		{#if vm.overview.model}
			<input type="hidden" name="modelId" value={vm.overview.model.id} />
			<input type="hidden" name="revision" value={String(vm.overview.model.revision)} />
		{/if}
		<Field name="name" label="Model name" value={editorName(vm)} required class="w-full" wrapperClass="block text-sm" />
		<div class="grid grid-cols-2 gap-3">
			<SelectField name="groupingMode" label="Grouping" wrapperClass="text-sm" options={groupingOptionList(editorGrouping(vm))} />
			<Field
				name="minimumTradeAmount"
				label="Min. trade"
				type="number"
				value={fixed(editorMinimumTrade(vm), 2)}
				class="w-full"
				wrapperClass="text-sm"
				step="0.01"
			/>
		</div>
		<div class="grid grid-cols-2 gap-3">
			<Field
				name="assetThreshold"
				label="Asset alert %"
				type="number"
				value={fixed(editorAssetThreshold(vm), 2)}
				class="w-full"
				wrapperClass="text-sm"
				step="0.01"
			/>
			<Field
				name="totalThreshold"
				label="Total alert %"
				type="number"
				value={fixed(editorTotalThreshold(vm), 2)}
				class="w-full"
				wrapperClass="text-sm"
				step="0.01"
			/>
		</div>
		<div id="rebalance-groups" class="space-y-3">
			{#each groups as group, index (group.key)}
				{#if group.variant === 'existing' && group.bucket}
					<div class="rounded-lg bg-current/5 p-3" data-rebalance-group={String(index)}>
						<div class="grid grid-cols-[1fr_6rem] gap-2">
							<input type="hidden" name="bucketId[]" value={group.bucket.id} /><NativeInput
								name="bucketName[]"
								value={group.bucket.name}
								required
								aria-label="Group name"
							/><NativeInput
								name="bucketTarget[]"
								type="number"
								value={fixed(group.bucket.targetBasisPoints / 100, 2)}
								class="text-right"
								step="0.01"
								required
								aria-label="Group target percent"
							/>
						</div>
						<div class="mt-2 space-y-2" data-rebalance-leaves={String(index)}>
							{#each group.leaves as row (row.key)}
								{@render leafRow(index, row)}
							{/each}
						</div>
						<NativeButton class="mt-2 text-sm font-medium text-muted-foreground hover:opacity-100" onclick={() => addLeaf(index)}>
							+ Add holding
						</NativeButton>
					</div>
				{:else}
					<!-- #rebalance-group-template -->
					<div class="rounded-lg bg-current/5 p-3" data-rebalance-group={String(index)}>
						<div class="grid grid-cols-[1fr_6rem] gap-2">
							<NativeInput name="bucketName[]" placeholder="Group name" required aria-label="Group name" /><NativeInput
								name="bucketTarget[]"
								type="number"
								class="text-right"
								step="0.01"
								placeholder="Target %"
								required
								aria-label="Group target percent"
							/><input type="hidden" name="bucketId[]" />
						</div>
						<div class="mt-2 space-y-2" data-rebalance-leaves={String(index)}>
							{#each group.leaves as row (row.key)}
								{@render leafRow(index, row)}
							{/each}
						</div>
					</div>
				{/if}
			{/each}
		</div>
		<div class="flex gap-2">
			<NativeButton class="btn-secondary flex-1" onclick={addGroup}>Add group</NativeButton><SubmitButton class="flex-1"
				>Save policy</SubmitButton
			>
		</div>
		<div class="grid grid-cols-2 gap-3">
			<CheckboxField
				name="fractionalSharesEnabled"
				label="Fractional shares"
				checked={editorFractional(vm)}
				wrapperClass="flex items-center gap-2 text-sm"
			/><Field
				name="flatFee"
				label="Flat fee"
				type="number"
				value={fixed(editorFlatFee(vm), 2)}
				placeholder="Fee per trade"
				class="w-full"
				wrapperClass="text-sm"
				step="0.01"
			/>
		</div>
	</form>
</section>

{#snippet leafRow(group: number, row: LeafRow)}
	{#if row.variant === 'existing' && row.leaf}
		<div class="grid grid-cols-[1fr_5rem_5rem_auto] gap-2">
			<input type="hidden" name="leafGroup[]" value={String(group)} /><input type="hidden" name="leafId[]" value={row.leaf.id} /><NativeSelect
				name="leafKind[]"
				aria-label="Holding kind"
				options={kindOptions(row.leaf.kind)}
			/><NativeInput name="leafSymbol[]" value={row.leaf.symbol ?? ''} class="tabular-nums" placeholder="Ticker" aria-label="Ticker" /><NativeInput
				name="leafTarget[]"
				type="number"
				value={fixed(row.leaf.targetBasisPoints / 100, 2)}
				class="text-right"
				step="0.01"
				required
				aria-label="Target percent"
			/><NativeInput
				name="leafName[]"
				value={row.leaf.name}
				class="col-span-3"
				placeholder="Target name"
				required
				aria-label="Holding name"
			/><NativeButton
				class="text-sm text-muted-foreground hover:opacity-100"
				aria-label="Remove holding"
				onclick={() => removeLeaf(group, row.key)}>×</NativeButton
			>
		</div>
	{:else if row.variant === 'added'}
		<!-- #rebalance-leaf-template -->
		<div class="grid grid-cols-[1fr_5rem_5rem_auto] gap-2">
			<input type="hidden" name="leafGroup[]" value={String(group)} /><input type="hidden" name="leafId[]" /><SelectField
				name="leafKind[]"
				aria-label="Holding kind"
				options={[
					{ value: 'security', label: 'Security' },
					{ value: 'cash', label: 'Cash' }
				]}
			/><NativeInput name="leafSymbol[]" class="tabular-nums" placeholder="Ticker" aria-label="Ticker" /><NativeInput
				name="leafTarget[]"
				type="number"
				class="text-right"
				step="0.01"
				placeholder="%"
				required
				aria-label="Target percent"
			/><NativeInput name="leafName[]" class="col-span-3" placeholder="Target name" required aria-label="Holding name" /><NativeButton
				class="text-sm text-muted-foreground hover:opacity-100"
				aria-label="Remove holding"
				onclick={() => removeLeaf(group, row.key)}>×</NativeButton
			>
		</div>
	{:else}
		<!-- first holding of #rebalance-group-template -->
		<div class="grid grid-cols-[1fr_5rem_5rem] gap-2">
			<input type="hidden" name="leafGroup[]" value={String(group)} /><input type="hidden" name="leafId[]" /><input
				type="hidden"
				name="leafKind[]"
				value="security"
			/><NativeInput name="leafName[]" placeholder="Holding name" required aria-label="Holding name" /><NativeInput
				name="leafSymbol[]"
				class="tabular-nums"
				placeholder="Ticker"
				required
				aria-label="Ticker"
			/><NativeInput
				name="leafTarget[]"
				type="number"
				class="text-right"
				step="0.01"
				placeholder="%"
				required
				aria-label="Target percent"
			/>
		</div>
	{/if}
{/snippet}
