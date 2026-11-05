<script lang="ts">
	// Quick Q: a star button on every signed-in page opens a card over the page,
	// for one question and one answer. It has its own conversation, which also
	// appears in full Q's history. Mounted once, in the (app) layout, so a turn
	// survives closing the card and its answer waits for the next opening.
	import { onDestroy } from 'svelte';
	import { page } from '$app/state';
	import Paperclip from '@lucide/svelte/icons/paperclip';
	import X from '@lucide/svelte/icons/x';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import TextareaField from '#lib/components/norviq/TextareaField.svelte';
	import VigIcon from '#lib/components/norviq/VigIcon.svelte';
	import { t } from '#lib/i18n/context.svelte.js';
	import { ImageAttachments, type Attachment } from '../attachments.svelte.js';
	import { MAX_CHAT_IMAGES } from '../images.js';
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
	const images = new ImageAttachments({ tooMany: t('Attach up to %d images.', MAX_CHAT_IMAGES) });
	onDestroy(() => {
		muse.destroy();
		images.clear();
	});

	let dialog = $state<HTMLDialogElement | null>(null);
	let draft = $state('');
	let question = $state('');
	let exchange = $state<MessageRow[]>([]);
	let conversationId = $state('');
	let sending = $state(false);
	let errorText = $state('');
	/** Q answered and stored the reply, but reading it back failed. */
	let replyMissing = $state(false);
	/** The backend takes images on a turn, as full Q decides it. Asked on first opening. */
	let imagesEnabled = $state(false);
	let imagesAsked = false;
	/** Images on the question in flight, shown under it until the turn settles. */
	let sentImages = $state<Attachment[]>([]);
	const canAttach = $derived(imagesEnabled && !sending && !images.full);
	const hasExchange = $derived(
		question !== '' || exchange.length > 0 || errorText !== '' || images.error !== ''
	);
	/** The trades review card needs a table's width. */
	const wide = $derived(exchange.some((message) => message.action?.trades));

	const showsButton = $derived(quickQAllowedOn(page.url.pathname));
	const canOpenInQ = $derived(conversationId !== '' && (exchange.length > 0 || replyMissing));

	// A link inside an answer, or "Open in Q", leaves this page: the card goes too.
	$effect(() => {
		void page.url.pathname;
		dialog?.close();
	});

	function resetCard() {
		images.clear();
		draft = '';
		question = '';
		exchange = [];
		errorText = '';
		replyMissing = false;
	}

	function onClosed() {
		if (!sending) resetCard();
	}

	function open() {
		dialog?.showModal();
		if (imagesAsked) return;
		imagesAsked = true;
		fetch('/assistant/quick', { headers: { Accept: 'application/json' } })
			.then((res) => (res.ok ? (res.json() as Promise<{ imagesEnabled?: boolean }>) : null))
			.then((body) => {
				imagesEnabled = body?.imagesEnabled === true;
			})
			.catch(() => {
				// Asked again on the next opening.
				imagesAsked = false;
			});
	}

	function onPick(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = '';
		if (canAttach) void images.add(files);
	}

	function onPaste(event: ClipboardEvent) {
		const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
			f.type.startsWith('image/')
		);
		if (!imagesEnabled || files.length === 0) return;
		event.preventDefault();
		if (!sending) void images.add(files);
	}

	const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;

	function onDragOver(event: DragEvent) {
		if (imagesEnabled && hasFiles(event)) event.preventDefault();
	}

	function onDrop(event: DragEvent) {
		if (!imagesEnabled || !hasFiles(event)) return;
		event.preventDefault();
		if (!sending) void images.add(Array.from(event.dataTransfer?.files ?? []));
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

	async function runTurn(content: string, files: File[], mayRecreate: boolean): Promise<string> {
		let id = storedConversation(localStorage);
		if (!id) {
			id = await createQuickConversation(fetch, (url) => window.location.assign(url));
			if (!id) return '';
			storeConversation(localStorage, id);
		}
		const body = new FormData();
		body.set('content', content);
		for (const file of files) body.append('image', file, file.name);
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
			if (mayRecreate) return runTurn(content, files, false);
		}
		return failure;
	}

	async function send(event: SubmitEvent) {
		event.preventDefault();
		const content = draft.trim();
		if ((content === '' && images.items.length === 0) || sending || images.preparing > 0) return;
		sending = true;
		images.error = '';
		const sent = images.take();
		sentImages = sent;
		errorText = '';
		replyMissing = false;
		exchange = [];
		question = content;
		draft = '';
		try {
			errorText = await runTurn(
				content,
				sent.map((a) => a.file),
				true
			);
		} catch (error) {
			muse.fail();
			errorText = error instanceof Error ? error.message : 'Assistant unavailable';
		} finally {
			sending = false;
		}
		sentImages = [];
		// A failed question comes back to the box, unless a new one was typed meanwhile.
		if (errorText !== '') {
			if (draft === '') draft = content;
			images.restore(sent);
		} else {
			images.release(sent);
		}
	}

	function sendOnEnter(event: KeyboardEvent) {
		if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
		if (!(event.target instanceof HTMLTextAreaElement)) return;
		event.preventDefault();
		event.target.form?.requestSubmit();
	}
