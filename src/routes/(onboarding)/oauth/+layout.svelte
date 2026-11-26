<script lang="ts">
	import AppShell from '#lib/components/shell/AppShell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<AppShell
	username={data.username}
	email={data.email}
	sidebar={data.sidebar}
	social={data.social}
	trialExpired={data.trialExpired}
>
	{@render children()}
</AppShell>
