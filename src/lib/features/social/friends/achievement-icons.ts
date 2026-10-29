// Port of norviq-web internal/pages/achievements/icons.go: the backend's SF
// Symbol iconKeys mapped to Lucide. Unknown keys fall back to award. Kept in
// the friends feature so it does not depend on the icon registry (several of
// these names are not in it); dedupe with the achievements port.
import type { Component } from 'svelte';
import type { LucideProps } from '@lucide/svelte';
import IArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
import IAward from '@lucide/svelte/icons/award';
import IBadgeCheck from '@lucide/svelte/icons/badge-check';
import IBanknote from '@lucide/svelte/icons/banknote';
import IBookOpen from '@lucide/svelte/icons/book-open';
import IBookmark from '@lucide/svelte/icons/bookmark';
import ICalendarCheck from '@lucide/svelte/icons/calendar-check';
import IChartColumn from '@lucide/svelte/icons/chart-column';
import IChartPie from '@lucide/svelte/icons/chart-pie';
import ICircleArrowUp from '@lucide/svelte/icons/circle-arrow-up';
import ICirclePlus from '@lucide/svelte/icons/circle-plus';
import IClipboardList from '@lucide/svelte/icons/clipboard-list';
import ICrosshair from '@lucide/svelte/icons/crosshair';
import ICrown from '@lucide/svelte/icons/crown';
import IEye from '@lucide/svelte/icons/eye';
import IFileText from '@lucide/svelte/icons/file-text';
import IFlag from '@lucide/svelte/icons/flag';
import IFlame from '@lucide/svelte/icons/flame';
import IHourglass from '@lucide/svelte/icons/hourglass';
import ILandmark from '@lucide/svelte/icons/landmark';
import ILayoutGrid from '@lucide/svelte/icons/layout-grid';
import ILeaf from '@lucide/svelte/icons/leaf';
import ILink from '@lucide/svelte/icons/link';
import ILock from '@lucide/svelte/icons/lock';
import IMedal from '@lucide/svelte/icons/medal';
import IMessageSquareText from '@lucide/svelte/icons/message-square-text';
import INewspaper from '@lucide/svelte/icons/newspaper';
import IPencilLine from '@lucide/svelte/icons/pencil-line';
import IPlane from '@lucide/svelte/icons/plane';
import IRefreshCw from '@lucide/svelte/icons/refresh-cw';
import IRuler from '@lucide/svelte/icons/ruler';
import IShoppingCart from '@lucide/svelte/icons/shopping-cart';
import ISlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
import ISmile from '@lucide/svelte/icons/smile';
import ISparkles from '@lucide/svelte/icons/sparkles';
import IStar from '@lucide/svelte/icons/star';
import ISunset from '@lucide/svelte/icons/sunset';
import ITarget from '@lucide/svelte/icons/target';
import ITerminal from '@lucide/svelte/icons/terminal';
import IThumbsUp from '@lucide/svelte/icons/thumbs-up';
import ITrendingUp from '@lucide/svelte/icons/trending-up';
import ITrophy from '@lucide/svelte/icons/trophy';
import IUserPlus from '@lucide/svelte/icons/user-plus';
import IUsers from '@lucide/svelte/icons/users';
import IUsersRound from '@lucide/svelte/icons/users-round';
import IWallet from '@lucide/svelte/icons/wallet';

const byIconKey: Record<string, Component<LucideProps>> = {
	'flame.fill': IFlame,
	'book.fill': IBookOpen,
	'star.fill': IStar,
	'star.circle.fill': IStar,
	'trophy.fill': ITrophy,
	'medal.fill': IMedal,
	'crown.fill': ICrown,
	'sparkles': ISparkles,
	'chart.line.uptrend.xyaxis': ITrendingUp,
	'banknote.fill': IBanknote,
	'cart.fill': IShoppingCart,
	'newspaper.fill': INewspaper,
	'leaf.fill': ILeaf,
	'person.badge.plus': IUserPlus,
	'person.2.fill': IUsers,
	'person.3.fill': IUsersRound,
	'lock': ILock,
	'target': ITarget,
	'scope': ICrosshair,
	'calendar': ICalendarCheck,
	'checkmark.seal.fill': IBadgeCheck,
	'airplane': IPlane,
	'arrow.triangle.2.circlepath': IRefreshCw,
	'arrow.up.right.circle.fill': ICircleArrowUp,
	'arrow.up.right': IArrowUpRight,
	'arrow.uturn.up.circle.fill': ICircleArrowUp,
	'bookmark.fill': IBookmark,
	'building.columns.fill': ILandmark,
	'chart.bar.fill': IChartColumn,
	'chart.pie.fill': IChartPie,
	'doc.text.fill': IFileText,
	'eye.fill': IEye,
	'face.smiling.inverse': ISmile,
	'flag.checkered': IFlag,
	'hand.thumbsup.fill': IThumbsUp,
	'hourglass': IHourglass,
	'link': ILink,
	'list.bullet.clipboard.fill': IClipboardList,
	'pencil.and.outline': IPencilLine,
	'plus.circle.fill': ICirclePlus,
	'ruler.fill': IRuler,
	'slider.horizontal.3': ISlidersHorizontal,
	'square.grid.2x2.fill': ILayoutGrid,
	'sunset.fill': ISunset,
	'terminal.fill': ITerminal,
	'text.bubble.fill': IMessageSquareText,
	'wallet.pass.fill': IWallet,
};

/** achievements.Icon: the Lucide glyph for a backend iconKey, or award. */
export function achievementIcon(iconKey: string): Component<LucideProps> {
	return byIconKey[iconKey] ?? IAward;
}
