import type { SubmitFunction } from '$app/forms';

/**
 * The Go web's only form-loading mechanism is css/loading.css keyed on
 * `form.htmx-request [data-nq-submit]` (and `.btn-primary[type=submit]`).
 * htmx put `htmx-request` on the form while a request was in flight; this does
 * the same for SvelteKit's `use:enhance`, so SubmitButton's spinner keeps working:
 *
 *   <form method="POST" action="?/save" use:enhance={withSpinner()}>
 *   <form … use:enhance={withSpinner(({ formData }) => { …; return async ({ update }) => update(); })}>
 */
export function withSpinner(submit?: SubmitFunction): SubmitFunction {
	return async (input) => {
		const form = input.formElement;
		form.classList.add('htmx-request');
		const cancel = input.cancel;
		input.cancel = () => {
			form.classList.remove('htmx-request');
			cancel();
		};
		const after = await submit?.(input);
		return async (opts) => {
			try {
				if (after) await after(opts);
				else await opts.update();
			} finally {
				form.classList.remove('htmx-request');
			}
		};
	};
}
