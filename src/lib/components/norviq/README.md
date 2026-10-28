# Norviq kit (Phase 1)

Svelte 5 ports of `norviq-web/internal/pages/components/*.templ` and of the
templUI primitives in `norviq-web/internal/components/*` that pages use. The
markup and class names are copied from the templ, so the legacy CSS in
`src/lib/styles/legacy` applies unchanged. Live gallery: `/__dev/kit` (dev only).

```ts
import { Field, SelectField, SubmitButton, EmptyState, withSpinner } from '#lib/components/norviq/index.js';
import * as vigil from '#lib/components/norviq/vigil/index.js';    // vigil.Panel, vigil.ModernPageHeader…
import * as dialog from '#lib/components/norviq/tui/dialog/index.js'; // dialog.Dialog, dialog.Content…
import * as table from '#lib/components/norviq/tui/table/index.js';
import * as card from '#lib/components/norviq/tui/card/index.js';
import * as form from '#lib/components/norviq/tui/form/index.js';
import { pageMotion, flashOnChange, animateValue } from '#lib/motion.js';
import { applyTheme, initTheme, theme } from '#lib/theme.svelte.js';
```

## How templ arguments map to Svelte

| templ | Svelte |
|---|---|
| `Props{ID, Name, Class, …}` struct fields | props of the same name, camelCased (`WrapperClass` becomes `wrapperClass`, `TitleID` becomes `titleID`) |
| `Attributes: templ.Attributes{…}` | ordinary attributes on the component; they are spread onto the same element, last, so they win (`aria-label`, `data-*`, `form`, `onchange`) |
| `{ children... }` | children |
| a `templ.Component` argument (`trailing`, `actions`, `delta`, `icon`, `content`) | a snippet prop with that name (`{#snippet actions()}…{/snippet}`) |
| Alpine `x-model` | `bind:value` / `bind:checked` (Field, TextareaField, SelectField, NativeSelect, CheckboxField, SwitchField, PasswordField, Input, Textarea, Checkbox, Switch) |
| `hx-post` form with the spinner | `<form method="POST" use:enhance={withSpinner()}>`, which puts `.htmx-request` on the form so `[data-nq-submit]` spins. Pass `loading` to a button for a fetch-driven spinner. |
| `i18n.T(ctx, …)` | none of these templ files call it (only shell.templ does); their strings are English literals in Go too. Pass translated text in as props. |

## pages/components → Svelte

