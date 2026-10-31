<script lang="ts">
	// auth.MFAModal(maskedDestination, resendAvailableIn, error, info). Its two
	// forms post to /mfa/verify and /mfa/resend and re-render the modal with the
	// result, as the htmx swap into #mfa-modal-content did.
	import { enhance } from '$app/forms';
	import { t } from '#lib/i18n/context.svelte.js';
	import { staggerOnMount } from '#lib/motion.js';
	import Field from '#lib/components/norviq/Field.svelte';
	import FormErrorBanner from '#lib/components/norviq/FormErrorBanner.svelte';
	import GhostButton from '#lib/components/norviq/GhostButton.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import ToastBanner from '#lib/components/norviq/ToastBanner.svelte';
	import { enhanceInPlace } from './enhance.js';
	import type { MFAModalState } from './types.js';

	let { mfa = $bindable(), onclose }: { mfa: MFAModalState; onclose: () => void } = $props();

	const onData = (data: { mfa?: MFAModalState }) => {
		if (data.mfa) mfa = data.mfa;
	};
	const onError = (message: string) => {
		mfa = { ...mfa, error: message, info: '' };
	};
</script>

<div class="auth-vigil space-y-5" {@attach staggerOnMount(':scope > *', 40)}>
	<header class="auth-modern-header flex items-start justify-between gap-4">
		<div>
			<h2 class="auth-modern-title">{t('Two-Factor Verification')}</h2>
		</div>
		<GhostButton class="link-tint text-sm font-semibold" onclick={onclose}>{t('Close')}</GhostButton
		>
	</header>
	<p class="text-sm leading-relaxed text-muted-foreground">
		{#if mfa.maskedDestination}
			{t('Enter the 6-digit code sent to')} {mfa.maskedDestination}.
		{:else}
			{t('Enter the 6-digit code sent to your email.')}
		{/if}
	</p>
	<form
		method="POST"
		action="/mfa/verify"
		class="space-y-4"
		use:enhance={enhanceInPlace({ onData, onError, hardRedirect: true })}
	>
		<!-- "one-time-code" lets iOS and Android offer the code from the keyboard. -->
		<Field
			name="code"
			label={t('Verification code')}
			placeholder="123456"
			autocomplete="one-time-code"
			required
			class="spring-pop text-center text-2xl font-semibold"
			inputmode="numeric"
			pattern={'[0-9]{6}'}
			maxlength={6}
			data-motion="spring"
		/>
		<FormErrorBanner message={mfa.error} />
		<ToastBanner message={mfa.info} />
		<SubmitButton fullWidth>{t('Verify and Sign In')}</SubmitButton>
	</form>
	<form
		method="POST"
		action="/mfa/resend"
		use:enhance={enhanceInPlace({ onData, onError, hardRedirect: true })}
	>
		{#if mfa.resendAvailableIn > 0}
			<GhostButton
				disabled
				fullWidth
				class="spring-pop text-sm font-semibold text-muted-foreground"
				data-motion="spring">Resend in {mfa.resendAvailableIn}s</GhostButton
			>
		{:else}
			<SubmitButton fullWidth class="link-tint text-sm font-semibold"
				>{t('Resend code')}</SubmitButton
			>
		{/if}
	</form>
</div>
