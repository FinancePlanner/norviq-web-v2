import { json, type RequestEvent } from '@sveltejs/kit';
import type { components } from '#lib/api/schema.js';
import { apiFetch, apiJSON, isAPIError } from '#lib/server/api.js';
import { aiConsentRequiredJSON, aiConsentReturnPath, hasAIConsent } from '#lib/features/dashboard/ai-consent.server.js';
import type {
	ActionOutcome,
	ActionRow,
	ConversationViewModel,
	MessageRow,
	PageViewModel,
	WatchProposalRow,
	WatchResultViewModel
} from './types.js';

// Port of norviq-web internal/handlers/assistant.go (loaders and mappers) and
// the memo helpers it borrows from position_memos.go.

type Schemas = components['schemas'];
type AIConversationSummary = Schemas['AIConversationSummaryResponse'];
type AIConversation = Schemas['AIConversationResponse'];
type AIMessage = Schemas['AIMessageResponse'];
type AIPendingAction = Schemas['AIPendingActionResponse'];
type AIConfirmedAction = Schemas['AIConfirmedActionResponse'];
type AIUsage = Schemas['AIAssistantUsageResponse'];
type AITip = Schemas['AITipResponse'];
type AITurn = Schemas['AIAssistantTurnResponse'];

/** api.PositionMemoListItem (internal/api/position_memos.go). */
interface PositionMemoListItem {
	id: string;
	askedSymbol: string;
	primarySymbol: string;
	title: string;
	verdict: string;
	bookmarked: boolean;
	createdAt: string;
}

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

