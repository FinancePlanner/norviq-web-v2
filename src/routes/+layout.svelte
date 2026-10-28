<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { Toaster } from 'svelte-sonner';
	import { browser } from '$app/env';
	import { onMount } from 'svelte';
	import { initTheme } from '#lib/theme.svelte.js';
	import type { LayoutProps } from './$types';
	import './layout.css';

	let { children }: LayoutProps = $props();

	// theme.js: keep "system" appearance following OS changes on every page.
	onMount(() => initTheme());

	const queryClient = new QueryClient({
		defaultOptions: { queries: { enabled: browser, staleTime: 30_000, refetchOnWindowFocus: false } }
	});
</script>

<QueryClientProvider client={queryClient}>
	{@render children()}
	<Toaster richColors position="top-center" />
</QueryClientProvider>
