<script lang="ts">
	// auth.ForgotPasswordPage + ForgotPasswordForm
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import { t } from '#lib/i18n/context.svelte.js';
	import { staggerOnMount } from '#lib/motion.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import AuthBrandPanel from '#lib/components/norviq/AuthBrandPanel.svelte';
	import FormErrorBanner from '#lib/components/norviq/FormErrorBanner.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import ToastBanner from '#lib/components/norviq/ToastBanner.svelte';
	import VaultTextField from '#lib/components/norviq/VaultTextField.svelte';
	import AuthMeta from '#lib/features/auth-onboarding/AuthMeta.svelte';
	import { enhanceInPlace } from '#lib/features/auth-onboarding/enhance.js';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	// The form re-renders in place (htmx outerHTML swap of #forgot-form). The
	// swap also cleared the email field; the keyed block below does the same.
	let result = $state<{ success: string; error: string }>(untrack(() => form ?? { success: '', error: '' }));
	let generation = $state(0);
	const submit = enhanceInPlace<{ success: string; error: string }>({
		onData: (data) => {
			result = data;
			generation++;
		},
		onError: (message) => {
			result = { success: '', error: message };
			generation++;
		}
	});
</script>

<AuthMeta title="Reset password - Norviq" keywords="Reset password" description="Reset your Norviq password." />

<div class="auth-container auth-container-wide">
	<vigil.AuthShell>
		<vigil.AuthBrandColumn>
			<AuthBrandPanel />
		</vigil.AuthBrandColumn>
		<vigil.AuthFormColumn>
			<a href="/login" class="vigil-settings-back">
				<ChevronLeft class="h-4 w-4 shrink-0" />
				<span>{t('Back to sign in')}</span>
			</a>
			<header class="auth-modern-header space-y-4 text-center lg:text-left" {@attach staggerOnMount(':scope > *', 80)}>
				<div class="space-y-2">
					<h1 class="auth-modern-title">{t('Reset Password')}</h1>
					<p class="text-subhead text-muted-foreground">
						{t(
							"Enter the email address associated with your account and we'll send a code to reset your password."
						)}
					</p>
				</div>
			</header>
			<div class="glass-card auth-form-card">
				{#key generation}
					<form
						method="POST"
						id="forgot-form"
						class="space-y-6"
						use:enhance={submit}
						{@attach staggerOnMount(':scope > *', 50)}
					>
						<VaultTextField
							label={t('Email Address')}
							name="email"
							inputType="email"
							placeholder="name@domain.com"
							required
						/>
						<FormErrorBanner message={result.error} />
						<ToastBanner message={result.success} />
						<SubmitButton fullWidth>{t('Send reset instructions')}</SubmitButton>
					</form>
				{/key}
			</div>
		</vigil.AuthFormColumn>
	</vigil.AuthShell>
</div>
