<script lang="ts">
	// auth.SocialAuthSection(intentLabel): Apple / Google / X links to
	// /auth/oauth/{provider}/start and the passkey button (auth.js).
	import { t } from '#lib/i18n/context.svelte.js';
	import { staggerOnMount } from '#lib/motion.js';
	import GoogleLogoIcon from '#lib/components/norviq/GoogleLogoIcon.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import { passkeyButton } from './passkey.js';

	let { intentLabel, onerror }: { intentLabel: string; onerror: (message: string) => void } =
		$props();
</script>

<div class="space-y-4">
	<div class="social-divider">or</div>
	<div class="space-y-3" {@attach staggerOnMount(':scope > a, :scope > button', 50)}>
		<a href="/auth/oauth/apple/start" class="btn-social-apple" data-sveltekit-reload>
			<svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true" fill="currentColor">
				<path
					d="M16.365 1.43c0 1.14-.417 2.063-1.249 2.787-.896.787-1.966 1.173-3.116 1.01-.015-1.098.403-2.036 1.249-2.812.883-.812 1.978-1.224 3.116-1.985zm2.493 16.957c-.726 1.333-1.602 2.667-2.628 4.002-1.384 1.867-2.826 2.8-4.326 2.8-1.015 0-1.88-.298-2.595-.894-.715-.596-1.343-.894-1.884-.894-.58 0-1.23.298-1.95.894-.72.596-1.303.902-1.75.918-1.676.074-3.16-.88-4.452-2.862-1.36-2.09-2.04-4.625-2.04-7.605 0-2.275.493-4.145 1.479-5.61.947-1.4 2.18-2.101 3.699-2.101.865 0 1.588.223 2.17.67.582.447 1.074.67 1.476.67.372 0 .983-.252 1.833-.756.817-.447 1.508-.67 2.073-.67 1.52 0 2.752.67 3.699 2.01-.427.372-.826.787-1.198 1.244-.893 1.14-1.339 2.387-1.339 3.74 0 1.428.372 2.764 1.116 4.008z"
				></path>
			</svg>
			<span>{t('Continue with Apple')}</span>
		</a>
		<a href="/auth/oauth/google/start" class="btn-social-google" data-sveltekit-reload>
			<GoogleLogoIcon />
			<span>{t('Continue with Google')}</span>
		</a>
		<a href="/auth/oauth/x/start" class="btn-social-x" data-sveltekit-reload>
			<svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true" fill="currentColor">
				<path
					d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
				></path>
			</svg>
			<span>{t('Continue with X')}</span>
		</a>
		<NativeButton
			class="btn-social-passkey"
			id="passkey-sign-in"
			data-intent={intentLabel}
			{@attach passkeyButton(onerror)}
		>
			<svg
				viewBox="0 0 24 24"
				class="h-5 w-5"
				aria-hidden="true"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
			>
				<path d="M7 11V8a5 5 0 0 1 10 0v3"></path>
				<rect x="5" y="11" width="14" height="10" rx="2"></rect>
				<circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none"></circle>
			</svg>
			<span>{t('Sign in with Passkey')}</span>
		</NativeButton>
	</div>
</div>
