<script lang="ts">
	// settings.ConnectVerify: the "Verify connection" step. Go re-fetched the
	// fragment with hx-trigger="load delay:3s" while waiting; here a query polls
	// the same URL (now JSON) every 3s until the state is terminal.
	import { createQuery } from '@tanstack/svelte-query';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import { untrack } from 'svelte';
	import { Button } from '#lib/components/norviq/index.js';
	import type { VerifyStateVM } from './connect.js';

	let { vm }: { vm: VerifyStateVM } = $props();

	const initial = untrack(() => vm);

	const query = createQuery(() => ({
		queryKey: ['settings-api-access-verify', initial.tokenID, initial.pollURL],
		queryFn: async (): Promise<VerifyStateVM> => {
			const res = await fetch(initial.pollURL, { headers: { accept: 'application/json' } });
			if (!res.ok) throw new Error(`verify poll ${res.status}`);
			return (await res.json()) as VerifyStateVM;
		},
		initialData: initial,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		retry: false,
		refetchInterval: (q) => (q.state.data?.keepPolling ? 3000 : false)
	}));

	const state = $derived(query.data ?? initial);
</script>

<div class="mcp-connect-verify mcp-connect-verify-{state.state}" role="status" aria-live="polite">
	{#if state.state === 'connected'}
		<span class="mcp-connect-verify-icon" aria-hidden="true">
			<CircleCheck class="h-4 w-4" data-lucide="icon" />
		</span>
		<div class="mcp-connect-verify-copy">
			<strong>Connected</strong>
			<small>First tool call received · {state.lastUsed}</small>
		</div>
	{:else if state.state === 'timeout'}
		<span class="mcp-connect-verify-icon" aria-hidden="true">
			<CircleAlert class="h-4 w-4" data-lucide="icon" />
		</span>
		<div class="mcp-connect-verify-copy">
			<strong>No connection yet</strong>
			<small>Paste the snippet into your agent, then check again.</small>
		</div>
		<Button
			class="btn-secondary mcp-connect-verify-retry w-auto px-4"
			type="button"
			variant="secondary"
			onclick={() => query.refetch()}
		>
			Check again
		</Button>
	{:else}
		<span class="mcp-connect-verify-icon mcp-connect-verify-spinner" aria-hidden="true"></span>
		<div class="mcp-connect-verify-copy">
			<strong>Waiting for your agent</strong>
			<small>Paste the snippet above — this flips green on the first tool call.</small>
		</div>
	{/if}
</div>
