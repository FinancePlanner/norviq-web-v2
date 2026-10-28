// Port of norviq-web internal/sharelinks: the outbound share targets for a
// public page — web intents for X, LinkedIn, Reddit and WhatsApp, a tagged
// copy link, and ready-made text for Discord and an Instagram caption.
//
// Shared by articles and the market brief. Every target carries its own
// utm_source (with utm_medium=share) so marketing can tell the networks apart.

/** Every share target for one page. */
export interface Links {
	x: string;
	linkedIn: string;
	reddit: string;
	whatsApp: string;
	/** The canonical URL tagged for a copied link. */
	copy: string;
	/** Markdown: bold title, bullets, link, disclaimer. */
	discordText: string;
	/** Goes with the card image, which carries no link. */
	instagramCaption: string;
}

/** What a page shares. disclaimer and captionCTA are already in the page's language. */
export interface Input {
	/** The absolute page URL. It may already carry a query (?lang=pt-PT); the UTM parameters are appended. */
	canonical: string;
	title: string;
	/** Bare symbols; X gets them as cashtags. */
	tickers?: string[];
	/** Lead the Discord text. */
	bullets?: string[];
	disclaimer?: string;
	/** Closes the Instagram caption, e.g. "Read it on Norviq (link in bio)." */
	captionCTA?: string;
}

/**
 * Go's url.QueryEscape: only A-Z a-z 0-9 - _ . ~ stay literal and a space is
 * "+". encodeURIComponent also leaves ! ' ( ) * alone, so those are escaped too.
 */
export function queryEscape(s: string): string {
	return encodeURIComponent(s)
		.replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
		.replace(/%20/g, '+');
}

/** QueryEscape with spaces as %20. WhatsApp shows a literal "+" for an encoded space. */
function escapeSpaces(s: string): string {
	return queryEscape(s).replaceAll('+', '%20');
}

/** Appends utm_source=source&utm_medium=share to canonical. */
export function tag(canonical: string, source: string): string {
	const sep = canonical.includes('?') ? '&' : '?';
	return canonical + sep + 'utm_source=' + queryEscape(source) + '&utm_medium=share';
}

/** Builds every share target for input. */
export function build(input: Input): Links {
	const tickers = input.tickers ?? [];
	const cashtags = tickers.map((t) => ' $' + t).join('');

	let discord = '**' + input.title + '**\n';
	for (const b of input.bullets ?? []) discord += '• ' + b + '\n';
	discord += tag(input.canonical, 'discord');
	if (input.disclaimer) discord += '\n' + input.disclaimer;

	let caption = input.title + '\n\n';
	if (tickers.length > 0) caption += cashtags.trim() + '\n\n';
	caption += input.captionCTA ?? '';
	if (input.disclaimer) caption += '\n' + input.disclaimer;

	return {
		x: 'https://x.com/intent/post?text=' + queryEscape(input.title + cashtags) + '&url=' + queryEscape(tag(input.canonical, 'x')),
		linkedIn: 'https://www.linkedin.com/sharing/share-offsite/?url=' + queryEscape(tag(input.canonical, 'linkedin')),
		reddit: 'https://www.reddit.com/submit?url=' + queryEscape(tag(input.canonical, 'reddit')) + '&title=' + escapeSpaces(input.title),
		// wa.me takes the whole message in one parameter; the link goes last so
		// WhatsApp unfurls it into a preview.
		whatsApp: 'https://wa.me/?text=' + escapeSpaces(input.title + ' ' + tag(input.canonical, 'whatsapp')),
		copy: tag(input.canonical, 'copy'),
		discordText: discord,
		instagramCaption: caption
	};
}
