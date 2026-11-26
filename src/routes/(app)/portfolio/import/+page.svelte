<script lang="ts">
	// Broker picker: choose a broker and portfolio, read a short guide, then go
	// to the import flow (screenshots, Ask Q or CSV) that already exists.
	import { untrack } from 'svelte';
	import { SecondaryButton, SelectField } from '#lib/components/norviq/index.js';
	import CSVImportFormatHint from '#lib/components/norviq/CSVImportFormatHint.svelte';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import {
		ASK_Q_GUIDE,
		BROKERS,
		METHOD_LABELS,
		methodHref,
		screenshotGuide,
		type ImportMethod
	} from '#lib/features/portfolio/import/brokers.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let brokerId = $state('');
	let method = $state<ImportMethod | ''>('');
	let portfolioId = $state(untrack(() => data.selectedId));

	const broker = $derived(BROKERS.find((b) => b.id === brokerId) ?? null);
	const listId = $derived(portfolioId || null);
	const active = $derived(broker && method && broker.methods.includes(method) ? method : null);
	const portfolioOptions = $derived(
		data.portfolios.map((p) => ({ value: p.id, label: p.name + ' (' + p.mode + ')' }))
	);

	function pickBroker(id: string) {
		brokerId = id;
		method = BROKERS.find((b) => b.id === id)?.methods[0] ?? '';
	}
</script>

<svelte:head><title>Import from broker - Norviq</title></svelte:head>

<div class="app-page-content vigil-canvas-page portfolio-modern-page">
	<vigil.ModernPageHeader
		title="Import from broker"
		subtitle="Pick your broker and portfolio, then choose how to bring your holdings in."
	/>
	<vigil.Panel class="p-5 md:p-6" titleID="import-broker-title">
		<h2 id="import-broker-title" class="text-lg font-semibold">Broker</h2>
		<div class="mt-3 flex flex-wrap gap-2">
			{#each BROKERS as b (b.id)}
				<SecondaryButton
					aria-pressed={brokerId === b.id}
					class={brokerId === b.id ? 'ring-2 ring-primary' : ''}
					onclick={() => pickBroker(b.id)}>{b.name}</SecondaryButton
				>
			{/each}
		</div>
		{#if data.portfolios.length > 0}
			<SelectField
				id="import-portfolio"
				name="portfolio_list_id"
				label="Portfolio"
				wrapperClass="mt-5 max-w-sm space-y-2"
				options={portfolioOptions}
				bind:value={portfolioId}
			/>
		{/if}
	</vigil.Panel>

	{#if broker}
		<vigil.Panel class="mt-6 p-5 md:p-6" titleID="import-guide-title">
			<h2 id="import-guide-title" class="text-lg font-semibold">{broker.name}</h2>
			<div class="mt-3 flex flex-wrap gap-2">
				{#each broker.methods as m (m)}
					<SecondaryButton
						aria-pressed={active === m}
						class={active === m ? 'ring-2 ring-primary' : ''}
						onclick={() => (method = m)}>{METHOD_LABELS[m]}</SecondaryButton
					>
				{/each}
			</div>
			<div class="mt-4">
				{#if active === 'csv'}
					<CSVImportFormatHint />
				{:else if active === 'ask-q'}
					<p class="text-sm">{ASK_Q_GUIDE}</p>
				{:else}
					<p class="text-sm">{screenshotGuide(broker.id === 'other' ? 'broker' : broker.name)}</p>
				{/if}
			</div>
			<div class="mt-5 flex flex-wrap gap-2">
				{#each broker.methods as m (m)}
					<a class="btn-secondary" href={methodHref(m, listId)}>{METHOD_LABELS[m]}</a>
				{/each}
			</div>
		</vigil.Panel>
	{/if}
</div>
