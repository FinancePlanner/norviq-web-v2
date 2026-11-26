<script lang="ts">
	// assistant.Workspace: one conversation's transcript and composer. The
	// composer streams the turn (window.streamAssistantTurn); on the `turn`
	// frame the page reloads this conversation and re-keys the workspace,
	// which is Go's htmx outerHTML swap of #assistant-workspace.
	import { onDestroy } from 'svelte';
	import Paperclip from '@lucide/svelte/icons/paperclip';
	import FileText from '@lucide/svelte/icons/file-text';
	import X from '@lucide/svelte/icons/x';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import TextareaField from '#lib/components/norviq/TextareaField.svelte';
	import { mergeRestored, settleComposer } from '../composer.js';
	import {
		acceptTypes,
		appendChatFiles,
		checkDocument,
		documentKind,
		MAX_CHAT_IMAGES,
		ImageUnreadable,
		prepareChatImage,
		UNSUPPORTED_FILE,
		type AttachmentKind
	} from '../images.js';
	import type { MuseChat } from '../muse.svelte.js';
	import { streamAssistantTurn } from '../stream.js';
	import type { ConversationViewModel, MessageRow } from '../types.js';
	import Message from './Message.svelte';
	import MuseHeader from './MuseHeader.svelte';

	let {
		vm,
		muse,
		imagesEnabled = false,
		documentsEnabled = false,
		reload,
		onConsentRequired
	}: {
		vm: ConversationViewModel;
		muse: MuseChat;
		/** The backend accepts images on a turn: shows the attach controls. */
		imagesEnabled?: boolean;
		/** The backend also accepts a PDF or CSV on a turn. */
		documentsEnabled?: boolean;
		/** Swaps the workspace for a fresh render of this conversation. */
		reload: (id: string) => Promise<void>;
		/** The stream refused for want of AI consent: the page shows the consent card. */
		onConsentRequired?: () => void;
	} = $props();

	// The workspace is keyed on vm, so these start from it and are owned here.
	// svelte-ignore state_referenced_locally
	let messages = $state<MessageRow[]>([...vm.messages]);
	// svelte-ignore state_referenced_locally
	let content = $state(vm.seed);
	let sending = $state(false);
	/** The stream opened, so the box was cleared and typing is safe again. */
	let accepted = $state(false);
	let errorText = $state('');

	/** Files waiting to go with the next message: an image has a thumbnail URL, a document a chip. */
	interface Attachment {
		key: number;
		file: File;
		kind: AttachmentKind;
		url: string;
	}
	let attachments = $state<Attachment[]>([]);
	let preparing = $state(0);
	let nextKey = 0;
	const attachFull = $derived(sending || attachments.length + preparing >= MAX_CHAT_IMAGES);

	/** What was sent and not yet known to be stored; its thumbnails stay alive until then. */
	let inFlight: Attachment[] = [];

	const isImage = (file: File) => file.type.startsWith('image/');
	const attachable = (file: File) =>
		(imagesEnabled && isImage(file)) || (documentsEnabled && documentKind(file) !== null);
	const canAttach = $derived(imagesEnabled || documentsEnabled);

	function revoke(list: Attachment[]) {
		for (const a of list) if (a.url) URL.revokeObjectURL(a.url);
	}

	onDestroy(() => {
		revoke(attachments);
		revoke(inFlight);
	});

	function removeAttachment(key: number) {
		const gone = attachments.find((a) => a.key === key);
		if (gone?.url) URL.revokeObjectURL(gone.url);
		attachments = attachments.filter((a) => a.key !== key);
	}

	async function addFiles(picked: File[]) {
		const wanted = picked.filter(attachable);
		// Nothing is attached mid-turn: it would be dropped when the box is restored or cleared.
		if (!canAttach || sending) return;
		errorText = '';
		if (documentsEnabled && wanted.length < picked.length) errorText = UNSUPPORTED_FILE;
		if (wanted.length === 0) return;
		const room = Math.max(MAX_CHAT_IMAGES - attachments.length - preparing, 0);
		if (wanted.length > room) {
			errorText = documentsEnabled
				? `Attach up to ${MAX_CHAT_IMAGES} files.`
				: `Attach up to ${MAX_CHAT_IMAGES} images.`;
		}
		const take = wanted.slice(0, room);
		// Reserve every slot now, so a second drop while these decode cannot overshoot.
		preparing += take.length;
		for (const file of take) {
			try {
				const kind = documentKind(file);
				if (kind) {
					const refusal = checkDocument(
						file,
						kind,
						attachments.map((a) => a.kind)
					);
					if (refusal) errorText = refusal;
					else attachments.push({ key: nextKey++, file, kind, url: '' });
					continue;
				}
				const prepared = await prepareChatImage(file);
				attachments.push({
					key: nextKey++,
					file: prepared,
					kind: 'image',
					url: URL.createObjectURL(prepared)
				});
			} catch (error) {
				errorText =
					error instanceof ImageUnreadable
						? error.message
						: "This image format can't be read. Try a PNG or JPEG.";
			} finally {
				preparing--;
			}
		}
	}

	function onPick(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = '';
		void addFiles(files);
	}

	function onPaste(event: ClipboardEvent) {
		const files = Array.from(event.clipboardData?.files ?? []).filter(attachable);
		if (!canAttach || sending || files.length === 0) return;
		event.preventDefault();
		void addFiles(files);
	}

	const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;

	function onDragOver(event: DragEvent) {
		if (canAttach && hasFiles(event)) event.preventDefault();
	}

	function onDrop(event: DragEvent) {
		if (!canAttach || !hasFiles(event)) return;
		event.preventDefault();
		if (sending) return;
		void addFiles(Array.from(event.dataTransfer?.files ?? []));
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const form = event.currentTarget as HTMLFormElement;
		if (preparing > 0) return;
		errorText = '';
		sending = true;
		const body = new FormData(form);
		appendChatFiles(
			body,
			attachments.map((a) => a.file)
		);
		const snapshot = { content, attachments };
		inFlight = attachments;
		let answered = false;
		accepted = false;
		try {
			errorText = await streamAssistantTurn({
				conversationId: vm.id,
				body,
				muse,
				onConsentRequired,
				onAccepted: () => {
					// The box clears as soon as the stream opens, as it always did.
					accepted = true;
					content = '';
					attachments = [];
				},
				onTurn: () => {
					answered = true;
					return reload(vm.id);
				}
			});
		} finally {
			sending = false;
		}
		const { restore, discard } = settleComposer(snapshot, { accepted, answered, error: errorText });
		if (restore) {
			// The turn failed after the stream opened: the text and images come back.
			const merged = mergeRestored(restore, { content, attachments });
			content = merged.content;
			attachments = merged.attachments;
		}
		revoke(discard);
		inFlight = [];
	}

	const isComposer = (target: EventTarget | null) => target instanceof HTMLTextAreaElement;
