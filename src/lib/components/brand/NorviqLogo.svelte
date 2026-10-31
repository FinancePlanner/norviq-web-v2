<script lang="ts">
	// NorviqLogo/NorviqIcon from brand.templ: light and dark artwork, swapped by
	// the .dark class on <html>.
	let { variant = 'icon' }: { variant?: 'icon' | 'full' | 'full-large' } = $props();
	const src = $derived(
		variant === 'icon'
			? {
					light: '/static/icons/icon-light.webp',
					dark: '/static/icons/icon-dark.webp',
					w: '512',
					h: '512'
				}
			: {
					light: '/static/images/logo-light.webp',
					dark: '/static/images/logo-dark.webp',
					w: '576',
					h: '192'
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
