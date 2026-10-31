<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		CheckboxField,
		FormErrorBanner,
		SubmitButton,
		ToastBanner,
		withSpinner
	} from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	// The action answers with the re-rendered form state, as Go's NotificationsForm fragment did.
	const vm = $derived(form?.vm ?? data.vm);
</script>

<svelte:head>
	<title>Notifications - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page settings-modern-page settings-section-page">
	<vigil.SettingsShell
		backHref="/settings"
		backLabel={t('← Settings')}
		title="Notifications"
		subtitle="Earnings reminder preferences"
	>
		<div id="notification-settings-panel">
			{#key vm}
				<form
					class="glass-card space-y-5 p-6"
					method="POST"
					action="?/earnings"
					use:enhance={withSpinner(
						() =>
							async ({ update }) =>
								update({ reset: false, invalidateAll: false })
					)}
				>
					<ToastBanner message={vm.successMessage} />
					<FormErrorBanner message={vm.errorMessage} />
					<div class="flex flex-wrap items-start justify-between gap-4">
						<div class="max-w-xl">
							<p class="font-semibold">Earnings reminders</p>
							<p class="mt-2 text-sm text-muted-foreground">
								Receive reminder alerts for companies tracked in Norviq.
							</p>
						</div>
						<label class="inline-flex items-center gap-3 text-sm font-semibold">
							<CheckboxField
								name="earnings_enabled"
								value="1"
								checked={vm.earningsEnabled}
								aria-label="Earnings reminders"
							/>
							<span>{vm.earningsEnabled ? 'On' : 'Off'}</span>
						</label>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<div
							class="rounded-lg border p-4"
							style="border-color: color-mix(in srgb, currentColor 10%, transparent);"
						>
							<p class="field-label">Coverage</p>
							<p class="mt-1 text-sm text-muted-foreground">{vm.scopeLabel}</p>
						</div>
						<div
							class="rounded-lg border p-4"
							style="border-color: color-mix(in srgb, currentColor 10%, transparent);"
						>
							<p class="field-label">Reminder timing</p>
							<p class="mt-1 text-sm text-muted-foreground">{vm.leadDays}</p>
						</div>
					</div>
					<p class="text-xs text-muted-foreground">
						Device push delivery is still managed by the iOS app; this controls the backend earnings
						reminder preference for your account.
					</p>
					<SubmitButton class="w-auto px-6">Save notification settings</SubmitButton>
				</form>
			{/key}
		</div>
	</vigil.SettingsShell>
</div>
