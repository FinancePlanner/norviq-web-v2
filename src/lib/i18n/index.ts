import ptPT from './pt-PT.json';

// Port of norviq-web internal/i18n. Message ids are the English source
// strings (go-i18n style), so `t('Holdings')` reads the same as the templ
// `i18n.T(ctx, "Holdings")` it replaces. pt-PT.json is generated from
// norviq-web/internal/i18n/locales/active.pt-PT.json; an id with no
// translation falls back to itself, which is the English text.

export const LANG_COOKIE = 'lang';
export const LANGUAGE_ENGLISH = 'en';
export const LANGUAGE_PTPT = 'pt-PT';
export type Locale = typeof LANGUAGE_ENGLISH | typeof LANGUAGE_PTPT;

const dictionaries: Record<Locale, Record<string, string>> = {
	en: {},
	'pt-PT': ptPT as Record<string, string>
};

export function normalizeLanguage(raw: string | null | undefined): Locale | null {
	const v = raw?.trim().toLowerCase();
	if (!v) return null;
	const base = v.split(/[-_]/)[0];
	if (base === 'en') return LANGUAGE_ENGLISH;
	if (base === 'pt') return LANGUAGE_PTPT;
	return null;
}

function wantsPortuguese(header: string | null): boolean {
	if (!header) return false;
	return header
		.split(',')
		.map((part) => part.split(';')[0].trim().toLowerCase())
		.some((tag) => tag === 'pt' || tag.startsWith('pt-'));
}

export function resolveRequestLanguage(
	cookie: string | undefined,
	acceptLanguage: string | null
): Locale {
	return (
		normalizeLanguage(cookie) ??
		(wantsPortuguese(acceptLanguage) ? LANGUAGE_PTPT : LANGUAGE_ENGLISH)
	);
}

export function translate(locale: Locale, id: string): string {
	return dictionaries[locale]?.[id] || id;
}

/** Format a go-i18n/iOS style template: `%@`, `%s`, `%d`, `%.2f` placeholders in order. */
export function format(template: string, ...args: unknown[]): string {
	let i = 0;
	return template.replace(/%(\.\d+)?[@sdf]|%%/g, (m, prec: string | undefined) => {
		if (m === '%%') return '%';
		const v = args[i++];
		if (m.endsWith('f') && typeof v === 'number')
			return v.toFixed(prec ? Number(prec.slice(1)) : 6);
		return String(v ?? '');
	});
}

export type T = (id: string, ...args: unknown[]) => string;

export function translator(locale: Locale): T {
	return (id, ...args) => {
		const s = translate(locale, id);
		return args.length ? format(s, ...args) : s;
	};
}
