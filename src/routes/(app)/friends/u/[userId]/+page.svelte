<script lang="ts">
	// Port of friends.templ ProfilePage.
	import Ban from '@lucide/svelte/icons/ban';
	import Flag from '@lucide/svelte/icons/flag';
	import UserMinus from '@lucide/svelte/icons/user-minus';
	import {
		CheckboxField,
		FormErrorBanner,
		SecondarySubmitButton,
		SelectField,
		SubmitButton,
		TextareaField,
		ToastBanner,
		type Option
	} from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import AchievementIcon from '#lib/features/social/friends/AchievementIcon.svelte';
	import FriendButton from '#lib/features/social/friends/FriendButton.svelte';
	import { boostedForm } from '#lib/features/social/friends/client.js';
	import { achievementsOn, activityFeedOn, type SocialFlags } from '#lib/features/social/friends/flags.js';
	import {
		count,
		formatDate,
		Friendship,
		mutualFriends,
		reportReasonLabel,
		SocialReportReasons,
		tierLabelID,
		userStatus,
		userTitle
	} from '#lib/features/social/friends/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const user = $derived(data.profile.user);
	const status = $derived(userStatus(user));
	const cfg = $derived(data.social as SocialFlags);
	const showcase = $derived((data.profile.showcase ?? []).slice(0, 3));
	const reasonOptions = $derived<Option[]>(SocialReportReasons.map((r) => ({ value: r, label: t(reportReasonLabel(r)) })));
	const hidden = $derived(data.profile.xpLevel == null && data.profile.streakDays == null && data.profile.badgeCount == null);
</script>

<svelte:head>
	<title>{userTitle(user)} - Norviq</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet metric(label: string, value: string)}
	<div class="command-metric">
		<span class="command-metric-label">{label}</span>
		<span class="command-metric-value">{value}</span>
	</div>
{/snippet}

<vigil.DocumentPage
	pageClass="friends-profile-page"
	backHref="/friends"
	backLabel={t('← Friends')}
	title={userTitle(user)}
	subtitle={'@' + user.username}
>
	<ToastBanner message={data.notice} />
	<FormErrorBanner message={data.errorMessage} />
	<vigil.Panel titleID="profile-progress-title">
		<vigil.PanelHeader id="profile-progress-title" title={t('Progress')} desc={mutualFriends(user)}>
			{#snippet trailing()}<FriendButton {user} />{/snippet}
		</vigil.PanelHeader>
		<div class="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
			{#if data.profile.xpLevel != null}
				{@render metric(t('Level'), String(data.profile.xpLevel))}
			{/if}
			{#if data.profile.streakDays != null}
				{@render metric(t('Streak'), count(data.profile.streakDays, 'day', 'days'))}
			{/if}
			{#if data.profile.badgeCount != null}
				{@render metric(t('Badges'), count(data.profile.badgeCount, 'badge', 'badges'))}
			{/if}
			{#if data.profile.joinedAt}
				{@render metric(t('Joined'), formatDate(data.profile.joinedAt))}
			{/if}
		</div>
		{#if hidden}
			<p class="mt-3 text-subhead text-muted-foreground">{t('They keep their progress private.')}</p>
		{/if}
		{#if achievementsOn(cfg) && showcase.length > 0}
			<ul class="mt-4 flex flex-wrap gap-2" aria-label={t('Showcase')}>
				{#each showcase as entry (entry.key + entry.tier)}
					<li class="achievement-chip inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-subhead">
						<span aria-hidden="true"><AchievementIcon iconKey={entry.iconKey} class="h-4 w-4" /></span>
						<span>{entry.title}</span>
						{#if entry.tier}
							<span class="text-muted-foreground">{t(tierLabelID(entry.tier))}</span>
						{/if}
					</li>
				{/each}
			</ul>
			{#if activityFeedOn(cfg)}
				<a class="mt-3 inline-block text-subhead font-medium underline underline-offset-4" href={'/friends/u/' + user.id + '/achievements'}
					>{t('See all')}</a
				>
			{/if}
		{/if}
	</vigil.Panel>
	{#if status !== Friendship.Blocked}
		<vigil.Panel class="mt-6" titleID="profile-manage-title">
			<vigil.PanelHeader id="profile-manage-title" title={t('More')} />
			<div class="mt-3 flex flex-wrap gap-2">
				{#if status === Friendship.Friends}
					<form method="post" action={'/friends/u/' + user.id + '/unfriend'} {@attach boostedForm(t('Remove this friend?'))}>
						<SecondarySubmitButton class="w-auto px-4">
							<UserMinus class="h-4 w-4" />
							{t('Remove friend')}
						</SecondarySubmitButton>
					</form>
				{/if}
				<form
					method="post"
					action={'/friends/u/' + user.id + '/block'}
					{@attach boostedForm(
						t("Block them? They won't be able to find you, message you or see your progress. They aren't told you blocked them.")
					)}
				>
					<SecondarySubmitButton class="w-auto px-4">
						<Ban class="h-4 w-4" />
						{t('Block')}
					</SecondarySubmitButton>
				</form>
			</div>
		</vigil.Panel>
		<vigil.Panel class="mt-6" titleID="profile-report-title">
			<vigil.PanelHeader id="profile-report-title" title={t('Report')} desc={t('Thanks. We review every report within 24 hours.')} />
			<form method="post" action={'/friends/u/' + user.id + '/report'} class="mt-3 space-y-4" {@attach boostedForm()}>
				<SelectField id="report-reason" name="reason" label={t('Why are you reporting them?')} options={reasonOptions} required />
				<TextareaField id="report-note" name="note" label={t('Details (optional)')} rows={3} maxlength={1000} />
				<CheckboxField id="report-also-block" name="alsoBlock" value="1" label={t('Also block') + ' @' + user.username} />
				<SubmitButton class="w-auto px-4">
					<Flag class="h-4 w-4" />
					{t('Send report')}
				</SubmitButton>
			</form>
		</vigil.Panel>
	{/if}
</vigil.DocumentPage>
