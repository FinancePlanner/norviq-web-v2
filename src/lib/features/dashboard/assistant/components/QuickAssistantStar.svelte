<script lang="ts">
	// Vig's face inside a four-point star, with Q's small sparkles beside it. The
	// star stays light in dark mode, because Vig is navy and would disappear.
	const STAR = 'M32 0Q41.6 22.4 64 32Q41.6 41.6 32 64Q22.4 41.6 0 32Q22.4 22.4 32 0Z';
</script>

<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
	<defs>
		<clipPath id="quick-q-star-clip"><path d={STAR} /></clipPath>
	</defs>
	<path d={STAR} fill="#fcfaf2" />
	<image
		href="/static/brand/vig/vig-icon-128.webp"
		x="2"
		y="7"
		width="60"
		height="60"
		clip-path="url(#quick-q-star-clip)"
	/>
	<path d={STAR} fill="none" stroke="var(--color-tint)" stroke-width="1.5" />
	<path
		d="M8 1.5Q9.3 6.7 14.5 8Q9.3 9.3 8 14.5Q6.7 9.3 1.5 8Q6.7 6.7 8 1.5Z"
		fill="var(--color-tint)"
	/>
	<path
		d="M18-2Q18.8 1.2 22 2Q18.8 2.8 18 6Q17.2 2.8 14 2Q17.2 1.2 18-2Z"
		fill="var(--color-tint)"
	/>
</svg>

<style>
	svg {
		display: block;
		overflow: visible;
		filter: drop-shadow(0 3px 6px rgb(0 0 0 / 0.25));
	}
</style>
