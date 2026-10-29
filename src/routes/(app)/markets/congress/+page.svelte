<script lang="ts">
	// markets.CongressFeedPage. Neither empty branch claims Congress traded
	// nothing: a failed fetch and an empty 200 both just say what the page has.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
</script>

<svelte:head>
	<title>Congressional trades - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet actions()}
	{#if vm.pilotsEnabled}
		<a href="/pilots" class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">Follow a politician</a>
	{/if}
	<a href="/markets/earnings" class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">Earnings calendar</a>
{/snippet}

<vigil.CanvasPage pageClass="markets-congress-page" title="Congressional trades" subtitle="Disclosures from both chambers, newest transaction first" {actions}>
	{#if vm.loadError}
		<p class="mt-4 text-sm text-muted-foreground">No disclosures to show right now — the feed is unavailable. Try again shortly.</p>
	{:else if vm.trades.length === 0}
		<p class="mt-4 text-sm text-muted-foreground">No disclosures to show right now.</p>
	{:else}
		<vigil.Panel class="mt-6 p-5 md:p-6">
			<vigil.DataTable>
				<thead>
					<tr>
						<th>Filer</th>
						<th>Chamber</th>
						<th>Symbol</th>
						<th>Type</th>
						<th>Amount</th>
						<th>Traded</th>
						<th>Disclosed</th>
					</tr>
				</thead>
				<tbody>
					{#each vm.trades as trade, i (i)}
						<tr>
							<td>{trade.politician}</td>
							<td class="text-muted-foreground">{trade.chamber}</td>
							<td class="font-semibold vigil-mono">
								{#if trade.symbolHref}
									<a class="hover:text-[var(--color-tint)]" href={trade.symbolHref}>{trade.symbol}</a>
								{:else}
									{trade.symbol}
								{/if}
							</td>
							<td>{trade.type}</td>
							<td class="tabular-nums vigil-mono">{trade.amountRange}</td>
							<td class="whitespace-nowrap tabular-nums">{trade.transactionDate}</td>
							<td class="whitespace-nowrap tabular-nums text-muted-foreground">{trade.disclosureDate}</td>
						</tr>
					{/each}
				</tbody>
			</vigil.DataTable>
		</vigil.Panel>
	{/if}
</vigil.CanvasPage>
