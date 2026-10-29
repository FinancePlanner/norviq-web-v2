<script lang="ts">
	// Port of friends.templ InvitePage.
	import Copy from '@lucide/svelte/icons/copy';
	import { Field, FormErrorBanner, PrimaryButton } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import { formatDate } from '#lib/features/social/friends/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let copied = $state(false);
	function copy(e: MouseEvent) {
		const url = (e.currentTarget as HTMLElement).dataset.copy ?? '';
		navigator.clipboard.writeText(url).then(() => {
			copied = true;
			setTimeout(() => (copied = false), 2000);
		});
	}
</script>

<svelte:head>
	<title>Invite friends - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<vigil.DocumentPage
	pageClass="friends-invite-page"
	backHref="/friends"
	backLabel={t('← Friends')}
	title={t('Invite friends')}
	subtitle={t('Share your invite link on Instagram, Facebook, X or WhatsApp.')}
>
	<FormErrorBanner message={data.errorMessage} />
	{#if data.link}
		<vigil.Panel titleID="invite-link-title">
			<vigil.PanelHeader
				id="invite-link-title"
				title={t('Your invite link')}
				desc={t('Anyone who opens it can add you as a friend.')}
			/>
			<div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
				<Field
					id="invite-url"
					name="inviteUrl"
					label={t('Link')}
					value={data.link.url}
					readonly
					wrapperClass="min-w-0 flex-1"
					data-invite-url={data.link.url}
					onfocus={(e: FocusEvent) => (e.currentTarget as HTMLInputElement).select()}
				/>
				<PrimaryButton class="w-auto px-4" data-copy={data.link.url} onclick={copy}>
					<Copy class="h-4 w-4" />
					<span>{copied ? t('Copied') : t('Copy link')}</span>
				</PrimaryButton>
			</div>
			<p class="mt-3 text-subhead text-muted-foreground">
				{t('Invite code')}: <span class="font-semibold tabular-nums">{data.link.code}</span>
				{#if data.link.expiresAt}
					{' · ' + t('Expires') + ' ' + formatDate(data.link.expiresAt)}
				{/if}
			</p>
		</vigil.Panel>
	{/if}
</vigil.DocumentPage>
