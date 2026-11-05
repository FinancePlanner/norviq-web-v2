<script lang="ts">
	// Quick Q: a star button on every signed-in page opens a card over the page,
	// for one question and one answer. It has its own conversation, which also
	// appears in full Q's history. Mounted once, in the (app) layout, so a turn
	// survives closing the card and its answer waits for the next opening.
	import { onDestroy } from 'svelte';
	import { page } from '$app/state';
	import X from '@lucide/svelte/icons/x';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import TextareaField from '#lib/components/norviq/TextareaField.svelte';
	import VigIcon from '#lib/components/norviq/VigIcon.svelte';
	import { t } from '#lib/i18n/context.svelte.js';
	import { MuseChat } from '../muse.svelte.js';
	import {
		createQuickConversation,
		forgetConversation,
		latestExchange,
		quickQAllowedOn,
		storeConversation,
		storedConversation
	} from '../quick.js';
	import { streamAssistantTurn } from '../stream.js';
	import type { ConversationViewModel, MessageRow } from '../types.js';
	import Message from './Message.svelte';
	import QuickAssistantStar from './QuickAssistantStar.svelte';

	const muse = new MuseChat();
	onDestroy(() => muse.destroy());

	let dialog = $state<HTMLDialogElement | null>(null);
	let draft = $state('');
	let question = $state('');
	let exchange = $state<MessageRow[]>([]);
	let conversationId = $state('');
	let sending = $state(false);
	let errorText = $state('');
	/** Q answered and stored the reply, but reading it back failed. */
	let replyMissing = $state(false);

	const showsButton = $derived(quickQAllowedOn(page.url.pathname));
	const canOpenInQ = $derived(conversationId !== '' && (exchange.length > 0 || replyMissing));

	// A link inside an answer, or "Open in Q", leaves this page: the card goes too.
	$effect(() => {
		void page.url.pathname;
		dialog?.close();
	});

	function resetCard() {
		draft = '';
		question = '';
		exchange = [];
		errorText = '';
		replyMissing = false;
	}

	function onClosed() {
		if (!sending) resetCard();
	}

	function closeOnBackdrop(event: MouseEvent) {
		if (event.target === dialog) dialog?.close();
	}

	function leaveForConsent() {
		const next = page.url.pathname + page.url.search;
		window.location.assign('/ai-consent?next=' + encodeURIComponent(next));
	}

	async function loadReply(id: string) {
		try {
			const res = await fetch(`/assistant/conversations/${id}`, {
				headers: { Accept: 'application/json' }
			});
			if (!res.ok) throw new Error(String(res.status));
			exchange = latestExchange(((await res.json()) as ConversationViewModel).messages);
			if (exchange.length === 0) replyMissing = true;
		} catch {
			replyMissing = true;
		}
		conversationId = id;
	}

	async function runTurn(content: string, mayRecreate: boolean): Promise<string> {
		let id = storedConversation(localStorage);
		if (!id) {
			id = await createQuickConversation(fetch, (url) => window.location.assign(url));
			if (!id) return '';
			storeConversation(localStorage, id);
		}
		const body = new FormData();
		body.set('content', content);
		const conversation = id;
		let gone = false;
		const failure = await streamAssistantTurn({
			conversationId: conversation,
			body,
			muse,
			onAccepted: () => {},
			onConsentRequired: leaveForConsent,
			onConversationGone: () => (gone = true),
			onTurn: () => loadReply(conversation)
		});
		if (gone) {
			// Conversations expire after 30 days without a message.
			forgetConversation(localStorage);
			if (mayRecreate) return runTurn(content, false);
		}
		return failure;
	}

	async function send(event: SubmitEvent) {
		event.preventDefault();
		const content = draft.trim();
		if (content === '' || sending) return;
		sending = true;
		errorText = '';
		replyMissing = false;
		exchange = [];
		question = content;
		draft = '';
		try {
			errorText = await runTurn(content, true);
		} catch (error) {
			muse.fail();
			errorText = error instanceof Error ? error.message : 'Assistant unavailable';
		} finally {
			sending = false;
		}
		// A failed question comes back to the box, unless a new one was typed meanwhile.
		if (errorText !== '' && draft === '') draft = content;
	}

	function sendOnEnter(event: KeyboardEvent) {
		if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
		if (!(event.target instanceof HTMLTextAreaElement)) return;
		event.preventDefault();
		event.target.form?.requestSubmit();
	}
</script>

