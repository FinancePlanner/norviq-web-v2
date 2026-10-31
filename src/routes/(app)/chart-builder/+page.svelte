<script lang="ts">
	// /chart-builder (internal/pages/stock/chart_builder.templ ChartBuilderStandalonePage).
	import Field from '#lib/components/norviq/Field.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';

	let { data } = $props();

	function initial(symbol: string): string {
		const s = symbol.trim();
		return s === '' ? '?' : s.slice(0, 1).toUpperCase();
	}
</script>

<svelte:head>
	<title>Chart builder - Norviq</title>
	<meta name="keywords" content="Norviq dashboard" />
	<meta name="description" content="Your Norviq financial dashboard." />
</svelte:head>

{#snippet chip(symbol: string)}
	<a
		href={'/chart-builder?q=' + symbol}
		class="rounded-full border border-[var(--border)] bg-[var(--color-elevated-card)] px-4 py-1.5 text-sm font-semibold transition hover:border-[var(--color-tint)] hover:text-[var(--color-tint)]"
		>{symbol}</a
	>
{/snippet}

<div class="app-page-content vigil-canvas-page stock-modern-page">
	<section class="glass-card p-6 md:p-10">
		<p class="text-footnote font-semibold text-[var(--muted-foreground)]">Chart builder</p>
		<h1 class="mt-2 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
			Turn financial statements into a comparable time series.
		</h1>
		<p class="mt-3 max-w-2xl text-sm text-[var(--muted-foreground)]">
			Search for a stock, then combine up to 20 financial metrics with as many as three peer
			tickers.
		</p>
		<form method="get" action="/chart-builder" class="mt-7 flex flex-col gap-3 sm:flex-row">
			<!-- svelte-ignore a11y_autofocus -->
			<Field
				name="q"
				type="search"
				value={data.query}
				placeholder="Search ticker or company"
				autocomplete="off"
				wrapperClass="min-w-0 flex-1"
				autofocus
				aria-label="Search stocks"
			/>
			<SubmitButton class="shrink-0 px-7">Search</SubmitButton>
		</form>
	</section>

	<section class="glass-card mt-4 p-5 md:p-6" aria-live="polite">
		{#if data.query === ''}
			<div class="py-8 text-center">
				<p class="font-semibold">Choose a company to begin</p>
				<p class="mt-2 text-sm text-[var(--muted-foreground)]">
					Search above, or start from a popular ticker:
				</p>
				<div class="mt-4 flex flex-wrap justify-center gap-2">
					{@render chip('AAPL')}
					{@render chip('MSFT')}
					{@render chip('NVDA')}
					{@render chip('META')}
					{@render chip('AMZN')}
				</div>
			</div>
		{:else if data.results.length === 0}
			<div class="py-8 text-center">
				<p class="font-semibold">No matches for “{data.query}”</p>
				<p class="mt-2 text-sm text-[var(--muted-foreground)]">
					Try a company name, or one of these:
				</p>
				<div class="mt-4 flex flex-wrap justify-center gap-2">
					{@render chip('AAPL')}
					{@render chip('MSFT')}
					{@render chip('NVDA')}
				</div>
			</div>
		{:else}
			<div class="mb-4 flex items-center justify-between gap-3">
				<h2 class="font-semibold">Search results</h2>
				<span class="text-xs text-[var(--muted-foreground)]">{data.results.length} found</span>
			</div>
			<ul class="divide-y divide-[var(--border)]" role="list">
				{#each data.results as result, i (i)}
					<li>
						<a
							href={result.href}
							class="flex items-center gap-4 rounded-lg px-3 py-4 transition hover:bg-[var(--color-elevated-card)]"
						>
							<span
								class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-tint-soft)] text-sm font-bold text-[var(--color-tint)]"
								>{initial(result.symbol)}</span
							>
							<span class="min-w-0 flex-1">
								<span class="block font-semibold">{result.symbol}</span>
								<span class="block truncate text-sm text-[var(--muted-foreground)]"
									>{result.name}</span
								>
							</span>
							{#if result.exchange}
								<span class="text-xs text-[var(--muted-foreground)]">{result.exchange}</span>
							{/if}
							<span aria-hidden="true" class="text-[var(--color-tint)]">→</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
