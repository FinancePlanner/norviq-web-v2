import type { AppLocale } from '#lib/money.js';

// The desktop top bar's date: weekday, day and month, long form, in the
// browser's zone (DesktopTopBar sets it in onMount; Worker time is UTC).

const formats = new Map<AppLocale, Intl.DateTimeFormat>();

// Built on first use, so a zone set before then (tests) is the one read.
function format(locale: AppLocale): Intl.DateTimeFormat {
	let f = formats.get(locale);
	if (!f) {
		f = new Intl.DateTimeFormat(locale === 'pt-PT' ? 'pt-PT' : 'en-US', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		});
		formats.set(locale, f);
	}
	return f;
}

/** "Tuesday 24 November" / "terça-feira, 24 de novembro". */
export function topBarDate(now: Date, locale: AppLocale): string {
	const f = format(locale);
	if (locale === 'pt-PT') {
		// money.ts's space step only: its hyphen-to-minus step would break "terça-feira".
		return f.format(now).replace(/[  ]/g, ' ');
	}
	// English dates are day first across the app ("11 Nov 2026", "Mon 2 Jan").
	const parts: Record<string, string> = {};
	for (const p of f.formatToParts(now)) parts[p.type] = p.value;
	return `${parts.weekday} ${parts.day} ${parts.month}`;
}
