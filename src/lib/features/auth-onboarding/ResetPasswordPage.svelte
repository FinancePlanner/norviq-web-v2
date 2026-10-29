<script lang="ts">
	// auth.ResetPasswordPage + ResetPasswordForm. "Update password" posts to
	// /reset-password; "Resend reset code" posts the same form to
	// /reset-password/resend (was hx-post with hx-include="#reset-email").
	// Either result re-renders the form in place (htmx outerHTML swap).
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import { t } from '#lib/i18n/context.svelte.js';
	import { staggerOnMount } from '#lib/motion.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import AuthBrandPanel from '#lib/components/norviq/AuthBrandPanel.svelte';
	import Field from '#lib/components/norviq/Field.svelte';
	import FormErrorBanner from '#lib/components/norviq/FormErrorBanner.svelte';
	import GhostButton from '#lib/components/norviq/GhostButton.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import ToastBanner from '#lib/components/norviq/ToastBanner.svelte';
	import AuthMeta from './AuthMeta.svelte';
	import { enhanceInPlace } from './enhance.js';

	type Result = { success: string; error: string };
	let { initial = null }: { initial?: Result | null } = $props();

	let result = $state<Result>(untrack(() => initial ?? { success: '', error: '' }));
	let generation = $state(0);
	const submit = enhanceInPlace<Result>({
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

<AuthMeta title="Choose a new password - Norviq" keywords="Reset password" description="Choose a new Norviq password." />

<div class="auth-container auth-container-wide">
	<vigil.AuthShell>
		<vigil.AuthBrandColumn>
			<AuthBrandPanel />
		</vigil.AuthBrandColumn>
		<vigil.AuthFormColumn>
			<div class="auth-form-card glass-card" {@attach staggerOnMount('header, .mt-8 > *, p.mt-6', 70)}>
				<header class="auth-card-header auth-modern-header">
					<h1 class="auth-modern-title">{t('Choose a new password')}</h1>
					<p class="text-subhead text-muted-foreground mt-2">
						{t('Enter the reset code from your email and your new password.')}
					</p>
				</header>
				<div class="mt-6">
					{#key generation}
						<form
							method="POST"
							action="/reset-password"
							id="reset-form"
							class="space-y-6"
							use:enhance={submit}
							{@attach staggerOnMount(':scope > div, :scope > button', 50)}
						>
							<ToastBanner message={result.success} />
							<FormErrorBanner message={result.error} />
							<Field
								id="reset-email"
								name="email"
								label={t('Email')}
								type="email"
								autocomplete="email"
								required
								wrapperClass="space-y-2"
							/>
							<Field
								id="reset-code"
								name="code"
								label={t('Reset code')}
								autocomplete="one-time-code"
								required
								class="spring-pop"
								wrapperClass="space-y-2"
								data-motion="spring"
							/>
							<Field
								id="reset-password"
								name="new_password"
								label={t('New password')}
								type="password"
								autocomplete="new-password"
								required
								wrapperClass="space-y-2"
							/>
							<SubmitButton fullWidth>{t('Update password')}</SubmitButton>
							<GhostButton
								type="submit"
								fullWidth
								class="link-tint text-sm font-semibold"
								formaction="/reset-password/resend"
								formnovalidate>{t('Resend reset code')}</GhostButton
							>
						</form>
					{/key}
				</div>
				<p class="mt-6 text-center text-subhead text-muted-foreground">
					<a href="/login" class="link-tint font-semibold">{t('Back to sign in')}</a>
				</p>
			</div>
		</vigil.AuthFormColumn>
	</vigil.AuthShell>
</div>
