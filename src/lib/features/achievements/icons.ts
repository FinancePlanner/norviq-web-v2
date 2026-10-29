// Port of norviq-web internal/pages/achievements/icons.go: the backend's SF
// Symbol iconKeys mapped to Lucide names. Every name is in the kit icon
// registry (#lib/components/norviq/tui/icon-registry.ts); icons.spec.ts
// checks that, as Go's icons_test.go checks icon_data.go.

/** fallbackIcon is shown for any iconKey we have no mapping for. */
export const fallbackIcon = 'award';

export const lucideByIconKey: Record<string, string> = {
	'flame.fill': 'flame',
	'book.fill': 'book-open',
	'star.fill': 'star',
	'star.circle.fill': 'star',
	'trophy.fill': 'trophy',
	'medal.fill': 'medal',
	'crown.fill': 'crown',
	sparkles: 'sparkles',
	'chart.line.uptrend.xyaxis': 'trending-up',
	'banknote.fill': 'banknote',
	'cart.fill': 'shopping-cart',
	'newspaper.fill': 'newspaper',
	'leaf.fill': 'leaf',
	'person.badge.plus': 'user-plus',
	'person.2.fill': 'users',
	'person.3.fill': 'users-round',
	lock: 'lock',
	target: 'target',
	scope: 'crosshair',
	calendar: 'calendar-check',
	'checkmark.seal.fill': 'badge-check',
	airplane: 'plane',
	'arrow.triangle.2.circlepath': 'refresh-cw',
	'arrow.up.right.circle.fill': 'circle-arrow-up',
	'arrow.up.right': 'arrow-up-right',
	'arrow.uturn.up.circle.fill': 'circle-arrow-up',
	'bookmark.fill': 'bookmark',
	'building.columns.fill': 'landmark',
	'chart.bar.fill': 'chart-column',
	'chart.pie.fill': 'chart-pie',
	'doc.text.fill': 'file-text',
	'eye.fill': 'eye',
	'face.smiling.inverse': 'smile',
	'flag.checkered': 'flag',
	'hand.thumbsup.fill': 'thumbs-up',
	hourglass: 'hourglass',
	link: 'link',
	'list.bullet.clipboard.fill': 'clipboard-list',
	'pencil.and.outline': 'pencil-line',
	'plus.circle.fill': 'circle-plus',
	'ruler.fill': 'ruler',
	'slider.horizontal.3': 'sliders-horizontal',
	'square.grid.2x2.fill': 'layout-grid',
	'sunset.fill': 'sunset',
	'terminal.fill': 'terminal',
	'text.bubble.fill': 'message-square-text',
	'wallet.pass.fill': 'wallet'
};

/** achievements.Icon: the Lucide name for a backend iconKey, or "award". */
export function achievementIcon(iconKey: string): string {
	return Object.hasOwn(lucideByIconKey, iconKey) ? lucideByIconKey[iconKey] : fallbackIcon;
}
