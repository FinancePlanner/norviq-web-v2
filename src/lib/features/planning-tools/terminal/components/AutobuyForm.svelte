<script lang="ts">
	// autobuyForm: the add form (form.id === '') or an item's edit form. The
	// state only mirrors the fields so the example chips can fill them and the
	// percent field can show for percent cadence (assets/terminal.js
	// terminalAutobuyForm); the server validates everything.
	import { tick, untrack } from 'svelte';
	import Field from '#lib/components/norviq/Field.svelte';
	import SelectField from '#lib/components/norviq/SelectField.svelte';
	import SecondaryButton from '#lib/components/norviq/SecondaryButton.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import GhostButton from '#lib/components/norviq/GhostButton.svelte';
	import { Cadence, type AutobuyFormVM, type AutobuysVM } from '../types.js';
	import { autobuyFormID, cadenceOptions, type AutobuyChip } from '../vm.js';
	import { terminalSend } from '../client.js';

	let {
		form,
		chips = [],
		onpanel,
		oncancel
	}: {
		form: AutobuyFormVM;
		chips?: AutobuyChip[];
		onpanel: (vm: AutobuysVM) => void;
		oncancel?: () => void;
	} = $props();

	const initial = untrack(() => form);
	const fid = autobuyFormID(initial.id);
	let label = $state(initial.label);
	let ticker = $state(initial.ticker);
	let amount = $state(initial.amount);
	let cadence = $state(initial.cadence || Cadence.Monthly);
	let percent = $state(initial.percent);
	let pending = $state(false);
	let root: HTMLFormElement | null = $state(null);

	const options = $derived(
		cadenceOptions.map((o) => ({ ...o, selected: o.value === initial.cadence }))
	);

	async function prefill(chip: AutobuyChip) {
		label = chip.name;
		amount = chip.amount;
		cadence = chip.cadence || Cadence.Monthly;
		percent = chip.percent;
		await tick();
		root?.querySelector<HTMLInputElement>('[name="amount"]')?.focus();
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (pending) return;
		pending = true;
		try {
			const data = new FormData(e.currentTarget as HTMLFormElement);
			const vm =
				initial.id === ''
					? await terminalSend<AutobuysVM>('POST', '/terminal/autobuys', data)
					: await terminalSend<AutobuysVM>('PATCH', `/terminal/autobuys/${initial.id}`, data);
			if (vm) onpanel(vm);
		} finally {
			pending = false;
		}
	}
</script>

<form
	bind:this={root}
	id={fid}
	class="space-y-3"
	class:htmx-request={pending}
	method="POST"
	action={initial.id === '' ? '/terminal/autobuys' : `/terminal/autobuys/${initial.id}`}
	onsubmit={submit}
>
	{#if initial.id === ''}
		<input type="hidden" name="idempotency_key" value={initial.idempotencyKey} />
	{/if}
	{#if chips.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each chips as chip (chip.label)}
				<SecondaryButton onclick={() => prefill(chip)}>{chip.label}</SecondaryButton>
			{/each}
		</div>
	{/if}
	<Field
		id={fid + '-label'}
		name="label"
		label="Name"
		type="text"
		bind:value={label}
		placeholder="Weekly buy"
		required
	/>
	<SelectField
		id={fid + '-cadence'}
		name="cadence"
		label="How often"
		{options}
		bind:value={cadence}
	/>
	<Field
		id={fid + '-amount'}
		name="amount"
		label="Amount"
		type="text"
		bind:value={amount}
		placeholder="50"
		inputmode="decimal"
	/>
	<div class="space-y-2" style:display={cadence === Cadence.Percent ? undefined : 'none'}>
		<p class="text-footnote text-muted-foreground">
			For a percent, the amount is the monthly base it is taken from.
		</p>
		<Field
			id={fid + '-percent'}
			name="percent"
			label="Percent of base (%)"
			type="text"
			bind:value={percent}
			placeholder="4"
			inputmode="decimal"
		/>
	</div>
	<Field
		id={fid + '-ticker'}
		name="ticker"
		label="Ticker (optional)"
		type="text"
		bind:value={ticker}
		placeholder="VOO"
		autocomplete="off"
	/>
	{#if initial.error}
		<p role="alert" class="text-footnote text-destructive">{initial.error}</p>
	{/if}
	<div class="flex gap-2">
		{#if initial.id === ''}
			<SubmitButton>Add autobuy</SubmitButton>
		{:else}
			<SubmitButton>Save</SubmitButton>
			<GhostButton onclick={() => oncancel?.()}>Cancel</GhostButton>
		{/if}
	</div>
</form>
