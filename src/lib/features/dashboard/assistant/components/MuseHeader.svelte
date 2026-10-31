<script lang="ts">
	// assistant.MuseHeader: a bar with the conversation-list toggle and "New
	// chat", and Vig's avatar centred over the top of the transcript with the
	// name/status pill under it. `muse` drives data-state and the status line.
	import IconButton from '#lib/components/norviq/IconButton.svelte';
	import SecondarySubmitButton from '#lib/components/norviq/SecondarySubmitButton.svelte';
	import VigIcon from '#lib/components/norviq/VigIcon.svelte';
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import type { MuseChat } from '../muse.svelte.js';

	let { muse }: { muse: MuseChat } = $props();

	// The left button opens the conversation rail on a phone and collapses it
	// on a desktop. The attribute lives on .assistant-page, outside this
	// component, exactly as the Go script toggled it.
	function toggleRail(event: MouseEvent) {
		const toggle = event.currentTarget as HTMLElement;
		const page = toggle.closest('.assistant-page');
		const rail = page?.querySelector('.assistant-rail');
		if (!page || !rail) return;
		page.toggleAttribute('data-rail-toggled');
		toggle.setAttribute('aria-expanded', String(getComputedStyle(rail).display !== 'none'));
	}
</script>

<header class="muse-header">
	<div class="muse-bar">
		<IconButton
			class="muse-bar-button"
			aria-label="Conversations"
			aria-controls="assistant-rail"
			data-muse-rail-toggle="true"
			onclick={toggleRail}
		>
			<Icon name="panel-left" class="size-5" />
		</IconButton>
		<form method="post" action="/assistant/conversations">
			<SecondarySubmitButton class="muse-new-chat">
				<Icon name="plus" class="size-4" />
				New chat
			</SecondarySubmitButton>
		</form>
	</div>
	<div class="muse-identity">
		<div class="muse-avatar" data-muse-avatar data-state={muse.avatar}>
			<VigIcon class="muse-avatar-img" />
		</div>
		<div class="muse-pill">
			<p class="muse-name">Vig</p>
			<p id="muse-status" class="muse-status" data-muse-status role="status" aria-live="polite">
				{muse.status}
			</p>
		</div>
	</div>
</header>
