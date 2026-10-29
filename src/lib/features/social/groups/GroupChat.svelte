<script lang="ts">
	// groups.templ ChatPage + norviq-web assets/groups-chat.js.
	//
	// Sending posts the composer and answers with the row as JSON; the pending
	// row shows the text straight away and is swapped for it. Live updates
	// come from /groups/events (the backend's SSE stream, proxied, as in Go),
	// and every event turns into a fetch of rows or sidebars from this app's
	// endpoints, so rows have one builder (view.ts buildRows on the server).
	// There is no replay: on `ready` (every connect and reconnect) the page
	// catches up from the last seq it shows, exact because seqs have no gaps.
	import { onMount, tick } from 'svelte';
	import { SkeletonBlock, SubmitButton, TextareaField } from '#lib/components/norviq/index.js';
	import Icon from '#lib/components/norviq/tui/Icon.svelte';
	import ChannelLink from './ChannelLink.svelte';
	import ChannelPanel from './ChannelPanel.svelte';
	import MessageRowView from './MessageRowView.svelte';
	import Notices from './Notices.svelte';
	import Rail from './Rail.svelte';
	import { chatHref, sameID } from './view.js';
	import type { ChannelPanelVM, ChatVM, MessageRow, RailItem, RailResponse, RowsResponse } from './types.js';

	let { vm }: { vm: ChatVM } = $props();

	// The page remounts this component per channel ({#key}), so the initial
	// props seed local state once, like the Alpine component's init().
	const initial = (() => vm)();
	const base = chatHref(initial.groupId, initial.channelId);
	const moderator = initial.canModerate;

	let rail = $state<RailItem[]>(initial.rail);
	let invitations = $state(initial.invitations);
	let panel = $state<ChannelPanelVM>({
		groupId: initial.groupId,
		groupName: initial.groupName,
		emoji: initial.emoji,
		ticker: initial.ticker,
		channelId: initial.channelId,
		channels: initial.channels,
		canInvite: initial.canInvite,
		canManage: initial.canManage
	});
	let rows = $state<MessageRow[]>(initial.messages);
	let olderSeq = $state(initial.hasMoreBefore ? initial.oldestSeq : 0);
	const showStart = !initial.hasMoreBefore;
	let hasMessages = $state(false);

	interface Pending {
		clientId: string;
		body: string;
		status: string;
		failed: boolean;
	}
	let pending = $state<Pending[]>([]);
	let draft = $state('');

	let scroller: HTMLDivElement;
	let list: HTMLOListElement;
	let input = $state<HTMLTextAreaElement | null>(null);

	let lastSeq = initial.lastSeq;
	let readSeq = 0;
	let readTimer: ReturnType<typeof setTimeout> | undefined;
	let refreshTimer: ReturnType<typeof setTimeout> | undefined;
	let catchingUp = false;
	let catchUpAgain = false;
	let source: EventSource | null = null;

	// dedupeDays: two pages can each open with a separator for the same day;
	// only the first separator for a day is drawn.
	const showDays = $derived.by(() => {
		let previous = '';
		return rows.map((row) => {
			if (!row.dayLabel) return false;
			const day = row.stamp.slice(0, 10);
			if (day === previous) return false;
			previous = day;
			return true;
		});
	});

	onMount(() => {
		scrollToStart();
		const onScroll = () => scheduleRead();
		scroller.addEventListener('scroll', onScroll, { passive: true });
		const onVisible = () => {
			if (document.visibilityState === 'visible') scheduleRead();
		};
		document.addEventListener('visibilitychange', onVisible);
		connect();
		scheduleRead();
		return () => {
			source?.close();
			clearTimeout(readTimer);
			clearTimeout(refreshTimer);
			scroller.removeEventListener('scroll', onScroll);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});

	// MARK: stream

	function connect() {
		if (typeof window.EventSource !== 'function') return;
		const es = new EventSource('/groups/events');
		source = es;
		const on = (name: string, handler: (data: Record<string, unknown>) => void) =>
			es.addEventListener(name, (event) => {
				let data: Record<string, unknown> = {};
				try {
					data = JSON.parse((event as MessageEvent).data || '{}');
				} catch {
					return;
				}
				handler(data);
			});
		on('ready', () => {
			catchUp();
			refreshSidebars();
		});
		on('message.created', (data) => {
			if (sameID(data.channelId, initial.channelId)) catchUp();
			else refreshSidebars();
		});
		on('message.deleted', (data) => {
			if (!sameID(data.channelId, initial.channelId)) return;
			const id = String(data.messageId || '');
			const i = rows.findIndex((r) => r.id === id);
			if (i >= 0) tombstone(i);
		});
		on('channel.read', () => refreshSidebars());
		on('channel.created', () => refreshSidebars());
		on('channel.updated', () => refreshSidebars());
		on('channel.deleted', (data) => {
			if (sameID(data.channelId, initial.channelId)) window.location.assign(`/groups/${initial.groupId}`);
			else refreshSidebars();
		});
		on('group.updated', () => refreshSidebars());
		on('invitation.received', () => refreshSidebars());
		on('membership.removed', (data) => {
			if (sameID(data.groupId, initial.groupId)) window.location.assign('/groups?notice=removed');
			else refreshSidebars();
		});
		// The backend ends each stream after ten minutes; EventSource
		// reconnects on its own after the retry delay the stream set.
		es.onerror = () => {
			// 401/404: signed out or groups switched off. Stop.
			if (es.readyState === EventSource.CLOSED) source = null;
		};
	}

	const modQuery = (prefix: string) => (moderator ? `${prefix}mod=1` : '');

	// Fetches everything after the last row shown (or the newest page, for a
	// channel that was empty). Overlapping triggers collapse into one more
	// pass, so a burst costs two requests.
	async function catchUp() {
		if (catchingUp) {
			catchUpAgain = true;
			return;
		}
		catchingUp = true;
		try {
			do {
				catchUpAgain = false;
				const url = lastSeq > 0 ? `${base}/messages?after=${lastSeq}${modQuery('&')}` : `${base}/messages${modQuery('?')}`;
				let response: Response;
				try {
					response = await fetch(url, { headers: { accept: 'application/json' }, credentials: 'same-origin' });
				} catch {
					return;
				}
				if (!response.ok) return;
				const page = (await response.json()) as RowsResponse;
				await appendRows(page.rows);
				if (page.more) catchUpAgain = true;
			} while (catchUpAgain);
		} finally {
			catchingUp = false;
		}
	}

	async function appendRows(incoming: MessageRow[]) {
		const stick = atBottom();
		for (const row of incoming) {
			if (row.seq && rows.some((r) => r.seq === row.seq)) continue;
			if (row.clientId) pending = pending.filter((p) => p.clientId !== row.clientId);
			hasMessages = true;
			rows.push(row);
			if (row.seq > lastSeq) lastSeq = row.seq;
		}
		await tick();
		if (stick) scrollToBottom();
		scheduleRead();
	}

	/** The older-history sentinel: loads the page before seq once it is in view. */
	function olderSentinel(node: HTMLElement) {
		const seq = olderSeq;
		const observer = new IntersectionObserver((entries) => {
			if (!entries.some((e) => e.isIntersecting)) return;
			observer.disconnect();
			void loadOlder(seq);
		});
		observer.observe(node);
		return () => observer.disconnect();
	}

	// Older history comes in above what is on screen; keep the reader's place
	// rather than letting the page jump.
	async function loadOlder(beforeSeq: number) {
		let page: RowsResponse;
		try {
			const res = await fetch(`${base}/messages?before=${beforeSeq}`, {
				headers: { accept: 'application/json' },
				credentials: 'same-origin'
			});
			if (!res.ok) return;
			page = (await res.json()) as RowsResponse;
		} catch {
			return;
		}
		const heightBefore = scroller.scrollHeight;
		const known = new Set(rows.map((r) => r.seq));
		rows.unshift(...page.rows.filter((r) => !known.has(r.seq)));
		olderSeq = page.olderSeq;
		await tick();
		scroller.scrollTop += scroller.scrollHeight - heightBefore;
	}

	function tombstone(index: number) {
		const row = rows[index];
		rows[index] = { ...row, deleted: true, segments: [], canDelete: false, canReport: false };
	}

	/** hx-post delete swapped the row for the server's tombstone row. */
	function deleted(row: MessageRow) {
		const i = rows.findIndex((r) => r.seq === row.seq);
		if (i < 0) return;
		rows[i] = {
			id: row.id,
			seq: row.seq,
			clientId: '',
			author: '',
			initial: '',
			time: '',
			stamp: '',
			segments: [],
			deleted: true,
			continued: true,
			dayLabel: '',
			newDivider: false,
			own: false,
			canDelete: false,
			canReport: false
		};
	}

	function refreshSidebars() {
		clearTimeout(refreshTimer);
		refreshTimer = setTimeout(async () => {
			const [railRes, panelRes] = await Promise.allSettled([
				fetch(`/groups/rail?g=${encodeURIComponent(initial.groupId)}`, { headers: { accept: 'application/json' } }),
				fetch(`${base}/panel`, { headers: { accept: 'application/json' } })
			]);
			if (railRes.status === 'fulfilled' && railRes.value.ok) {
				const next = (await railRes.value.json()) as RailResponse;
				rail = next.rail;
				invitations = next.invitations;
			}
			if (panelRes.status === 'fulfilled' && panelRes.value.ok) {
				panel = (await panelRes.value.json()) as ChannelPanelVM;
			}
		}, 400);
	}

	// MARK: sending

	function enterToSend(event: KeyboardEvent) {
		if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
		event.preventDefault();
		(event.target as HTMLTextAreaElement).form?.requestSubmit();
	}

	function newClientId(): string {
		if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
		return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
	}

	async function send(event: SubmitEvent) {
		event.preventDefault();
		const body = draft.trim();
		if (!body) return;
		const clientId = newClientId();
		pending.push({ clientId, body, status: 'Sending…', failed: false });
		draft = '';
		input?.dispatchEvent(new Event('input'));
		await tick();
		scrollToBottom();
		void post(body, clientId);
	}

	async function post(body: string, clientId: string) {
		const find = () => pending.find((p) => p.clientId === clientId);
		const row = find();
		if (!row) return;
		row.status = 'Sending…';
		row.failed = false;
		const data = new FormData();
		data.set('body', body);
		data.set('client_id', clientId);
		let response: Response;
		try {
			response = await fetch(`${base}/messages`, {
				method: 'POST',
				body: data,
				headers: { 'X-Groups-Send': '1' },
				credentials: 'same-origin'
			});
		} catch {
			failed(clientId, "Couldn't send. Check your connection.");
			return;
		}
		if (!response.ok) {
			failed(clientId, (await response.text()).trim() || "Couldn't send.");
			return;
		}
		const sent = ((await response.json()) as RowsResponse).rows[0];
		pending = pending.filter((p) => p.clientId !== clientId);
		if (!sent) return;
		// The live stream may have delivered this message first.
		if (rows.some((r) => r.seq === sent.seq)) return;
		rows.push(sent);
		hasMessages = true;
		if (sent.seq > lastSeq) lastSeq = sent.seq;
		scheduleRead();
	}

	function failed(clientId: string, reason: string) {
		const row = pending.find((p) => p.clientId === clientId);
		if (!row) return;
		row.failed = true;
		row.status = reason.slice(0, 200) + ' ';
	}

	// MARK: reading

	function atBottom() {
		return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
	}

	function scrollToBottom() {
		scroller.scrollTop = scroller.scrollHeight;
	}

	// Opens at the "New messages" divider when there is one, else the end.
	function scrollToStart() {
		const divider = list.querySelector('[data-groups-new-divider]');
		if (divider) divider.scrollIntoView({ block: 'start' });
		else scrollToBottom();
	}

	// Marks the channel read up to the newest row, once the reader is at the
	// bottom of a visible page, at most every second.
	function scheduleRead() {
		clearTimeout(readTimer);
		readTimer = setTimeout(() => {
			if (document.visibilityState !== 'visible' || !atBottom()) return;
			if (lastSeq <= readSeq) return;
			const seq = lastSeq;
			readSeq = seq;
			const data = new FormData();
			data.set('seq', String(seq));
			fetch(`${base}/read`, { method: 'POST', body: data, credentials: 'same-origin' }).catch(() => {
				readSeq = 0;
			});
		}, 1000);
	}
</script>

<div class="groups-shell" data-group-id={initial.groupId} data-channel-id={initial.channelId}>
	<nav id="groups-rail" class="groups-rail" aria-label="Your groups">
		<Rail items={rail} {invitations} />
	</nav>
	<aside id="group-channels" class="groups-channels" aria-label="Channels">
		<ChannelPanel vm={panel} />
	</aside>
	<section class="groups-chat" aria-label={'#' + initial.channelName}>
		<header class="groups-chat-header">
			<a href="/groups" class="groups-back lg:hidden" aria-label="All groups">
				<Icon name="chevron-left" class="h-5 w-5" />
			</a>
			<details class="groups-channel-switcher lg:hidden">
				<summary class="flex items-center gap-1 font-semibold">
					<span class="text-muted-foreground">#</span>{initial.channelName}
					<Icon name="chevron-down" class="h-4 w-4" />
				</summary>
				<div class="groups-channel-switcher-menu">
					<p class="px-3 py-2 text-xs font-semibold text-muted-foreground">{initial.groupName}</p>
					{#each initial.channels as channel (channel.id)}
						<ChannelLink {channel} />
					{/each}
				</div>
			</details>
			<h1 class="hidden min-w-0 items-center gap-1 font-semibold lg:flex">
				<span class="text-muted-foreground">#</span>
				<span class="truncate">{initial.channelName}</span>
			</h1>
			{#if initial.channelTopic}
				<p class="hidden truncate text-sm text-muted-foreground xl:block">{initial.channelTopic}</p>
			{/if}
			<div class="ml-auto flex items-center gap-1">
				{#if initial.canInvite}
					<a
						href={'/groups/' + initial.groupId + '/settings#invite'}
						class="groups-icon-button"
						aria-label="Invite friends"
						title="Invite friends"
					>
						<Icon name="user-plus" class="h-4 w-4" />
					</a>
				{/if}
				<a href={'/groups/' + initial.groupId + '/settings'} class="groups-icon-button" aria-label="Group info" title="Group info">
					<Icon name="info" class="h-4 w-4" />
				</a>
			</div>
		</header>
		<Notices notice={initial.notice} error={initial.error} />
		<div class="groups-messages" data-groups-scroller bind:this={scroller}>
			<ol class="groups-message-list" data-groups-list aria-live="polite" bind:this={list}>
				{#if olderSeq > 0}
					{#key olderSeq}
						<li class="groups-older" data-groups-older {@attach olderSentinel}>
							<SkeletonBlock heightClass="h-10" />
						</li>
					{/key}
				{:else if showStart}
					<li class={['groups-channel-start', hasMessages && 'has-messages']} data-groups-start>
						<p class="text-lg font-semibold">Welcome to #{initial.channelName}</p>
						<p class="text-sm text-muted-foreground">
							{#if initial.channelTopic}
								{initial.channelTopic}
							{:else}
								This is the start of the channel.
							{/if}
						</p>
					</li>
				{/if}
				{#each rows as row, i (row.seq)}
					<MessageRowView {row} chat={base} showDay={showDays[i]} ondeleted={deleted} />
				{/each}
				{#each pending as row (row.clientId)}
					<li class={['groups-message groups-message-pending', row.failed && 'is-failed']} data-pending data-client-id={row.clientId}>
						<div class="groups-message-body">
							<p class="groups-message-text" data-pending-text>{row.body}</p>
							<p class="groups-message-status text-xs text-muted-foreground" data-pending-status>
								{row.status}{#if row.failed}<a
										href="#retry"
										class="font-medium underline"
										onclick={(e) => {
											e.preventDefault();
											// Same client id: if the first attempt did land, the
											// backend answers with that message instead of posting it twice.
											void post(row.body, row.clientId);
										}}>Retry</a
									>{/if}
							</p>
						</div>
					</li>
				{/each}
			</ol>
		</div>
		{#if initial.canPost}
			<form class="groups-composer" method="post" action={base + '/messages'} data-groups-composer onsubmit={send}>
				<TextareaField
					name="body"
					placeholder={'Message #' + initial.channelName}
					rows={1}
					autoResize
					required
					wrapperClass="flex-1"
					class="groups-composer-input"
					aria-label={'Message #' + initial.channelName}
					maxlength={2000}
					onkeydown={enterToSend}
					data-groups-input="true"
					bind:value={draft}
					bind:ref={input}
				/>
				<SubmitButton class="groups-send" aria-label="Send">
					<Icon name="send" class="h-4 w-4" />
				</SubmitButton>
			</form>
		{:else}
			<p class="groups-composer-blocked" data-groups-blocked>
				{#if initial.postBlocked}
					{initial.postBlocked}
				{:else}
					You can't post here right now.
				{/if}
			</p>
		{/if}
	</section>
</div>
