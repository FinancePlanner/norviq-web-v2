<script lang="ts">
	// assistant.Workspace: one conversation's transcript and composer. The
	// composer streams the turn (window.streamAssistantTurn); on the `turn`
	// frame the page reloads this conversation and re-keys the workspace,
	// which is Go's htmx outerHTML swap of #assistant-workspace.
	import { onDestroy } from 'svelte';
	import Paperclip from '@lucide/svelte/icons/paperclip';
	import X from '@lucide/svelte/icons/x';
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import TextareaField from '#lib/components/norviq/TextareaField.svelte';
	import { MAX_CHAT_IMAGES, ImageUnreadable, prepareChatImage } from '../images.js';
	import type { MuseChat } from '../muse.svelte.js';
	import { streamAssistantTurn } from '../stream.js';
	import type { ConversationViewModel, MessageRow } from '../types.js';
	import Message from './Message.svelte';
	import MuseHeader from './MuseHeader.svelte';

	let {
		vm,
		muse,
		imagesEnabled = false,
		reload
	}: {
		vm: ConversationViewModel;
		muse: MuseChat;
		/** The backend accepts images on a turn: shows the attach controls. */
		imagesEnabled?: boolean;
		/** Swaps the workspace for a fresh render of this conversation. */
		reload: (id: string) => Promise<void>;
	} = $props();

	// The workspace is keyed on vm, so these start from it and are owned here.
	// svelte-ignore state_referenced_locally
	let messages = $state<MessageRow[]>([...vm.messages]);
	// svelte-ignore state_referenced_locally
	let content = $state(vm.seed);
	let sending = $state(false);
	let errorText = $state('');

	/** Downscaled files waiting to go with the next message, each with a thumbnail URL. */
	interface Attachment {
		key: number;
		file: File;
		url: string;
	}
	let attachments = $state<Attachment[]>([]);
	let preparing = $state(0);
	let nextKey = 0;
	const attachFull = $derived(attachments.length + preparing >= MAX_CHAT_IMAGES);

	const isImage = (file: File) => file.type.startsWith('image/');

	function clearAttachments() {
		for (const a of attachments) URL.revokeObjectURL(a.url);
		attachments = [];
	}

	onDestroy(clearAttachments);

	function removeAttachment(key: number) {
		const gone = attachments.find((a) => a.key === key);
		if (gone) URL.revokeObjectURL(gone.url);
		attachments = attachments.filter((a) => a.key !== key);
	}

	async function addFiles(picked: File[]) {
		const images = picked.filter(isImage);
		if (!imagesEnabled || images.length === 0) return;
		errorText = '';
		const room = Math.max(MAX_CHAT_IMAGES - attachments.length - preparing, 0);
		if (images.length > room) errorText = `Attach up to ${MAX_CHAT_IMAGES} images.`;
		const take = images.slice(0, room);
		// Reserve every slot now, so a second drop while these decode cannot overshoot.
		preparing += take.length;
		for (const file of take) {
			try {
				const prepared = await prepareChatImage(file);
				attachments.push({ key: nextKey++, file: prepared, url: URL.createObjectURL(prepared) });
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
		const files = Array.from(event.clipboardData?.files ?? []).filter(isImage);
		if (!imagesEnabled || files.length === 0) return;
		event.preventDefault();
		void addFiles(files);
	}

	const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;

	function onDragOver(event: DragEvent) {
		if (imagesEnabled && hasFiles(event)) event.preventDefault();
	}

	function onDrop(event: DragEvent) {
		if (!imagesEnabled || !hasFiles(event)) return;
		event.preventDefault();
		void addFiles(Array.from(event.dataTransfer?.files ?? []));
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const form = event.currentTarget as HTMLFormElement;
		if (preparing > 0) return;
		errorText = '';
		sending = true;
		const body = new FormData(form);
		for (const a of attachments) body.append('image', a.file, a.file.name);
		try {
			errorText = await streamAssistantTurn({
				conversationId: vm.id,
				body,
				muse,
				// Only the turn frame clears the composer: a refused image or a
				// failed turn leaves the text and thumbnails to retry with.
				onTurn: () => {
					content = '';
					clearAttachments();
					return reload(vm.id);
				}
			});
		} finally {
			sending = false;
		}
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
			<ul class="muse-attachments" aria-label="Attached images">
				{#each attachments as attachment (attachment.key)}
					<li class="muse-attachment">
						<img src={attachment.url} alt="Attached screenshot" />
						<button
							type="button"
							class="muse-attachment-remove"
							aria-label="Remove image"
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
				maxlength={12000}
				autofocus={vm.seed !== ''}
				aria-label="Message Q"
			/>
			{#if imagesEnabled}
				<label class="muse-attach" class:muse-attach-disabled={attachFull} title="Attach images">
					<input
						type="file"
						class="sr-only"
						accept="image/png,image/jpeg,image/webp,image/gif"
						multiple
						disabled={attachFull}
						aria-label="Attach images"
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
