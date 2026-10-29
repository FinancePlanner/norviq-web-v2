# Social domain parity (groups, friends, XP, boards)

Scope: every Go route under /groups, /friends, /xp and /boards in ROUTES.md (70), plus the
achievements routes under /friends from norviq-web `feat/achievements-web` (#138), which the
local `main` checkout of norviq-web does not have yet.

Flags: `src/lib/features/social/gates.server.ts` ports RequireSocial / RequireGroups /
RequireLeaderboards / RequireXImport / RequireFacebookImport / RequireAchievements /
RequireActivityFeed. Every load, action and +server handler calls the same gate Go mounted,
so it 404s exactly where Go does. Boards have no flag in Go and none here.

## /groups (31)

- [x] GET /groups → (app)/groups/+page.{server.ts,svelte} (HomeView)
- [x] GET /groups/unread-badge → (app)/groups/unread-badge/+server.ts — JSON `{count}` for NavBadge (Go: HTML fragment)
- [x] GET /groups/rail → (app)/groups/rail/+server.ts — JSON `{rail, invitations}` for GroupChat (Go: Rail fragment)
- [x] GET /groups/events → (app)/groups/events/+server.ts — SSE proxy of /v1/realtime/stream, as Go
- [x] GET /groups/discover → (app)/groups/discover/+page.{server.ts,svelte} (404 unless groupsPublic)
- [x] GET /groups/new → (app)/groups/new/+page.{server.ts,svelte}
- [x] POST /groups/new → same, default action (422 re-render with the posted values)
- [x] GET /groups/join → (app)/groups/join/+server.ts (redirect to /g/{code})
- [x] POST /groups/block → (app)/groups/block/+server.ts
- [x] POST /groups/invitations/{id}/accept → (app)/groups/invitations/[invitationID]/accept/+server.ts
- [x] POST /groups/invitations/{id}/decline → …/decline/+server.ts
- [x] POST /groups/m/{id}/delete → (app)/groups/m/[messageID]/delete/+server.ts (fetch → JSON; plain post → redirect)
- [x] POST /groups/m/{id}/report → …/report/+server.ts (fetch → JSON; plain post → Go's Reported HTML)
- [x] GET /groups/{groupID} → (app)/groups/[groupID]/+page.{server.ts,svelte} (preview or redirect to last channel)
- [x] POST /groups/{groupID}/join → [groupID]/join/+server.ts
- [x] GET /groups/{g}/c/{c} → [groupID]/c/[channelID]/+page.{server.ts,svelte} + `GroupChat.svelte` (groups-chat.js)
- [x] GET /groups/{g}/c/{c}/panel → …/panel/+server.ts — JSON ChannelPanelVM (Go: fragment)
- [x] GET /groups/{g}/c/{c}/messages → …/messages/+server.ts — JSON rows (`before`/`after`/`mod`, `more` = X-Groups-More)
- [x] POST /groups/{g}/c/{c}/messages → same file (X-Groups-Send → JSON row, text refusals; plain post → redirect #msg-N)
- [x] POST /groups/{g}/c/{c}/read → …/read/+server.ts (204)
- [x] GET /groups/{g}/settings → [groupID]/settings/+page.{server.ts,svelte}
- [x] POST /groups/{g}/notifications → [groupID]/notifications/+server.ts
- [x] POST /groups/{g}/edit → [groupID]/edit/+server.ts
- [x] POST /groups/{g}/invitations → [groupID]/invitations/+server.ts
- [x] POST /groups/{g}/invites → [groupID]/invites/+server.ts
- [x] POST /groups/{g}/invites/{inviteID}/revoke → [groupID]/invites/[inviteID]/revoke/+server.ts
- [x] POST /groups/{g}/channels → [groupID]/channels/+server.ts
- [x] POST /groups/{g}/channels/{c}/delete → [groupID]/channels/[channelID]/delete/+server.ts
- [x] POST /groups/{g}/members/{userID}/{action} → [groupID]/members/[userID]/[action]/+server.ts
- [x] POST /groups/{g}/leave → [groupID]/leave/+server.ts
- [x] POST /groups/{g}/delete → [groupID]/delete/+server.ts

Notes:
- Live chat: Go streams SSE, so v2 keeps SSE (EventSource on /groups/events) rather than polling.
  Rows are built once on the server (`view.ts buildRows`, viewer timezone from the `tz` cookie) and
  rendered by `MessageRowView.svelte`; day-separator dedupe, scroll anchoring on older pages,
  "New messages" divider, pending/failed/retry rows, Enter-to-send (Shift+Enter newline, IME-safe),
  mark-read throttle and sidebar refresh are ported from groups-chat.js.
- Backend ids are upper-case UUIDs; path ids are normalised to lower case, so ids compare
  case-insensitively (`sameID`).
- Deviation: a community ban on a *form post* redirects back with the banned text as ?error=
  (Go rendered the banned page in place; a +server endpoint can't render a page). Page loads still
  render the banned page via (app)/groups/+error.svelte.
- Not in scope: GET /g/{code} (GroupsRedeemInvite / invite page) — public prefix, other domain.
