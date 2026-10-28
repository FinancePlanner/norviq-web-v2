import type { Cookies } from '@sveltejs/kit';

// Stateless replacement for norviq-web's scs session (internal/session).
//
// The Go web kept the session server-side and handed the browser an opaque
// id. A Worker has no shared memory, so the whole session travels in the
// cookie instead, sealed with AES-GCM under a key derived from SESSION_SECRET.
// The browser can neither read nor forge it; rotating SESSION_SECRET logs
// everyone out, exactly as wiping the scs store did.
//
// Tokens alone are ~1.5 KB, so the sealed value is split across numbered
// cookies when it would cross the 4 KB per-cookie limit.

export const SESSION_COOKIE = 'nq_session';
const CHUNK = 3800;
const MAX_CHUNKS = 4;

export interface AuthState {
	accessToken: string;
	refreshToken: string;
	tokenExpiresAt: number; // unix seconds
	refreshExpiresAt: number; // unix seconds
	userId: string;
	username: string;
	email: string;
}

export interface MFAChallenge {
	challengeId: string;
	maskedDestination: string;
	resendAvailableIn: number;
}

export interface SessionData {
	auth?: AuthState;
	mfa?: MFAChallenge;
	// Small per-session UI state the Go web kept in scs: guided start step,
	// once-per-session banners, OAuth state, onboarding resume point, … Keyed
	// by the same names as internal/session so ported code reads naturally.
	flags: Record<string, unknown>;
	lastSeen: number; // unix seconds; enforces SESSION_IDLE_TIMEOUT_MINUTES
}

const enc = new TextEncoder();
const dec = new TextDecoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

function key(secret: string): Promise<CryptoKey> {
	let k = keyCache.get(secret);
	if (!k) {
		k = (async () => {
			const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'HKDF', false, [
				'deriveKey'
			]);
			return crypto.subtle.deriveKey(
				{ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('norviq-web-v2'), info: enc.encode('session') },
				base,
				{ name: 'AES-GCM', length: 256 },
				false,
				['encrypt', 'decrypt']
			);
		})();
		keyCache.set(secret, k);
	}
	return k;
}

function b64url(bytes: Uint8Array): string {
	let s = '';
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(s: string): Uint8Array {
	const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

export async function seal(data: SessionData, secret: string): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ct = new Uint8Array(
		await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(secret), enc.encode(JSON.stringify(data)))
	);
	const out = new Uint8Array(iv.length + ct.length);
	out.set(iv);
	out.set(ct, iv.length);
	return b64url(out);
}

export async function unseal(value: string, secret: string): Promise<SessionData | null> {
	try {
		const raw = unb64url(value);
		const pt = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: raw.slice(0, 12) },
			await key(secret),
			raw.slice(12)
		);
		const data = JSON.parse(dec.decode(pt)) as SessionData;
		data.flags ??= {};
		return data;
	} catch {
		return null;
	}
}

function readRaw(cookies: Cookies): string {
	const single = cookies.get(SESSION_COOKIE);
	if (single) return single;
	let out = '';
	for (let i = 0; i < MAX_CHUNKS; i++) {
		const part = cookies.get(`${SESSION_COOKIE}.${i}`);
		if (!part) break;
		out += part;
	}
	return out;
}

export interface SessionOptions {
	secret: string;
	secure: boolean;
	idleMinutes: number;
}

export class Session {
	data: SessionData;
	#cookies: Cookies;
	#opts: SessionOptions;

	constructor(cookies: Cookies, data: SessionData | null, opts: SessionOptions) {
		this.#cookies = cookies;
		this.#opts = opts;
		this.data = data ?? { flags: {}, lastSeen: 0 };
	}

	static async load(cookies: Cookies, opts: SessionOptions): Promise<Session> {
		const raw = readRaw(cookies);
		let data = raw ? await unseal(raw, opts.secret) : null;
		const now = Math.floor(Date.now() / 1000);
		if (data && data.lastSeen && now - data.lastSeen > opts.idleMinutes * 60) data = null;
		const s = new Session(cookies, data, opts);
		// Refresh the idle clock at most once a minute, so most requests
		// don't re-issue the cookie.
		if (data && now - data.lastSeen > 60) await s.save();
		return s;
	}

	get auth(): AuthState | undefined {
		return this.data.auth;
	}

	get isAuthenticated(): boolean {
		return !!this.data.auth?.accessToken;
	}

	get accessToken(): string {
		return this.data.auth?.accessToken ?? '';
	}

	get<T = unknown>(flag: string): T | undefined {
		return this.data.flags[flag] as T | undefined;
	}

	async set(flag: string, value: unknown): Promise<void> {
		if (value === undefined || value === null) delete this.data.flags[flag];
		else this.data.flags[flag] = value;
		await this.save();
	}

	async remove(...flags: string[]): Promise<void> {
		for (const f of flags) delete this.data.flags[f];
		await this.save();
	}

	async saveAuth(resp: {
		token: string;
		refreshToken: string;
		expiresIn: number;
		refreshExpiresIn: number;
		userId: string;
		username: string;
		email: string;
	}): Promise<void> {
		const now = Math.floor(Date.now() / 1000);
		this.data.auth = {
			accessToken: resp.token,
			refreshToken: resp.refreshToken,
			tokenExpiresAt: now + resp.expiresIn,
			refreshExpiresAt: now + resp.refreshExpiresIn,
			userId: resp.userId,
			username: resp.username,
			email: resp.email
		};
		delete this.data.mfa;
		await this.save();
	}

	async saveMFA(challenge: MFAChallenge): Promise<void> {
		this.data.mfa = challenge;
		await this.save();
	}

	async clearMFA(): Promise<void> {
		delete this.data.mfa;
		await this.save();
	}

	// Equivalent of sm.Destroy: drops auth and every flag.
	async destroy(): Promise<void> {
		this.data = { flags: {}, lastSeen: 0 };
		this.#clearCookies();
	}

	async save(): Promise<void> {
		this.data.lastSeen = Math.floor(Date.now() / 1000);
		const sealed = await seal(this.data, this.#opts.secret);
		const base = {
			path: '/',
			httpOnly: true,
			secure: this.#opts.secure,
			sameSite: 'lax' as const,
			maxAge: this.#opts.idleMinutes * 60
		};
		this.#clearCookies();
		if (sealed.length <= CHUNK) {
			this.#cookies.set(SESSION_COOKIE, sealed, base);
			return;
		}
		const parts = Math.ceil(sealed.length / CHUNK);
		if (parts > MAX_CHUNKS) throw new Error(`session too large: ${sealed.length} bytes`);
		for (let i = 0; i < parts; i++) {
			this.#cookies.set(`${SESSION_COOKIE}.${i}`, sealed.slice(i * CHUNK, (i + 1) * CHUNK), base);
		}
	}

	#clearCookies() {
		const opts = { path: '/', secure: this.#opts.secure };
		if (this.#cookies.get(SESSION_COOKIE)) this.#cookies.delete(SESSION_COOKIE, opts);
		for (let i = 0; i < MAX_CHUNKS; i++) {
			const name = `${SESSION_COOKIE}.${i}`;
			if (this.#cookies.get(name)) this.#cookies.delete(name, opts);
		}
	}
}