{#if showsButton}
	<button
		type="button"
		class="quick-q-button"
		aria-label={t('Ask Q')}
		onclick={() => dialog?.showModal()}
	>
		<QuickAssistantStar />
	</button>
{/if}

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -- a click on the backdrop; Escape closes the dialog natively -->
<dialog
	bind:this={dialog}
	class="quick-q-card glass-card"
	aria-labelledby="quick-q-title"
	onclose={onClosed}
	onclick={closeOnBackdrop}
>
	<div class="quick-q-layout">
		<header class="quick-q-header">
			<VigIcon class="size-7 shrink-0" />
			<h2 id="quick-q-title" class="text-base font-semibold">{t('Ask Q')}</h2>
			{#if canOpenInQ}
				<a class="quick-q-open" href={'/assistant?conversation=' + conversationId}
					>{t('Open in Q')}</a
				>
			{/if}
			<NativeButton class="quick-q-close" aria-label={t('Close')} onclick={() => dialog?.close()}>
				<X class="size-5" />
			</NativeButton>
		</header>

		{#if question !== '' || exchange.length > 0 || errorText !== ''}
			<div class="quick-q-exchange" aria-live="polite">
				{#if exchange.length > 0}
					{#each exchange as message (message.id)}
						<Message {message} onreply={(reply) => exchange.push(reply)} />
					{/each}
				{:else if question !== ''}
					<div class="muse-message user">
						<div class="muse-bubble"><div class="muse-text">{question}</div></div>
					</div>
				{/if}
				{#if sending}
					<p class="quick-q-status" role="status">
						{muse.status === 'is thinking' ? t('Thinking…') : 'Q ' + muse.status}
					</p>
				{/if}
				{#if replyMissing}
					<p class="quick-q-status">{t('Q answered, but the reply did not load. Open it in Q.')}</p>
				{/if}
			</div>
		{/if}

		<p class="muse-composer-error" role="alert" hidden={errorText === ''}>{errorText}</p>

		<form class="quick-q-form" onsubmit={send} onkeydown={sendOnEnter}>
			<TextareaField
				name="content"
				bind:value={draft}
				rows={2}
				placeholder={t('Ask about your finances')}
				required
				maxlength={12000}
				autofocus
				aria-label={t('Ask Q')}
				wrapperClass="min-w-0 flex-1"
			/>
			<NativeButton type="submit" class="btn-primary px-4" disabled={sending}
				>{t('Send')}</NativeButton
			>
		</form>
		<p class="muse-privacy">
			{t('AI-generated · not verified financial data · Encrypted · retained 30 days')}
		</p>
	</div>
</dialog>

<style>
	.quick-q-button {
		position: fixed;
		z-index: 45;
		right: calc(0.75rem + env(safe-area-inset-right, 0px));
		bottom: calc(var(--app-tabbar-height) + env(safe-area-inset-bottom, 0px) + 0.5rem);
		width: 64px;
		height: 64px;
		padding: 0;
		background: none;
		border: 0;
		cursor: pointer;
	}
	/* The card takes over: a star tip must not poke out beside it. */
	.quick-q-button:has(+ :global(dialog[open])) {
		visibility: hidden;
	}
	.quick-q-button:focus-visible {
		outline: 2px solid var(--color-tint);
		outline-offset: 2px;
		border-radius: 50%;
	}
	.quick-q-card {
		width: min(28rem, calc(100vw - 1.5rem));
		max-height: min(75dvh, 40rem);
		margin: auto auto 0.75rem;
		padding: 0;
		overflow: hidden;
		color: var(--foreground);
		background: var(--color-card-bg);
	}
	.quick-q-card:not([open]) {
		display: none;
	}
	.quick-q-card::backdrop {
		background: rgb(0 0 0 / 0.35);
	}
	.quick-q-layout {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-height: inherit;
		padding: 1rem;
	}
	.quick-q-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.quick-q-open {
		margin-left: auto;
		font-size: 0.875rem;
		color: var(--color-tint);
	}
	.quick-q-header :global(.quick-q-close) {
		display: inline-flex;
		padding: 0.25rem;
	}
	.quick-q-header h2 + :global(.quick-q-close) {
		margin-left: auto;
	}
	.quick-q-exchange {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-height: 0;
		overflow-y: auto;
	}
	.quick-q-status {
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}
	.quick-q-form {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
	}
	.quick-q-form :global(.btn-primary) {
		flex: none;
		width: auto;
	}
	.quick-q-form :global(textarea) {
		width: 100%;
	}
	@media (min-width: 1024px) {
		.quick-q-button {
			right: 1.5rem;
			bottom: 1.5rem;
		}
		.quick-q-card {
			margin: auto 1.5rem 1.5rem auto;
		}
	}
</style>
