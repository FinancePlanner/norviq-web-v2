<script lang="ts">
	// tax.ReportRow. Go polled GET /tax/reports/{id}/status every 2s with
	// hx-swap="outerHTML" while the report was generating; this polls the
	// backend report through the /api/v1 proxy and re-renders the row.
	import { createQuery } from '@tanstack/svelte-query';
	import type { TaxReportResponse } from '../types.js';

	let { report, isPro }: { report: TaxReportResponse; isPro: boolean } = $props();

	const generating = (status: string) => status === 'pending' || status === 'retry' || status === 'generating';

	const query = createQuery(() => ({
		queryKey: ['tax-report', report.id],
		queryFn: async (): Promise<TaxReportResponse> => {
			const res = await fetch(`/api/v1/tax/reports/${report.id}`, { headers: { accept: 'application/json' } });
			if (!res.ok) throw new Error(`report status ${res.status}`);
			return (await res.json()) as TaxReportResponse;
		},
		enabled: generating(report.status),
		refetchInterval: (q: { state: { data?: TaxReportResponse } }) =>
			generating(q.state.data?.status ?? report.status) ? 2000 : false
	}));

	const current = $derived(query.data ?? report);
</script>

<article class="glass-card flex items-center justify-between p-5">
	<div>
		<p class="font-medium">Transaction workpaper · {current.taxYear}</p>
		<p class="text-sm text-muted-foreground">{current.format} · {current.status}</p>
	</div>
	{#if current.status === 'ready' && isPro}
		<a class="btn-secondary" href="/tax/reports/{current.id}/download" data-sveltekit-reload>Download</a>
	{:else if current.status === 'ready'}
		<span class="text-sm text-muted-foreground">Pro download</span>
	{:else if generating(current.status)}
		<span class="text-sm text-muted-foreground">Generating…</span>
	{:else}
		<span class="text-sm text-danger">Generation failed</span>
	{/if}
</article>
