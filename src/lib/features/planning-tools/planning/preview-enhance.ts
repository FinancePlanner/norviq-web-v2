import type { SubmitFunction } from '$app/forms';
import { goto } from '$app/navigation';

// The Go planners and the simulator post their form with
//   hx-post=".../preview" hx-target="#…-result" hx-swap="innerHTML" hx-indicator="#…-result"
// so only the results panel is replaced and the form being typed into is left
// alone. The action lives on the /preview route (which also renders the whole
// page for a no-JS post, as Go did), so `use:enhance` here posts cross-route
// and hands the returned view model to `onData` instead of applying it.
// hx-indicator put `.htmx-request` on the result container, not on the form.
//
// htmx swapped nothing on a 4xx/5xx; neither does this.
export function previewEnhance<T>(
	indicator: () => HTMLElement | null | undefined,
	onData: (data: T) => void
): SubmitFunction {
	return () => {
		const el = indicator();
		el?.classList.add('htmx-request');
		return async ({ result }) => {
			el?.classList.remove('htmx-request');
			if (result.type === 'success' && result.data) onData(result.data as T);
			else if (result.type === 'redirect') await goto(result.location);
		};
	};
}
