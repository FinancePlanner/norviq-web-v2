import { goto } from '$app/navigation';

// The Go forms here were hx-post with an HX-Redirect on success and a bare
// error status otherwise (which htmx did not swap). This posts the form the
// same way: a redirect navigates, anything else leaves the page as it is.
export async function postAndFollow(e: SubmitEvent) {
	e.preventDefault();
	const form = e.currentTarget as HTMLFormElement;
	try {
		const res = await fetch(form.action, {
			method: 'POST',
			body: new FormData(form),
			headers: { Accept: 'text/html' }
		});
		if (res.ok && res.redirected) {
			const url = new URL(res.url);
			await goto(url.pathname + url.search, { invalidateAll: true });
		}
	} catch (err) {
		console.warn('form post failed', form.action, err);
	}
}
