<script lang="ts">
	// vigil.AsOf: a plain "As of" date, or the warning form when the last price is stale.
	import { t, locale } from '#lib/i18n/context.svelte.js';
	import { civilDateLabel, isStale } from '#lib/as-of.js';

	let { date, now = new Date() }: { date: string; now?: Date } = $props();

	const stale = $derived(isStale(date, now));
	const label = $derived(civilDateLabel(date, locale()));
</script>

<span class={['vigil-as-of', stale && 'is-stale']}
	>{stale ? t('Prices as of %@', label) : t('As of %@', label)}</span
>

<style>
	.is-stale {
		color: var(--color-warning);
	}
</style>
