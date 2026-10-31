<script lang="ts">
	// settings.SubscriptionPlanCards(options). Local copy for the onboarding
	// paywall; the settings port owns the original and the two can merge.
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import type { PlanOptionVM } from './subscription.server.js';

	let { options }: { options: PlanOptionVM[] } = $props();

	const cardClass = (selected: boolean) =>
		'pro-plan-card rounded-lg p-4' + (selected ? ' pro-plan-card-selected' : '');
</script>

<div class="pro-plan-cards mt-5">
	{#each options as option (option.productId)}
		<div class={cardClass(option.isCurrent)}>
			<div class="flex items-start justify-between gap-3">
				<p class="text-sm font-semibold">{option.title}</p>
				{#if option.badge}
					<span
						class="rounded-full border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
						>{option.badge}</span
					>
				{/if}
			</div>
			<p class="text-sm text-muted-foreground">{option.subtitle}</p>
			<p class="text-sm">
				<span class="font-semibold tabular-nums" data-rc-price={option.productId}></span>
				{#if option.intervalLabel}
					<span class="text-muted-foreground">{option.intervalLabel}</span>
				{/if}
			</p>
			<NativeButton
				class="btn-primary mt-4 w-full px-4 py-2 text-sm"
				disabled={option.isCurrent}
				data-action="purchase"
				data-product-id={option.productId}>{option.buttonText}</NativeButton
			>
		</div>
	{/each}
</div>
