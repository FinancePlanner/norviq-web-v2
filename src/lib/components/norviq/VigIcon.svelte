<script lang="ts">
	// components.VigIcon(class) — Vig's head (empty states, nav, avatars).
	let { class: className = '' }: { class?: string } = $props();
</script>

<img
	src="/static/brand/vig/vig-icon-192.webp"
	alt=""
	width="192"
	height="192"
	class={'vig-icon ' + className}
	aria-hidden="true"
/>
