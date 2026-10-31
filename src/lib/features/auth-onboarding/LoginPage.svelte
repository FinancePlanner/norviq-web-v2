<script lang="ts">
	// auth.LoginPage(isSignup, errorMessage, infoMessage, mfaOpen, nextPath):
	// the sign-in / sign-up forms plus the MFA modal.
	//
	// The forms post with use:enhance and handle the result in place, as the
	// htmx version did: an error replaces #auth-errors and flags the card
	// (auth-form-error), a redirect is a full page load (HX-Redirect), and an
	// MFA challenge opens the modal (showMfaModal).
	import { enhance } from '$app/forms';
	import { tick, untrack } from 'svelte';
	import { scale } from 'svelte/transition';
	import { t } from '#lib/i18n/context.svelte.js';
	import { staggerOnMount } from '#lib/motion.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import AuthBrandPanel from '#lib/components/norviq/AuthBrandPanel.svelte';
	import AuthMobileBrand from '#lib/components/norviq/AuthMobileBrand.svelte';
	import Field from '#lib/components/norviq/Field.svelte';
	import FormErrorBanner from '#lib/components/norviq/FormErrorBanner.svelte';
	import PasswordField from '#lib/components/norviq/PasswordField.svelte';
	import PasswordToggle from '#lib/components/norviq/PasswordToggle.svelte';
	import SubmitButton from '#lib/components/norviq/SubmitButton.svelte';
	import ThemeToggleCompact from '#lib/components/norviq/ThemeToggleCompact.svelte';
	import ToastBanner from '#lib/components/norviq/ToastBanner.svelte';
	import MfaModal from './MfaModal.svelte';
	import SocialAuthSection from './SocialAuthSection.svelte';
	import { enhanceInPlace } from './enhance.js';
	import { emptyMFAState, type MFAModalState } from './types.js';

	type Props = {
		isSignup: boolean;
		errorMessage?: string;
		infoMessage?: string;
		mfaOpen?: boolean;
		nextPath?: string;
		/** Set when a no-JS post came back with an MFA challenge. */
		mfa?: MFAModalState | null;
	};

	let {
		isSignup,
		errorMessage = '',
		infoMessage = '',
		mfaOpen = false,
		nextPath = '',
		mfa: mfaIn = null
	}: Props = $props();

	let showMfa = $state(untrack(() => mfaOpen || !!mfaIn));
	// The modal always starts from MFAModal("", 0, "", ""), as in Go.
	let mfa = $state<MFAModalState>(untrack(() => mfaIn ?? emptyMFAState()));
	// #auth-errors holds the server banners; an htmx error swap replaced both
	// the error and the info banner with the new error only.
	let error = $state(untrack(() => errorMessage));
	let info = $state(untrack(() => (errorMessage ? '' : infoMessage)));
	let formError = $state(untrack(() => errorMessage !== ''));
	let password = $state('');

	const switchHref = (base: string) =>
		nextPath ? `${base}?next=${encodeURIComponent(nextPath)}` : base;

	async function showError(message: string) {
		error = message;
		info = '';
		formError = true;
		await tick();
		document.getElementById('auth-errors')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	const submit = enhanceInPlace<{ error?: string; mfa?: MFAModalState }>({
		hardRedirect: true,
		onData: (data) => {
			if (data.mfa) {
				mfa = data.mfa;
				showMfa = true;
				return;
			}
			if (data.error) void showError(data.error);
		},
		onError: (message) => void showError(message)
	});

	function score(): number {
		let s = 0;
		if (password.length >= 8) s++;
		if (/[A-Z]/.test(password)) s++;
		if (/[0-9]/.test(password)) s++;
		if (/[^A-Za-z0-9]/.test(password)) s++;
		return s;
	}
	let passwordVisible = $state(false);
</script>

{#snippet errors()}
	<div id="auth-errors" class="space-y-2">
		<FormErrorBanner message={error} />
		<ToastBanner message={info} />
	</div>
	{#if nextPath}
		<input type="hidden" name="next" value={nextPath} />
	{/if}
{/snippet}

<div class="auth-container auth-container-wide">
	<div id="auth-panel">
		{#if isSignup}
			<vigil.AuthShell>
				<vigil.AuthBrandColumn>
					<AuthBrandPanel />
				</vigil.AuthBrandColumn>
				<vigil.AuthFormColumn>
					<div class="flex items-center justify-end">
						<a
							href="/login"
							class="text-subhead text-muted-foreground hover:text-foreground"
							aria-label="Close sign up">✕</a
						>
					</div>
					<AuthMobileBrand />
					<header class="auth-modern-header space-y-4 text-center lg:text-left">
						<div>
							<h1 class="auth-modern-title">{t('Create your account')}</h1>
						</div>
					</header>
					<div class="glass-card auth-form-card" class:auth-form-card--error={formError}>
						<form
							method="POST"
							action="/signup"
							class="space-y-4"
							oninput={() => (formError = false)}
							use:enhance={submit}
							{@attach staggerOnMount(':scope > div, :scope > button', 50)}
						>
							{@render errors()}
							<Field
								name="username"
								label={t('Username')}
								placeholder="johndoe"
								autocomplete="username"
								required
								wrapperClass="space-y-2"
							/>
							<Field
								name="email"
								label={t('Email Address')}
								type="email"
								placeholder="john@example.com"
								autocomplete="email"
								required
								wrapperClass="space-y-2"
							/>
							<!-- Kept as its own block rather than PasswordField: the strength
							     meter reads this input's value. -->
							<div class="space-y-2">
								<div class="relative">
									<Field
										id="password"
										name="password"
										label={t('Password')}
										type={passwordVisible ? 'text' : 'password'}
										placeholder="••••••••"
										autocomplete="new-password"
										required
										class="pr-12"
										bind:value={password}
									/>
									<PasswordToggle bind:visible={passwordVisible} />
								</div>
								<div class="flex gap-1 pt-1">
									{#each [1, 2, 3, 4] as i (i)}
										<div
											class="h-1 flex-1 rounded-full bg-black/10 transition-all dark:bg-white/10 {score() >=
											i
												? 'spring-pop bg-[var(--color-tint)]'
												: ''}"
											style={score() >= i ? 'animation-delay: ' + i * 50 + 'ms' : ''}
										></div>
									{/each}
								</div>
								<p class="text-xs text-muted-foreground">
									{t(
										'At least 8 characters, with a capital letter, a small letter, a number and a symbol.'
									)}
								</p>
							</div>
							<PasswordField
								label={t('Confirm Password')}
								name="confirmPassword"
								placeholder="••••••••"
								autocomplete="new-password"
								required
							/>
							<Field
								name="dateOfBirth"
								label={t('Date of Birth')}
								type="date"
								autocomplete="bday"
								required
								wrapperClass="space-y-2"
							/>
							<SubmitButton fullWidth>{t('Create account')}</SubmitButton>
							<SocialAuthSection intentLabel="sign up" onerror={showError} />
						</form>
					</div>
					<p class="text-center text-subhead text-muted-foreground lg:text-left">
						{t('Already have an account?')}
						<a href={switchHref('/login')} class="link-tint ml-1 font-semibold"
							>{t('Log in instead')}</a
						>
					</p>
					<ThemeToggleCompact />
				</vigil.AuthFormColumn>
			</vigil.AuthShell>
		{:else}
			<vigil.AuthShell>
				<vigil.AuthBrandColumn>
					<AuthBrandPanel />
				</vigil.AuthBrandColumn>
				<vigil.AuthFormColumn>
					<AuthMobileBrand />
					<header class="auth-modern-header space-y-4 text-center lg:text-left">
						<div class="pt-2">
							<h1 class="auth-modern-title">{t('Welcome back')}</h1>
						</div>
					</header>
					<div class="glass-card auth-form-card" class:auth-form-card--error={formError}>
						<form
							method="POST"
							action="/login"
							class="space-y-5"
							oninput={() => (formError = false)}
							use:enhance={submit}
							{@attach staggerOnMount(':scope > div, :scope > button', 50)}
						>
							{@render errors()}
							<!-- autocomplete="username" pairs with "current-password": the
							     combination password managers look for. -->
							<Field
								name="email"
								label={t('Email Address')}
								type="email"
								placeholder="name@domain.com"
								autocomplete="username"
								required
								wrapperClass="space-y-2"
							/>
							<PasswordField
								label={t('Password')}
								name="password"
								placeholder="••••••••"
								autocomplete="current-password"
								required
							/>
							<div class="flex justify-end">
								<a href="/forgot-password" class="link-tint text-footnote font-semibold"
									>{t('Forgot Password?')}</a
								>
							</div>
							<SubmitButton fullWidth>{t('Sign in')}</SubmitButton>
							<SocialAuthSection intentLabel="sign in" onerror={showError} />
						</form>
					</div>
					<p class="text-center text-subhead text-muted-foreground lg:text-left">
						{t("Don't have an account?")}
						<a href={switchHref('/signup')} class="link-tint ml-1 font-semibold"
							>{t('Create one')}</a
						>
					</p>
					<ThemeToggleCompact />
				</vigil.AuthFormColumn>
			</vigil.AuthShell>
		{/if}
	</div>
	{#if showMfa}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			in:scale={{ duration: 200, start: 0.95 }}
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			onclick={(e) => {
				if (e.target === e.currentTarget) showMfa = false;
			}}
		>
			<div
				id="mfa-modal-content"
				class="vigil-modal-panel w-full max-w-md rounded-xl bg-[var(--color-card-bg)] p-6 shadow-2xl"
			>
				<MfaModal bind:mfa onclose={() => (showMfa = false)} />
			</div>
		</div>
	{/if}
</div>
