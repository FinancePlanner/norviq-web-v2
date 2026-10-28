<script lang="ts">
	// brand.templ NorviqIcon / NorviqLogo / NorviqFullLogo / NorviqFullLogoLarge /
	// NorviqLogoLarge, with the templ's lazy-loading <img> pair. (The shell uses
	// #lib/components/brand/NorviqLogo.svelte, which is the same artwork.)
	//   variant "icon"       = NorviqIcon / NorviqLogo
	//   variant "full"       = NorviqFullLogo
	//   variant "full-large" = NorviqFullLogoLarge / NorviqLogoLarge
	let { variant = 'icon' }: { variant?: 'icon' | 'full' | 'full-large' } = $props();

	const art = $derived(
		variant === 'icon'
			? { light: '/static/icons/icon-light.webp', dark: '/static/icons/icon-dark.webp', w: '512', h: '512' }
			: { light: '/static/images/logo-light.webp', dark: '/static/images/logo-dark.webp', w: '576', h: '192' }
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
