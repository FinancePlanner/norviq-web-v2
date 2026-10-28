<script lang="ts">
	// components.MCPStateBadge(state) { children } — outline templUI badge with
	// the .mcp-state is-live / is-ready / is-off modifier.
	import type { Snippet } from 'svelte';
	import { mcpStateClass } from './mcp-status.js';
	import Badge from './tui/Badge.svelte';

	let { state, children }: { state: string; children?: Snippet } = $props();
</script>

<Badge variant="outline" class={'mcp-state ' + mcpStateClass(state)}>{@render children?.()}</Badge>
