// components/sentiment_badge.go — retail-sentiment presentation helpers.

export interface SentimentBadgeVM {
	hasReading: boolean;
	label: string;
	scoreLabel?: string;
	deltaLabel?: string;
	deltaUp?: boolean;
	hasDelta?: boolean;
	postLabel?: string;
	tooltip?: string;
}

export function sentimentBadgeText(label: string): string {
	const trimmed = label.trim();
	if (!trimmed) return 'Neutral';
	return trimmed[0].toUpperCase() + trimmed.slice(1);
}

export function sentimentBadgeClass(label: string): string {
	switch (label.trim().toLowerCase()) {
		case 'bullish':
		case 'positive':
			return 'bg-[color-mix(in_oklab,var(--color-gain)_8%,transparent)] text-[var(--color-gain)]';
		case 'bearish':
		case 'negative':
			return 'bg-[color-mix(in_oklab,var(--color-loss)_8%,transparent)] text-[var(--color-loss)]';
		default:
			return 'bg-[color-mix(in_oklab,var(--color-flat)_8%,transparent)] text-[var(--color-flat)]';
	}
}

export function sentimentNoDataClass(): string {
	return 'bg-transparent text-muted-foreground border border-dashed border-border';
}

export function sentimentPostCountLabel(count: number): string {
	return count === 1 ? '1 post' : `${count} posts`;
}

/** Go fmt "%+.0f" of score*100. */
function formatSentimentScore(score: number): string {
	const s = (score * 100).toFixed(0);
	return s.startsWith('-') ? s : '+' + s;
}

/** BuildSentimentBadge — score null/undefined means nothing was measured. */
export function buildSentimentBadge(
	label: string,
	score: number | null | undefined,
	delta: number | null | undefined,
	postCount: number
): SentimentBadgeVM {
	if (score === null || score === undefined) {
		return {
			hasReading: false,
			label: 'No chatter',
			tooltip: 'No retail posts found for this symbol in the current window.'
		};
	}
	const vm: SentimentBadgeVM = {
		hasReading: true,
		label: sentimentBadgeText(label),
		scoreLabel: formatSentimentScore(score),
		postLabel: sentimentPostCountLabel(postCount)
	};
	vm.tooltip = `${vm.label} · ${vm.postLabel}`;
	if (delta !== null && delta !== undefined && Math.abs(delta) >= 0.01) {
		vm.hasDelta = true;
		vm.deltaUp = delta > 0;
		const d = delta.toFixed(2);
		vm.deltaLabel = d.startsWith('-') ? d : '+' + d;
	}
	return vm;
}

export function sentimentCoverageLabel(covered: number, total: number): string {
	if (total === 0) return 'No positions';
	const pct = (covered / total) * 100;
	return `${covered} of ${total} positions (${pct.toFixed(0)}%)`;
}
