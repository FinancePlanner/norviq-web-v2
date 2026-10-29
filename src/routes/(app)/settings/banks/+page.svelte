<script lang="ts">
	// Port of settings.BanksPage (banks.templ).
	import { enhance } from '$app/forms';
	import { CollapsibleSection, EmptyState, NativeButton, PrimaryButton, SelectField, SubmitButton, withSpinner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { BankLink } from '#lib/features/settings-admin/banks/bank-link.svelte.js';
	import EuropeanBankPicker from '#lib/features/settings-admin/banks/EuropeanBankPicker.svelte';
	import { pillarSelectOptions } from '#lib/features/settings-admin/banks/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const vm = $derived(data.vm);
	const bankLink = new BankLink();

	function confirmDisconnect(e: MouseEvent) {
		if (!confirm('Disconnect this bank? Transactions awaiting review are removed.')) e.preventDefault();
	}
</script>

<svelte:head>
	<title>Bank Sync - Norviq</title>
	<meta name="description" content="Connect a bank to Norviq for read-only transaction sync." />
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page settings-modern-page settings-banks">
	<vigil.SettingsShell
		backHref="/settings"
		backLabel="← Settings"
		title="Bank Sync"
		subtitle="Norviq reads transactions only — it can never move money or make payments."
	>
		{#if vm.successMessage !== ''}
			<p class="rounded-lg bg-success/10 px-4 py-3 text-sm text-success">{vm.successMessage}</p>
		{/if}
		{#if vm.errorMessage !== ''}
			<p class="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{vm.errorMessage}</p>
		{/if}
		{#if !vm.isPro}
			<div class="glass-card dash-panel p-6 text-center">
				<p class="text-sm text-muted-foreground">Bank sync is a Pro feature.</p>
				<PrimaryButton href="/settings/subscription" class="mt-4 inline-block px-5 py-2 text-sm">Upgrade to Pro</PrimaryButton>
			</div>
		{:else}
			<section id="bank-connections" class="glass-card dash-panel space-y-4 p-6">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold">Connected banks</h2>
					<NativeButton class="btn-primary !w-auto px-4 py-2 text-sm" onclick={() => bankLink.connect()} disabled={bankLink.loading}>
						{#if bankLink.loading}<span>Connecting…</span>{:else}<span>Connect a bank</span>{/if}
					</NativeButton>
				</div>
				{#if bankLink.error}
					<p class="text-sm text-danger">{bankLink.error}</p>
				{/if}
				<EuropeanBankPicker />
				{#if vm.connections.length === 0}
					<EmptyState title="No banks connected yet" description="Link a bank above to sync transactions into your expenses automatically." />
				{:else}
					<ul class="space-y-3">
						{#each vm.connections as c (c.id)}
							<li class="rounded-xl border border-[var(--border)] p-4">
								<div class="flex items-center justify-between">
									<span class="font-medium">{c.institution}</span>
									<span class="rounded-full bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] px-2 py-0.5 text-xs">{c.statusLabel}</span>
								</div>
								{#if c.accountsLine !== ''}
									<p class="mt-1 text-sm text-muted-foreground">{c.accountsLine}</p>
								{/if}
								{#if c.lastSynced !== ''}
									<p class="mt-1 text-xs text-muted-foreground">Last synced {c.lastSynced}</p>
								{/if}
								<div class="mt-3 flex gap-4 text-sm">
									<form class="contents" method="POST" action="?/sync" use:enhance={withSpinner()}>
										<input type="hidden" name="id" value={c.id} />
										<button type="submit" class="font-semibold text-muted-foreground hover:opacity-100">Sync</button>
									</form>
									<form class="contents" method="POST" action="?/disconnect" use:enhance={withSpinner()}>
										<input type="hidden" name="id" value={c.id} />
										<button type="submit" class="font-semibold text-danger hover:text-danger" onclick={confirmDisconnect}>Disconnect</button>
									</form>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<!-- Folded when there is nothing to review (the usual state), never folded over pending work. -->
			<CollapsibleSection title="Review transactions" open={vm.suggestions.length > 0}>
				{#if vm.suggestions.length === 0}
					<p class="text-sm text-muted-foreground">Nothing to review. Synced transactions appear here.</p>
				{:else}
					<ul class="space-y-3">
						{#each vm.suggestions as t (t.id)}
							<li class="rounded-xl border border-[var(--border)] p-4">
								<div class="flex items-center justify-between">
									<span class="font-medium">{t.title}</span>
									<span class="font-semibold tabular-nums vigil-mono">{t.amount}</span>
								</div>
								<p class="mt-1 text-xs text-muted-foreground">
									{t.date}
									{#if t.pending}
										<span>· Pending</span>
									{/if}
									{#if t.possibleDuplicate}
										<span class="text-warning">· Possible duplicate</span>
									{/if}
								</p>
								<form class="mt-3 flex items-center gap-2" method="POST" action="?/import" use:enhance={withSpinner()}>
									<input type="hidden" name="id" value={t.id} />
									<SelectField name="pillar" required class="!w-auto text-sm" aria-label="Budget pillar" options={pillarSelectOptions} />
									<SubmitButton class="!w-auto px-3 py-1.5 text-sm">Add as expense</SubmitButton>
									<button type="submit" formaction="?/dismiss" formnovalidate class="px-3 py-1.5 text-sm text-danger hover:text-danger">Dismiss</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</CollapsibleSection>
		{/if}
	</vigil.SettingsShell>
</div>