</script>

{#if showsButton}
	<button type="button" class="quick-q-button" aria-label={t('Ask Q')} onclick={open}>
		<QuickAssistantStar />
	</button>
{/if}

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -- a click on the backdrop; Escape closes the dialog natively -->
<dialog
	bind:this={dialog}
	class="quick-q-card glass-card"
	class:quick-q-wide={wide}
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

		{#if hasExchange}
			<div class="quick-q-exchange" aria-live="polite">
				{#if exchange.length > 0}
					{#each exchange as message (message.id)}
						<Message {message} onreply={(reply) => exchange.push(reply)} />
					{/each}
				{:else if question !== ''}
					<div class="muse-message user">
						<div class="muse-bubble"><div class="muse-text">{question}</div></div>
					</div>
					{#if sentImages.length > 0}
						<ul class="muse-attachments quick-q-sent" aria-label={t('Attached images')}>
							{#each sentImages as attachment (attachment.key)}
								<li class="muse-attachment">
									<img src={attachment.url} alt={t('Attached screenshot')} />
								</li>
							{/each}
						</ul>
					{/if}
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

		<p class="muse-composer-error" role="alert" hidden={errorText === '' && images.error === ''}>
			{errorText || images.error}
		</p>

		{#if images.items.length > 0 || images.preparing > 0}
			<ul class="muse-attachments" aria-label={t('Attached images')}>
				{#each images.items as attachment (attachment.key)}
					<li class="muse-attachment">
						<img src={attachment.url} alt={t('Attached screenshot')} />
						<button
							type="button"
							class="muse-attachment-remove"
							aria-label={t('Remove image')}
							disabled={sending}
							onclick={() => images.remove(attachment.key)}
						>
							<X class="size-3" />
						</button>
					</li>
				{/each}
				{#if images.preparing > 0}
					<li class="muse-attachment-pending" role="status">{t('Preparing…')}</li>
				{/if}
			</ul>
		{/if}

		<form
			class="quick-q-form"
			onsubmit={send}
			onkeydown={sendOnEnter}
			onpaste={onPaste}
			ondragover={onDragOver}
			ondrop={onDrop}
		>
			<TextareaField
				name="content"
				bind:value={draft}
				rows={2}
				placeholder={t('Ask about your finances')}
				required={images.items.length === 0}
				maxlength={12000}
				autofocus
				aria-label={t('Ask Q')}
				wrapperClass="min-w-0 flex-1"
			/>
			{#if imagesEnabled}
				<label
					class="muse-attach"
					class:muse-attach-disabled={!canAttach}
					title={t('Attach images')}
				>
					<input
						type="file"
						class="sr-only"
						accept="image/png,image/jpeg,image/webp,image/gif"
						multiple
						disabled={!canAttach}
						aria-label={t('Attach images')}
						onchange={onPick}
					/>
					<Paperclip class="size-5" />
				</label>
			{/if}
			<NativeButton
				type="submit"
				class="btn-primary px-4"
				disabled={sending || images.preparing > 0}>{t('Send')}</NativeButton
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
	.quick-q-card.quick-q-wide {
		width: min(48rem, calc(100vw - 1.5rem));
		max-height: min(88dvh, 52rem);
	}
	.quick-q-sent {
		align-self: flex-end;
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
	/* Flex items grow to their content: without these a wide trades table pushes
	   the bubble past the card's edge, where it is clipped. */
	.quick-q-exchange :global(.muse-message),
	.quick-q-exchange :global(.muse-bubble) {
		min-width: 0;
	}
	.quick-q-exchange :global(.muse-message) {
		width: 100%;
	}
	/* The bubble breaks words anywhere, which stacks a narrow table's headers a
	   letter per line. The table scrolls sideways in its own wrapper instead. */
	.quick-q-exchange :global(.muse-bubble table) {
		overflow-wrap: normal;
	}
	.quick-q-exchange :global(.muse-bubble th) {
		white-space: nowrap;
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
