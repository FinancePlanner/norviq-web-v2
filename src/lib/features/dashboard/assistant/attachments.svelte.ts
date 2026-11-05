// Images waiting to go with the Quick Q card's next question, each with a
// thumbnail URL. Full Q's Workspace keeps the same rules inline.

import { ImageUnreadable, MAX_CHAT_IMAGES, prepareChatImage } from './images.js';

export interface Attachment {
	key: number;
	file: File;
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

	constructor(opts: { prepare?: (file: File) => Promise<File>; tooMany: string }) {
		this.#prepare = opts.prepare ?? prepareChatImage;
		this.#tooMany = opts.tooMany;
	}

	get full(): boolean {
		return this.items.length + this.preparing >= MAX_CHAT_IMAGES;
	}

	/** Keeps the images among `picked`, up to the limit, downscaled for the turn. */
	async add(picked: File[]) {
		const images = picked.filter((file) => file.type.startsWith('image/'));
		if (images.length === 0) return;
		this.error = '';
		const room = Math.max(MAX_CHAT_IMAGES - this.items.length - this.preparing, 0);
		if (images.length > room) this.error = this.#tooMany;
		const take = images.slice(0, room);
		this.preparing += take.length;
		for (const file of take) {
			try {
				const prepared = await this.#prepare(file);
				this.items.push({
					key: this.#nextKey++,
					file: prepared,
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
		if (gone) URL.revokeObjectURL(gone.url);
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
		for (const a of sent) URL.revokeObjectURL(a.url);
	}

	clear() {
		this.release(this.items);
		this.items = [];
		this.error = '';
	}
}