| templ | Svelte component | Props |
|---|---|---|
| `Field(FieldProps)` | `Field` | `id? name label? type? value(bindable) placeholder? description? error? autocomplete? required? disabled? readonly? class? wrapperClass?` + input attrs |
| `TextareaField` | `TextareaField` | as Field + `rows? autoResize?` |
| `SelectField` | `SelectField` | `id? name? label? options: Option[] placeholder? description? error? required? disabled? multiple? value(bindable) class? wrapperClass?`. Always native `<select class="field-input">`; the templUI combobox path is not ported |
| `NativeSelect` | `NativeSelect` | `id? name? options class? required? disabled? value(bindable)` |
| `NativeInput` | `NativeInput` | any `<input>` attrs, `ref(bindable)` |
| `CheckboxField` / `SwitchField` | `CheckboxField` / `SwitchField` | `id? name label? value? description? checked(bindable) disabled? class? wrapperClass?` |
| `PrimaryButton` / `SecondaryButton` / `GhostButton` | same names | `id? type?(button) href? class? disabled? fullWidth? loading?` + attrs |
| `IconButton` | `IconButton` | as above (`h-9 w-9 p-0`); pass `aria-label` |
| `SubmitButton` / `SecondarySubmitButton` | same names | as above, with no `type`; stamps `data-nq-submit` |
| `NativeButton` | `NativeButton` | `type?(button) id? class? disabled?` + attrs; a submit gets `data-nq-submit` |
| `norviqButton` / `variantFor` | `NorviqButton` (`kind`), `variantFor()` | |
| `PasswordToggle` | `PasswordToggle` | `visible(bindable)` |
| `PasswordField(label,name,placeholder,autocomplete,required)` | `PasswordField` | same + `value(bindable) error? id?` |
| `VaultTextField(label,name,inputType,…)` | `VaultTextField` | `label name inputType? placeholder? value(bindable) required?` |
| `Option` / `SegmentItem` / `FilterChip` / `controlID` | `types.ts` | |
| `EmptyState` / `EmptyStateInline` | same names | `title description actionLabel? actionHref?` |
| `SkeletonBlock(heightClass)` / `ListSkeleton(rows)` | same names | `heightClass` / `rows` |
| `ChartPlaceholder(label)` | `ChartPlaceholder` | `label?` |
| `StatPill(label,value,positive)` | `StatPill` | `label value positive?` |
| `SegmentedControl(items, activePath)` | `SegmentedControl` | `items: SegmentItem[] activePath?` (defaults to the current path) |
| `SectionCard(title)` | `SectionCard` | `title` + children |
| `CollapsibleSection(title,desc,open)` | `CollapsibleSection` | `title desc? open?` + children |
| `CardHeader` / `ReportCardHeader` | `CardHeader` | `title desc?` |
| `FormErrorBanner(msg)` / `ToastBanner(msg)` | same names | `message` (renders nothing when empty) |
| `ThemeToggle` / `ThemeToggleCompact` | same names | |
| `ProGateWrap(isPro, name, content)` | `ProGateWrap` | `isPro featureName` + children |
| `ProGateOverlay` / `ProGatePage` / `ProGateHero` / `ProFeatureRow` | same names | `featureName` / `title description` |
| (error page helper) | `ProGate` | `featureName variant?: 'page'\|'overlay'` |
| `ShareBar(ShareBarProps)` + `assets/share.js` | `ShareBar` | `id? class? links: ShareLinks cardImageURL cardFileName? native? nativeURL? nativeTitle? event? eventProps?(JSON) text: ShareBarText` |
| `sharelinks.Build` / `Tag` | `buildShareLinks()`, `shareTag()` (`share-links.ts`) | |
| `NewsHeadlineList(items)` | `NewsHeadlineList` | `items: NewsHeadlineVM[]` |
| `TechnicalsStrip` / `InsiderActivity` / `InstitutionalOwnership` / `CongressTrades` | same names | `vm` (types in `market-signals.ts`) |
| `SentimentBadge(vm)` | `SentimentBadge` | `vm`; build it with `buildSentimentBadge()` (`sentiment.ts`, which also has `sentimentCoverageLabel` and the other helpers) |
| `AIConsentDisclosure` / `AIConsentCard(next,dismissible,notNowHref)` / `AIConsentPage(next)` | same names | Card also takes `action?` (default `/ai-consent`) |
| `ConnectAgentPill` | `ConnectAgentPill` | |
| `MCPStateBadge(state)` / `MCPStateClass` | `MCPStateBadge`, `mcpStateClass()` | `state` + children |
| `PilotFollowingBanner(vm)` / `PilotFollowingFor` | `PilotFollowingBanner`, `pilotFollowingFor()` | `vm: PilotFollowingVM` |
| `CSVImportFormatHint` / `WatchlistCSVImportFormatHint` | same names | |
| `ChartEmbed(html)` | `ChartEmbed` | `html`. `{@html}` does not run `<script>`, so use `#lib/charts` for live charts |
| `StoreBadges` / `AppStoreBadge` / `GooglePlayBadge` | same names | `appStoreURL googlePlayURL` / `href` |
| `NorviqIcon` / `NorviqLogo` / `NorviqFullLogo` / `NorviqFullLogoLarge` / `NorviqLogoLarge` | `BrandLogo` | `variant: 'icon' \| 'full' \| 'full-large'` (the shell keeps `#lib/components/brand/NorviqLogo.svelte`) |
| `VigIcon(class)` / `VigFull(class)` / `VigMark` | same names | `class?` |
| `AuthBrandPanel` / `AuthMobileBrand` / `GoogleLogoIcon` | same names | |
| `PinesModalShell(id, openEvent, title)` | `PinesModalShell` | `modalID openEvent? title open(bindable)` + children. Open it with `window.dispatchEvent(new CustomEvent('openQuickExpense'))` (this replaces Alpine `$dispatch`) or with `bind:open` |
| `PinesSearchField(searchURL, targetID)` | `PinesSearchField` | `resultsId query(bindable) onsearch?(q)` (fires 280ms after typing stops), and a `results(q)` snippet. The page fetches the results itself (TanStack Query on `/api/v1/...`) |

## templUI (internal/components) → Svelte

