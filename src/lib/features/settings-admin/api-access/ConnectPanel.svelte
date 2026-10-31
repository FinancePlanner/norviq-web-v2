<script lang="ts">
	// settings.ConnectPanel: client tabs, a mode toggle and the matching snippet.
	// Every client's snippets are rendered up front (as in Go) because the
	// plaintext token exists on this one render only.
	import { untrack } from 'svelte';
	import { BrandMark, CopyButton } from '#lib/components/norviq/index.js';
	import type { ConnectClientVM, VerifyStateVM } from './connect.js';
	import ConnectVerify from './ConnectVerify.svelte';

	let {
		activeClient,
		clients,
		mcpEndpoint,
		newToken,
		verifyTokenID,
		verify
	}: {
		activeClient: string;
		clients: ConnectClientVM[];
		mcpEndpoint: string;
		newToken: string;
		verifyTokenID: string;
		verify: VerifyStateVM | null;
	} = $props();

	let client = $state(untrack(() => activeClient));
	let mode = $state('prompt');

	const modes = [
		{ value: 'prompt', label: 'Prompt', key: 'prompt' },
		{ value: 'cli', label: 'CLI', key: 'cli' },
		{ value: 'config', label: 'Config file', key: 'config' },
		{ value: 'installer', label: 'Installer', key: 'installer' }
	] as const;
</script>

{#snippet snippetBlock(id: string, content: string)}
	<div class="mcp-snippet">
		<code
			{id}
			class="mcp-code-block mcp-snippet-code block rounded-xl p-3 font-mono text-xs break-all whitespace-pre-wrap"
			>{content}</code
		>
		<span class="mcp-snippet-copy">
			<CopyButton targetId={id} />
		</span>
	</div>
{/snippet}

<section class="glass-card mcp-connect-panel mt-6 p-6" aria-labelledby="mcp-connect-title">
	<div>
		<h2 id="mcp-connect-title" class="text-lg leading-none font-semibold tracking-tight">
			Connect your agent
		</h2>
		<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
			Pick your client, copy the snippet, paste it in. Scoped tools only — revoke any time.
		</p>
	</div>
	<div class="mcp-connect-tabs mt-4" role="tablist" aria-label="AI client">
		{#each clients as c (c.id)}
			<a
				href="#top"
				role="tab"
				class={['mcp-connect-tab', client === c.id && 'is-active']}
				aria-selected={client === c.id}
				onclick={(e) => {
					e.preventDefault();
					client = c.id;
				}}
			>
				<span class="mcp-connect-tab-icon" aria-hidden="true">
					<BrandMark name={c.brand} class="h-5 w-5" />
				</span>
				{c.label}
			</a>
		{/each}
	</div>
	{#each clients as c (c.id)}
		<div hidden={client !== c.id} role="tabpanel">
			{#if c.oauthOnly}
				<div class="mcp-connect-oauth mt-4">
					<p class="text-sm text-muted-foreground">{c.oauthHint}</p>
					<div class="mt-3 space-y-2">
						<span class="field-label">Server address</span>
						{@render snippetBlock('mcp-endpoint-' + c.id, mcpEndpoint)}
					</div>
				</div>
			{:else}
				<div class="mcp-connect-modes mt-4" role="tablist" aria-label="Setup method">
					{#each modes as m (m.value)}
						{#if c[m.key] !== ''}
							<a
								href="#top"
								role="tab"
								class={['mcp-connect-mode', mode === m.value && 'is-active']}
								aria-selected={mode === m.value}
								onclick={(e) => {
									e.preventDefault();
									mode = m.value;
								}}>{m.label}</a
							>
						{/if}
					{/each}
				</div>
				<div class="mcp-connect-body mt-4">
					<div class="mcp-connect-step">
						<span class="mcp-connect-step-num" aria-hidden="true">1</span>
						<div class="mcp-connect-step-copy">
							<strong>Copy and send this to your agent</strong>
							{#if c.prompt !== ''}
								<div hidden={mode !== 'prompt'}>
									{@render snippetBlock('mcp-prompt-' + c.id, c.prompt)}
								</div>
							{/if}
							{#if c.cli !== ''}
								<div hidden={mode !== 'cli'}>
									{@render snippetBlock('mcp-cli-' + c.id, c.cli)}
								</div>
							{/if}
							{#if c.config !== ''}
								<div hidden={mode !== 'config'}>
									{@render snippetBlock('mcp-config-' + c.id, c.config)}
								</div>
							{/if}
							{#if c.installer !== ''}
								<div hidden={mode !== 'installer'}>
									{@render snippetBlock('mcp-installer-' + c.id, c.installer)}
									<p class="mt-2 text-xs text-muted-foreground">
										<a href="/install.sh" class="underline" data-sveltekit-reload
											>Read the installer script</a
										>
										before piping it into your shell.
									</p>
								</div>
							{/if}
						</div>
					</div>
					<div class="mcp-connect-step">
						<span class="mcp-connect-step-num" aria-hidden="true">2</span>
						<div class="mcp-connect-step-copy">
							<strong>Connect and start working</strong>
							<small class="opacity-70">
								Then ask it something like “list my recent expenses” or “quote AAPL.”
							</small>
							{#if verifyTokenID !== '' && verify}
								<ConnectVerify vm={verify} />
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/each}
	{#if newToken === ''}
		<p class="mt-4 text-xs text-muted-foreground">
			Snippets show a placeholder because a token is only ever shown once. Create a token above to
			get one with your real key filled in.
		</p>
	{/if}
</section>
