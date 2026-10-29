<script lang="ts">
	// templates.AuthLayout body: mesh background, the auth shell and the MFA
	// modal root. Title and meta tags are set by each page (<svelte:head>).
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<div class="mesh-bg fixed inset-0 -z-10" aria-hidden="true"></div>
<div id="main-content" class="auth-shell command-grid">
	{@render children?.()}
</div>
<div id="mfa-modal-root"></div>
