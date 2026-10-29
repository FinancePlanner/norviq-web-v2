# Go catch-up sync (norviq-web ba4689a..ec05890)

The v2 ports were written against norviq-web `ba4689a`. This brings v2 to parity with
`ec05890` (origin/main, 15 commits later). Branch `port/go-sync`, with `main` (603ca39,
public merge) merged in once before pt-PT.json was edited, as the coordinator asked.

## Commits in the range

- [~] `e4ebf43` feat(digest): public unsubscribe confirm page. **Out of scope** (public agent, see public.md). Only its pt-PT strings were already on main.
- [x] `539d4ed` Discord link in footer, settings and feedback.
  - One shared `DiscordURL` in `src/lib/discord.ts` (= `config.DiscordURL`, `discord.gg/UmFCd87x8`). `features/public/landing/landing.ts` re-exports it, so the landing footer and llms.txt use the same constant.
  - Settings → About: fixed the stale `discord.gg/3QVkas3rH`. The label is now `t('Join us on Discord')`, with `rel="noopener noreferrer"` and capture `discord_link_clicked {surface:'settings'}`.
  - Settings → Feedback: added the "Want to talk it through…" line with the link, capturing `{surface:'support'}`.
  - The landing footer (`{surface:'footer'}`), landing.js and seo.go stay with the public agent and were already done.
- [x] `1fdb340` docs: achievements web plan. Read only.
- [x] `44c3194` config flags, gates, DTOs, icon map.
  - Gates `requireAchievements` and `requireActivityFeed` already existed in `features/social/gates.server.ts` (social port).
  - `SocialConfig` in `nav.ts` now declares `achievements` and `activityFeed`, adds them to `socialOff`, and has `achievementsOn` and `activityFeedOn`.
  - `achievementsDo` (socialDo + Accept-Language) already existed in `features/social/friends/friends.server.ts`.
  - DTOs are in `features/achievements/types.ts`.
  - `icons.go` is now `features/achievements/icons.ts`, which maps an iconKey to a Lucide name; `icons.spec.ts` checks every name against the registry.
  - The 20 missing names were added to `tui/icon-registry.ts`.
  - The social port's duplicate component map (`friends/achievement-icons.ts`) was deleted. `AchievementIcon.svelte` now renders the kit `<Icon>`.
- [x] `6b4fcfd` achievements page, nav, showcase pinning.
  - `GET /achievements` → `(app)/achievements/+page.{server.ts,svelte}` and `features/achievements/{viewmodel.ts,AchievementCard.svelte}`. Covers the load-failed empty state, the notice/error flash (translated), the Unlocked and Hidden metrics, the showcase strip, and category sections in API order. Hidden cards show "???" with the lock icon. Performance cards get no progress and no pin. The templUI progress markup is inlined.
  - `POST /achievements/showcase` → `(app)/achievements/showcase/+server.ts`. It is a plain form post that 303s back with "Showcase updated." or the error. A backend 400 shows "You can pin up to 3 achievements". A malformed or `hidden.` item returns 400.
  - `/settings/badges` → 302 `/achievements` while achievements are on.
  - Nav: Achievements is added to the Friends group, Settings → Badges is relabelled and pointed at `/achievements`, `activeTab('/achievements')` returns `friends`, and the sidebar icon is Trophy.
- [x] `a42558b` styles: restore earnings-flow input colour. v2 already had `color: var(--color-foreground)`, so there was nothing to change.
- [x] `cdd8f0e` unlock toast.
  - `GET /achievements/unseen` → `(app)/achievements/unseen/+server.ts`. It returns JSON `{toast}` instead of Go's HTML fragment and marks unlocks seen before it answers. If marking fails, it returns no toast.
  - `features/achievements/UnlockToast.svelte` is rendered by `AppShell` when `achievementsOn(social)`. It fetches after every navigation, as Go's `hx-trigger=load` placeholder did on every boosted page load. Navigating clears the old toast, and Dismiss works client-side only.
- [x] `2628549` friends showcase, friend list, privacy toggle.
  - The friends parts were already ported by social (checked).
  - Privacy: `showAchievements` is added to `SocialPrivacySettings` and its toggle "Show achievements to friends" is listed only when achievements are on (`settings-admin/social/privacy.ts`).
