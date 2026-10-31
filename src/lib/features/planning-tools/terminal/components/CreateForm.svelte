<script lang="ts">
	// CreateForm: the "Add scenario" form. Values echo what was typed when a
	// submit is rejected (the workspace answer carries them back).
	import { untrack } from 'svelte';
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import Field from '#lib/components/norviq/Field.svelte';
	import SecondaryButton from '#lib/components/norviq/SecondaryButton.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import { terminalSend } from '../client.js';
	import type { CreateFormVM, WorkspaceVM } from '../types.js';

	let { vm, onworkspace }: { vm: CreateFormVM; onworkspace: (vm: WorkspaceVM) => void } = $props();

	let open = $state(untrack(() => vm.open));
	let pending = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (pending) return;
		pending = true;
		try {
			const next = await terminalSend<WorkspaceVM>(
				'POST',
				'/terminal/positions',
				new FormData(e.currentTarget as HTMLFormElement)
			);
			if (next) onworkspace(next);
		} finally {
			pending = false;
		}
	}
</script>

<div id="terminal-create">
	<SecondaryButton
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-controls="terminal-create-form"
	>
		<Icon name="plus" class="h-4 w-4" />
		Add scenario
	</SecondaryButton>
	<form
		id="terminal-create-form"
		class="mt-3 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-6"
		class:htmx-request={pending}
		method="POST"
		action="/terminal/positions"
		style:display={open ? undefined : 'none'}
		onsubmit={submit}
	>
		<input type="hidden" name="idempotency_key" value={vm.idempotencyKey} />
		<Field
			id="terminal-create-ticker"
			name="ticker"
			label="Ticker"
			type="text"
			value={vm.ticker}
			placeholder="AMZN"
			required
			autocomplete="off"
		/>
		<Field
			id="terminal-create-share-count"
			name="terminalShareCount"
			label="Terminal share count"
			type="text"
			value={vm.terminalShareCount}
			placeholder="11B"
			required
			inputmode="decimal"
		/>
		<Field
			id="terminal-create-market-cap"
			name="terminalMarketCap"
			label="Terminal market cap"
			type="text"
			value={vm.terminalMarketCap}
			placeholder="10T"
			required
			inputmode="decimal"
		/>
		<Field
			id="terminal-create-value-wanted"
			name="valueWanted"
			label="Value wanted"
			type="text"
			value={vm.valueWanted}
			placeholder="1M"
			required
			inputmode="decimal"
		/>
		<Field
			id="terminal-create-owned"
			name="sharesOwned"
			label="Shares owned (optional)"
			type="text"
			value={vm.sharesOwned}
			placeholder="0"
			inputmode="decimal"
		/>
		<SubmitButton>Add</SubmitButton>
		{#if vm.error}
			<p role="alert" class="text-footnote text-destructive sm:col-span-2 lg:col-span-6">
				{vm.error}
			</p>
		{/if}
	</form>
</div>
