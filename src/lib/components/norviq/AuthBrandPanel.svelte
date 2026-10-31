<script lang="ts">
	// components.AuthBrandPanel
	import BrandLogo from './BrandLogo.svelte';
</script>

<aside class="auth-brand-panel" aria-hidden="true">
	<BrandLogo variant="full-large" />
	<!-- The tagline is live text under the lockup, never baked into the artwork. -->
	<p class="auth-brand-tagline">Discipline creates freedom.</p>
	<!-- vig-thinking-280 is 222×280 and renders at 1x here; the 445 px source covers 2x. -->
	<img
		class="auth-brand-portrait"
		src="/static/brand/precision/vig-thinking-280.webp"
		srcset="/static/brand/precision/vig-thinking-280.webp 1x, /static/brand/precision/vig-thinking.webp 2x"
		width="222"
		height="280"
		alt=""
		loading="lazy"
		decoding="async"
	/>
</aside>