- [x] `d0c039e` activity feed and congrats. Already in the social port (checked against the final `feed.templ`).
- [x] `8824553` holdings in two waves.
  - v2 already loaded the portfolio list and pilot follows alongside the holdings (`portfolio/+page.server.ts`), and ran enrichment and per-symbol sentiment side by side.
  - Changed: the sentiment roll-up now starts in wave 1 with stocks, summary, performance, pnl and targets, not in wave 2 (`holdings.server.ts`).
  - **Not done:** the 2 s enrichment timeout on the roll-up. That change is in `sentiment_data.go`, which is out of scope. Its v2 counterpart is `loadPortfolioSentimentRollup` in `features/portfolio/market.server.ts`, which has no `AbortSignal.timeout(ENRICHMENT_TIMEOUT_MS)`. It is a one-line follow-up.
- [x] `3600c0a` i18n test. The strings were covered by the pt-PT sweep below.
- [x] `d22cbe3` toast pinned on screen. The `shell.css` `.achievement-toast` rules were copied, and the toast keeps the `achievement-toast success-banner` classes.
- [x] `b5f016d` localize profile showcase, keep load more after an error. Already in the social port: the profile loads through `achievementsDo`, and `loadFeed` keeps the cursor and sets `loadMoreFailed`, which shows "Couldn't load more. Try again.".
- [x] `e02431c` save only the privacy toggles shown on the form. Each switch now renders a hidden `shown=<key>`, and the action writes only the marked keys (`settings/friends-privacy`).

## Other items

- Styles: the `styles.css` (`.achievements-grid`, `.achievement-*`) and `css/shell.css` (`.achievement-toast`) diffs were applied to `src/lib/styles/legacy/`. The added lines are byte-identical to Go's diff.
- i18n: the range adds 44 ids to Go's locales, and all of them have identical en text. 43 were missing from `src/lib/i18n/pt-PT.json` and were added sorted. Some of them were already used by the social port, for example "Congratulate", "Couldn't load more. Try again." and "← Settings".
- settings-admin `boardNotice` gained `reported`, `blocked` and `deleted` (same as the social `BOARD_NOTICES`). The lookup now uses `Object.hasOwn`.
- `app.go`, `portfolio_data.go` and `social.go`: there is nothing else in the range. The `socialDoWith` refactor is already `achievementsDo`, and the friends handlers belong to the social port.

## Shared changes (`shared:` commits)

- `src/lib/discord.ts` (new) and `features/public/landing/landing.ts` (now a re-export).
- `src/lib/styles/legacy/styles.css` and `css/shell.css`.
- `src/lib/i18n/pt-PT.json`.
- `src/lib/components/norviq/tui/icon-registry.ts` (20 names added).
- `src/lib/nav.ts` and `src/lib/components/shell/nav-icons.ts`.
- `src/lib/components/shell/AppShell.svelte` (toast).
- `docs/parity/ROUTES.md` (rows for `/achievements` and the friends achievements routes).
- Non-shared edits to other domains, as the task asked:
  - settings-admin: about, feedback, badges, friends-privacy, privacy.ts, boards-admin.ts.
  - social: AchievementIcon, deleted achievement-icons.ts.
  - portfolio: holdings.server.ts.
- New feature dir: `src/lib/features/achievements/`.

## Verification

- `bun run check`: 0 errors, 0 warnings. `bun run build`: passes. vitest `features/achievements`: 6 tests pass.
- Dev server 5213, signed in through `/__dev/login`. Staging has achievements and the activity feed on.
  - 200 for `/achievements` (43 cards in 9 sections), `/settings/about`, `/settings/feedback`, `/settings/friends-privacy` (shows `shown` markers including `showAchievements`), `/portfolio`, `/friends`, `/friends/feed` and `/dashboard`.
  - `/settings/badges` returns 302 to `/achievements`. The sidebar shows both Achievements links.
- Showcase: pin returns 303 with the notice and the showcase strip renders. A `hidden.` item returns 400. Four items return 303 with "You can pin up to 3 achievements". Unpin returns 303 and the showcase is empty again.
- Not verified: the flag-off 404s, because staging has the flags on. The toast's on-screen rendering was not checked in a browser; only the endpoint was.
- Staging side effect: the first `/achievements/unseen` call marked the test user's 14 unseen unlocks as seen, which is what Go would do on any page load. The showcase was left empty, as found.
