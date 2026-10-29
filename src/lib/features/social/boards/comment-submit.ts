import { goto } from '$app/navigation';
import { applyAction, type SubmitFunction } from '$app/forms';
import { withSpinner } from '#lib/components/norviq/index.js';
import { pathEscape, postURL, type PostRow } from './boards.js';

/**
 * Enhanced comment/reply post. Go answers /boards/p/{id}#c-{comment}, which
 * then redirects to the post's real address; a browser keeps the #c- fragment
 * through that hop, SvelteKit's client router does not. The page already
 * knows the real address, so it goes there directly with the same fragment.
 * A refusal shows on the post page, like Go's 422 re-render.
 */
export function commentSubmit(post: PostRow): SubmitFunction {
	return withSpinner(() => async ({ result, update, formElement }) => {
		if (result.type === 'redirect') {
			const target = new URL(result.location, window.location.href);
			if (target.pathname === '/boards/p/' + pathEscape(post.id)) {
				formElement.reset();
				await goto(postURL(post) + target.hash, { invalidateAll: true });
				return;
			}
		}
		// The action lives on another route, so the default update() would not
		// apply a failure here; apply it so the post page shows the reason.
		if (result.type === 'failure' || result.type === 'error') {
			await applyAction(result);
			return;
		}
		await update();
	});
}
