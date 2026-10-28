// Port of norviq-web internal/utils (redirect.go, series.go, templui.go).
//
// Not ported, on purpose: ScriptVersion/ScriptURL/ComponentScript and
// SetupScriptRoutes load templUI's per-component JS bundles, which v2 replaces
// with shadcn-svelte components (Vite fingerprints and loads their code).
import { redirect } from '@sveltejs/kit';
import { twMerge as merge } from 'tailwind-merge';

/**
 * Whether path would redirect off-site: anything that does not start with a
 * single "/" ("//evil.com" is protocol-relative). An empty path is allowed,
 * as in Go.
 */
export function isUnsafeRedirect(path: string): boolean {
	if (path === '') return false;
	return !path.startsWith('/') || path.startsWith('//');
}

/** The path SafeRedirect would send the browser to: path itself, or "/" when it is unsafe. */
export function safeRedirectPath(path: string): string {
	return isUnsafeRedirect(path) ? '/' : path;
}

/**
 * utils.SafeRedirect for SvelteKit: throws redirect(status, path) after the
 * open-redirect check. Use in load functions, actions and +server handlers.
 */
export function safeRedirect(status: 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308, path: string): never {
	redirect(status, safeRedirectPath(path));
}

/**
 * utils.SortTimeSeries: sorts in place, ascending by time. Same exchange sort
 * as Go (not stable), so items with equal timestamps end up in the same order.
 */
export function sortTimeSeries<T>(series: T[], getTime: (item: T) => Date | number): void {
	const t = (item: T) => {
		const v = getTime(item);
		return typeof v === 'number' ? v : v.getTime();
	};
	for (let i = 0; i < series.length; i++) {
		for (let j = i + 1; j < series.length; j++) {
			if (t(series[j]) < t(series[i])) [series[i], series[j]] = [series[j], series[i]];
		}
	}
}

/** utils.TwMerge: combines Tailwind classes and resolves conflicts (same as cn() without clsx). */
export function twMerge(...classes: string[]): string {
	return merge(...classes);
}

/** utils.If: value when condition holds, else the zero value ('' for strings). */
export function ifValue(condition: boolean, value: string): string;
export function ifValue<T>(condition: boolean, value: T): T | undefined;
export function ifValue<T>(condition: boolean, value: T): T | string | undefined {
	if (condition) return value;
	return typeof value === 'string' ? '' : undefined;
}

/** utils.IfElse. */
export function ifElse<T>(condition: boolean, trueValue: T, falseValue: T): T {
	return condition ? trueValue : falseValue;
}

/** utils.MergeAttributes: later attributes win. */
export function mergeAttributes(...attrs: Array<Record<string, unknown> | null | undefined>): Record<string, unknown> {
	return Object.assign({}, ...attrs.filter(Boolean));
}

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** utils.RandomID: "id-" + 26 random base32 characters (Go's crypto/rand.Text). */
export function randomID(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(26));
	let out = 'id-';
	for (const b of bytes) out += BASE32[b & 31];
	return out;
}
