// View models of norviq-web internal/pages/assistant/viewmodel.go. Shared by
// the server loaders (assistant.server.ts) and the Svelte components, and
// sent as JSON by the fragment endpoints that replace the Go HTML fragments.

export interface PageViewModel {
	conversations: ConversationRow[];
	active: ConversationViewModel | null;
	tips: TipRow[];
	usage: UsageViewModel;
	errorMessage: string;
}

export interface ConversationRow {
	id: string;
	title: string;
	updatedAt: string;
	active: boolean;
}

export interface ConversationViewModel {
	id: string;
	title: string;
	messages: MessageRow[];
	/** Prefills the composer (from a suggestion chip); the user still sends it. */
	seed: string;
}

export interface MessageRow {
	id: string;
	role: string;
	content: string;
	createdAt: string;
	/** The 11px uppercase line above a proactive agent bubble. Empty on replies and user turns. */
	caption: string;
	action?: ActionRow | null;
	memo?: MemoCardRow | null;
}

/** The position memo a turn wrote. */
export interface MemoCardRow {
	id: string;
	title: string;
	verdict: string;
	bookmarked: boolean;
}

export interface ActionRow {
	id: string;
	summary: string;
	expiresAt: string;
	status: string;
	/** Set for a create_watch action: rendered as the standing-task card. */
	watch?: WatchProposalRow | null;
}

/** A standing task the assistant offers to create. */
export interface WatchProposalRow {
	title: string;
	scheduleHuman: string;
	spec: string;
}

export type WatchResultState = 'confirmed' | 'existing' | 'declined' | 'failed';

/** Replaces a standing-task card once it was answered. */
export interface WatchResultViewModel {
	id: string;
	state: WatchResultState;
	title: string;
	message: string;
	/** The agent's "Got it — I'll watch …" message, appended to the transcript. */
	reply?: MessageRow | null;
}

export interface TipRow {
	id: string;
	kind: string;
	title: string;
	body: string;
	importance: number;
	actionPath: string;
}

export interface UsageViewModel {
	label: string;
	remaining: string;
	isPro: boolean;
}

export interface ActionResultViewModel {
	id: string;
	success: boolean;
	message: string;
}

/**
 * What POST /assistant/actions/{id}/confirm|cancel answers with: the fragment
 * the Go handler rendered into #assistant-action-{id}, as data.
 */
export type ActionOutcome =
	| { kind: 'result'; vm: ActionResultViewModel }
	| { kind: 'watchResult'; vm: WatchResultViewModel }
	| { kind: 'watchCard'; id: string; watch: WatchProposalRow; error: string };

/** The JSON refusal a script caller gets without AI consent (RenderAIConsentRequired). */
export interface AIConsentRefusal {
	error: true;
	reason: 'AI_CONSENT_REQUIRED';
	consentUrl: string;
}
