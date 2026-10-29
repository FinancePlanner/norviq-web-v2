<script lang="ts">
	// expenses.PartnerPanel (modals.templ). Posts to /expenses/partner.
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import Field from '#lib/components/norviq/Field.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import { panelEnhance } from '../panel.js';
	import type { PartnerFormVM } from '../vm.js';
	import PanelHeader from './PanelHeader.svelte';
	import CancelButton from './CancelButton.svelte';

	let { vm: initial }: { vm: PartnerFormVM } = $props();
	let vm = $state(untrack(() => initial));
</script>

<div id="expense-action-panel" class="vigil-modal-body">
	<PanelHeader title="Household partner" />
	{#if vm.error}
		<p class="mt-4 text-sm text-danger" role="alert">{vm.error}</p>
	{/if}
	{#key vm}
		<form
			class="portfolio-form mt-6 space-y-6"
			method="POST"
			action="/expenses/partner"
			use:enhance={panelEnhance<PartnerFormVM>((next) => (vm = next), (_, msg) => (vm = { ...vm, error: msg || 'Could not save partner profile.' }))}
		>
			<Field id="partner-name" name="display_name" label="Display name" value={vm.displayName} wrapperClass="space-y-2" />
			<Field
				id="partner-default-share"
				name="default_share_percent"
				label="Your default share (%)"
				type="number"
				value={vm.defaultSharePercent}
				wrapperClass="space-y-2"
				min="0"
				max="100"
				step="1"
				aria-describedby="partner-default-share-hint"
			/>
			<p id="partner-default-share-hint" class="text-sm text-muted-foreground">
				New shared items start at this split. Leave blank to keep starting them at 100%. Existing items are not changed.
			</p>
			<div class="portfolio-form-actions">
				<CancelButton />
				<SubmitButton class="portfolio-form-save">Save partner</SubmitButton>
			</div>
		</form>
	{/key}
</div>
