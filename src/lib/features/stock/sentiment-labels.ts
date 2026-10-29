// pages/stock/sentiment_helpers.go sentimentPostCountLabel ("notable posts",
// unlike the kit's components.SentimentPostCountLabel).
export function notablePostCountLabel(count: number): string {
	return count === 1 ? '1 notable post' : `${count} notable posts`;
}
