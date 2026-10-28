import type { Attachment } from 'svelte/attachments';
import { invalidateAll } from '$app/navigation';
import { capture } from './analytics/index.js';
import { isPro, type BillingContext } from './billing.js';

// Port of norviq-web internal/server/assets/billing.js (RevenueCat web billing).
//
// Same DOM contract as the Go page, so markup ports 1:1: put the attachment on
// the element Go rendered as #subscription-root, with
//   data-rc-api-key, data-app-user-id, data-restore-url (default /billing/restore),
//   data-continue-url (onboarding paywall only)
// and inside it [data-action="purchase"][data-product-id], [data-action="paywall"]
// + #paywall-container, [data-rc-price="<productId>"]. Errors go to #billing-error.
//
//   <div id="subscription-root" data-rc-api-key={key} ... {@attach billingPage()}>
//
// Differences from Go: the status refresh after a purchase is invalidateAll()
// instead of an htmx swap of #billing-status, and the settle poll reads
// /api/v1/billing/me instead of the /settings/subscription/status fragment.

type Purchases = typeof import('@revenuecat/purchases-js').Purchases;
type Offerings = Awaited<ReturnType<InstanceType<Purchases>['getOfferings']>>;
type Package = NonNullable<Offerings['current']>['availablePackages'][number];

let purchasesModule: Promise<Purchases> | null = null;
function loadPurchases(): Promise<Purchases> {
	purchasesModule ??= import('@revenuecat/purchases-js').then((m) => m.Purchases);
	return purchasesModule;
}

export function billingPage(): Attachment<HTMLElement> {
	return (root) => {
		const apiKey = root.dataset.rcApiKey;
		const appUserId = root.dataset.appUserId;
		const restoreURL = root.dataset.restoreUrl || '/billing/restore';
		let configured: InstanceType<Purchases> | null = null;

		async function ensureConfigured(): Promise<InstanceType<Purchases> | null> {
			if (configured) return configured;
			if (!apiKey || !appUserId) return null;
			const Purchases = await loadPurchases();
			configured = Purchases.configure({ apiKey, appUserId });
			return configured;
		}

		const cleanups: Array<() => void> = [];
		const on = (el: Element, fn: () => void) => {
			el.addEventListener('click', fn);
			cleanups.push(() => el.removeEventListener('click', fn));
		};

		root.querySelectorAll<HTMLButtonElement>('[data-action="purchase"]').forEach((button) => {
			on(button, () => onPurchase(button, restoreURL, ensureConfigured, root));
		});
		const paywallButton = root.querySelector('[data-action="paywall"]');
		if (paywallButton) on(paywallButton, () => onPaywall(root, restoreURL, ensureConfigured));

		hydratePlanPrices(root, ensureConfigured);

		return () => cleanups.forEach((fn) => fn());
	};
}

type Ensure = () => Promise<InstanceType<Purchases> | null>;

// Fill each plan card's price span with the localized RevenueCat price so the
// purchase flow shows price alongside the server-rendered interval (Guideline 3.1.2c).
async function hydratePlanPrices(root: HTMLElement, ensureConfigured: Ensure) {
	const priceNodes = root.querySelectorAll<HTMLElement>('[data-rc-price]');
	if (priceNodes.length === 0) return;
	const purchases = await ensureConfigured();
	if (!purchases) return;
	try {
		const packages = collectPackages(await purchases.getOfferings());
		priceNodes.forEach((node) => {
			const productId = node.dataset.rcPrice ?? '';
			const pkg = packages.find((p) => packageMatchesProduct(p, productId));
			const price = pkg ? formattedPrice(pkg) : '';
			if (price) node.textContent = price;
		});
	} catch {
		// Non-fatal: the interval label still communicates subscription length.
	}
}

// RevenueCat's package shape has moved between SDK versions; read every field
// the Go-era bundle read.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LoosePackage = any;

function formattedPrice(pkg: LoosePackage): string {
	const candidates = [
		pkg.webBillingProduct?.currentPrice?.formattedPrice,
		pkg.rcBillingProduct?.currentPrice?.formattedPrice,
		pkg.storeProduct?.currentPrice?.formattedPrice,
		pkg.storeProduct?.priceString
	];
	return candidates.find((v) => typeof v === 'string' && v.length > 0) || '';
}

async function onPurchase(
	button: HTMLButtonElement,
	restoreURL: string,
	ensureConfigured: Ensure,
	root: HTMLElement
) {
	const purchases = await ensureConfigured();
	if (!purchases) {
		window.location.assign('/billing/checkout');
		return;
	}
	const productId = button.dataset.productId;
	button.disabled = true;
	try {
		const pkg = await findPackage(purchases, productId);
		if (!pkg) throw new Error('This plan is not available right now.');
		await purchases.purchase({ rcPackage: pkg });
		await syncBackendEntitlement(
			restoreURL,
			{ event: 'subscription_purchased', productId: productId || pkg.identifier },
			root
		);
	} catch (error) {
		const e = error as { userCancelled?: boolean; message?: string } | null;
		if (e?.userCancelled) return;
		showBillingError(e?.message || 'Purchase could not be completed.');
	} finally {
		button.disabled = false;
	}
}

