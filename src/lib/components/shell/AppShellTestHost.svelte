<script lang="ts">
	// Test host for AppShell.svelte.spec.ts: AppShell with the QueryClient the root
	// layout provides, which the ⌘K palette's symbol search needs.
	import type { ComponentProps } from 'svelte';
	import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
	import AppShell from './AppShell.svelte';

	let props: ComponentProps<typeof AppShell> = $props();
	setQueryClientContext(new QueryClient());
</script>

<AppShell {...props} />
