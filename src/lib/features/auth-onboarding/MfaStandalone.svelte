<script lang="ts">
	// No-JS fallback for a POST to /mfa/verify or /mfa/resend: the modal on its
	// own, inside the auth container. With JS the login page handles the result.
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import MfaModal from './MfaModal.svelte';
	import AuthMeta from './AuthMeta.svelte';
	import { emptyMFAState, type MFAModalState } from './types.js';

	let { initial = null }: { initial?: MFAModalState | null } = $props();
	let mfa = $state<MFAModalState>(untrack(() => initial ?? emptyMFAState()));
</script>

<AuthMeta
	title="Sign in - Norviq"
	keywords="Norviq sign in"
	description="Securely access your Norviq account."
/>
<div class="auth-container auth-container-wide">
	<div class="flex items-center justify-center p-4">
		<div
			id="mfa-modal-content"
			class="vigil-modal-panel w-full max-w-md rounded-xl bg-[var(--color-card-bg)] p-6 shadow-2xl"
		>
			<MfaModal bind:mfa onclose={() => goto('/login')} />
		</div>
	</div>
</div>
