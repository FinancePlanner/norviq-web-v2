<!-- components.CSVImportFormatHint -->
<div
	class="csv-import-format-hint rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--color-card-bg)_88%,transparent)] p-4 text-sm"
>
	<p class="font-semibold">CSV format</p>
	<p class="mt-2 opacity-70">
		Include a header row. Required column: <code>symbol</code> (or <code>ticker</code>).
		<code>shares</code>, <code>buy_price</code>, and <code>buy_date</code> are optional — empty
		values default to 0 shares, $0 cost, and today.
		<code>notes</code> is optional. Aliases like <code>quantity</code> and <code>average_cost</code> also
		work.
	</p>
	<code class="mt-2 block font-mono text-xs">symbol,shares,buy_price,buy_date,notes</code>
</div>
