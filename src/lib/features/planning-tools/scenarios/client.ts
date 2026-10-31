// Browser side of the scenario fragment endpoints. The Go page used hx-post /
// hx-delete with `noSwap: [204, 304, "4xx", "5xx"]` (components/htmx.templ),
// so a failed request changed nothing on the page; these helpers return null
// in that case. One exception, see `formError`.

export type FragmentResult<T> =
	| { kind: 'ok'; data: T }
	| { kind: 'redirect'; to: string }
	| { kind: 'formError'; message: string }
	| null;

async function send<T>(method: string, url: string, body?: FormData): Promise<FragmentResult<T>> {
	let res: Response;
	try {
		res = await fetch(url, { method, body, headers: { accept: 'application/json' } });
	} catch {
		return null;
	}
	const type = res.headers.get('content-type') ?? '';
	if (!type.includes('application/json')) return null;
	let data: unknown;
	try {
		data = await res.json();
	} catch {
		return null;
	}
	// The 422 FormError fragment: htmx 4 discarded it (noSwap "4xx"), which left
	// the validation message unseen. The templ clearly meant it to show, so v2
	// renders it in the same target.
	if (
		res.status === 422 &&
		data &&
		typeof (data as { formError?: unknown }).formError === 'string'
	) {
		return { kind: 'formError', message: (data as { formError: string }).formError };
	}
	if (!res.ok) return null;
	if (data && typeof (data as { redirect?: unknown }).redirect === 'string') {
		return { kind: 'redirect', to: (data as { redirect: string }).redirect };
	}
	return { kind: 'ok', data: data as T };
}

export const postForm = <T>(url: string, form: FormData) => send<T>('POST', url, form);
export const deleteRequest = <T>(url: string) => send<T>('DELETE', url);
