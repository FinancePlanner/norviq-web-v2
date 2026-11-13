<script lang="ts">
	// components.AuthBrandPanel
	import type { Snippet } from 'svelte';
	import BrandLogo from './BrandLogo.svelte';

	// `children` renders above the lockup: sign-in puts the beta-only 3D Vig there (BRD-001).
	let { children }: { children?: Snippet } = $props();
</script>

<aside class="auth-brand-panel" aria-hidden="true">
	{@render children?.()}
	<BrandLogo variant="full-large" />
	<!-- The tagline is live text under the lockup, never baked into the artwork. -->
	<p class="auth-brand-tagline">Discipline creates freedom.</p>
</aside>
