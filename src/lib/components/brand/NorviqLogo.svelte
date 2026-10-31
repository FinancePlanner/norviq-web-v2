<script lang="ts">
	// NorviqLogo/NorviqIcon from brand.templ: light and dark artwork, swapped by
	// the .dark class on <html>.
	// Precision artwork (docs/precision-identity.md): raster crops of the approved
	// composite, so never render taller than half the source (183 CSS px) — the
	// largest wrapper below is h-20 (80 px), well inside that.
	let { variant = 'icon' }: { variant?: 'icon' | 'full' | 'full-large' } = $props();
	const src = $derived(
		variant === 'icon'
			? {
					light: '/static/brand/precision/logo-symbol-light.webp',
					dark: '/static/brand/precision/logo-symbol-dark.webp',
					w: '313',
					h: '367'
				}
			: {
					light: '/static/brand/precision/logo-lockup-horizontal-light.webp',
					dark: '/static/brand/precision/logo-lockup-horizontal-dark.webp',
					w: '805',
					h: '367'
				}
	);
	const wrap = $derived(
		variant === 'icon'
			? 'norviq-logo mx-auto flex h-20 w-20 items-center justify-center'
			: variant === 'full'
				? 'norviq-full-logo mx-auto flex h-14 items-center justify-center'
				: 'norviq-full-logo mx-auto flex h-20 items-center justify-center'
	);
</script>

<div class={wrap}>
	<img
		src={src.light}
		alt="Norviq"
		width={src.w}
		height={src.h}
		class="block h-full w-auto max-w-full object-contain dark:hidden"
		decoding="async"
	/>
	<img
		src={src.dark}
		alt=""
		width={src.w}
		height={src.h}
		class="hidden h-full w-auto max-w-full object-contain dark:block"
		aria-hidden="true"
		decoding="async"
	/>
</div>
