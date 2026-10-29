<script lang="ts">
	// settings.AIProvidersPage (internal/pages/settings/ai_providers.templ).
	import { enhance } from '$app/forms';
	import { Field, FormErrorBanner, SubmitButton, withSpinner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import AIConsentSettingsCard from '#lib/features/settings-admin/ai-providers/AIConsentSettingsCard.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// A failed action replaces the panel feedback, as the htmx swap did.
	const errorMessage = $derived(form?.errorMessage ?? data.errorMessage);

	const confirmDisconnect = withSpinner(({ cancel }) => {
		if (!confirm(t("Disconnect this key? The assistant will go back to using Norviq's key."))) cancel();
	});
</script>

<svelte:head>
	<title>AI providers - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page settings-ai-providers settings-modern-page">
	<vigil.SettingsShell
		backHref="/settings"
		backLabel={t('← Settings')}
		title={t('AI providers')}
		subtitle={t('Use your own Anthropic or OpenAI key. Norviq stores it encrypted and never shows it again.')}
	>
		<AIConsentSettingsCard vm={data.consent} />
		<div id="ai-providers-feedback">
			<FormErrorBanner message={errorMessage} />
		</div>
		<div
			class="rounded-lg border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] px-4 py-3 text-sm text-muted-foreground"
			role="note"
		>
			<p class="font-medium">{t('What this changes')}</p>
			<p class="mt-1">
				{t(
					"With a key connected, the in-app assistant calls your provider account and your monthly Norviq assistant limit no longer applies. Without one, it keeps using Norviq's own key."
				)}
			</p>
		</div>
		{#each data.providers as row (row.provider)}
			<section class="glass-card ai-provider-card mt-6 p-6">
				<div class="ai-provider-head">
					<div>
						<h2 class="text-lg leading-none font-semibold tracking-tight">{row.title}</h2>
						<p class="text-sm leading-relaxed text-muted-foreground mt-1">{row.label}</p>
					</div>
					<span class="ai-provider-status ai-provider-status-{row.statusTone}">
						{#if row.connected}
							{row.masked}
						{:else}
							{t('Not connected')}
						{/if}
					</span>
				</div>
				<p class="text-xs mt-2 text-muted-foreground">{row.statusText}</p>
				{#if row.connected && row.lastUsed !== ''}
					<p class="text-xs text-muted-foreground">{t('Last used')} · {row.lastUsed}</p>
				{/if}
				<form class="ai-provider-form mt-4 space-y-3" method="POST" action="?/connect" use:enhance={withSpinner()}>
					<input type="hidden" name="provider" value={row.provider} />
					<Field
						id={'ai-key-' + row.provider}
						name="apiKey"
						label={t('API key')}
						type="password"
						placeholder="sk-…"
						required
						wrapperClass="space-y-2"
						maxlength={512}
						autocomplete="off"
						spellcheck="false"
					/>
					{#if row.requiresEndpoint}
						<Field
							id={'ai-base-' + row.provider}
							name="baseURL"
							label={t('Base URL')}
							placeholder="https://your-endpoint.example.com/v1"
							value={row.baseURL}
							required
							wrapperClass="space-y-2"
							description={t('Must be https. Private and loopback addresses are refused.')}
						/>
						<Field
							id={'ai-model-' + row.provider}
							name="defaultModel"
							label={t('Default model')}
							placeholder="llama-3.3-70b"
							value={row.defaultModel}
							required
							wrapperClass="space-y-2"
						/>
					{/if}
					<div class="ai-provider-actions">
						<SubmitButton class="w-auto px-6">
							{#if row.connected}
								{t('Replace key')}
							{:else}
								{t('Connect')}
							{/if}
						</SubmitButton>
					</div>
				</form>
				{#if row.connected}
					<div class="ai-provider-actions mt-3">
						<form method="POST" action="?/verify" use:enhance={withSpinner()}>
							<input type="hidden" name="id" value={row.id} />
							<SubmitButton class="btn-secondary w-auto px-4">{t('Test key')}</SubmitButton>
						</form>
						<form method="POST" action="?/disconnect" use:enhance={confirmDisconnect}>
							<input type="hidden" name="id" value={row.id} />
							<SubmitButton class="btn-revoke w-auto px-4">{t('Disconnect')}</SubmitButton>
						</form>
					</div>
				{/if}
			</section>
		{/each}
	</vigil.SettingsShell>
</div>