async function onPaywall(root: HTMLElement, restoreURL: string, ensureConfigured: Ensure) {
	const purchases = await ensureConfigured();
	if (!purchases) {
		window.location.assign('/billing/checkout');
		return;
	}
	const container = root.querySelector<HTMLElement>('#paywall-container');
	if (!container) return;
	try {
		await purchases.presentPaywall({ htmlTarget: container });
		await syncBackendEntitlement(restoreURL, { event: 'subscription_purchased' }, root);
	} catch (error) {
		const e = error as { userCancelled?: boolean; message?: string } | null;
		if (e?.userCancelled) return;
		showBillingError(e?.message || 'Checkout could not be completed.');
	}
}

async function findPackage(purchases: InstanceType<Purchases>, productId?: string) {
	const packages = collectPackages(await purchases.getOfferings());
	if (productId) {
		const match = packages.find((pkg) => packageMatchesProduct(pkg, productId));
		if (match) return match;
	}
	return packages[0] ?? null;
}

function collectPackages(offerings: Offerings): Package[] {
	const current = offerings?.current;
	if (!current) return [];
	const list: Package[] = [];
	for (const pkg of [
		current.annual,
		current.sixMonth,
		current.threeMonth,
		current.twoMonth,
		current.monthly,
		current.weekly,
		current.lifetime
	]) {
		if (pkg) list.push(pkg);
	}
	for (const pkg of current.availablePackages ?? []) {
		if (!list.includes(pkg)) list.push(pkg);
	}
	return list;
}

function packageMatchesProduct(pkg: LoosePackage, productId: string): boolean {
	return [
		pkg.identifier,
		pkg.webBillingProduct?.identifier,
		pkg.rcBillingProduct?.identifier,
		pkg.storeProduct?.identifier
	].some((v) => v === productId);
}

// The webhook grants the entitlement server-side regardless of what the browser
// does, so a failed sync is a display problem, not a lost purchase. Poll the
// billing context until it reports Pro rather than leaving the buyer looking at
// a page that still says Free.
const POLL_INTERVAL_MS = 5000;
const POLL_ATTEMPTS = 24;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function pollUntilEntitled(): Promise<boolean> {
	for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
		await delay(POLL_INTERVAL_MS);
		try {
			const res = await fetch('/api/v1/billing/me', { credentials: 'same-origin' });
			if (!res.ok) continue;
			if (isPro((await res.json()) as BillingContext)) {
				await invalidateAll();
				return true;
			}
		} catch {
			continue; // A dropped request is worth retrying; the deadline ends it.
		}
	}
	return false;
}

async function syncBackendEntitlement(
	restoreURL: string,
	analytics: { event: string; productId?: string },
	root: HTMLElement
) {
	const res = await fetch(restoreURL, { method: 'POST', credentials: 'same-origin' });
	if (!res.ok) {
		showBillingNotice('Payment went through. Confirming your subscription…');
		if (await pollUntilEntitled()) {
			hideBillingError();
			return;
		}
		throw new Error('Purchase succeeded but subscription sync failed.');
	}

	if (analytics.event) {
		capture(analytics.event, analytics.productId ? { product_id: analytics.productId } : {});
	}
	const continueURL = root.dataset.continueUrl;
	if (continueURL) {
		await fetch(continueURL, { method: 'POST', credentials: 'same-origin' });
		window.location.assign('/onboarding');
		return;
	}
	await invalidateAll();
}

const DANGER_CLASS = 'text-[var(--color-danger)]';
const NOTICE_CLASS = 'text-muted-foreground';

function showBillingError(message: string) {
	const target = document.getElementById('billing-error');
	if (!target) {
		window.alert(message);
		return;
	}
	target.classList.remove(NOTICE_CLASS);
	target.classList.add(DANGER_CLASS);
	target.textContent = message;
	target.hidden = false;
}

// A purchase that is still settling is progress, not a failure — the same slot
// carries it, but it must not be dressed as an error.
function showBillingNotice(message: string) {
	const target = document.getElementById('billing-error');
	if (!target) return;
	target.classList.remove(DANGER_CLASS);
	target.classList.add(NOTICE_CLASS);
	target.textContent = message;
	target.hidden = false;
}

function hideBillingError() {
	const target = document.getElementById('billing-error');
	if (target) target.hidden = true;
}
