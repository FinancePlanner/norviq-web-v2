<script lang="ts">
	// Port of page.templ achievementCard.
	import Lock from '@lucide/svelte/icons/lock';
	import Pin from '@lucide/svelte/icons/pin';
	import PinOff from '@lucide/svelte/icons/pin-off';
	import { Icon, SecondarySubmitButton } from '#lib/components/norviq/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import {
		cardStateClass,
		isHidden,
		tierLabelID,
		type CardViewModel,
		type TierPip
	} from './viewmodel.js';

	let { card }: { card: CardViewModel } = $props();

	const tierAria = (pip: TierPip) =>
		t(tierLabelID(pip.tier)) + ', ' + (pip.earned ? t('earned') : t('not yet earned'));
	// templUI progress: indicator width = value / max (max <= 0 → 100), clamped.
	const percent = $derived.by(() => {
		const max = card.target > 0 ? card.target : 100;
		return (Math.min(Math.max(card.current, 0), max) * 100) / max;
	});
</script>

<article class={'achievement-card glass-card ' + cardStateClass(card)}>
	<div class="flex items-start gap-3">
		<span class="achievement-icon" aria-hidden="true">
			<Icon name={card.icon} class="h-5 w-5" />
		</span>
		<div class="min-w-0 flex-1">
			{#if isHidden(card)}
				<h3 class="text-body font-semibold">???</h3>
				<p class="mt-1 text-subhead text-muted-foreground">
					{t('A hidden achievement. Keep exploring to find it.')}
				</p>
			{:else}
				<h3 class="text-body font-semibold">{card.title}</h3>
				<p class="mt-1 text-subhead text-muted-foreground">{card.description}</p>
			{/if}
		</div>
	</div>
	{#if card.tiers.length > 0}
		<ul class="achievement-pips mt-3" aria-label={t('Tiers')}>
			{#each card.tiers as pip (pip.tier)}
				<li
					class={['achievement-pip achievement-pip-' + pip.tier, pip.earned && 'is-earned']}
					aria-label={tierAria(pip)}
				>
					{t(tierLabelID(pip.tier))}
				</li>
			{/each}
		</ul>
	{/if}
	{#if card.showProgress}
		<div class="mt-3">
			<div
				class="w-full"
				aria-valuemin="0"
				aria-valuemax={card.target}
				aria-valuenow={card.current}
				role="progressbar"
			>
				<div class="w-full overflow-hidden rounded-full bg-secondary">
					<div
						data-tui-progress-indicator
						class="h-1 rounded-full bg-primary transition-all"
						style:width="{percent}%"
					></div>
				</div>
			</div>
			<p class="mt-1 text-footnote text-muted-foreground">{card.current} / {card.target}</p>
		</div>
	{/if}
	{#if isHidden(card)}
		<p class="mt-3 text-footnote text-muted-foreground">
			<Lock class="inline h-3 w-3" data-lucide="icon" />
			{t('Locked')}
		</p>
	{/if}
	{#if card.pinned || card.canPin}
		<!-- A plain post, like Go's: the handler redirects back with a flash. -->
		<form method="post" action="/achievements/showcase" class="mt-3">
			{#each card.formItems as item (item)}
				<input type="hidden" name="item" value={item} />
			{/each}
			{#if card.pinned}
				<SecondarySubmitButton class="w-auto px-3">
					<PinOff class="h-4 w-4" data-lucide="icon" />
					{t('Unpin')}
				</SecondarySubmitButton>
			{:else}
				<SecondarySubmitButton class="w-auto px-3">
					<Pin class="h-4 w-4" data-lucide="icon" />
					{t('Pin')}
				</SecondarySubmitButton>
			{/if}
		</form>
	{/if}
</article>
