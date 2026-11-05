import { describe, expect, test } from 'vitest';
import { mergeRestored, settleComposer } from './composer.js';

const snap = { content: 'what is this', attachments: ['a', 'b'] };

describe('settleComposer', () => {
	test('a stream that never opened changes nothing', () => {
		expect(
			settleComposer(snap, { accepted: false, answered: false, error: 'That image is too large.' })
		).toEqual({
			restore: null,
			discard: []
		});
		// A consent redirect returns '' without opening the stream.
		expect(settleComposer(snap, { accepted: false, answered: false, error: '' })).toEqual({
			restore: null,
			discard: []
		});
	});
	test('an error after the stream opened restores the text and keeps the thumbnails alive', () => {
		const out = settleComposer(snap, {
			accepted: true,
			answered: false,
			error: 'Only JPEG, PNG, WebP and GIF.'
		});
		expect(out.restore).toBe(snap);
		expect(out.discard).toEqual([]);
	});
	test('an error after the turn frame is not a failed turn: nothing stored is restored', () => {
		expect(
			settleComposer(snap, { accepted: true, answered: true, error: 'The reload failed.' })
		).toEqual({ restore: null, discard: ['a', 'b'] });
	});
	test('an answered turn discards the thumbnails and restores nothing', () => {
		expect(settleComposer(snap, { accepted: true, answered: true, error: '' })).toEqual({
			restore: null,
			discard: ['a', 'b']
		});
	});
});

describe('mergeRestored', () => {
	test('puts the snapshot in front of text typed since', () => {
		expect(mergeRestored(snap, { content: 'also', attachments: ['c'] })).toEqual({
			content: 'what is this\nalso',
			attachments: ['a', 'b', 'c']
		});
	});
	test('an empty box just gets the snapshot back', () => {
		expect(mergeRestored(snap, { content: '', attachments: [] })).toEqual(snap);
	});
});
