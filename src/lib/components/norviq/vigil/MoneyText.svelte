<script lang="ts">
	// vigil.MoneyText: the currency comes from the data, the locale only sets separators.
	import { t, locale } from '#lib/i18n/context.svelte.js';
	import { money, signedMoney, compactMoney } from '#lib/money.js';

	let {
		value,
		currency,
		signed = false,
		compact = false
	}: {
		value: number | null | undefined;
		currency: string | null | undefined;
		signed?: boolean;
		compact?: boolean;
	} = $props();

	const text = $derived.by(() => {
		if (value == null || !Number.isFinite(value)) return null;
		const l = locale();
		if (compact) return compactMoney(value, currency, l);
		return signed ? signedMoney(value, currency, l) : money(value, currency, l);
	});
</script>

{#if text === null}<span class="vigil-money"
		><span aria-hidden="true">—</span><span class="sr-only">{t('Not available')}</span></span
	>{:else}<span class="vigil-money">{text}</span>{/if}

<style>
	.vigil-money {
		font-variant-numeric: tabular-nums;
	}
</style>
