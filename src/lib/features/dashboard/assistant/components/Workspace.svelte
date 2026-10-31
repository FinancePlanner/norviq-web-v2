<script lang="ts">
	// assistant.Workspace: one conversation's transcript and composer. The
	// composer streams the turn (window.streamAssistantTurn); on the `turn`
	// frame the page reloads this conversation and re-keys the workspace,
	// which is Go's htmx outerHTML swap of #assistant-workspace.
	import NativeButton from '#lib/components/norviq/NativeButton.svelte';
	import TextareaField from '#lib/components/norviq/TextareaField.svelte';
	import type { MuseChat } from '../muse.svelte.js';
	import { streamAssistantTurn } from '../stream.js';
	import type { ConversationViewModel, MessageRow } from '../types.js';
	import Message from './Message.svelte';
	import MuseHeader from './MuseHeader.svelte';

	let {
		vm,
		muse,
		reload
	}: {
		vm: ConversationViewModel;
		muse: MuseChat;
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

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const form = event.currentTarget as HTMLFormElement;
		errorText = '';
		sending = true;
		try {
			errorText = await streamAssistantTurn({
				conversationId: vm.id,
				body: new FormData(form),
				muse,
				onAccepted: () => (content = ''),
				onTurn: () => reload(vm.id)
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
		onfocusin={(e) => isComposer(e.target) && muse.listen()}
		onfocusout={(e) => isComposer(e.target) && muse.unlisten()}
	>
		<p class="muse-composer-error" data-muse-error role="alert" hidden={errorText === ''}>
			{errorText}
		</p>
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
				required
				maxlength={12000}
				autofocus={vm.seed !== ''}
				aria-label="Message Q"
			/>
			<div>
				<NativeButton type="submit" class="assistant-send" disabled={sending}>Send</NativeButton>
			</div>
		</form>
		<p class="muse-privacy">
			AI-generated · not verified financial data · Encrypted · retained 30 days
		</p>
	</div>
</main>
