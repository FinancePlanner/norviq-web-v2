// Browser side of the terminal writes. Go sent each as an htmx request with
// form-encoded values; these send the same values to the same paths and get
// the region's data back as JSON. Like htmx 4, a non-2xx answer changes
// nothing on the page (the Go handlers answered every outcome as a 200).

export async function terminalSend<T>(
	method: string,
	url: string,
	values: Record<string, string> | FormData = {}
): Promise<T | null> {
	const body = new URLSearchParams();
	if (values instanceof FormData) {
		for (const [k, v] of values) if (typeof v === 'string') body.append(k, v);
	} else {
		for (const [k, v] of Object.entries(values)) body.append(k, v);
	}
	let res: Response;
	try {
		res = await fetch(url, {
			method,
			body,
			headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }
		});
	} catch (err) {
		console.warn('terminal request failed', method, url, err);
		return null;
	}
	if (res.redirected && !res.headers.get('content-type')?.includes('application/json')) {
		// The session expired: hooks sent the request to the login page.
		window.location.href = res.url;
		return null;
	}
	if (!res.ok) return null;
	try {
		return (await res.json()) as T;
	} catch {
		return null;
	}
}
