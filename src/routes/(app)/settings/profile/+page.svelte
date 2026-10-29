<script lang="ts">
	import { enhance } from '$app/forms';
	import { FormErrorBanner, NativeButton, SecondarySubmitButton, SubmitButton, ToastBanner, VaultTextField, withSpinner } from '#lib/components/norviq/index.js';
	import * as dialog from '#lib/components/norviq/tui/dialog/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import { registerPasskey } from '#lib/features/settings-admin/passkey-register.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const vm = $derived(data.vm);
	// #profile-feedback: an action's answer replaces the load's messages (ProfileFeedback).
	const feedback = $derived(form?.feedback ?? { successMessage: vm.successMessage, errorMessage: vm.errorMessage });

	// Go swapped only #profile-feedback, so typed values stay put.
	const keepFields = withSpinner(() => async ({ update }) => update({ reset: false, invalidateAll: false }));

	// auth.js bindPasskeyRegisterButton
	let passkeyBusy = $state(false);
	let passkeyResult = $state<{ ok: boolean; message: string } | null>(null);
	async function onPasskeyRegister() {
		passkeyBusy = true;
		passkeyResult = null;
		try {
			passkeyResult = { ok: true, message: await registerPasskey() };
		} catch (error) {
			console.error(error);
			passkeyResult = { ok: false, message: error instanceof Error ? error.message : 'Could not register passkey.' };
		} finally {
			passkeyBusy = false;
		}
	}
</script>

<svelte:head>
	<title>Edit profile - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="app-page-content vigil-document-page settings-modern-page settings-section-page">
	<vigil.SettingsShell backHref="/settings" backLabel={t('← Settings')} title={t('Edit profile')} subtitle={t('Name, email, and password')}>
		<div id="profile-feedback">
			<ToastBanner message={feedback.successMessage} />
			<FormErrorBanner message={feedback.errorMessage} />
		</div>
		<form class="glass-card mt-6 space-y-4 p-6" method="POST" action="?/save" use:enhance={keepFields}>
			<VaultTextField label="Username" name="username" inputType="text" placeholder="Your username" value={vm.username} />
			<VaultTextField label="Email" name="email" inputType="email" placeholder="you@example.com" value={vm.email} />
			<div class="space-y-4 border-t pt-4" style="border-color: color-mix(in srgb, currentColor 10%, transparent);">
				<p class="field-label">Change password</p>
				<VaultTextField label="Current password" name="current_password" inputType="password" placeholder="••••••••" />
				<VaultTextField label="New password" name="new_password" inputType="password" placeholder="••••••••" />
			</div>
			<SubmitButton class="w-auto px-6">Save changes</SubmitButton>
		</form>
		<div class="glass-card mt-6 p-6">
			<p class="font-semibold">Passkeys</p>
			<p class="mt-2 text-sm text-muted-foreground">Register a passkey on this device for faster sign in.</p>
			<div id="passkey-register-feedback" class="mt-3">
				{#if passkeyResult?.ok}
					<div class="success-banner" role="status">{passkeyResult.message}</div>
				{:else if passkeyResult}
					<div class="error-banner" role="alert">{passkeyResult.message}</div>
				{/if}
			</div>
			<NativeButton id="passkey-register" class="btn-secondary mt-4 px-5 text-sm" disabled={passkeyBusy} onclick={onPasskeyRegister}>Add passkey</NativeButton>
		</div>
		<div class="glass-card mt-6 p-6">
			<p class="font-semibold">Connected sign-in accounts</p>
			{#if vm.connectedAccountsError !== ''}
				<p class="mt-2 text-sm text-[var(--color-danger)]">{vm.connectedAccountsError}</p>
			{/if}
			<div class="mt-4 divide-y" style="border-color: color-mix(in srgb, currentColor 10%, transparent);">
				{#each vm.connectedAccounts as account (account.provider)}
					<div class="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p class="font-medium">{account.label}</p>
							{#if account.connected}
								{#if account.email !== ''}
									<p class="mt-1 text-sm text-muted-foreground">{account.email}</p>
								{:else}
									<p class="mt-1 text-sm text-muted-foreground">Connected</p>
								{/if}
							{:else}
								<p class="mt-1 text-sm text-muted-foreground">Not connected</p>
							{/if}
						</div>
						{#if account.connected}
							<span
								class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
								style="background: color-mix(in srgb, var(--color-success) 14%, transparent); color: var(--color-success);">Connected</span
							>
						{:else}
							<!-- A redirect out to the provider: skip client-side routing. -->
							<a href="/settings/profile/oauth/{account.provider}/connect" class="btn-secondary px-4 py-2 text-sm" data-sveltekit-reload>Connect</a>
						{/if}
					</div>
				{/each}
			</div>
		</div>
		<div class="glass-card mt-6 p-6">
			<p class="font-semibold text-[var(--color-danger)]">Delete account</p>
			<p class="mt-2 text-sm text-muted-foreground">Permanently remove your Norviq account and data.</p>
			<dialog.Trigger for="delete-account-dialog">
				<NativeButton class="btn-secondary mt-4 px-5 text-sm">Delete account</NativeButton>
			</dialog.Trigger>
			<dialog.Dialog id="delete-account-dialog">
				<dialog.Content class="glass-card vigil-modal-panel border-0 p-6 sm:max-w-lg md:p-8">
					<dialog.Header>
						<dialog.Title>Delete account?</dialog.Title>
						<dialog.Description>This cannot be undone. Type DELETE to confirm.</dialog.Description>
					</dialog.Header>
					<form class="mt-4 space-y-4" method="POST" action="?/delete" use:enhance={keepFields}>
						<VaultTextField label="Confirmation" name="confirm" inputType="text" placeholder="DELETE" required />
						<div class="flex flex-wrap gap-3">
							<SecondarySubmitButton class="px-5 text-[var(--color-danger)]">Delete permanently</SecondarySubmitButton>
							<dialog.Close for="delete-account-dialog">
								<NativeButton class="btn-secondary px-5">Cancel</NativeButton>
							</dialog.Close>
						</div>
					</form>
				</dialog.Content>
			</dialog.Dialog>
		</div>
	</vigil.SettingsShell>
</div>
