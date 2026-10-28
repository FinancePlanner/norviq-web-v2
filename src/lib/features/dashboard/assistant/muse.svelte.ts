// window.museChat from norviq-web internal/pages/assistant/assistant.templ:
// the Muse header state (avatar data-state + status line), per the shared
// contract's "Avatar states + status copy". One instance per assistant page;
// MuseHeader reads `avatar` and `status`.

export type MuseAvatarState = 'idle' | 'listening' | 'working' | 'celebrating' | 'failed';

const READY = 'Ready';
const CELEBRATE_MS = 1200;
const FAILED_MS = 2400;

/**
 * "Reading your expenses…" -> "is reading your expenses". The API's labels
 * are sentence-case with an ellipsis; the pill reads as a continuation of the
 * name above it, capped at 32 characters.
 */
export function toolStatus(label: unknown): string {
	let phrase =
		String(label ?? '')
			.trim()
			.replace(/(…|\.\.\.)$/, '')
			.trim() || 'working';
	phrase = phrase.charAt(0).toLowerCase() + phrase.slice(1);
	if (phrase.length > 32) phrase = phrase.slice(0, 31).trimEnd() + '…';
	return 'is ' + phrase;
}

export class MuseChat {
	avatar = $state<MuseAvatarState>('idle');
	status = $state(READY);
	#timer: ReturnType<typeof setTimeout> | null = null;
	#busy = false;

	#paint(state: MuseAvatarState, text: string) {
		this.avatar = state;
		this.status = text;
	}

	#show(state: MuseAvatarState, text: string, idleAfter = 0) {
		if (this.#timer) clearTimeout(this.#timer);
		this.#timer = null;
		this.#paint(state, text);
		if (idleAfter) {
			this.#timer = setTimeout(() => {
				this.#timer = null;
				this.#paint('idle', READY);
			}, idleAfter);
		}
	}

	/**
	 * Go re-rendered the header at idle on every swap of #assistant-workspace
	 * while the closure's busy flag and timer carried on; this is that swap.
	 */
	rerender() {
		this.#paint('idle', READY);
	}

	begin() {
		this.#busy = true;
		this.#show('working', 'is thinking');
	}
	tool(label: unknown) {
		if (this.#busy) this.#show('working', toolStatus(label));
	}
	celebrate() {
		this.#busy = false;
		this.#show('celebrating', READY, CELEBRATE_MS);
	}
	fail() {
		this.#busy = false;
		this.#show('failed', 'hit a snag', FAILED_MS);
	}
	/** Composer focus. Never interrupts a turn or a timed state. */
	listen() {
		if (!this.#busy && !this.#timer) this.#show('listening', 'is listening');
	}
	unlisten() {
		if (!this.#busy && !this.#timer) this.#show('idle', READY);
	}

	destroy() {
		if (this.#timer) clearTimeout(this.#timer);
		this.#timer = null;
	}
}
