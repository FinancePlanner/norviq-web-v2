<script lang="ts">
	// settings.APIAccessPage (internal/pages/settings/apiaccess.templ).
	import { enhance } from '$app/forms';
	import {
		CheckboxField,
		CollapsibleSection,
		CopyButton,
		CardHeader,
		EmptyState,
		Field,
		FormErrorBanner,
		PrimaryButton,
		SelectField,
		SubmitButton,
		ToastBanner,
		withSpinner
	} from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import ConnectPanel from '#lib/features/settings-admin/api-access/ConnectPanel.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// The action's failure replaces the load's flash, as the htmx swap of
	// #api-access-feedback did.
	const successMessage = $derived(form ? '' : data.successMessage);
	const errorMessage = $derived(form?.errorMessage ?? data.errorMessage);

	const clientOptions = $derived(
		data.clients.map((c) => ({ value: c.id, label: c.label, selected: c.isActive }))
	);

	const confirmRevoke = withSpinner(({ cancel }) => {
		if (!confirm('Revoke this token? Clients using it will stop working.')) cancel();
	});
</script>

<svelte:head>
	<title>API access - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page settings-api-access settings-modern-page">
	<vigil.SettingsShell backHref="/settings" backLabel="← Settings" title="API access">
		<section class="glass-card mcp-engine-room p-6">
			<CardHeader
				title="MCP engine room"
				desc="Mint scoped personal access tokens. Revoke any time — clients stop immediately."
			/>
		</section>
		<div
			class="mt-4 rounded-lg border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] px-4 py-3 text-sm text-muted-foreground"
			role="note"
		>
			<p class="font-medium">Cost model</p>
			<p class="mt-1">
				A personal access token unlocks Norviq portfolio and expense tools only. It is <strong
					>not</strong
				> an OpenAI or Anthropic API key. Model usage is billed by your Claude / Cursor / ChatGPT / Hermes
				account. In-app Norviq Assistant (if enabled) is separate and uses Norviq’s provider key.
			</p>
			<p class="mt-2">
				Data accessed with a token goes to the AI client you connect and is handled under that
				client’s own privacy terms, not Norviq’s. <a
					href="/privacy#mcp"
					class="underline"
					target="_blank"
					rel="noopener">Privacy policy</a
				>
			</p>
		</div>
		<div id="api-access-feedback">
			<ToastBanner message={successMessage} />
			<FormErrorBanner message={errorMessage} />
		</div>
		{#if !data.isPro}
			<div class="glass-card mt-6 p-6">
				<h2 class="text-lg leading-none font-semibold tracking-tight">Norviq Pro required</h2>
				<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
					Connecting external AI clients is a Pro feature. Upgrade to create access tokens.
				</p>
				<PrimaryButton href="/settings/subscription" class="mt-4 inline-block px-6"
					>See plans</PrimaryButton
				>
			</div>
		{:else}
			{#if data.newToken !== ''}
				<div class="glass-card mt-6 space-y-2 border border-success/40 p-6">
					<h2 class="text-lg leading-none font-semibold tracking-tight">Copy your new token now</h2>
					<p class="text-xs text-muted-foreground">
						This is the only time it will be shown. Store it somewhere safe.
					</p>
					<div class="mcp-snippet">
						<code
							id="new-token-value"
							class="mcp-code-block mcp-snippet-code block rounded-xl p-3 text-sm break-all"
							>{data.newToken}</code
						>
						<span class="mcp-snippet-copy">
							<CopyButton targetId="new-token-value" />
						</span>
					</div>
				</div>
			{/if}
			<CollapsibleSection title="New token">
				<form class="space-y-4" method="POST" action="?/create" use:enhance={withSpinner()}>
					<Field
						id="token-name"
						name="name"
						label="Name"
						placeholder="e.g. Claude desktop, Hermes VPS"
						required
						wrapperClass="space-y-2"
						maxlength={100}
					/>
					<div class="space-y-2">
						<span class="field-label">Permissions</span>
						{#each data.availableScopes as scope (scope.value)}
							<label class="flex items-center gap-2">
								<CheckboxField
									id={'scope-' + scope.value}
									name="scopes"
									value={scope.value}
									checked={scope.checked}
									aria-label={scope.value}
								/>
								<span>{scope.label}</span>
							</label>
						{/each}
					</div>
					<SelectField
						id="token-client"
						name="client"
						label="Connecting from"
						wrapperClass="space-y-2"
						options={clientOptions}
					/>
					<Field
						id="token-expiry"
						name="expiresInDays"
						label="Expires in (days)"
						type="number"
						value="90"
						wrapperClass="space-y-2"
						min="1"
						max="365"
					/>
					<SubmitButton class="w-auto px-6">Create token</SubmitButton>
				</form>
			</CollapsibleSection>
			{#if data.mcpEndpoint !== ''}
				<CollapsibleSection
					title="Server address"
					desc="Where MCP clients connect, and what they can ask for."
				>
					<div class="space-y-4">
						<div class="space-y-2">
							<span class="field-label">Server address</span>
							<code class="mcp-code-block block rounded-xl p-3 font-mono text-sm break-all"
								>{data.mcpEndpoint}</code
							>
						</div>
						<div
							class="rounded-lg border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] px-4 py-3 text-sm"
						>
							<p class="font-medium">What you can ask for</p>
							<ul class="mt-2 space-y-1 opacity-80">
								<li>· Expenses, categories, recurring, CSV import/export</li>
								<li>· Spending reports, budgets, and goals</li>
								<li>· Quotes, symbol search, market insights</li>
								<li>· Tax dashboard and loss carryforwards</li>
							</ul>
							<p class="mt-2 text-xs text-muted-foreground">
								Exact tools depend on the scopes on your token.
							</p>
						</div>
						<p class="text-xs text-muted-foreground">
							Prefer least-privilege scopes. Revoke tokens you no longer use. Engineering reference
							lives in the project docs under MCP integration.
						</p>
					</div>
				</CollapsibleSection>
				<ConnectPanel
					activeClient={data.activeClient}
					clients={data.clients}
					mcpEndpoint={data.mcpEndpoint}
					newToken={data.newToken}
					verifyTokenID={data.verifyTokenID}
					verify={data.verify}
				/>
			{/if}
			<div class="mt-6 space-y-3">
				<h2 class="text-lg leading-none font-semibold tracking-tight">Active tokens</h2>
				{#if data.tokens.length === 0}
					<EmptyState
						title="No keys at the gate yet"
						description="Create a token above to connect Claude, Hermes, or any MCP client."
					/>
				{:else}
					<vigil.DataTable>
						<thead>
							<tr>
								<th>Token</th>
								<th>Scopes</th>
								<th>Created</th>
								<th>Expires</th>
								<th>Last used</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each data.tokens as row (row.id)}
								<tr>
									<td class="mcp-token-name font-medium">{row.name}</td>
									<td class="text-xs text-muted-foreground">{row.scopes.join(', ')}</td>
									<td class="text-xs tabular-nums">{row.created}</td>
									<td class="text-xs tabular-nums">{row.expires}</td>
									<td class="text-xs tabular-nums">{row.lastUsed}</td>
									<td class="text-right">
										<form method="POST" action="?/revoke" use:enhance={confirmRevoke}>
											<input type="hidden" name="id" value={row.id} />
											<SubmitButton class="btn-revoke w-auto px-4">Revoke</SubmitButton>
										</form>
									</td>
								</tr>
							{/each}
						</tbody>
					</vigil.DataTable>
				{/if}
			</div>
			<section class="mcp-tool-logs mt-6" aria-labelledby="api-tool-logs-title">
				<h3 id="api-tool-logs-title" class="command-metric-label">Live tool logs</h3>
				<div class="mcp-tool-logs-terminal">
					{#if data.tokens.length === 0}
						<p class="mcp-tool-log-line">
							<span class="mcp-tool-log-ts">standby</span> no active tokens · mint one above
						</p>
					{:else}
						{#each data.tokens.slice(0, 4) as row (row.id)}
							<p class="mcp-tool-log-line">
								<span class="mcp-tool-log-ts">{row.lastUsed}</span>
								{row.name} · scopes OK
							</p>
						{/each}
					{/if}
				</div>
			</section>
		{/if}
	</vigil.SettingsShell>
</div>
