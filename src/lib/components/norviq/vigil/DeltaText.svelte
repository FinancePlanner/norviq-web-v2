<script lang="ts">
	// vigil.DeltaText: direction by sign and arrow, never by colour alone; always with its basis.
	import { t, locale } from '#lib/i18n/context.svelte.js';
	import { signedMoney, signedPercent } from '#lib/money.js';

	let {
		fraction,
		basis,
		amount
	}: {
		fraction: number | null | undefined;
		basis?: string;
		amount?: { value: number; currency: string | null };
	} = $props();

	const view = $derived.by(() => {
		if (fraction == null || !Number.isFinite(fraction)) return null;
		const l = locale();
		const pct = signedPercent(fraction, l);
		// "0.0%", "+0.0%" and "−0.0%" all mean flat: judge by the printed figure.
		const flat = !/[1-9]/.test(pct);
		const dir = flat ? 'flat' : fraction > 0 ? 'positive' : 'negative';
		return {
			dir,
			arrow: dir === 'positive' ? '▲' : dir === 'negative' ? '▼' : '–',
			pct,
			money: amount ? signedMoney(amount.value, amount.currency, l) : null,
			sr:
				dir === 'positive'
					? t('up %@', pct)
					: dir === 'negative'
						? t('down %@', pct)
						: t('unchanged')
		};
	});
</script>

{#if view}<span class={['vigil-delta', `is-${view.dir}`]}
		><span aria-hidden="true">{view.arrow}</span>
		<span aria-hidden="true"
			>{view.pct}{view.money ? ` · ${view.money}` : ''}{basis ? ` ${basis}` : ''}</span
		><span class="sr-only">{view.sr}{basis ? ` ${basis}` : ''}</span></span
	>{/if}

<style>
	.vigil-delta {
		font-variant-numeric: tabular-nums;
	}
	.is-positive {
		color: var(--color-gain);
	}
	.is-negative {
		color: var(--color-loss);
	}
	.is-flat {
		color: var(--muted-foreground);
	}
</style>
