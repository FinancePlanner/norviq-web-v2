// Port of norviq-web internal/sharelinks: share URLs and paste-ready text for
// a public page. Pure; safe on server and client.

export interface ShareLinks {
	x: string;
	linkedIn: string;
	reddit: string;
	whatsApp: string;
	copy: string;
	discordText: string;
	instagramCaption: string;
}

export interface ShareInput {
	canonical: string;
	title: string;
	tickers?: string[];
	bullets?: string[];
	disclaimer?: string;
	captionCTA?: string;
}

/** Go url.QueryEscape: like encodeURIComponent but spaces as "+" and !'()* escaped. */
function queryEscape(s: string): string {
	return encodeURIComponent(s)
		.replace(/%20/g, '+')
		.replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function escapeSpaces(s: string): string {
	return queryEscape(s).replace(/\+/g, '%20');
}

/** sharelinks.Tag — adds utm_source/utm_medium=share to the canonical URL. */
export function shareTag(canonical: string, source: string): string {
	const sep = canonical.includes('?') ? '&' : '?';
	return canonical + sep + 'utm_source=' + queryEscape(source) + '&utm_medium=share';
}

/** sharelinks.Build */
export function buildShareLinks(input: ShareInput): ShareLinks {
	const tickers = input.tickers ?? [];
	const cashtags = tickers.map((t) => ' $' + t).join('');

	let discord = '**' + input.title + '**\n';
	for (const b of input.bullets ?? []) discord += '• ' + b + '\n';
	discord += shareTag(input.canonical, 'discord');
	if (input.disclaimer) discord += '\n' + input.disclaimer;

	let caption = input.title + '\n\n';
	if (tickers.length > 0) caption += cashtags.trim() + '\n\n';
	caption += input.captionCTA ?? '';
	if (input.disclaimer) caption += '\n' + input.disclaimer;

	return {
		x:
			'https://x.com/intent/post?text=' +
			queryEscape(input.title + cashtags) +
			'&url=' +
			queryEscape(shareTag(input.canonical, 'x')),
		linkedIn:
			'https://www.linkedin.com/sharing/share-offsite/?url=' +
			queryEscape(shareTag(input.canonical, 'linkedin')),
		reddit:
			'https://www.reddit.com/submit?url=' +
			queryEscape(shareTag(input.canonical, 'reddit')) +
			'&title=' +
			escapeSpaces(input.title),
		whatsApp:
			'https://wa.me/?text=' +
			escapeSpaces(input.title + ' ' + shareTag(input.canonical, 'whatsapp')),
		copy: shareTag(input.canonical, 'copy'),
		discordText: discord,
		instagramCaption: caption
	};
}

/**
 * share.js capture(): window.norviqAnalytics.capture when present, else the
 * __norviqAnalyticsQueue that the PostHog loader drains.
 */
export function captureShare(event: string, properties: Record<string, unknown>) {
	const w = window as unknown as {
		norviqAnalytics?: { capture?: (e: string, p: Record<string, unknown>) => void };
		__norviqAnalyticsQueue?: [string, Record<string, unknown>][];
	};
	if (typeof w.norviqAnalytics?.capture === 'function') {
		w.norviqAnalytics.capture(event, properties);
		return;
	}
	w.__norviqAnalyticsQueue = w.__norviqAnalyticsQueue || [];
	w.__norviqAnalyticsQueue.push([event, properties]);
}
