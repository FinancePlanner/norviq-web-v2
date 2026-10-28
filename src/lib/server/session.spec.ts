import { describe, expect, it } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { seal, unseal, Session, SESSION_COOKIE, type SessionData } from './session.js';

function jar(initial: Record<string, string> = {}) {
	const store = new Map(Object.entries(initial));
	const cookies = {
		get: (n: string) => store.get(n),
		getAll: () => [...store].map(([name, value]) => ({ name, value })),
		set: (n: string, v: string) => void store.set(n, v),
		delete: (n: string) => void store.delete(n),
		serialize: () => ''
	} as unknown as Cookies;
	return { cookies, store };
}

const opts = { secret: 'test-secret', secure: false, idleMinutes: 120 };

describe('session', () => {
	it('round-trips sealed data and rejects a wrong key', async () => {
		const data: SessionData = { flags: { a: 1 }, lastSeen: 5 };
		const sealed = await seal(data, 'k1');
		expect(await unseal(sealed, 'k1')).toEqual(data);
		expect(await unseal(sealed, 'k2')).toBeNull();
		expect(await unseal(sealed.slice(0, -2) + 'AA', 'k1')).toBeNull();
	});

	it('saves auth and reloads it from cookies', async () => {
		const { cookies } = jar();
		const s = await Session.load(cookies, opts);
		await s.saveAuth({ token: 'a', refreshToken: 'r', expiresIn: 60, refreshExpiresIn: 120, userId: 'u', username: 'n', email: 'e' });
		const again = await Session.load(cookies, opts);
		expect(again.accessToken).toBe('a');
		expect(again.auth?.username).toBe('n');
	});

	it('chunks large sessions across cookies', async () => {
		const { cookies, store } = jar();
		const s = await Session.load(cookies, opts);
		await s.set('big', 'x'.repeat(6000));
		expect(store.has(SESSION_COOKIE)).toBe(false);
		expect(store.has(`${SESSION_COOKIE}.0`) && store.has(`${SESSION_COOKIE}.1`)).toBe(true);
		const again = await Session.load(cookies, opts);
		expect(again.get<string>('big')?.length).toBe(6000);
	});

	it('expires after the idle timeout', async () => {
		const sealed = await seal({ flags: {}, lastSeen: Math.floor(Date.now() / 1000) - 121 * 60, auth: undefined }, opts.secret);
		const { cookies } = jar({ [SESSION_COOKIE]: sealed });
		const s = await Session.load(cookies, opts);
		expect(s.data.lastSeen).toBe(0);
	});
});
