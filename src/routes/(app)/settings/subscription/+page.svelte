<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { capture } from '#lib/analytics/index.js';
	import { billingPage } from '#lib/billing-client.js';
	import { CardHeader, Field, FormErrorBanner, NativeButton, SecondarySubmitButton, ToastBanner, withSpinner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import type { SubscriptionPlanOptionVM } from '#lib/features/settings-admin/subscription.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const vm = $derived(data.vm);

	// The Go restore button was an hx-post that swapped #billing-status with the
	// restored status ("Purchases restored.") and posthog.js captured
	// subscription_restored on its success. Here: POST, capture, re-run the load.
	let restoring = $state(false);
	let restoreSuccess = $state('');
	let restoreError = $state('');
	async function onRestore() {
		restoring = true;
		restoreSuccess = '';
		restoreError = '';
		try {
			const res = await fetch('/billing/restore', { method: 'POST', credentials: 'same-origin' });
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as { error?: string };
				restoreError = body.error || 'Could not restore purchases.';
				return;
			}
			capture('subscription_restored');
			restoreSuccess = 'Purchases restored.';
			await invalidateAll();
		} catch {
			restoreError = 'Could not restore purchases.';
		} finally {
			restoring = false;
		}
	}

	const statusSuccess = $derived(restoreSuccess || vm.successMessage);
	const statusError = $derived(restoreError || (restoreSuccess ? '' : vm.errorMessage));
</script>

