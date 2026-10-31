<script lang="ts">
	// assistant.Page: conversation rail, workspace (or the empty state) and the
	// tools rail. Clicking a conversation swaps the workspace in place, without
	// a navigation, like Go's hx-get into #assistant-workspace. Like Go, the
	// rail's .active marker stays where the page load put it.
	import { onDestroy } from 'svelte';
	import AIConsentCard from '#lib/components/norviq/AIConsentCard.svelte';
	import ConnectAgentPill from '#lib/components/norviq/ConnectAgentPill.svelte';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import VigIcon from '#lib/components/norviq/VigIcon.svelte';
	import { MuseChat } from '../muse.svelte.js';
	import type { AIConsentRefusal, ConversationViewModel, PageViewModel } from '../types.js';
	import MuseHeader from './MuseHeader.svelte';
	import Tip from './Tip.svelte';
	import Workspace from './Workspace.svelte';

	let { vm }: { vm: PageViewModel } = $props();

	const muse = new MuseChat();
	onDestroy(() => muse.destroy());

	/** What #assistant-workspace currently holds. */
	type Slot =
		| { kind: 'conversation'; vm: ConversationViewModel }
		| { kind: 'consent'; next: string }
		| { kind: 'empty' };
	let slot = $derived<Slot>(
		vm.active ? { kind: 'conversation', vm: vm.active } : { kind: 'empty' }
	);

	const suggestions = [
		'Summarize my expenses this month',
		'How is my portfolio doing?',
		'Where am I over budget?',
		'How is US inflation affecting me?'
	];

	/** hx-get /assistant/conversations/{id} → #assistant-workspace (outerHTML). */
	async function loadWorkspace(id: string) {
		try {
			const res = await fetch(`/assistant/conversations/${id}`, {
				headers: { Accept: 'application/json' }
			});
			if (res.status === 403) {
				// RenderAIConsentRequired gave an htmx swap the inline card.
				const refusal = (await res.json().catch(() => null)) as AIConsentRefusal | null;
				if (refusal?.reason === 'AI_CONSENT_REQUIRED') {
					const next =
						new URL(refusal.consentUrl, window.location.href).searchParams.get('next') ??
						'/assistant';
					slot = { kind: 'consent', next };
					muse.rerender();
				}
				return;
			}
			if (!res.ok) return;
			slot = { kind: 'conversation', vm: (await res.json()) as ConversationViewModel };
			muse.rerender();
		} catch {
			/* htmx left the workspace alone on a failed request */
		}
	}
</script>

<div class="app-page-content vigil-canvas-page assistant-page assistant-modern-page">
	<div class="assistant-grid">
		<aside id="assistant-rail" class="assistant-rail assistant-signals-rail">
			<div class="assistant-identity">
				<VigIcon class="assistant-vig" />
				<h1 class="assistant-title">Q</h1>
			</div>
			<div class="mt-3 mb-4">
				<ConnectAgentPill />
			</div>
			<form method="post" action="/assistant/conversations">
				<NativeButton type="submit" class="assistant-new">New conversation</NativeButton>
			</form>
			<div class="assistant-conversations">
				{#each vm.conversations as conversation (conversation.id)}
					<NativeButton
						class={conversation.active ? 'assistant-conversation active' : 'assistant-conversation'}
						onclick={() => loadWorkspace(conversation.id)}
					>
						{conversation.title}
						<time>{conversation.updatedAt}</time>
					</NativeButton>
				{/each}
			</div>
		</aside>
		{#if slot.kind === 'conversation'}
			{#key slot.vm}
				<Workspace vm={slot.vm} {muse} reload={loadWorkspace} />
			{/key}
		{:else if slot.kind === 'consent'}
			<AIConsentCard next={slot.next} dismissible />
		{:else}
			<main id="assistant-workspace" class="assistant-main muse-main">
				<MuseHeader {muse} />
				<div class="muse-stage">
					<div class="muse-scrim" aria-hidden="true"></div>
					<div class="muse-transcript muse-empty">
						<h2 class="assistant-title">Ask Q. Answers come from your data.</h2>
						<p class="mt-3 text-sm text-muted-foreground">
							Create a conversation to review spending, budgets, holdings, or goals. Your data stays
							on your account.
						</p>
						<form method="post" action="/assistant/conversations" class="assistant-suggestions">
							{#each suggestions as message (message)}
								<NativeButton type="submit" class="assistant-suggestion" name="seed" value={message}
									>{message}</NativeButton
								>
							{/each}
						</form>
					</div>
				</div>
			</main>
		{/if}
		<aside class="assistant-context assistant-tools-rail">
			<div class="assistant-card">
				<h3>{vm.usage.label}</h3>
				<p class="mt-2 text-sm text-muted-foreground">{vm.usage.remaining}</p>
			</div>
			<div class="assistant-card">
				<h3>Proactive tips</h3>
				{#if vm.tips.length === 0}
					<p class="mt-2 text-sm text-muted-foreground">No material changes need your attention.</p>
				{/if}
				{#each vm.tips as tip (tip.id)}
					<Tip {tip} />
				{/each}
			</div>
			<div class="assistant-tool-tiles" aria-label="Available MCP tools">
				<div class="mcp-tool-tile"><span class="icon" aria-hidden="true">◈</span>Sentiment</div>
				<div class="mcp-tool-tile"><span class="icon" aria-hidden="true">◎</span>Portfolio</div>
				<div class="mcp-tool-tile"><span class="icon" aria-hidden="true">⇄</span>Expenses</div>
				<div class="mcp-tool-tile"><span class="icon" aria-hidden="true">⛨</span>Risk / tax</div>
			</div>
		</aside>
	</div>
	{#if vm.errorMessage !== ''}
		<p class="assistant-error">{vm.errorMessage}</p>
	{/if}
</div>
