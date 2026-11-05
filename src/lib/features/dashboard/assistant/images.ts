// Prepares a picked image for a chat turn in the browser: decode, scale the
// long edge to 1568 px, flatten onto white and re-encode as JPEG under 5 MB.

export const MAX_CHAT_IMAGES = 3;
export const MAX_CHAT_IMAGE_BYTES = 5 << 20;
const MAX_EDGE = 1568;
const QUALITIES = [0.8, 0.7, 0.6, 0.5];

export class ImageUnreadable extends Error {
	constructor(message = "This image format can't be read. Try a PNG or JPEG.") {
		super(message);
		this.name = 'ImageUnreadable';
	}
}

/** Fits (w, h) inside maxEdge on the long edge, keeping aspect. Never upscales. */
export function scaledSize(
	w: number,
	h: number,
	maxEdge: number = MAX_EDGE
): { width: number; height: number } {
	const longest = Math.max(w, h);
	if (longest <= maxEdge) return { width: w, height: h };
	const scale = maxEdge / longest;
	return {
		width: Math.max(1, Math.round(w * scale)),
		height: Math.max(1, Math.round(h * scale))
	};
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
	return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/** Throws ImageUnreadable for a file the browser cannot decode (HEIC in Chrome) or that stays over 5 MB. */
export async function prepareChatImage(file: File): Promise<File> {
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		throw new ImageUnreadable();
	}
	try {
		const { width, height } = scaledSize(bitmap.width, bitmap.height);
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new ImageUnreadable();
		// Transparent PNGs would turn black as JPEG.
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, width, height);
		ctx.drawImage(bitmap, 0, 0, width, height);
		for (const quality of QUALITIES) {
			const blob = await toBlob(canvas, quality);
			if (!blob) throw new ImageUnreadable();
			if (blob.size <= MAX_CHAT_IMAGE_BYTES) {
				const name = (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg';
				return new File([blob], name, { type: 'image/jpeg' });
			}
		}
		throw new ImageUnreadable('That image is too large.');
	} finally {
		bitmap.close();
	}
}
