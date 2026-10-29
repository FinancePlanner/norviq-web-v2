<script lang="ts">
	// friends.templ FriendButton / FriendButtonError: the add/accept control for
	// someone who is not yet a friend. With JS it posts in the background and
	// swaps itself for the new state (Go's hx-post outerHTML swap); without JS
	// the form posts and POST /friends/requests redirects back to /friends.
	// Accepting an incoming request goes through the same "add" call.
	import { SubmitButton } from '#lib/components/norviq/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import { postForm } from './client.js';
	import { Friendship, userStatus, type SocialUserSummary } from './types.js';

	let { user }: { user: SocialUserSummary } = $props();

	let override = $state<{ status?: string; error?: string } | null>(null);
	const status = $derived(override?.status ?? userStatus(user));

	async function onsubmit(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		if (form.classList.contains('htmx-request')) return;
		form.classList.add('htmx-request');
		try {
			const res = await postForm(form);
			const body = (await res.json().catch(() => null)) as { status?: string; error?: string } | null;
			override = body?.status ? { status: body.status } : { error: body?.error || t('Could not send the request.') };
		} catch {
			override = { error: t('Could not send the request.') };
		} finally {
			form.classList.remove('htmx-request');
		}
	}
</script>

{#if override?.error}
	<div id={'friend-action-' + user.id} class="text-subhead text-danger" role="alert">{override.error}</div>
{:else}
	<div id={'friend-action-' + user.id} class="flex items-center">
		{#if status === Friendship.Friends}
			<span class="text-subhead text-muted-foreground">{t('Friends')}</span>
		{:else if status === Friendship.OutgoingPending}
			<span class="text-subhead text-muted-foreground">{t('Requested')}</span>
		{:else if status === Friendship.Blocked}
			<!-- blocked: no control -->
		{:else}
			<form method="post" action="/friends/requests" {onsubmit}>
				<input type="hidden" name="userId" value={user.id} />
				<input type="hidden" name="status" value={status} />
				<input type="hidden" name="username" value={user.username} />
				<SubmitButton class="w-auto px-3">
					{#if status === Friendship.IncomingPending}
						{t('Accept')}
					{:else}
						{t('Add friend')}
					{/if}
				</SubmitButton>
			</form>
		{/if}
	</div>
{/if}
