<script lang="ts">
	// pages/pilots/follow.templ FollowPage.
	import { enhance } from '$app/forms';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { Field, FormErrorBanner, SecondaryButton, SelectField, SubmitButton, withSpinner } from '#lib/components/norviq/index.js';
	import type { Option } from '#lib/components/norviq/types.js';
	import {
		DISCLAIMER,
		NO_TRADES_YET,
		TARGET_NEW_WATCHLIST,
		TARGET_PORTFOLIO,
		TARGET_WATCHLIST_PREFIX
	} from '#lib/features/settings-admin/pilots/vm.js';
	import type { FollowFormVM } from '#lib/features/settings-admin/pilots/types.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	// A refused submit re-renders with what was typed (Go re-rendered the form on 422).
	const vm: FollowFormVM = $derived(form?.vm ?? data.vm);

	// Go's Alpine guard: the idempotency key makes a repeat POST harmless on the
	// backend; this keeps a double click from sending one at all. pageshow
	// re-enables the button after a back-forward cache restore.
	let submitting = $state(false);

	// followTargetOptions keeps the portfolio choice visible but disabled for free
	// users, so they see what Pro adds instead of discovering it from a 403.
	const targetOptions: Option[] = $derived.by(() => {
		let portfolioLabel = 'New what-if portfolio';
		if (!vm.isPro) portfolioLabel += ' (Pro)';
		const options: Option[] = [
			{ value: TARGET_PORTFOLIO, label: portfolioLabel, selected: vm.target === TARGET_PORTFOLIO, disabled: !vm.isPro },
			{ value: TARGET_NEW_WATCHLIST, label: 'New watchlist', selected: vm.target === TARGET_NEW_WATCHLIST }
		];
		for (const list of vm.watchlists) {
			const value = TARGET_WATCHLIST_PREFIX + list.id;
			options.push({ value, label: 'Watchlist: ' + list.name + ' (must be empty)', selected: vm.target === value });
		}
		return options;
	});
</script>

<svelte:head>
	<title>Follow {vm.pilot.name} - Norviq</title>
</svelte:head>

<svelte:window onpageshow={() => (submitting = false)} />

<vigil.DocumentPage
	pageClass="pilot-follow-page"
	backHref={vm.pilot.href}
	backLabel={vm.pilot.name}
	title={'Follow ' + vm.pilot.name}
	subtitle="Norviq copies the trades this pilot discloses into a simulation you choose."
>
	{#if !vm.pilot.hasTrades}
		<p class="text-sm" role="status">{NO_TRADES_YET + '. There is nothing to follow until Norviq sees a disclosed trade.'}</p>
	{:else}
		<vigil.Panel class="p-5 md:p-6" titleID="pilot-follow-form-title">
			<vigil.PanelHeader id="pilot-follow-form-title" title="Where should the trades go?" />
			<form
				method="post"
				action={vm.pilot.followHref}
				class="mt-4 space-y-4"
				use:enhance={withSpinner(({ cancel }) => {
					if (submitting) {
						cancel();
						return;
					}
					submitting = true;
					return async ({ update }) => {
						try {
							await update({ reset: false });
						} finally {
							submitting = false;
						}
					};
				})}
			>
				<input type="hidden" name="idempotency_key" value={vm.idempotencyKey} />
				<FormErrorBanner message={vm.error} />
				{#if vm.showUpgrade}
					<SecondaryButton href="/settings/subscription">See Pro</SecondaryButton>
				{/if}
				{#key vm}
					<SelectField
						id="pilot-follow-target"
						name="target"
						label="Copy trades into"
						required
						class="w-full"
						wrapperClass="block text-sm"
						options={targetOptions}
					/>
					<Field
						id="pilot-starting-capital"
						name="starting_capital"
						label="Starting capital (USD)"
						type="text"
						value={vm.startingCapital}
						description="Used only for a what-if portfolio. Watchlists track symbols, not money."
						autocomplete="off"
						class="w-full"
						wrapperClass="block text-sm"
						inputmode="decimal"
					/>
				{/key}
				{#if !vm.isPro}
					<p class="text-xs text-muted-foreground">
						Free includes one watchlist follow. What-if portfolio follows, and up to 10 follows, need Pro.
					</p>
				{/if}
				<div class="rounded-lg bg-current/5 px-4 py-3 text-sm" role="note">
					<p class="font-medium">This is a simulation</p>
					<p class="mt-1 text-muted-foreground">{DISCLAIMER}</p>
					{#if vm.lagNote}
						<p class="mt-1 text-muted-foreground">{vm.lagNote}</p>
					{/if}
				</div>
				<SubmitButton class="w-full" disabled={submitting}>Start following</SubmitButton>
			</form>
		</vigil.Panel>
	{/if}
</vigil.DocumentPage>
