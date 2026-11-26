<script lang="ts">
	// Port of settings.IntegrationsPage (integrations.templ).
	import { enhance } from '$app/forms';
	import {
		CardHeader,
		CollapsibleSection,
		CSVImportFormatHint,
		EmptyState,
		FormErrorBanner,
		MCPStateBadge,
		NativeButton,
		PrimaryButton,
		ToastBanner,
		withSpinner
	} from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import TelegramCard from '#lib/features/settings-admin/integrations/TelegramCard.svelte';
	import { settingsMCPAgentState } from '#lib/features/settings-admin/integrations/types.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const vm = $derived(data.vm);
	// The pairing code exists only on the action response that minted it.
	const telegram = $derived(
		form?.telegramCode ? { ...vm.telegram, ...form.telegramCode } : vm.telegram
	);

	function confirmIBKRDisconnect(e: MouseEvent) {
		if (
			!confirm(
				'Disconnect IBKR from Norviq? IBKR holdings will be removed, including CSV imports labelled IBKR.'
			)
		)
			e.preventDefault();
	}
</script>

<svelte:head>
	<title>{t('Brokers and imports')} - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page settings-integrations settings-modern-page">
	<vigil.SettingsShell
		backHref="/settings"
		backLabel="← Settings"
		title={t('Brokers and imports')}
		subtitle="Every connection is scoped and revocable."
	>
		{#if vm.successMessage !== ''}
			<div class="mt-4">
				<ToastBanner message={vm.successMessage} />
			</div>
		{/if}
		{#if vm.errorMessage !== ''}
			<div class="mt-4">
				<FormErrorBanner message={vm.errorMessage} />
			</div>
		{/if}
		<section class="glass-card mcp-engine-room mt-6 p-6">
			<CardHeader
				title="MCP engine room & privacy controls"
				desc="Norviq provides the MCP tools and your portfolio data. You bring your own AI client (Claude, Cursor, ChatGPT, Hermes) — that client pays for the LLM. Norviq does not bill model tokens for MCP."
			/>
			<div class="mcp-engine-layout mt-5">
				<div class="mcp-active-scopes">
					<p class="command-metric-label">Active scopes</p>
					{#if vm.mcp.scopes.length === 0}
						<ul class="mcp-status-list mt-2">
							<li>
								<span class="mcp-scope">No live scopes yet</span>
								<MCPStateBadge state="off">Off</MCPStateBadge>
							</li>
						</ul>
					{:else}
						<ul class="mcp-status-list mt-2">
							{#each vm.mcp.scopes as scope (scope.label)}
								<li>
									<span class="mcp-scope">{scope.label}</span>
									<MCPStateBadge state={scope.state}>
										{#if scope.state === 'live'}On · Live{:else if scope.state === 'ready'}On{:else}Off{/if}
									</MCPStateBadge>
								</li>
							{/each}
						</ul>
					{/if}
					{#if vm.mcp.lastActivity !== ''}
						<p class="mcp-last-activity mt-3">Last activity · {vm.mcp.lastActivity}</p>
					{/if}
					<a
						href="/settings/api-access"
						class="mt-3 inline-block text-xs text-muted-foreground underline"
						>View policy &amp; manage tokens</a
					>
				</div>
				<div class="mcp-token-table-wrap">
					<p class="command-metric-label">Personal access tokens &amp; connected agents</p>
					{#if vm.mcp.needsPro}
						<p class="mt-3 text-sm text-muted-foreground">Pro required to mint tokens.</p>
						<PrimaryButton href="/settings/subscription" class="mt-3 inline-block px-5"
							>See plans</PrimaryButton
						>
					{:else if vm.mcp.empty || vm.mcp.agents.length === 0}
						<p class="mt-3 text-sm text-muted-foreground">No keys at the gate yet.</p>
						<PrimaryButton href="/settings/api-access" class="mt-3 inline-block px-5"
							>Generate new token</PrimaryButton
						>
					{:else}
						<vigil.DataTable class="mt-3">
							<thead>
								<tr>
									<th>Agent / token</th>
									<th>Scopes</th>
									<th>Last activity</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								{#each vm.mcp.agents as agent, i (i)}
									<tr>
										<td class="text-xs tabular-nums">{agent.name}</td>
										<td class="text-xs text-muted-foreground">{agent.scopes}</td>
										<td class="text-xs tabular-nums">{agent.lastUsed}</td>
										<td>
											<MCPStateBadge state={settingsMCPAgentState(agent)}
												>{agent.status}</MCPStateBadge
											>
										</td>
									</tr>
								{/each}
							</tbody>
						</vigil.DataTable>
						<PrimaryButton href="/settings/api-access" class="mt-4 inline-block px-5"
							>Manage API access</PrimaryButton
						>
					{/if}
				</div>
			</div>
			<div class="mcp-tool-grid" aria-label="MCP tool scopes">
				<div class="mcp-tool-tile"><span class="icon" aria-hidden="true">◈</span>Sentiment</div>
				<div class="mcp-tool-tile"><span class="icon" aria-hidden="true">◎</span>Portfolio</div>
				<div class="mcp-tool-tile"><span class="icon" aria-hidden="true">⇄</span>Expenses</div>
				<div class="mcp-tool-tile"><span class="icon" aria-hidden="true">⛨</span>Risk / tax</div>
				<div class="mcp-tool-tile"><span class="icon" aria-hidden="true">☰</span>Insights</div>
			</div>
			<section class="mcp-tool-logs mt-5" aria-labelledby="mcp-tool-logs-title">
				<h3 id="mcp-tool-logs-title" class="command-metric-label">Live tool logs</h3>
				<div class="mcp-tool-logs-terminal">
					{#if vm.mcp.lastActivity !== ''}
						<p class="mcp-tool-log-line">
							<span class="mcp-tool-log-ts">{vm.mcp.lastActivity}</span> portfolio.get_holdings · 200
							OK
						</p>
					{/if}
					{#if vm.mcp.liveCount > 0}
						<p class="mcp-tool-log-line">
							<span class="mcp-tool-log-ts">recent</span> expenses.list · 200 OK
						</p>
						<p class="mcp-tool-log-line">
							<span class="mcp-tool-log-ts">recent</span> market.quote · 200 OK
						</p>
					{:else}
						<p class="mcp-tool-log-line">
							<span class="mcp-tool-log-ts">standby</span> awaiting first authenticated MCP call
						</p>
					{/if}
				</div>
			</section>
			<p class="mt-4 text-xs text-muted-foreground">
				Privacy-first: least-privilege scopes, revocable any time. Live = used in the last 24h.
			</p>
		</section>
		<CollapsibleSection
			title="Broker connections"
			desc="Import holdings from your broker with screenshots, a CSV export, or Q."
		>
			<div class="mt-4">
				<CSVImportFormatHint />
			</div>
			{#if vm.brokers.length === 0}
				<div class="mt-4">
					<EmptyState
						title="No broker connections yet"
						description="Use Import from broker to add your holdings."
					/>
				</div>
			{:else}
				<ul class="mt-4 space-y-3">
					{#each vm.brokers as broker, i (i)}
						<li
							class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-4 py-3"
						>
							<div>
								<p class="font-medium">{broker.label}</p>
								<p class="text-xs text-muted-foreground">{broker.provider}</p>
							</div>
							<span class="settings-status-pill">{broker.status}</span>
						</li>
					{/each}
				</ul>
			{/if}
			<div class="mt-6 flex flex-wrap gap-3">
				<PrimaryButton href="/onboarding/import/csv" class="px-5" fullWidth
					>Import CSV</PrimaryButton
				>
				<a href="/onboarding/import/manual" class="btn-secondary px-5">Add manually</a>
			</div>
		</CollapsibleSection>
		<CollapsibleSection title="Interactive Brokers (IBKR)" open>
			<div
				class="mt-4 rounded-lg border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] px-4 py-3 text-sm text-muted-foreground"
				role="note"
			>
				<p class="font-medium">Import IBKR holdings</p>
				<p class="mt-1 opacity-90">
					Screenshot your positions in the IBKR app or Client Portal and import them from your
					portfolio. Statement import with full trade history is coming next.
				</p>
				<PrimaryButton href="/portfolio/import" class="mt-3 inline-block px-5">
					Import from broker
				</PrimaryButton>
			</div>
			{#if vm.ibkr.status === 'connected' || vm.ibkr.status === 'error'}
				<div class="mt-4 flex flex-wrap items-center gap-3">
					<span class="settings-status-pill">{vm.ibkr.statusLabel}</span>
					{#if vm.ibkr.displayName !== ''}
						<span class="text-sm text-muted-foreground">{vm.ibkr.displayName}</span>
					{/if}
				</div>
				{#if vm.ibkr.statusDetail !== ''}
					<p class="mt-2 text-sm text-muted-foreground">{vm.ibkr.statusDetail}</p>
				{/if}
				<form method="POST" action="?/ibkrDisconnect" class="mt-6" use:enhance={withSpinner()}>
					<NativeButton
						type="submit"
						class="btn-secondary px-5 text-[var(--color-danger)]"
						onclick={confirmIBKRDisconnect}
					>
						Disconnect
					</NativeButton>
				</form>
			{/if}
		</CollapsibleSection>
		<TelegramCard vm={telegram} />
	</vigil.SettingsShell>
</div>
