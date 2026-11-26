import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ImageAttachments } from './attachments.svelte.js';
import { ImageUnreadable } from './images.js';

const image = (name: string) => new File([new Uint8Array([1])], name, { type: 'image/png' });
const make = (prepare = (file: File) => Promise.resolve(file)) =>
	new ImageAttachments({ prepare, tooMany: 'Attach up to 3 images.' });

const revokeObjectURL = vi.fn<(url: string) => void>();

beforeEach(() => {
	let n = 0;
	revokeObjectURL.mockClear();
	vi.stubGlobal('URL', {
		createObjectURL: vi.fn<() => string>(() => `blob:${n++}`),
		revokeObjectURL
	});
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
	const a = make(() => Promise.reject(new ImageUnreadable('That image is too large.')));
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
	expect(revokeObjectURL).not.toHaveBeenCalled();
	await a.add([image('b')]);
	a.restore(sent);
	expect(a.items.map((i) => i.file.name)).toEqual(['a', 'b']);
});

test('release and clear revoke thumbnails', async () => {
	const a = make();
	await a.add([image('a'), image('b')]);
	const sent = a.take();
	a.release(sent);
	expect(revokeObjectURL).toHaveBeenCalledTimes(2);
	await a.add([image('c')]);
	a.clear();
	expect(a.items).toHaveLength(0);
	expect(revokeObjectURL).toHaveBeenCalledTimes(3);
});

const doc = (name: string, type = '', size = 10) =>
	new File([new Uint8Array(size)], name, { type });
const withDocs = () => {
	const a = new ImageAttachments({
		prepare: (f) => Promise.resolve(f),
		tooMany: 'Attach up to 3 images.',
		tooManyFiles: 'Attach up to 3 files.'
	});
	a.documentsEnabled = true;
	return a;
};

test('documents on: accepts a PDF and a CSV as chips beside images', async () => {
	const a = withDocs();
	await a.add([image('a.png'), doc('b.pdf', 'application/pdf'), doc('c.csv', 'text/csv')]);
	expect(a.items.map((i) => [i.file.name, i.kind])).toEqual([
		['a.png', 'image'],
		['b.pdf', 'pdf'],
		['c.csv', 'csv']
	]);
	expect(a.items[1].url).toBe('');
	expect(a.error).toBe('');
});

test('documents off: a PDF or CSV is ignored', async () => {
	const a = make();
	await a.add([doc('b.pdf', 'application/pdf'), doc('c.csv', 'text/csv')]);
	expect(a.items).toHaveLength(0);
	expect(a.error).toBe('');
});

test('images and documents share the three-file cap', async () => {
	const a = withDocs();
	await a.add([image('1'), image('2'), doc('b.pdf', 'application/pdf'), doc('c.csv', 'text/csv')]);
	expect(a.items).toHaveLength(3);
	expect(a.full).toBe(true);
	expect(a.error).toBe('Attach up to 3 files.');
});

test('a second PDF, an oversized CSV and an unsupported file are refused inline', async () => {
	const a = withDocs();
	await a.add([doc('a.pdf', 'application/pdf')]);
	await a.add([doc('b.pdf', 'application/pdf')]);
	expect(a.error).toBe('Attach one PDF at a time.');
	await a.add([doc('big.csv', 'text/csv', (1 << 20) + 1)]);
	expect(a.error).toBe('big.csv is too large.');
	await a.add([doc('n.txt', 'text/plain')]);
	expect(a.error).toBe('Only images, PDFs and CSV files are supported.');
	expect(a.items.map((i) => i.file.name)).toEqual(['a.pdf']);
});

test('documents without images: images are ignored, only PDF and CSV are offered', async () => {
	const a = withDocs();
	a.imagesEnabled = false;
	await a.add([image('a.png'), doc('c.csv', 'text/csv')]);
	expect(a.items.map((i) => i.file.name)).toEqual(['c.csv']);
	expect(a.accept).toBe('application/pdf,text/csv,.csv');
});

test('documents leave no thumbnail to revoke', async () => {
	const a = withDocs();
	await a.add([doc('c.csv', 'text/csv')]);
	a.clear();
	expect(revokeObjectURL).not.toHaveBeenCalled();
});
