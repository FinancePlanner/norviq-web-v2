<script lang="ts">
	// components.VigFull(class) — the full-body character (onboarding only).
	let { class: className = '' }: { class?: string } = $props();
</script>

<img
	src="/static/brand/vig/vig-full-512.webp"
	alt=""
	width="231"
	height="512"
	class={'vig-full ' + className}
	aria-hidden="true"
/>
