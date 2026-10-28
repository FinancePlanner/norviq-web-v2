<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { Toaster } from 'svelte-sonner';
	import { browser } from '$app/env';
	import type { LayoutProps } from './$types';
	import './layout.css';

	let { children }: LayoutProps = $props();

	const queryClient = new QueryClient({
		defaultOptions: { queries: { enabled: browser, staleTime: 30_000, refetchOnWindowFocus: false } }
	});
</script>

<QueryClientProvider client={queryClient}>
	{@render children()}
	<Toaster richColors position="top-center" />
</QueryClientProvider>
