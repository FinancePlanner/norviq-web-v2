// Groups: Discord-style chat groups with text channels. Wire shapes follow
// norviq-web internal/api/groups.go (StockPlanShared GroupsDTOs, camelCase);
// view models follow internal/pages/groups/viewmodel.go. Client-safe.

export interface GroupMembership {
	role: string;
	pushEnabled: boolean;
	joinedAt: string;
}

export interface GroupMessagePreview {
	authorUsername?: string | null;
	excerpt?: string | null;
	createdAt: string;
}

export interface GroupSummary {
	id: string;
	name: string;
	description: string;
	iconEmoji?: string | null;
	topic: string;
	ticker?: string | null;
	visibility: string;
	memberCount: number;
	defaultChannelId?: string | null;
	lastMessageAt?: string | null;
	lastMessage?: GroupMessagePreview | null;
	unreadCount: number;
	membership?: GroupMembership | null;
	createdAt: string;
}

export interface GroupPermissions {
	canPost: boolean;
	canInvite: boolean;
	canEdit: boolean;
	canManageChannels: boolean;
	canModerate: boolean;
	canDelete: boolean;
}

export interface GroupChannel {
	id: string;
	groupId: string;
	name: string;
	kind: string;
	topic?: string | null;
	position: number;
	lastSeq: number;
	lastMessageAt?: string | null;
	lastReadSeq: number;
	unreadCount: number;
}

export interface GroupDetail {
	group: GroupSummary;
	channels?: GroupChannel[] | null;
	permissions: GroupPermissions;
	ownerUsername?: string | null;
}

export interface GroupListResponse {
	items?: GroupSummary[] | null;
	pendingInvitationCount: number;
}

export interface GroupDirectoryPage {
	items?: GroupSummary[] | null;
	nextCursor?: string | null;
}

export interface GroupUnreadCount {
	total: number;
	pendingInvitationCount: number;
}

export interface CreateGroupRequest {
	name: string;
	description?: string;
	iconEmoji?: string;
	topic: string;
	ticker?: string;
	visibility: string;
}

export interface UpdateGroupRequest {
	name?: string;
	description?: string;
	iconEmoji?: string;
	topic?: string;
	ticker?: string;
	visibility?: string;
}

export interface GroupMember {
	userId: string;
	username?: string | null;
	displayName?: string | null;
	role: string;
	joinedAt: string;
}

export interface GroupMemberPage {
	items?: GroupMember[] | null;
	nextCursor?: string | null;
}

export interface GroupMessage {
	id: string;
	groupId: string;
	channelId: string;
	seq: number;
	clientMessageId?: string | null;
	authorId?: string | null;
	authorUsername?: string | null;
	body?: string | null;
	isDeleted: boolean;
	createdAt: string;
}

export interface GroupMessagePage {
	items?: GroupMessage[] | null;
	hasMoreBefore: boolean;
	hasMoreAfter: boolean;
	lastReadSeq: number;
}

export interface GroupInviteLink {
	id: string;
	groupId: string;
	code: string;
	url: string;
	expiresAt?: string | null;
	maxUses?: number | null;
	uses: number;
	createdByUsername?: string | null;
	createdAt: string;
}

export interface GroupInvitation {
	id: string;
	group: GroupSummary;
	inviterUsername?: string | null;
	createdAt: string;
}

/** api.CommunityViewerStatus (GET /v1/community/me). */
export interface CommunityViewerStatus {
	isAdmin: boolean;
	guidelinesAccepted: boolean;
	hasUsername: boolean;
	activeSanction?: { kind: string } | null;
}

// MARK: view models

export interface RailItem {
	id: string;
	name: string;
	emoji: string;
	href: string;
	unread: number;
	muted: boolean;
	active: boolean;
}

export interface ChannelItem {
	id: string;
	name: string;
	href: string;
	unread: number;
	active: boolean;
}

/** A run of message text, or a $TICKER chip when ticker is set. */
export interface Segment {
	text: string;
	ticker?: string;
}

export interface MessageRow {
	id: string;
	seq: number;
	clientId: string;
	author: string;
	initial: string;
	time: string;
	stamp: string;
	segments: Segment[];
	deleted: boolean;
	continued: boolean;
	dayLabel: string;
	newDivider: boolean;
	own: boolean;
	canDelete: boolean;
	canReport: boolean;
}

export interface GroupCard {
	id: string;
	name: string;
	description: string;
	emoji: string;
	ticker: string;
	topic: string;
	public: boolean;
	members: number;
	href: string;
	preview: string;
	activity: string;
	unread: number;
	muted: boolean;
	member: boolean;
}

export interface InvitationRow {
	id: string;
	group: GroupCard;
	inviter: string;
}

export interface GroupForm {
	name: string;
	description: string;
	emoji: string;
	topic: string;
	ticker: string;
	visibility: string;
}

/** The channel header + channel list (ChannelPanel), refreshable from /panel. */
export interface ChannelPanelVM {
	groupId: string;
	groupName: string;
	emoji: string;
	ticker: string;
	channelId: string;
	channels: ChannelItem[];
	canInvite: boolean;
	canManage: boolean;
}

export interface ChatVM extends ChannelPanelVM {
	channelName: string;
	channelTopic: string;
	rail: RailItem[];
	invitations: number;
	messages: MessageRow[];
	oldestSeq: number;
	lastSeq: number;
	hasMoreBefore: boolean;
	canPost: boolean;
	canModerate: boolean;
	postBlocked: string;
	notice: string;
	error: string;
}

export interface MemberRow {
	userId: string;
	name: string;
	role: string;
	canManage: boolean;
	isOwner: boolean;
	self: boolean;
}

export interface InviteLinkRow {
	id: string;
	url: string;
	uses: string;
	expires: string;
}

export interface FriendOption {
	id: string;
	name: string;
}

/** JSON the rows endpoints answer with (Go's MessageRows fragment). */
export interface RowsResponse {
	rows: MessageRow[];
	/** When > 0, an older-history sentinel goes above the rows. */
	olderSeq: number;
	/** Go's X-Groups-More: more than one page was missed; ask again. */
	more?: boolean;
}

export interface RailResponse {
	rail: RailItem[];
	invitations: number;
}