/** uuid.Parse: canonical lower-case form, or null. */
export function parseUUID(raw: string | null | undefined): string | null {
	const value = (raw ?? '').trim();
	const bare = value.replace(/^urn:uuid:/i, '').replace(/^\{(.*)\}$/, '$1');
	if (!UUID_RE.test(bare)) return null;
	const hex = bare.replace(/-/g, '').toLowerCase();
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// The Go web formatted with time.Local, which is UTC in its container; a
// Worker is UTC too. Pinned so a dev machine renders the same strings.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n: number) => String(n).padStart(2, '0');

/** Go layout "15:04". */
export function clock(raw: string | Date): string {
	const d = new Date(raw);
	if (Number.isNaN(d.getTime())) return '';
	return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

/** Go layout "2 Jan · 15:04". */
function dayClock(raw: string): string {
	const d = new Date(raw);
	if (Number.isNaN(d.getTime())) return '';
	return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} · ${clock(d)}`;
}

/** time.Kitchen, "3:04PM". */
function kitchen(raw: string): string {
	const d = new Date(raw);
	if (Number.isNaN(d.getTime())) return '';
	const h = d.getUTCHours();
	return `${h % 12 === 0 ? 12 : h % 12}:${pad2(d.getUTCMinutes())}${h < 12 ? 'AM' : 'PM'}`;
}

const statusOf = (err: unknown) => (isAPIError(err) ? err.status : 0);

/**
 * assistantUpstreamMessage: a banner that names the real problem, since a
 * swallowed upstream failure reads as "the chat is broken".
 */
export function assistantUpstreamMessage(status: number): string {
	switch (status) {
		case 401:
		case 403:
			return 'Your session expired. Sign in again to use the assistant.';
		case 429:
			return 'Too many assistant requests. Try again in a minute.';
		case 502:
		case 503:
		case 504:
			return 'The assistant service is temporarily unavailable. Try again shortly.';
		case 0:
			return 'The assistant service could not be reached.';
		default:
			return `Conversations could not be loaded (upstream error ${status}).`;
	}
}

/** loadAssistantPage. */
export async function loadAssistantPage(event: RequestEvent): Promise<PageViewModel> {
	const vm: PageViewModel = {
		conversations: [],
		active: null,
		tips: [],
		usage: { label: 'AI preview', remaining: 'Usage unavailable', isPro: false },
		errorMessage: ''
	};
	let conversations: AIConversationSummary[];
	try {
		conversations = (await apiJSON<AIConversationSummary[]>(event, 'GET', '/v1/ai/assistant/conversations')) ?? [];
	} catch (err) {
		const status = statusOf(err);
		console.error('assistant conversations load failed', { status, err });
		vm.errorMessage = assistantUpstreamMessage(status);
		return vm;
	}
	let activeID = parseUUID(event.url.searchParams.get('conversation'));
	if (activeID === NIL_UUID) activeID = null;
	if (!activeID && conversations.length > 0) activeID = conversations[0].id;
	for (const item of conversations) {
		vm.conversations.push({
			id: item.id,
			title: item.title,
			updatedAt: dayClock(item.updatedAt),
			active: item.id.toLowerCase() === activeID
		});
	}

	const [active, usage, tips] = await Promise.all([
		activeID ? loadAssistantConversation(event, activeID) : Promise.resolve(null),
		apiJSON<AIUsage>(event, 'GET', '/v1/ai/assistant/usage').catch(() => null),
		apiJSON<AITip[]>(event, 'GET', '/v1/ai/assistant/tips').catch(() => null)
	]);
	if (active) {
		active.seed = (event.url.searchParams.get('seed') ?? '').trim();
		vm.active = active;
	}
	if (usage) {
		vm.usage.isPro = usage.isPro;
		if (usage.isPro) {
			vm.usage.label = 'Pro assistant';
			vm.usage.remaining = `${usage.used} requests this month · unlimited`;
		} else {
			vm.usage.label = 'Free preview';
			vm.usage.remaining = `${usage.remaining ?? 0} requests remaining`;
		}
	}
	for (const tip of tips ?? []) {
		vm.tips.push({
			id: tip.id,
			kind: tip.kind,
			title: tip.title,
			body: tip.body,
			importance: tip.importance,
			actionPath: tip.actionPath ?? ''
		});
	}
	return vm;
}

/** loadAssistantConversation. Null when the conversation could not be loaded. */
export async function loadAssistantConversation(event: RequestEvent, id: string): Promise<ConversationViewModel | null> {
	let conversation: AIConversation;
	try {
		conversation = await apiJSON<AIConversation>(event, 'GET', `/v1/ai/assistant/conversations/${id}`);
	} catch (err) {
		console.error('assistant conversation load failed', { conversation_id: id, status: statusOf(err), err });
		return null;
	}
	const source = conversation.messages ?? [];
	const vm: ConversationViewModel = { id, title: conversation.title, messages: source.map(mapAssistantMessage), seed: '' };
	await Promise.all([attachConversationMemos(event, id, vm.messages), attachPendingActions(event, id, source, vm.messages)]);
	return vm;
}

/**
 * attachPendingActions redraws the confirmation cards still waiting in this
 * thread. The stream path re-renders the whole conversation on its `turn`
 * frame, so the card is rebuilt from GET /v1/ai/assistant/actions. A failure
 * only costs the cards, never the thread.
 */
async function attachPendingActions(event: RequestEvent, conversationID: string, source: AIMessage[], messages: MessageRow[]) {
	let actions: AIPendingAction[];
	try {
		actions = (await apiJSON<AIPendingAction[]>(event, 'GET', '/v1/ai/assistant/actions')) ?? [];
	} catch (err) {
		console.warn('assistant pending actions load failed', { conversation_id: conversationID, status: statusOf(err), err });
		return;
	}
	attachActionsToMessages(conversationID, source, messages, actions);
}

/**
 * attachActionsToMessages hangs each pending action of this conversation on
 * the assistant message its turn produced: the first assistant message written
 * at or after the action. An action newer than every message goes on the last
 * assistant message, so a card is never dropped.
 */
export function attachActionsToMessages(
	conversationID: string,
	source: AIMessage[],
	messages: MessageRow[],
	actions: AIPendingAction[]
) {
	let lastAssistant = -1;
	source.forEach((m, i) => {
		if (m.role === 'assistant') lastAssistant = i;
	});
	if (lastAssistant < 0 || source.length !== messages.length) return;
	const time = (s: string) => new Date(s).getTime();
	// Oldest first, so when two actions land on one message the newer wins.
	const sorted = [...actions].sort((a, b) => time(a.createdAt) - time(b.createdAt));
	for (const action of sorted) {
		if (action.status !== 'pending' || !action.conversationId) continue;
		if (action.conversationId.toLowerCase() !== conversationID.toLowerCase()) continue;
		let target = lastAssistant;
		for (let i = 0; i < source.length; i++) {
			if (source[i].role === 'assistant' && !(time(source[i].createdAt) < time(action.createdAt))) {
				target = i;
				break;
			}
		}
		messages[target].action = mapAssistantAction(action);
	}
}

/**
 * attachConversationMemos adds memo cards to messages that announced a memo.
 * Only called when some message looks like an announcement, so ordinary
 * conversations cost no extra request.
 */
export async function attachConversationMemos(event: RequestEvent, conversationID: string, messages: MessageRow[]) {
	const announced = messages.some((m) => m.role === 'assistant' && memoAnnouncementSymbol(m.content) !== null);
	if (!announced) return;
	let memos: PositionMemoListItem[];
	try {
		memos = (await apiJSON<PositionMemoListItem[]>(event, 'GET', '/v1/ai/memos', undefined, { query: { conversationId: conversationID } })) ?? [];
	} catch (err) {
		console.warn('conversation memos fetch failed', { conversation_id: conversationID, err });
		return;
	}
	attachMemoCards(messages, memos);
}

/**
 * attachMemoCards puts each memo written in this conversation on the assistant
 * message that announced it ("Memo on SYMBOL is ready."), matched by symbol in
 * the order they were written.
 */
export function attachMemoCards(messages: MessageRow[], memos: PositionMemoListItem[]) {
	if (memos.length === 0) return;
	const queues = new Map<string, PositionMemoListItem[]>();
	// The list is newest first; pair oldest memo with oldest message.
	for (let i = memos.length - 1; i >= 0; i--) {
		const symbol = memos[i].primarySymbol.toUpperCase();
		queues.set(symbol, [...(queues.get(symbol) ?? []), memos[i]]);
	}
	for (const message of messages) {
		if (message.role !== 'assistant') continue;
		const symbol = memoAnnouncementSymbol(message.content);
		const queue = symbol ? queues.get(symbol) : undefined;
		if (!queue || queue.length === 0) continue;
		const memo = queue.shift()!;
		message.memo = { id: memo.id, title: memo.title, verdict: memo.verdict, bookmarked: memo.bookmarked };
	}
}

export function memoAnnouncementSymbol(content: string): string | null {
	const text = content.trim();
	if (!text.startsWith('Memo on ') || !text.endsWith(' is ready.')) return null;
	const symbol = text.slice('Memo on '.length, text.length - ' is ready.'.length);
	if (!symbol || /[ \n]/.test(symbol)) return null;
	return symbol.toUpperCase();
}

export function mapAssistantMessage(message: AIMessage): MessageRow {
	return {
		id: message.id,
		role: message.role,
		content: message.content,
		createdAt: clock(message.createdAt),
		caption: assistantCaption(message)
	};
}

/**
 * assistantCaption is the line above a proactive agent bubble. A missing
 * origin means a reply, and a user turn never carries one.
 */
function assistantCaption(message: AIMessage): string {
	if (message.role !== 'assistant' || message.origin !== 'proactive') return '';
	const label = (message.sourceLabel ?? '').trim();
	return label || 'From Vig';
}

/** The pending-action tool name of a proposed standing task. */
const CREATE_WATCH_TOOL = 'create_watch';

export function mapAssistantAction(action: AIPendingAction): ActionRow {
	const row: ActionRow = { id: action.id, summary: action.summary, expiresAt: kitchen(action.expiresAt), status: action.status };
	if (action.toolName === CREATE_WATCH_TOOL) row.watch = watchProposalFromArguments(action.arguments, action.summary);
	return row;
}

/**
 * watchProposalFromArguments redraws a standing-task card from the stored
 * create_watch arguments (a JSON string). Unreadable arguments still give a
 * card, titled with the action summary.
 */
function watchProposalFromArguments(args: string, summary: string): WatchProposalRow {
	let stored: { title?: unknown; scheduleHuman?: unknown; spec?: unknown } = {};
	try {
		const parsed = JSON.parse(args);
		if (parsed && typeof parsed === 'object') stored = parsed;
	} catch (err) {
		console.warn('create_watch arguments unreadable', err);
	}
	const str = (v: unknown) => (typeof v === 'string' ? v : '');
	const title = str(stored.title);
	return { title: title.trim() === '' ? summary : title, scheduleHuman: str(stored.scheduleHuman), spec: str(stored.spec) };
}

/** watchProposalFromForm: the proposal the card posted back with its button. */
export function watchProposalFromForm(form: FormData): WatchProposalRow {
	const v = (k: string) => String(form.get(k) ?? '').trim();
	return { title: v('title'), scheduleHuman: v('schedule'), spec: v('spec') };
}

/** Reads a request's form body; an unreadable body is an empty form, like r.FormValue. */
export async function formOf(event: RequestEvent): Promise<FormData> {
	try {
		return await event.request.formData();
	} catch {
		return new FormData();
	}
}

/**
 * The AI-consent gate (RequireAIConsent) for the script-called endpoints: a
 * 403 with the backend's JSON shape plus consentUrl, or null when allowed.
 */
export async function aiConsentRefusal(event: RequestEvent): Promise<Response | null> {
	if (await hasAIConsent(event)) return null;
	return json(aiConsentRequiredJSON(aiConsentReturnPath(event, { self: false })), { status: 403 });
}

/** AssistantTurn: one non-streamed turn, answered as the new message row. */
export async function assistantTurn(event: RequestEvent, id: string, content: string): Promise<MessageRow> {
	const turn = await apiJSON<AITurn>(event, 'POST', `/v1/ai/assistant/conversations/${id}/chat`, { content });
	const message = mapAssistantMessage(turn.message);
	if (turn.pendingAction) {
		const action = mapAssistantAction(turn.pendingAction);
		const proposal = turn.watchProposal;
		if (proposal) action.watch = { title: proposal.title, scheduleHuman: proposal.scheduleHuman, spec: proposal.spec };
		message.action = action;
	}
	const messages = [message];
	await attachConversationMemos(event, id, messages);
	return messages[0];
}

/** AssistantConfirmAction. */
export async function confirmAction(event: RequestEvent, id: string, form: FormData): Promise<ActionOutcome> {
	let confirmed: AIConfirmedAction | null = null;
	let status = 0;
	try {
		confirmed = await apiJSON<AIConfirmedAction>(event, 'POST', `/v1/ai/assistant/actions/${id}/confirm`);
		status = 200;
	} catch (err) {
		status = statusOf(err);
	}
	if (String(form.get('kind') ?? '') === 'watch') return watchConfirmOutcome(id, watchProposalFromForm(form), status, confirmed);
	const success = confirmed !== null;
	return { kind: 'result', vm: { id, success, message: success ? confirmed!.message : 'The action could not be applied.' } };
}

/**
 * renderWatchConfirm: success swaps the card to its set-up state and appends
 * the agent's confirmation to the thread; a 409 means the action was already
 * handled (a double click or a second tab).
 */
function watchConfirmOutcome(id: string, watch: WatchProposalRow, status: number, confirmed: AIConfirmedAction | null): ActionOutcome {
	const vm: WatchResultViewModel = { id, state: 'confirmed', title: watch.title, message: '' };
	if (confirmed) {
		vm.message = 'Set up';
		if (watch.scheduleHuman) vm.message += ' · ' + watch.scheduleHuman;
		const replyID = 'watch-' + (confirmed.resultId ?? id);
		const text = (confirmed.message ?? '').trim();
		if (text) vm.reply = { id: replyID, role: 'assistant', content: text, createdAt: clock(new Date()), caption: 'Standing task' };
		return { kind: 'watchResult', vm };
	}
	if (status === 409) {
		vm.state = 'existing';
		vm.message = 'Already set up. Nothing more to do.';
		return { kind: 'watchResult', vm };
	}
	return { kind: 'watchCard', id, watch, error: 'That did not go through. Try again.' };
}

/** Sends a bodyless request and returns its status (0 when it never arrived). */
async function noContent(event: RequestEvent, method: string, path: string): Promise<number> {
	try {
		const res = await apiFetch(event, method, path);
		await res.body?.cancel();
		return res.status;
	} catch {
		return 0;
	}
}

/** AssistantDismissTip: true when the backend answered 204. */
export async function dismissTip(event: RequestEvent, id: string): Promise<boolean> {
	return (await noContent(event, 'DELETE', `/v1/ai/assistant/tips/${id}`)) === 204;
}

/** AssistantCancelAction. */
export async function cancelAction(event: RequestEvent, id: string, form: FormData): Promise<ActionOutcome> {
	const success = (await noContent(event, 'POST', `/v1/ai/assistant/actions/${id}/cancel`)) === 204;
	if (String(form.get('kind') ?? '') === 'watch') {
		const watch = watchProposalFromForm(form);
		if (!success) return { kind: 'watchCard', id, watch, error: 'That did not go through. Try again.' };
		return { kind: 'watchResult', vm: { id, state: 'declined', title: watch.title, message: 'Not set up. Ask again any time.' } };
	}
	return { kind: 'result', vm: { id, success, message: success ? 'Action canceled.' : 'The action could not be canceled.' } };
}
