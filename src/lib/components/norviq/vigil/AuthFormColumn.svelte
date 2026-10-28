<script lang="ts">
	// vigil.AuthFormColumn
	import type { Snippet } from 'svelte';

	let { children }: { children?: Snippet } = $props();
</script>

<div class="auth-form-column space-y-8">
	{@render children?.()}
</div>
