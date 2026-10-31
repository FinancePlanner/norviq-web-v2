<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { Toaster } from 'svelte-sonner';
	import { browser } from '$app/env';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';
	import { initTheme } from '#lib/theme.svelte.js';
	import { rememberTimezone } from '#lib/timezone.js';
	import { captureOnce, initAnalytics, trackPageview } from '#lib/analytics/index.js';
	import type { LayoutProps } from './$types';
	import './layout.css';

	let { children, data }: LayoutProps = $props();

	// theme.js: keep "system" appearance following OS changes on every page.
	onMount(() => initTheme());
	onMount(rememberTimezone);

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { enabled: browser, staleTime: 30_000, refetchOnWindowFocus: false }
		}
	});

	// Analytics (Go: posthog.js / sentry.js + /runtime-config.js). The first
	// capture-once event is fired by initAnalytics; later ones arrive when a
	// navigation reruns this layout's load (e.g. after a login action).
	let handledCapture = untrack(() => data.runtime?.posthog?.captureOnce);
	onMount(() => {
		initAnalytics(data.runtime);
		// Go's PwaServiceWorker: registered on load, by every layout except the public one.
		if ('serviceWorker' in navigator && !page.route.id?.startsWith('/(public)')) {
			const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
			if (document.readyState === 'complete') register();
			else window.addEventListener('load', register, { once: true });
		}
	});
	afterNavigate(({ type }) => {
		if (type !== 'enter') trackPageview();
	});
	$effect(() => {
		const next = data.runtime?.posthog?.captureOnce;
		if (next && next !== handledCapture) {
			handledCapture = next;
			captureOnce(next);
		}
	});
</script>

<QueryClientProvider client={queryClient}>
	{@render children()}
	<Toaster richColors position="top-center" />
</QueryClientProvider>
