<script lang="ts">
	// onboarding.PaywallPage. RevenueCat runs through billingPage() on
	// #subscription-root, with the same data-* contract as the Go page.
	import { billingPage } from '#lib/billing-client.js';
	import BrandLogo from '#lib/components/norviq/BrandLogo.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import SubscriptionPlanCards from '#lib/features/auth-onboarding/onboarding/SubscriptionPlanCards.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
</script>

<svelte:head><title>Norviq Pro - Norviq</title></svelte:head>

<div
	class="onboarding-page onboarding-modern-page"
	id="subscription-root"
	data-billing-page="true"
	data-rc-api-key={vm.revenueCatAPIKey}
	data-app-user-id={vm.appUserId}
	data-restore-url="/billing/restore"
	data-continue-url="/onboarding/paywall/continue"
	{@attach billingPage()}
>
	<div class="onboarding-hero onboarding-step-card glass-card p-8 text-center md:p-10">
		<BrandLogo variant="full-large" />
		<h1 class="onboarding-title mt-6">Everything you need.</h1>
		<p class="onboarding-lead mx-auto mt-3 max-w-lg">Cancel anytime.</p>
	</div>
	<div class="onboarding-step-card glass-card mt-6 p-6 text-left md:p-8">
		<p class="text-footnote font-semibold text-muted-foreground">Wealth</p>
		<ul class="mt-4 space-y-3 text-sm">
			<li>Unlimited holdings, watchlists and alerts</li>
			<li>10-year projections, chart builder and scenarios</li>
		</ul>
		<p class="mt-6 text-footnote font-semibold text-muted-foreground">Spending</p>
		<ul class="mt-4 space-y-3 text-sm">
			<li>Auto-categorised expenses, budgets and receipt scanning</li>
			<li>Read-only bank sync</li>
		</ul>
		<p class="mt-6 text-footnote font-semibold text-muted-foreground">Intelligence</p>
		<ul class="mt-4 space-y-3 text-sm">
			<li>AI assistant, sentiment insights and macro data</li>
			<li>MCP integrations and live syncing across devices</li>
		</ul>
	</div>
	<div class="onboarding-step-card glass-card mt-6 p-6 md:p-8">
		<div
			id="billing-error"
			class="mb-4 text-sm text-[var(--color-danger)]"
			hidden
			role="alert"
		></div>
		<div id="billing-status"></div>
		{#if vm.canWebCheckout}
			<SubscriptionPlanCards options={vm.planOptions} />
		{:else}
			<p class="text-sm text-muted-foreground">
				Web checkout is not configured on this environment. You can still continue with the free
				tier, or subscribe on iOS.
			</p>
			{#if vm.appStoreURL}
				<a
					href={vm.appStoreURL}
					class="btn-primary mt-4 inline-flex px-5"
					target="_blank"
					rel="noopener">Get Norviq on iOS</a
				>
			{/if}
		{/if}
		<form method="POST" action="/onboarding/paywall/continue" class="mt-6 text-center">
			<NativeButton
				type="submit"
				class="onboarding-skip-link text-sm text-muted-foreground hover:opacity-100"
				>Continue with limited Norviq</NativeButton
			>
		</form>
		<p class="mt-4 text-center text-xs text-muted-foreground">
			<a href="/privacy">Privacy Policy</a>
			<span class="px-2">•</span>
			<a href="/terms">Terms of Use</a>
			<span class="px-2">•</span>
			<a href="/legal">Legal notice</a>
		</p>
	</div>
</div>
