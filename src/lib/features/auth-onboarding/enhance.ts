// use:enhance for forms whose result is handled by the component rather than
// by page.form — the port of an hx-post that swapped a fragment in place, or
// that answered with HX-Redirect (a full page load).
import type { SubmitFunction } from '$app/forms';
import { goto } from '$app/navigation';
import { withSpinner } from '#lib/components/norviq/form-loading.js';

export interface EnhanceHandlers<T> {
	/** success and failure results: the action's returned data. */
	onData: (data: T, status: number) => void;
	/** An unexpected error result (thrown error / 5xx). */
	onError?: (message: string) => void;
	/** true: HX-Redirect semantics, a full page load. false: client navigation. */
	hardRedirect?: boolean;
	/** Called before the request goes out (e.g. to clear a banner). */
	onSubmit?: () => void;
}

export function enhanceInPlace<T>(h: EnhanceHandlers<T>): SubmitFunction {
	return withSpinner(() => {
		h.onSubmit?.();
		return async ({ result }) => {
			switch (result.type) {
				case 'redirect':
					if (h.hardRedirect) window.location.assign(result.location);
					else await goto(result.location, { invalidateAll: true });
					return;
				case 'success':
				case 'failure':
					h.onData((result.data ?? {}) as T, result.status);
					return;
				case 'error':
					h.onError?.(
						(result.error as { message?: string } | undefined)?.message || 'Something went wrong. Please try again.'
					);
					return;
			}
		};
	});
}