<svelte:head>
	<title>Subscription - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet planCards(options: SubscriptionPlanOptionVM[])}
	<div class="pro-plan-cards mt-5">
		{#each options as option (option.productID)}
			<div class={['pro-plan-card rounded-lg p-4', option.isCurrent && 'pro-plan-card-selected']}>
				<div class="flex items-start justify-between gap-3">
					<p class="text-sm font-semibold">{option.title}</p>
					{#if option.badge !== ''}
						<span class="rounded-full border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{option.badge}</span>
					{/if}
				</div>
				<p class="text-sm text-muted-foreground">{option.subtitle}</p>
				<p class="text-sm">
					<span class="font-semibold tabular-nums" data-rc-price={option.productID}></span>
					{#if option.intervalLabel !== ''}
						<span class="text-muted-foreground">{option.intervalLabel}</span>
					{/if}
				</p>
				<NativeButton class="btn-primary mt-4 w-full px-4 py-2 text-sm" disabled={option.isCurrent} data-action="purchase" data-product-id={option.productID}>
					{option.buttonText}
				</NativeButton>
			</div>
		{/each}
	</div>
{/snippet}

{#snippet couponSection()}
	<form class="subscription-coupon" method="POST" action="?/redeem" use:enhance={withSpinner(() => async ({ update }) => update({ reset: false }))}>
		<Field name="code" type="text" placeholder="Enter code" class="min-w-[180px] flex-1" autocomplete="off" />
		<SecondarySubmitButton class="px-5">Redeem</SecondarySubmitButton>
	</form>
	<div id="coupon-result" class="mt-3">
		{#if form?.couponError}
			<FormErrorBanner message={form.couponError} />
		{:else if vm.couponMessage !== ''}
			<ToastBanner message={vm.couponMessage} />
		{/if}
	</div>
{/snippet}

<div
	class="app-page-content vigil-document-page settings-modern-page settings-section-page"
	id="subscription-root"
	data-billing-page="true"
	data-rc-api-key={vm.revenueCatAPIKey}
	data-app-user-id={vm.appUserID}
	data-restore-url="/billing/restore"
	data-app-store-url={vm.appStoreURL}
	{@attach billingPage()}
>
	<vigil.SettingsShell backHref="/settings" backLabel="← Settings" title="Subscription">
		<div class="subscription-status-block">
			<div id="billing-status" class="subscription-status">
				<!-- SubscriptionStatusPartial. data-billing-settled stays as the explicit "entitled" signal. -->
				<div data-billing-settled={vm.isPro ? 'true' : 'false'}>
					<ToastBanner message={statusSuccess} />
					<FormErrorBanner message={statusError} />
					{#if vm.isPro}
						<span class="pro-badge">Pro</span>
						<p class="subscription-status-label mt-3">{vm.statusLabel}</p>
						<p class="mt-1 text-sm text-muted-foreground">{vm.planLabel}</p>
						{#if vm.hasPendingPlanChange}
							<p class="mt-2 text-sm text-muted-foreground">
								Scheduled change: {vm.pendingPlanLabel}
								{#if vm.pendingPlanDate !== ''}
									<span> on {vm.pendingPlanDate}</span>
								{/if}
							</p>
						{/if}
						{#if vm.renewsAt !== ''}
							{#if vm.isCancelledButActive}
								<p class="mt-2 text-sm text-muted-foreground">Canceled. Pro access continues until {vm.accessEndsAt}.</p>
							{:else}
								<p class="mt-2 text-sm text-muted-foreground">Renews or expires {vm.renewsAt}</p>
							{/if}
						{/if}
						{#if vm.trialDaysRemaining !== ''}
							<p class="mt-2 text-sm text-muted-foreground">Trial: {vm.trialDaysRemaining} day(s) remaining</p>
						{/if}
						{#if vm.hasBillingIssue}
							<p class="mt-3 text-sm text-[var(--color-danger)]">There is a billing issue on your subscription.</p>
						{/if}
					{:else}
						<p class="subscription-status-label">{vm.statusLabel}</p>
						<p class="mt-1 text-sm text-muted-foreground">Upgrade to unlock research, bank sync, the assistant, tax, and advanced reports.</p>
					{/if}
				</div>
			</div>
			<div class="subscription-status-actions">
				{#if vm.isPro}
					<!-- The billing portal also lists past invoices; naming it makes them findable. -->
					<a href="/billing/manage" class="btn-secondary px-5" data-sveltekit-reload>Manage, invoices, or cancel</a>
				{/if}
				<NativeButton class={['btn-secondary px-5', restoring && 'htmx-request']} data-action="restore" disabled={restoring} onclick={onRestore}>
					Restore purchases
				</NativeButton>
			</div>
		</div>
		<section class="feature-comparison mt-2" aria-label="What’s included">
			<CardHeader title="What’s included" desc="Free covers core tracking. Pro adds research, banks, assistant, tax, and advanced reports." />
			<table class="feature-comparison-table mt-4">
				<colgroup>
					<col class="feature-col" />
					<col class="mark-col" />
					<col class="mark-col" />
				</colgroup>
				<thead>
					<tr>
						<th scope="col">Feature</th>
						<th scope="col">Free</th>
						<th scope="col">Pro</th>
					</tr>
				</thead>
				<tbody>
					{#each vm.featureGroups as group (group.title)}
						<tr class="feature-comparison-group-row">
							<th scope="colgroup" colspan="3">{group.title}</th>
						</tr>
						{#each group.rows as row (row.title)}
							<tr>
								<th scope="row">{row.title}</th>
								<td>{row.includedFree ? 'Yes' : '—'}</td>
								<td>{row.includedPro ? 'Yes' : '—'}</td>
							</tr>
						{/each}
					{/each}
				</tbody>
			</table>
		</section>
		{#if !vm.isPro}
			<div id="billing-error" class="mt-4 text-sm text-[var(--color-danger)]" hidden role="alert"></div>
			<section class="subscription-upgrade">
				{#if vm.trialExpired}
					<CardHeader title="Your free trial has ended" desc="Subscribe to keep research, bank sync, the assistant, tax, and advanced reports." />
				{:else}
					<CardHeader title="Upgrade to Pro" desc="Unlock research, bank sync, the assistant, tax, and advanced reports." />
				{/if}
				{#if vm.canWebCheckout}
					{@render planCards(vm.planOptions)}
					<div class="mt-4 flex flex-wrap gap-3">
						<NativeButton class="btn-secondary px-5" data-action="paywall">Browse all plans</NativeButton>
					</div>
					<div id="paywall-container" class="mt-4"></div>
					{@render couponSection()}
				{:else}
					<div class="mt-4 flex flex-wrap gap-3">
						<a href={vm.appStoreURL} class="btn-primary px-5" target="_blank" rel="noopener">Get Norviq on iOS</a>
					</div>
					<p class="mt-3 text-xs text-muted-foreground">Web checkout requires RevenueCat Web Billing configuration.</p>
					{@render couponSection()}
				{/if}
			</section>
		{:else if vm.canWebCheckout && (vm.upgradePlanOptions.length > 0 || vm.downgradePlanOptions.length > 0)}
			<div id="billing-error" class="mt-4 text-sm text-[var(--color-danger)]" hidden role="alert"></div>
			{#if vm.upgradePlanOptions.length > 0}
				<section class="subscription-upgrade">
					<CardHeader title="Change plan" desc="Move to a longer billing interval for a lower effective price. Cancellation is handled from subscription management." />
					{@render planCards(vm.upgradePlanOptions)}
				</section>
			{/if}
			{#if vm.downgradePlanOptions.length > 0}
				<section class="subscription-upgrade">
					<CardHeader title="Switch to a shorter plan" desc="Takes effect at the end of your current billing period. You keep Pro until then." />
					{@render planCards(vm.downgradePlanOptions)}
				</section>
			{/if}
		{/if}
	</vigil.SettingsShell>
</div>
