// Files (images, and PDF or CSV chips when documents are on) waiting to go with the Quick Q card's next question, each with a
// thumbnail URL. Full Q's Workspace keeps the same rules inline.

import {
	acceptTypes,
	checkDocument,
	documentKind,
	ImageUnreadable,
	MAX_CHAT_IMAGES,
	prepareChatImage,
	UNSUPPORTED_FILE,
	type AttachmentKind
} from './images.js';

export interface Attachment {
	key: number;
	file: File;
	kind: AttachmentKind;
	/** Thumbnail of an image; empty for a document, which shows as a chip. */
	url: string;
}

const UNREADABLE = "This image format can't be read. Try a PNG or JPEG.";

export class ImageAttachments {
	items = $state<Attachment[]>([]);
	/** Images still being downscaled. Each holds a slot, so a second drop cannot overshoot. */
	preparing = $state(0);
	error = $state('');
	#nextKey = 0;
	#prepare: (file: File) => Promise<File>;
	#tooMany: string;
	#tooManyFiles: string;
	/** What the backend takes on a turn, from its preferences. */
	imagesEnabled = $state(true);
	documentsEnabled = $state(false);

	constructor(opts: {
		prepare?: (file: File) => Promise<File>;
		tooMany: string;
		tooManyFiles?: string;
	}) {
		this.#prepare = opts.prepare ?? prepareChatImage;
		this.#tooMany = opts.tooMany;
		this.#tooManyFiles = opts.tooManyFiles ?? opts.tooMany;
	}

	get accept(): string {
		return acceptTypes(this.imagesEnabled, this.documentsEnabled);
	}

	get full(): boolean {
		return this.items.length + this.preparing >= MAX_CHAT_IMAGES;
	}

	/** Keeps the files among `picked` the backend takes, up to the limit; images are downscaled for the turn. */
	async add(picked: File[]) {
		const wanted = picked.filter(
			(file) =>
				(this.imagesEnabled && file.type.startsWith('image/')) ||
				(this.documentsEnabled && documentKind(file) !== null)
		);
		this.error = '';
		if (this.documentsEnabled && wanted.length < picked.length) this.error = UNSUPPORTED_FILE;
		if (wanted.length === 0) return;
		const room = Math.max(MAX_CHAT_IMAGES - this.items.length - this.preparing, 0);
		if (wanted.length > room) {
			this.error = this.documentsEnabled ? this.#tooManyFiles : this.#tooMany;
		}
		const take = wanted.slice(0, room);
		this.preparing += take.length;
		for (const file of take) {
			try {
				const kind = documentKind(file);
				if (kind) {
					const refusal = checkDocument(
						file,
						kind,
						this.items.map((a) => a.kind)
					);
					if (refusal) this.error = refusal;
					else this.items.push({ key: this.#nextKey++, file, kind, url: '' });
					continue;
				}
				const prepared = await this.#prepare(file);
				this.items.push({
					key: this.#nextKey++,
					file: prepared,
					kind: 'image',
					url: URL.createObjectURL(prepared)
				});
			} catch (error) {
				this.error = error instanceof ImageUnreadable ? error.message : UNREADABLE;
			} finally {
				this.preparing--;
			}
		}
	}

	remove(key: number) {
		const gone = this.items.find((a) => a.key === key);
		if (gone?.url) URL.revokeObjectURL(gone.url);
		this.items = this.items.filter((a) => a.key !== key);
	}

	/** Hands the images to a turn. Their thumbnails stay alive until `restore` or `release`. */
	take(): Attachment[] {
		const taken = this.items;
		this.items = [];
		return taken;
	}

	/** The turn failed: its images go back in front of any added since. */
	restore(sent: Attachment[]) {
		this.items = [...sent, ...this.items];
	}

	/** The turn was stored: its thumbnails are no longer shown. */
	release(sent: Attachment[]) {
		for (const a of sent) if (a.url) URL.revokeObjectURL(a.url);
	}

	clear() {
		this.release(this.items);
		this.items = [];
		this.error = '';
	}
}