</script>

<main id="assistant-workspace" class="assistant-main muse-main">
	<MuseHeader {muse} />
	<div class="muse-stage">
		<div class="muse-scrim" aria-hidden="true"></div>
		<div id="assistant-transcript" class="muse-transcript">
			<h2 class="sr-only">{vm.title}</h2>
			{#each messages as message (message.id)}
				<Message {message} onreply={(reply) => messages.push(reply)} />
			{/each}
		</div>
	</div>
	<div
		class="assistant-composer muse-composer"
		role="presentation"
		onpaste={onPaste}
		ondragover={onDragOver}
		ondrop={onDrop}
		onfocusin={(e) => isComposer(e.target) && muse.listen()}
		onfocusout={(e) => isComposer(e.target) && muse.unlisten()}
	>
		<p class="muse-composer-error" data-muse-error role="alert" hidden={errorText === ''}>
			{errorText}
		</p>
		{#if attachments.length > 0 || preparing > 0}
			<ul
				class="muse-attachments"
				aria-label={documentsEnabled ? 'Attached files' : 'Attached images'}
			>
				{#each attachments as attachment (attachment.key)}
					<li class="muse-attachment">
						{#if attachment.kind === 'image'}
							<img src={attachment.url} alt="Attached screenshot" />
						{:else}
							<span class="muse-attachment-file"
								><FileText class="size-4" /><span>{attachment.file.name}</span></span
							>
						{/if}
						<button
							type="button"
							class="muse-attachment-remove"
							aria-label={attachment.kind === 'image' ? 'Remove image' : 'Remove file'}
							disabled={sending}
							onclick={() => removeAttachment(attachment.key)}
						>
							<X class="size-3" />
						</button>
					</li>
				{/each}
				{#if preparing > 0}
					<li class="muse-attachment-pending" role="status">Preparing…</li>
				{/if}
			</ul>
		{/if}
		<form
			method="post"
			action={'/assistant/conversations/' + vm.id + '/stream'}
			data-conversation-id={vm.id}
			onsubmit={submit}
		>
			<TextareaField
				name="content"
				bind:value={content}
				placeholder="Ask about your spending, budget, portfolio, or goals…"
				required={attachments.length === 0}
				readonly={sending && !accepted}
				maxlength={12000}
				autofocus={vm.seed !== ''}
				aria-label="Message Q"
			/>
			{#if canAttach}
				<label
					class="muse-attach"
					class:muse-attach-disabled={attachFull}
					title={documentsEnabled ? 'Attach files' : 'Attach images'}
				>
					<input
						type="file"
						class="sr-only"
						accept={acceptTypes(imagesEnabled, documentsEnabled)}
						multiple
						disabled={attachFull}
						aria-label={documentsEnabled ? 'Attach files' : 'Attach images'}
						onchange={onPick}
					/>
					<Paperclip class="size-5" />
				</label>
			{/if}
			<div>
				<NativeButton type="submit" class="assistant-send" disabled={sending || preparing > 0}
					>Send</NativeButton
				>
			</div>
		</form>
		<p class="muse-privacy">
			AI-generated · not verified financial data · Encrypted · retained 30 days
		</p>
	</div>
</main>
