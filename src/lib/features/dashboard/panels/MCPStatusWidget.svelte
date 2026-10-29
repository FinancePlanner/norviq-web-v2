<script lang="ts">
	// dashboard.MCPStatusShell / MCPStatusWidget. `vm` undefined = shell.
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import MCPStateBadge from '#lib/components/norviq/MCPStateBadge.svelte';
	import type { MCPAgentRow, MCPStatusVM } from './types.js';

	let { vm }: { vm?: MCPStatusVM } = $props();

	function agentState(agent: MCPAgentRow): string {
		if (agent.isLive) return 'live';
		if (agent.status === 'Never') return 'off';
		return 'ready';
	}

	function summary(v: MCPStatusVM): string {
		const parts: string[] = [];
		if (v.liveCount > 0) parts.push(`${v.liveCount} live`);
		else if (v.tokenCount > 0) parts.push(`${v.tokenCount} token(s)`);
		if (v.lastActivity) parts.push('last activity ' + v.lastActivity);
		return parts.join(' · ');
	}
</script>

{#snippet badgeText(state: string)}
	<MCPStateBadge {state}>{state === 'live' ? 'Live' : state === 'ready' ? 'Ready' : 'Off'}</MCPStateBadge>
{/snippet}
{#snippet readyBadge()}{@render badgeText('ready')}{/snippet}
{#snippet manageLink()}<a href="/settings/api-access">Manage</a>{/snippet}
{#snippet openAPILink()}<a href="/settings/api-access">Open API access</a>{/snippet}
{#snippet plansLink()}<a href="/settings/subscription">See plans</a>{/snippet}
{#snippet mintLink()}<a href="/settings/api-access">Mint first token</a>{/snippet}
{#snippet manageTokensLink()}<a href="/settings/api-access">Manage tokens</a>{/snippet}

{#if !vm}
	<div id="mcp-status-panel">
		<section class="glass-card dash-panel mcp-status-panel" aria-busy="true" aria-labelledby="mcp-status-title">
			<vigil.PanelHeader id="mcp-status-title" title="MCP status" trailing={manageLink} />
			<vigil.InsetList class="mcp-status-list">
				<vigil.ListRow title="Connecting" trailing={readyBadge} />
			</vigil.InsetList>
		</section>
	</div>
{:else}
	<section class="glass-card dash-panel mcp-status-panel" id="mcp-status-panel" aria-labelledby="mcp-status-title">
		{#if vm.loadError}
			<vigil.PanelHeader id="mcp-status-title" title="MCP status" trailing={openAPILink} />
			<p class="text-subhead text-muted-foreground">Could not load connection state.</p>
		{:else if vm.needsPro}
			<vigil.PanelHeader id="mcp-status-title" title="MCP status" trailing={plansLink} />
			<p class="text-subhead text-muted-foreground">Pro unlocks personal access tokens for Claude, Cursor, and Hermes.</p>
		{:else if vm.empty}
			<vigil.PanelHeader id="mcp-status-title" title="MCP status" trailing={mintLink} />
			<vigil.InsetList class="mcp-status-list">
				<vigil.ListRow title="No tokens yet" subtitle="Mint one to connect Claude, Cursor or Hermes." trailing={readyBadge} />
			</vigil.InsetList>
		{:else}
			<vigil.PanelHeader id="mcp-status-title" title="MCP status" desc={summary(vm)} trailing={manageTokensLink} />
			<vigil.InsetList class="mcp-status-list">
				{#each vm.scopes as scope (scope.label)}
					{#snippet scopeBadge()}{@render badgeText(scope.state)}{/snippet}
					<vigil.ListRow title={scope.label} trailing={scopeBadge} />
				{/each}
			</vigil.InsetList>
			{#if vm.agents.length > 0}
				<p class="mt-4 mb-1 text-footnote font-semibold text-muted-foreground">Connected tokens</p>
				<vigil.InsetList class="mcp-agent-list">
					{#each vm.agents.slice(0, 4) as agent, i (i)}
						{#snippet agentBadge()}<MCPStateBadge state={agentState(agent)}>{agent.status}</MCPStateBadge>{/snippet}
						<vigil.ListRow title={agent.name} trailing={agentBadge} />
					{/each}
				</vigil.InsetList>
			{/if}
		{/if}
	</section>
{/if}
