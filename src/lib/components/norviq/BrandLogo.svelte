<script lang="ts">
	// brand.templ NorviqIcon / NorviqLogo / NorviqFullLogo / NorviqFullLogoLarge /
	// NorviqLogoLarge, with the templ's lazy-loading <img> pair. (The shell uses
	// #lib/components/brand/NorviqLogo.svelte, which is the same artwork.)
	//   variant "icon"       = NorviqIcon / NorviqLogo
	//   variant "full"       = NorviqFullLogo
	//   variant "full-large" = NorviqFullLogoLarge / NorviqLogoLarge
	// Precision artwork (docs/precision-identity.md): raster crops of the approved
	// composite, so never render taller than half the source (183 CSS px) — the
	// largest wrapper below is h-20 (80 px), well inside that.
	let { variant = 'icon' }: { variant?: 'icon' | 'full' | 'full-large' } = $props();

	const art = $derived(
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
		src={art.light}
		alt="Norviq"
		width={art.w}
		height={art.h}
		class="block h-full w-auto max-w-full object-contain dark:hidden"
		loading="lazy"
		decoding="async"
	/>
	<img
		src={art.dark}
		alt=""
		width={art.w}
		height={art.h}
		class="hidden h-full w-auto max-w-full object-contain dark:block"
		aria-hidden="true"
		loading="lazy"
		decoding="async"
	/>
</div>
