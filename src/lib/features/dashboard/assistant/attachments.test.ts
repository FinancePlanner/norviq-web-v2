import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ImageAttachments } from './attachments.svelte.js';
import { ImageUnreadable } from './images.js';

const image = (name: string) => new File([new Uint8Array([1])], name, { type: 'image/png' });
const make = (prepare = async (file: File) => file) =>
	new ImageAttachments({ prepare, tooMany: 'Attach up to 3 images.' });

beforeEach(() => {
	let n = 0;
	vi.stubGlobal('URL', { createObjectURL: vi.fn(() => `blob:${n++}`), revokeObjectURL: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

test('keeps images and ignores other files', async () => {
	const a = make();
	await a.add([image('a.png'), new File(['x'], 'notes.pdf', { type: 'application/pdf' })]);
	expect(a.items.map((i) => i.file.name)).toEqual(['a.png']);
	expect(a.error).toBe('');
});

test('stops at three and says so', async () => {
	const a = make();
	await a.add([image('1'), image('2'), image('3'), image('4')]);
	expect(a.items).toHaveLength(3);
	expect(a.full).toBe(true);
	expect(a.error).toBe('Attach up to 3 images.');
});

test('an unreadable image shows its reason and takes no slot', async () => {
	const a = make(async () => {
		throw new ImageUnreadable('That image is too large.');
	});
	await a.add([image('big.png')]);
	expect(a.items).toHaveLength(0);
	expect(a.preparing).toBe(0);
	expect(a.error).toBe('That image is too large.');
});

test('take empties the box without revoking, restore puts them back first', async () => {
	const a = make();
	await a.add([image('a')]);
	const sent = a.take();
	expect(a.items).toHaveLength(0);
	expect(URL.revokeObjectURL).not.toHaveBeenCalled();
	await a.add([image('b')]);
	a.restore(sent);
	expect(a.items.map((i) => i.file.name)).toEqual(['a', 'b']);
});

test('release and clear revoke thumbnails', async () => {
	const a = make();
	await a.add([image('a'), image('b')]);
	const sent = a.take();
	a.release(sent);
	expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
	await a.add([image('c')]);
	a.clear();
	expect(a.items).toHaveLength(0);
	expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
});
