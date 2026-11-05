// window.streamAssistantTurn from norviq-web internal/pages/assistant/assistant.templ,
// minus the DOM: it posts the composer to POST /assistant/conversations/{id}/stream
// (the BFF relay in routes/(app)/assistant/conversations/[id]/stream/+server.ts)
// and reads the backend's SSE frames as they arrive.
//
// Frames: `started`, `tool` {label}, `error` {message, code?}, `turn` (the reply
// is stored; reload the transcript), `done`.
//
// Statuses that are not frames: 429 (rate limit), 413 (body too large) and 503
// (large-image slots full) come from middleware before the stream opens. Everything the turn itself refuses
// (a bad image, a missing plan) is an `error` frame inside a 200 stream.

import type { MuseChat } from './muse.svelte.js';
import type { AIConsentRefusal } from './types.js';

export interface StreamTurnOptions {
	conversationId: string;
	body: FormData;
	muse: MuseChat;
	/**
	 * The response is a stream: clear the composer (Go's form.reset()). The
	 * stream opens before the turn runs, so an error frame can still follow;
	 * the caller keeps a snapshot (composer.ts) to restore from.
	 */
	onAccepted: () => void;
	/** The `turn` frame: re-render the conversation (Go's htmx.ajax swap). */
	onTurn: () => Promise<void>;
	/**
	 * An `error` frame with code AI_CONSENT_REQUIRED: put up the inline consent
	 * card (AssistantPage), as the BFF's refusal does on a conversation load.
	 */
	onConsentRequired?: () => void;
	/** Navigation hook, so tests need no window. */
	assign?: (url: string) => void;
}

const UNAVAILABLE = 'Assistant unavailable';
export const IMAGE_TOO_LARGE = 'That image is too large.';
export const TOO_MANY_REQUESTS = 'Too many requests. Wait a minute and try again.';
/** The BFF's 402 also fires for text turns, and for a Pro user when the plan lookup fails. */
export const PLAN_NOT_CONFIRMED = 'Your plan could not be confirmed. Try again in a moment.';
export const IMAGES_BUSY = 'Too many large images right now. Try again in a moment.';
export const UPGRADE_REQUIRED = 'Attaching images is part of Pro. Upgrade to use it.';

/** The line to show for an `error` frame. Image refusals carry their real reason. */
export const CONSENT_REQUIRED_CODE = 'AI_CONSENT_REQUIRED';

export function errorFrameText(data: Record<string, unknown>): string {
	if (data.code === 'upgrade_required') return UPGRADE_REQUIRED;
	return String(data.message || UNAVAILABLE);
}

function parseData(line: string | undefined): Record<string, unknown> {
	try {
		return line ? (JSON.parse(line.slice(5)) as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

/**
 * Runs one streamed turn. Resolves with the error line to show ('' when the
 * turn was answered, or when the page is navigating to the consent page).
 */
export async function streamAssistantTurn(opts: StreamTurnOptions): Promise<string> {
	const { muse } = opts;
	muse.begin();
	try {
		const response = await fetch(`/assistant/conversations/${opts.conversationId}/stream`, {
			method: 'POST',
			body: opts.body,
			headers: { Accept: 'text/event-stream' }
		});
		if (response.status === 402) throw new Error(PLAN_NOT_CONFIRMED);
		if (response.status === 413) throw new Error(IMAGE_TOO_LARGE);
		if (response.status === 429) throw new Error(TOO_MANY_REQUESTS);
		if (response.status === 503) {
			// All large-image slots are taken: the BFF relays only the backend's JSON reason, as text.
			const reason = (await response.text().catch(() => '')).trim();
			throw new Error(reason || UNAVAILABLE);
		}
		if (response.status === 403) {
			// AI consent was withdrawn (perhaps on another device): go to the
			// consent page rather than show a generic failure.
			const refusal = (await response.json().catch(() => null)) as AIConsentRefusal | null;
			if (refusal && refusal.reason === 'AI_CONSENT_REQUIRED' && refusal.consentUrl) {
				(opts.assign ?? ((url) => window.location.assign(url)))(refusal.consentUrl);
				return '';
			}
			if ((refusal as { code?: string } | null)?.code === 'upgrade_required') {
				throw new Error(UPGRADE_REQUIRED);
			}
		}
		if (!response.ok || !response.body) throw new Error(UNAVAILABLE);
		opts.onAccepted();
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let pending = '';
		let answered = false;
		try {
			while (true) {
				const result = await reader.read();
				if (result.done) break;
				pending += decoder.decode(result.value, { stream: true });
				let boundary: number;
				while ((boundary = pending.indexOf('\n\n')) >= 0) {
					const frame = pending.slice(0, boundary);
					pending = pending.slice(boundary + 2);
					const lines = frame.split('\n');
					const eventLine = lines.find((line) => line.startsWith('event:'));
					const dataLine = lines.find((line) => line.startsWith('data:'));
					const kind = eventLine ? eventLine.slice(6).trim() : '';
					if (kind === 'started') muse.begin();
					if (kind === 'tool') muse.tool(parseData(dataLine).label);
					if (kind === 'error') {
						const data = parseData(dataLine);
						if (data.code === CONSENT_REQUIRED_CODE) opts.onConsentRequired?.();
						throw new Error(errorFrameText(data));
					}
					if (kind === 'turn') {
						await opts.onTurn();
						answered = true;
						// After the swap: it re-renders the header at idle.
						muse.celebrate();
					}
				}
			}
		} finally {
			reader.cancel().catch(() => {});
		}
		if (!answered) throw new Error(UNAVAILABLE);
		return '';
	} catch (error) {
		muse.fail();
		return (error instanceof Error && error.message) || UNAVAILABLE;
	}
}
