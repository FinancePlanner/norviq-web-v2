import { tick } from 'svelte';
import type { ReceiptDraft, ReceiptDraftResponse } from './expenses/types.js';

// Port of norviq-web internal/server/assets/receipt-scan.js (Alpine
// `receiptScan`), used by the Record spend panel.
//
// Opens the camera via getUserMedia, decodes a fiscal receipt QR with the
// native BarcodeDetector API, sends the decoded string to the BFF parser
// (POST /expenses/receipt/parse-qr) and prefills the expense form. The image is
// never uploaded for QR — only the decoded string leaves the browser. The photo
// path uploads the image (multipart field "image") to POST /expenses/receipt/ocr.
//
// Same DOM contract as Go: the draft is written into #expense-title,
// #expense-amount, #expense-date and the hidden #receipt-* provenance fields.

interface BarcodeDetectorLike {
	detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

export class ReceiptScan {
	open = $state(false);
	error = $state('');
	scanning = false;
	video: HTMLVideoElement | null = $state(null);
	photoInput: HTMLInputElement | null = $state(null);
	#stream: MediaStream | null = null;
	#rafId: number | null = null;
	#detector: BarcodeDetectorLike | null = null;

	get supported(): boolean {
		return 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia;
	}

	async start() {
		this.error = '';
		if (!this.supported) {
			this.error = 'This browser can’t scan QR codes. Enter the expense manually.';
			this.open = true;
			return;
		}
		this.open = true;
		try {
			const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor })
				.BarcodeDetector;
			this.#detector = new Detector({ formats: ['qr_code'] });
			this.#stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' }
			});
			await tick();
			const video = this.video;
			if (!video) throw new Error('no video element');
			video.srcObject = this.#stream;
			await video.play();
			this.scanning = true;
			void this.#tick();
		} catch {
			this.error = 'Couldn’t access the camera. Check permissions or enter manually.';
			this.stop();
		}
	}

	async #tick() {
		if (!this.scanning || !this.#detector || !this.video) return;
		try {
			const codes = await this.#detector.detect(this.video);
			const value = codes && codes.length ? codes[0].rawValue : '';
			if (value) {
				await this.#submitPayload(value);
				return;
			}
		} catch {
			// Transient detect errors are ignored; keep scanning.
		}
		this.#rafId = requestAnimationFrame(() => void this.#tick());
	}

	async #submitPayload(payload: string) {
		this.scanning = false;
		try {
			const resp = await fetch('/expenses/receipt/parse-qr', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ payload })
			});
			if (!resp.ok) throw new Error(`status ${resp.status}`);
			const data = (await resp.json()) as ReceiptDraftResponse;
			if (!data.recognized || !data.draft) {
				this.error = 'That QR code isn’t a recognized receipt. Try another or enter manually.';
				this.scanning = true;
				void this.#tick();
				return;
			}
			this.applyDraft(data.draft);
			this.stop();
		} catch {
			this.error = 'Couldn’t read that receipt. Try again or enter manually.';
			this.scanning = true;
			void this.#tick();
		}
	}

	/** Photo OCR: upload the image and prefill from the extracted draft. */
	async submitPhoto(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files && input.files[0];
		if (!file) return;
		this.error = '';
		const form = new FormData();
		form.append('image', file, file.name || 'receipt.jpg');
		try {
			const resp = await fetch('/expenses/receipt/ocr', { method: 'POST', body: form });
			if (resp.status === 403) {
				// No AI consent yet: hand the user the consent page.
				const refusal = (await resp.json().catch(() => null)) as {
					reason?: string;
					consentUrl?: string;
				} | null;
				if (refusal?.reason === 'AI_CONSENT_REQUIRED' && refusal.consentUrl) {
					window.location.assign(refusal.consentUrl);
					return;
				}
			}
			if (!resp.ok) throw new Error(`status ${resp.status}`);
			const data = (await resp.json()) as ReceiptDraftResponse;
			if (!data.recognized || !data.draft) {
				this.error = 'Couldn’t read that receipt photo. Try another or enter manually.';
				return;
			}
			this.applyDraft(data.draft);
			this.stop();
		} catch {
			this.error = 'Couldn’t scan that photo. Try again or enter manually.';
		} finally {
			input.value = '';
		}
	}

	applyDraft(draft: ReceiptDraft) {
		const title = document.getElementById('expense-title') as HTMLInputElement | null;
		const amount = document.getElementById('expense-amount') as HTMLInputElement | null;
		const date = document.getElementById('expense-date') as HTMLInputElement | null;
		if (amount && typeof draft.total === 'number') amount.value = draft.total.toFixed(2);
		if (title) {
			if (draft.merchant) title.value = draft.merchant;
			else if (!title.value) title.value = draft.taxId ? `Receipt · ${draft.taxId}` : 'Receipt';
		}
		if (date && draft.date) date.value = draft.date;
		this.applyReceiptProvenance(draft);
	}

	// Merchant tax id, currency and the scan source have no visible input; the
	// hidden fields carry them so the server keeps the VAT trail.
	applyReceiptProvenance(draft: ReceiptDraft) {
		const set = (id: string, value: unknown) => {
			const el = document.getElementById(id) as HTMLInputElement | null;
			if (el) el.value = value === null || value === undefined ? '' : String(value);
		};
		set('receipt-source', draft.source || '');
		set('receipt-merchant', draft.merchant || '');
		set('receipt-tax-id', draft.taxId || '');
		set('receipt-currency', draft.currency || '');
		set('receipt-total', typeof draft.total === 'number' ? draft.total : '');
		set('receipt-vat-total', typeof draft.taxTotal === 'number' ? draft.taxTotal : '');
		set('receipt-issued-on', draft.date || '');
	}

	stop() {
		this.scanning = false;
		if (this.#rafId) {
			cancelAnimationFrame(this.#rafId);
			this.#rafId = null;
		}
		if (this.#stream) {
			this.#stream.getTracks().forEach((track) => track.stop());
			this.#stream = null;
		}
		this.open = false;
	}
}
