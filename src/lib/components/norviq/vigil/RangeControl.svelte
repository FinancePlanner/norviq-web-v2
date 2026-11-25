<script lang="ts">
	// DS 2.0 vigil.RangeControl: the chart range picker. One link per range, so
	// the range lives in the URL query and every other param (the portfolio, the
	// tab, the bubble size) survives a click. The caller passes the label
	// already translated; the range keys are the same in every locale.
	import { rangeHref, type RangeKey, type RangeURL } from '#lib/ranges.js';

	let {
		ranges,
		active,
		param = 'range',
		url,
		label
	}: {
		ranges: readonly RangeKey[];
		active: RangeKey;
		/** The query param that carries the range. */
		param?: string;
		/** The current page URL (`page.url`, or a `URL`). */
		url: RangeURL;
		/** The nav's accessible name. */
		label: string;
	} = $props();
</script>

<nav class="segmented-control range-control" aria-label={label}>
	{#each ranges as range (range)}
		<a
			href={rangeHref(url, param, range)}
			class={['segmented-link', range === active && 'segmented-link-active']}
			aria-current={range === active ? 'page' : undefined}>{range}</a
		>
	{/each}
</nav>

<style>
	/* Range segments on phones are 44px tall (touch target). */
	@media (max-width: 639.98px) {
		.range-control a {
			min-height: 44px;
		}
	}
</style>