| templUI | Svelte | Notes |
|---|---|---|
| `button.Button` | `Button` (`tui/Button.svelte`), `buttonClass()` | `variant size fullWidth href target disabled type form class` |
| `input.Input` | `Input` | `type value(bindable) hasError fileAccept noTogglePassword`; the password toggle works |
| `textarea.Textarea` | `Textarea` | `value(bindable) rows autoResize hasError` |
| `checkbox.Checkbox` | `Checkbox` | `checked(bindable) value group groupParent icon(snippet)` |
| `switch.Switch` (switchcomp) | `Switch` | `checked(bindable) value disabled class` (class goes on the track) |
| `label.Label` / `form.*` | `Label`; `form.Item / ItemFlex / Label / Description / Message(variant)` | |
| `card.*` | `card.Card / Header / Title / Description / Content / Footer` | |
| `table.*` | `table.Table / Header / Body / Footer / Row(selected) / Head / Cell / Caption` | |
| `badge.Badge` | `Badge` | `variant: default\|secondary\|destructive\|outline` |
| `dialog.*` + `dialog.js` | `dialog.Dialog(id, open(bindable), disableClickAway, disableESC) / Trigger(for) / Content(hideCloseButton, disableModal) / Close(for) / Header / Footer / Title / Description` | Native `<dialog>` with the same `data-tui-dialog-*` attributes and a 200ms close. `openDialog(id)`, `closeDialog(id)`, `toggleDialog(id)` and `isDialogOpen(id)` replace `window.tui.dialog.*` |
| `copybutton.CopyButton` | `CopyButton` | `targetId id? class?` + attrs |
| `brandicon.Mark(name, class)` | `BrandMark` | `name class`; `hasBrandMark(name)` |
| `icon.Icon("kebab")(Props{Class})` | `Icon` | `name class`. Registry: `tui/icon-registry.ts`, holding the 160 names the Go web uses (literals, named calls and pillar data). For a fixed icon, import from `@lucide/svelte/icons/<name>` |
| `icon.X(…)` named | `import X from '@lucide/svelte/icons/x'` | add `data-lucide="icon"` if the CSS needs it |
| `vigil.*` | `vigil.Panel(class, titleID) / PanelHeader(id,title,desc,trailing) / MetricStrip / Metric(label,value,sentiment) / Hero(label,value,delta) / HeroDelta(text,sentiment) / InsetList(class) / ListRow(icon,tone,title,subtitle,trailing) / RowTrailing(value,caption,sentiment) / DataTable(class) / TerminalLine(text) / ModernPageHeader(title,subtitle,actions) / ModernPage / CanvasPage / DeckPage(pageClass,title,subtitle,actions) / DocumentPage(pageClass,backHref,backLabel,title,subtitle) / CommandDeck(class) / CommandSplit(class) / CommandSplitMain / CommandSplitAside / SettingsShell(backHref,backLabel,title,subtitle) / AuthShell(class) / AuthBrandColumn / AuthFormColumn` | `heroFormat()` and `backLinkText()` are exported too |

## Motion and theme

- `#lib/motion.js` holds `animateValue` (count-up, uses `motion`), `flashChange`,
  `getDirection`, `staggerReveal`, `segmentClip`, `triggerInitialValueAnimations`,
  `initScrollTaste` and `prefersReducedMotion`. It also has these attachments:
  - `pageMotion()`: the first-paint motion, scoped to the element
  - `staggerOnMount(selector, delay)`
  - `reveal()`: for `[data-motion-reveal]`
  - `scrubText()`
  - `countUp()`
  - `flashOnChange(() => value, {direction?, springPop?})`: replaces the htmx after-swap flash

  All of them respect prefers-reduced-motion.
- `#lib/theme.svelte.js` has `theme.mode` / `theme.isDark` (reactive), `applyTheme(mode)`,
  `initTheme()`, `getStoredTheme()` and `THEME_COLORS`. It uses localStorage
  `app_appearance` and fires the `theme-changed` event. The pre-paint script stays in `app.html`.

## Not ported

- **Dead (no call sites):** `PhoneMockup`, `MeshBackground`, `controlproof` (test-only),
  `vigil.FormDeck`, `ThemeInitScript` (replaced by `app.html`), `selectbox` / `SelectField.UseCombobox`
  (never enabled), `components.PillarOptions` (needs server-side `onboarding.ResolvePillars`;
  build `Option[]` in the page load). The templUI packages accordion, alert, aspectratio, avatar,
  breadcrumb, calendar, carousel, collapsible, datepicker, dropdown, hovercard, inputotp,
  pagination, popover, progress, radio, rating, separator, sheet, sidebar, skeleton, slider, tabs,
  tagsinput, timepicker, toast and tooltip have no page call sites. Use `#lib/components/ui/*`
  (shadcn-svelte) if a page needs one.
- **Go runtime plumbing:**
  - `csrf` is not needed, because SvelteKit rejects cross-origin form posts.
  - `htmx` is replaced by SvelteKit navigation, `use:enhance` and TanStack Query.
  - `head_assets`, `critical_app` and `pwa` are replaced by `app.html`, `routes/layout.css` and `static/`.
  - `runtime_config` is replaced by `page.data` and `$app/env/public`.
  - `templui_scripts` is no longer needed, because each component carries its own behaviour.
  - `csp` is replaced by SvelteKit `csp` config and hooks.
  - `shell` and `trial_banner` live in `#lib/components/shell`.
