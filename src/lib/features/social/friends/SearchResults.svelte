<script lang="ts">
	// friends.templ SearchResults: the /friends/search partial under the search box.
	import { EmptyStateInline, FormErrorBanner } from '#lib/components/norviq/index.js';
	import * as vigil from '#lib/components/norviq/vigil/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
	import FriendButton from './FriendButton.svelte';
	import UserRow from './UserRow.svelte';
	import type { SearchVM } from './types.js';

	let { vm }: { vm: SearchVM } = $props();
</script>

{#if vm.errorMessage}
	<FormErrorBanner message={vm.errorMessage} />
{:else if vm.query === ''}
	<!-- nothing typed -->
{:else if vm.users.length === 0}
	<EmptyStateInline
		title={t('No one found')}
		description={t('Check the spelling, or send them your invite link instead.')}
		actionLabel={t('Invite friends')}
		actionHref="/friends/invite"
	/>
{:else}
	<vigil.InsetList class="friend-search-list">
		{#each vm.users as user (user.id)}
			<UserRow {user}>
				{#snippet trailing()}<FriendButton {user} />{/snippet}
			</UserRow>
		{/each}
	</vigil.InsetList>
{/if}
