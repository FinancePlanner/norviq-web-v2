<script lang="ts">
	// components.ThemeToggle — System / Light / Dark radiogroup (Alpine themePicker).
	import { onMount } from 'svelte';
	import { applyTheme, initTheme, theme, type ThemeMode } from '#lib/theme.svelte.js';
	import NativeButton from './NativeButton.svelte';

	onMount(() => {
		initTheme();
	});

	const modes: { mode: ThemeMode; label: string }[] = [
		{ mode: 'system', label: 'System' },
		{ mode: 'light', label: 'Light' },
		{ mode: 'dark', label: 'Dark' }
	];
</script>

<div class="theme-toggle" role="radiogroup" aria-label="Appearance">
	{#each modes as m (m.mode)}
		<NativeButton
			class={['theme-toggle-btn', theme.mode === m.mode && 'theme-toggle-btn-active']}
			role="radio"
			aria-checked={theme.mode === m.mode}
			onclick={() => applyTheme(m.mode)}
		>
			{m.label}
		</NativeButton>
	{/each}
</div>
