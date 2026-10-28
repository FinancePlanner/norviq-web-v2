<script lang="ts">
	// pages/portfolio/workspace.templ WorkspacePage
	import { enhance } from '$app/forms';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import {
		Field,
		NativeInput,
		PilotFollowingBanner,
		SecondarySubmitButton,
		SelectField,
		SubmitButton,
		pilotFollowingFor,
		withSpinner
	} from '#lib/components/norviq/index.js';
	import { formatFloat } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const selected = $derived(data.selected);
</script>

<svelte:head>
	<title>Portfolios - Norviq</title>
	<meta name="keywords" content="Portfolio holdings" />
	<meta name="description" content="View and manage your stock, ETF, and crypto positions." />
</svelte:head>

{#snippet workspaceField(label: string, name: string, placeholder: string, type: 'text' | 'email')}
	<Field {name} {label} {type} {placeholder} required class="w-full" wrapperClass="block text-sm" />
{/snippet}

{#snippet pilotsLink()}
	<a href="/pilots" class="btn-secondary">Follow a pilot</a>
{/snippet}

<div class="app-page-content vigil-canvas-page portfolio-workspace portfolio-modern-page">
	<vigil.ModernPageHeader title="Portfolios" actions={data.pilotsEnabled ? pilotsLink : undefined} />
	{#if data.notice}
		<div class="mt-5 rounded-lg border border-success/25 bg-success/10 px-4 py-3 text-sm" role="status">{data.notice}</div>
	{/if}
	{#if data.error}
		<div class="mt-5 rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm" role="alert">{data.error}</div>
	{/if}
	<div class="vigil-command-split mt-6">
		<div class="vigil-command-split-main">
			<vigil.Panel class="p-5 md:p-6" titleID="portfolio-list-title">
				<div class="flex items-start justify-between gap-4">
					<div>
						<h2 id="portfolio-list-title" class="text-lg font-semibold">Your portfolios</h2>
						<p class="mt-1 text-sm text-muted-foreground">Actual portfolios affect totals. Sandboxes stay separate.</p>
					</div>
					<span class="text-sm tabular-nums text-muted-foreground">{`${data.portfolios.length} / 25`}</span>
				</div>
				<div class="mt-5 grid gap-3 sm:grid-cols-2">
					{#each data.portfolios as item (item.id)}
						{@const active = selected?.id === item.id}
						{@const following = pilotFollowingFor(data.pilotFollows, item.id)}
						<a
							href={'/portfolios?portfolio=' + item.id}
							class={[
								'rounded-lg border p-4 transition-colors active:scale-[.99]',
								active && 'border-[var(--color-accent)] bg-[var(--color-accent)]/5',
								!active && 'border-current/10 hover:border-current/25'
							]}
						>
							<div class="flex items-start justify-between gap-3">
								<div>
									<p class="font-semibold">{item.name}</p>
									<p class="mt-1 text-xs capitalize text-muted-foreground">{item.purpose} · {item.ownership}</p>
								</div>
								<span class="rounded-full bg-current/5 px-2 py-1 text-xs capitalize">{item.mode}</span>
							</div>
							<p class="mt-4 text-xs text-muted-foreground">{item.baseCurrency} · {item.currentUserRole}</p>
							{#if following}
								<p class="mt-2 text-xs font-medium text-[var(--color-tint)]">{'Following ' + following.pilotName}</p>
							{/if}
						</a>
					{/each}
				</div>
				{#if data.portfolios.length === 0}
					<div class="mt-5 rounded-lg border border-dashed border-current/20 p-8 text-center">
						<p class="font-medium">Create your first portfolio</p>
						<p class="mt-2 text-sm text-muted-foreground">Start with one personal actual portfolio.</p>
					</div>
				{/if}
			</vigil.Panel>
		</div>
		<vigil.CommandSplitAside>
			<vigil.Panel class="p-5 md:p-6" titleID="create-portfolio-title">
				<h2 id="create-portfolio-title" class="text-lg font-semibold">New portfolio</h2>
				<form method="post" action="?/create" class="mt-5 space-y-4" use:enhance={withSpinner()}>
					{@render workspaceField('Portfolio name', 'name', 'Long-term investments', 'text')}
					<div class="grid grid-cols-2 gap-3">
						<SelectField
							name="purpose"
							label="Purpose"
							required
							class="w-full"
							wrapperClass="block text-sm"
							options={[
								{ value: 'personal', label: 'Personal' },
								{ value: 'retirement', label: 'Retirement' }
							]}
						/>
						<SelectField
							name="ownership"
							label="Ownership"
							required
							class="w-full"
							wrapperClass="block text-sm"
							options={[
								{ value: 'individual', label: 'Individual' },
								{ value: 'joint', label: 'Joint' }
							]}
						/>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<SelectField
							name="mode"
							label="Mode"
							required
							class="w-full"
							wrapperClass="block text-sm"
							options={[
								{ value: 'actual', label: 'Actual' },
								{ value: 'hypothetical', label: 'What if' }
							]}
						/>
						<Field name="currency" label="Currency" value="USD" required class="w-full" wrapperClass="block text-sm" maxlength={3} />
					</div>
					{#if !data.isPro}
						<p class="text-xs text-muted-foreground">
							Free includes one personal actual portfolio. Retirement, joint, and hypothetical portfolios require Pro.
						</p>
					{/if}
					<SubmitButton class="w-full">Create portfolio</SubmitButton>
				</form>
			</vigil.Panel>
		</vigil.CommandSplitAside>
	</div>
	{#if selected}
		{@const following = pilotFollowingFor(data.pilotFollows, selected.id)}
		<section class="mt-5 glass-card p-5 md:p-6">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p class="text-footnote font-semibold text-muted-foreground">Selected portfolio</p>
					<h2 class="mt-2 text-2xl font-semibold">{selected.name}</h2>
					<p class="mt-1 text-sm capitalize text-muted-foreground">{selected.purpose} · {selected.ownership} · {selected.mode}</p>
				</div>
				<div class="flex flex-wrap gap-2">
					<a class="btn-secondary" href={'/portfolio?portfolio=' + selected.id}>Open holdings</a>
					<a class="btn-secondary" href={'/portfolio/rebalancing?portfolio=' + selected.id}>Rebalancing</a>
					{#if selected.purpose === 'retirement'}
						<a class="btn-secondary" href={'/portfolio/retirement?portfolio=' + selected.id}>Retirement plan</a>
					{/if}
					{#if selected.capabilities?.canEdit}
						<form method="post" action="?/clone" use:enhance={withSpinner()}>
							<input type="hidden" name="id" value={selected.id} />
							<SecondarySubmitButton>Create what-if copy</SecondarySubmitButton>
						</form>
					{/if}
				</div>
			</div>
			{#if following}
				<PilotFollowingBanner vm={following} />
			{/if}
			<div class="mt-6 grid gap-5 lg:grid-cols-3">
				<div>
					<h3 class="font-semibold">Cash balances</h3>
					<div class="mt-3 space-y-2">
						{#each data.cash as cash (cash.id)}
							<div class="rounded-lg bg-current/5 px-4 py-3">
								<div class="flex justify-between gap-3">
									<span>{cash.label}</span><strong>{`${cash.currency} ${formatFloat(cash.balance, 2)}`}</strong>
								</div>
								<p class="mt-1 text-xs text-muted-foreground">As of {cash.asOf}</p>
							</div>
						{/each}
						{#if data.cash.length === 0}
							<p class="text-sm text-muted-foreground">No cash balances yet.</p>
						{/if}
					</div>
					{#if selected.capabilities?.canEdit}
						<form method="post" action="?/cash" class="mt-4 space-y-3" use:enhance={withSpinner()}>
							<input type="hidden" name="id" value={selected.id} />
							{@render workspaceField('Label', 'label', 'Broker cash', 'text')}
							<div class="grid grid-cols-2 gap-3">
								<NativeInput
									name="currency"
									value={selected.baseCurrency}
									class="form-input"
									maxlength={3}
									aria-label="Cash currency"
									required
								/>
								<NativeInput
									name="balance"
									type="number"
									class="form-input"
									step="0.01"
									placeholder="0.00"
									aria-label="Cash balance"
									required
								/>
							</div>
							<SecondarySubmitButton class="w-full">Add cash balance</SecondarySubmitButton>
						</form>
					{/if}
				</div>
				<div>
					<h3 class="font-semibold">People</h3>
					<div class="mt-3 space-y-2">
						{#each data.members as member (member.id)}
							<div class="rounded-lg bg-current/5 px-4 py-3">
								<p class="font-medium">{member.displayName}</p>
								<p class="text-xs text-muted-foreground">{member.email} · {member.role}</p>
							</div>
						{/each}
					</div>
					{#if selected.capabilities?.canManageMembers}
						<form method="post" action="?/invite" class="mt-4 space-y-3" use:enhance={withSpinner()}>
							<input type="hidden" name="id" value={selected.id} />
							{@render workspaceField('Invite by verified email', 'email', 'person@example.com', 'email')}
							<SecondarySubmitButton class="w-full">Invite editor</SecondarySubmitButton>
						</form>
					{/if}
				</div>
				<div>
					<h3 class="font-semibold">Pending invitations</h3>
					<div class="mt-3 space-y-2">
						{#each data.invitations as invite (invite.id)}
							<div class="rounded-lg bg-current/5 px-4 py-3">
								<p class="font-medium">{invite.email}</p>
								<p class="text-xs text-muted-foreground">Expires {invite.expiresAt}</p>
							</div>
						{/each}
						{#if data.invitations.length === 0}
							<p class="text-sm text-muted-foreground">No pending invitations.</p>
						{/if}
					</div>
					{#if selected.capabilities?.canArchive}
						<form method="post" action="?/archive" class="mt-6" use:enhance={withSpinner()}>
							<input type="hidden" name="id" value={selected.id} />
							<SecondarySubmitButton class="w-full">Archive portfolio</SecondarySubmitButton>
						</form>
					{/if}
				</div>
			</div>
		</section>
	{/if}
</div>
