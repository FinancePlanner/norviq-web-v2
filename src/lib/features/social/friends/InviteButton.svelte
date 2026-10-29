<script lang="ts">
	// friends.templ friendsHeaderActions.
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import { PrimaryButton } from '#lib/components/norviq/index.js';
	import { t } from '#lib/i18n/context.svelte.js';
</script>

<PrimaryButton href="/friends/invite" class="w-auto px-4">
	<UserPlus class="h-4 w-4" />
	{t('Invite friends')}
</PrimaryButton>
