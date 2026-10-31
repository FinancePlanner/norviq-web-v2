import type { SubmitFunction } from '$app/forms';
import { goto } from '$app/navigation';
import { withSpinner } from '#lib/components/norviq/form-loading.js';

// The Go planner loaded each form into #expense-action-panel with hx-get and
// posted it with hx-post/hx-put (hx-target the panel, outerHTML). Success sent
// HX-Redirect; a validation error re-rendered the panel. Here the panel is a
// component fed by preloadData() of the fragment route, and its forms post
// cross-route to that route's actions. This enhance callback reproduces the
// htmx contract: failure → re-render the panel from result.data.vm, redirect →
// close the dialog and navigate (invalidating, as HX-Redirect reloaded).

export const PANEL_CLOSE_EVENT = 'expense-action-close';

export function closeExpensePanel() {
	window.dispatchEvent(new CustomEvent(PANEL_CLOSE_EVENT));
}

export function panelEnhance<T>(
	onVM: (vm: T) => void,
	onError?: (status: number, message: string) => void
): SubmitFunction {
	return withSpinner(() => async ({ result }) => {
		if (result.type === 'redirect') {
			closeExpensePanel();
			await goto(result.location, { invalidateAll: true });
		} else if (result.type === 'failure') {
			const vm = (result.data as { vm?: T } | undefined)?.vm;
			if (vm) onVM(vm);
			else
				onError?.(
					result.status,
					String((result.data as { message?: string } | undefined)?.message ?? '')
				);
		} else if (result.type === 'error') {
			const err = result.error as { message?: string; proGate?: string } | undefined;
			onError?.(result.status ?? 500, err?.proGate ?? err?.message ?? '');
		} else if (result.type === 'success') {
			closeExpensePanel();
			await goto(location.href, { invalidateAll: true });
		}
	});
}
