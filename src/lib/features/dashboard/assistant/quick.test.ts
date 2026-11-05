import { describe, expect, test, vi } from 'vitest';
import {
	createQuickConversation,
	forgetConversation,
	latestExchange,
	quickQAllowedOn,
	storeConversation,
	storedConversation
} from './quick.js';
import { PLAN_NOT_CONFIRMED, TOO_MANY_REQUESTS } from './stream.js';
import type { MessageRow } from './types.js';

const row = (id: string, role: string): MessageRow => ({
	id,
	role,
	content: id,
	createdAt: '',
	caption: ''
});

describe('quickQAllowedOn', () => {
	test.each(['/dashboard', '/expenses', '/portfolio/allocation', '/groups', '/assistants'])(
		'shows on %s',
		(path) => expect(quickQAllowedOn(path)).toBe(true)
	);
	test.each([
		'/assistant',
		'/assistant/conversations',
		'/ai-consent',
		'/groups/abc',
		'/groups/new'
	])('hides on %s', (path) => expect(quickQAllowedOn(path)).toBe(false));
});

describe('latestExchange', () => {
	test('starts at the last question', () => {
		const messages = [
			row('a', 'user'),
			row('b', 'assistant'),
			row('c', 'user'),
			row('d', 'assistant')
		];
		expect(latestExchange(messages).map((m) => m.id)).toEqual(['c', 'd']);
	});
	test('is empty before any question', () => {
		expect(latestExchange([row('a', 'assistant')])).toEqual([]);
	});
});

describe('stored conversation', () => {
	function memory() {
		const values = new Map<string, string>();
		return {
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => void values.set(key, value),
			removeItem: (key: string) => void values.delete(key)
		};
	}
	test('round trips and forgets', () => {
		const storage = memory();
		expect(storedConversation(storage)).toBeNull();
		storeConversation(storage, 'c1');
		expect(storedConversation(storage)).toBe('c1');
		forgetConversation(storage);
		expect(storedConversation(storage)).toBeNull();
	});
	test('a blocked store reads as nothing stored', () => {
		const blocked = {
			getItem: () => {
				throw new Error('denied');
			},
			setItem: () => {
				throw new Error('denied');
			},
			removeItem: () => {
				throw new Error('denied');
			}
		};
		expect(storedConversation(blocked)).toBeNull();
		expect(() => storeConversation(blocked, 'c1')).not.toThrow();
		expect(() => forgetConversation(blocked)).not.toThrow();
	});
});

describe('createQuickConversation', () => {
	const answering = (response: Response) => vi.fn(async () => response) as unknown as typeof fetch;
	const assign = vi.fn();

	test('returns the new id', async () => {
		const request = answering(Response.json({ id: 'c1' }));
		await expect(createQuickConversation(request, assign)).resolves.toBe('c1');
	});
	test('leaves for the consent page when consent is missing', async () => {
		const go = vi.fn();
		const request = answering(
			Response.json(
				{ reason: 'AI_CONSENT_REQUIRED', consentUrl: '/ai-consent?next=%2Fdashboard' },
				{ status: 403 }
			)
		);
		await expect(createQuickConversation(request, go)).resolves.toBeNull();
		expect(go).toHaveBeenCalledWith('/ai-consent?next=%2Fdashboard');
	});
	test.each([
		[402, PLAN_NOT_CONFIRMED],
		[429, TOO_MANY_REQUESTS],
		[502, 'Assistant unavailable']
	])('a %i throws the line to show', async (status, line) => {
		const request = answering(new Response('', { status }));
		await expect(createQuickConversation(request, assign)).rejects.toThrow(line);
	});
	test('an answer without an id is a failure', async () => {
		const request = answering(Response.json({}));
		await expect(createQuickConversation(request, assign)).rejects.toThrow('Assistant unavailable');
	});
});
