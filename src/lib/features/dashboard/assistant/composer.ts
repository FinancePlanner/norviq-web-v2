// What happens to the composer around one turn. The box is cleared when the
// stream opens, which is before the turn runs, so a refused image or a failed
// turn arrives after it was cleared. The snapshot taken at send time is what
// brings the text and images back, and its thumbnails are kept alive until the
// turn is known to have been stored.

export interface ComposerState<T> {
	content: string;
	attachments: T[];
}

/**
 * Decides what to do with a snapshot once streamAssistantTurn has returned.
 * `accepted` is whether the stream opened (so the box was cleared) and `error`
 * is the line it returned ('' when the turn was answered).
 *
 *   not accepted           nothing was cleared: nothing to restore, nothing to discard
 *   accepted, error        restore the snapshot; its thumbnails stay in use
 *   accepted, no error     the message is stored: discard the snapshot's thumbnails
 */
export function settleComposer<T>(
	snapshot: ComposerState<T>,
	turn: { accepted: boolean; error: string }
): { restore: ComposerState<T> | null; discard: T[] } {
	if (!turn.accepted) return { restore: null, discard: [] };
	if (turn.error !== '') return { restore: snapshot, discard: [] };
	return { restore: null, discard: snapshot.attachments };
}

/** Puts a snapshot back in front of whatever was typed since. */
export function mergeRestored<T>(
	snapshot: ComposerState<T>,
	current: ComposerState<T>
): ComposerState<T> {
	return {
		content: [snapshot.content, current.content].filter((t) => t !== '').join('\n'),
		attachments: [...snapshot.attachments, ...current.attachments]
	};
}
