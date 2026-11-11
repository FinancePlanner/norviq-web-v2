---
name: Norviq
description: Financial intelligence for people who plan before they act. Champagne gold on obsidian navy, numbers first.
colors:
  deep-gold: 'oklch(0.513 0.082 79)'
  champagne-gold: 'oklch(0.788 0.089 80)'
  precision-gold: 'oklch(0.857 0.092 80)'
  warm-page: 'oklch(0.968 0.009 85)'
  card-white: 'oklch(1 0 0)'
  warm-raised: 'oklch(0.941 0.012 85)'
  sidebar-warm: 'oklch(0.947 0.013 87)'
  warm-hairline: 'oklch(0.896 0.017 85)'
  warm-control-border: 'oklch(0.616 0.023 82)'
  midnight-navy: 'oklch(0.221 0.035 260)'
  slate-secondary: 'oklch(0.447 0.034 261)'
  obsidian: 'oklch(0.172 0.023 260)'
  armor-blue: 'oklch(0.28 0.047 260)'
  deep-graphite: 'oklch(0.281 0.026 253)'
  platinum: 'oklch(0.933 0.005 107)'
  muted-silver: 'oklch(0.73 0.026 254)'
  navy-control-border: 'oklch(0.574 0.04 260)'
  gain-light: 'oklch(0.482 0.091 165)'
  loss-light: 'oklch(0.507 0.152 20)'
  warning-light: 'oklch(0.498 0.101 68)'
  info-light: 'oklch(0.491 0.097 246)'
  flat-light: 'oklch(0.491 0.024 251)'
  gain-dark: 'oklch(0.707 0.118 169)'
  loss-dark: 'oklch(0.674 0.145 17)'
  warning-dark: 'oklch(0.787 0.113 73)'
  info-dark: 'oklch(0.706 0.093 243)'
  flat-dark: 'oklch(0.75 0.019 253)'
typography:
  display:
    fontFamily: 'Geist Sans, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif'
    fontSize: '2.5rem'
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: '-0.02em'
    fontFeature: 'tnum'
  headline:
    fontFamily: 'Geist Sans, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif'
    fontSize: '2rem'
    fontWeight: 700
    lineHeight: '2.375rem'
    letterSpacing: '-0.025em'
  title:
    fontFamily: 'Geist Sans, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif'
    fontSize: '1.0625rem'
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: 'Geist Sans, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif'
    fontSize: '1.0625rem'
    fontWeight: 400
    lineHeight: '1.375rem'
  subhead:
    fontFamily: 'Geist Sans, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 400
    lineHeight: '1.25rem'
  label:
    fontFamily: 'Geist Sans, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif'
    fontSize: '0.8125rem'
    fontWeight: 600
    lineHeight: '1.125rem'
  caption:
    fontFamily: 'Geist Sans, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 400
    lineHeight: '1rem'
  mono:
    fontFamily: 'JetBrains Mono, SF Mono, ui-monospace, Menlo, monospace'
    fontSize: '0.8125rem'
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: '0.5rem'
  control: '0.75rem'
  card: '1rem'
  hero: '1.25rem'
  pill: '999px'
spacing:
  '1': '0.25rem'
  '2': '0.5rem'
  '3': '0.75rem'
  '4': '1rem'
  '6': '1.5rem'
  '8': '2rem'
  card-pad: '1rem'
  card-pad-md: '1.25rem'
  stack-gap: '1.25rem'
components:
  button-primary:
    backgroundColor: '{colors.deep-gold}'
    textColor: '{colors.card-white}'
    rounded: '{rounded.card}'
    padding: '0.625rem 1rem'
    typography: '{typography.label}'
  button-primary-dark:
    backgroundColor: '{colors.champagne-gold}'
    textColor: '{colors.obsidian}'
    rounded: '{rounded.card}'
    padding: '0.625rem 1rem'
  input:
    backgroundColor: '{colors.warm-raised}'
    textColor: '{colors.midnight-navy}'
    rounded: '{rounded.control}'
    padding: '0.625rem 0.875rem'
    typography: '{typography.subhead}'
  card:
    backgroundColor: '{colors.card-white}'
    textColor: '{colors.midnight-navy}'
    rounded: '{rounded.card}'
    padding: '{spacing.card-pad}'
  card-dark:
    backgroundColor: '{colors.midnight-navy}'
    textColor: '{colors.platinum}'
    rounded: '{rounded.card}'
    padding: '{spacing.card-pad}'
  chip-subnav:
    textColor: '{colors.slate-secondary}'
    rounded: '{rounded.control}'
    padding: '0.375rem 0.75rem'
    typography: '{typography.label}'
  badge-pro:
    backgroundColor: '{colors.deep-gold}'
    textColor: '{colors.card-white}'
    rounded: '{rounded.pill}'
    padding: '0.125rem 0.5rem'
  nav-item-active:
    textColor: '{colors.deep-gold}'
    rounded: '{rounded.sm}'
---

# Design System: Norviq

## Overview

**Creative North Star: "The Night Desk"**

An analyst's desk after the close. The room is dark and quiet, one lamp is on, and the light falls on the figures that matter. Norviq's flagship scope is dark (obsidian page, midnight-navy surfaces, platinum type); the light scope is the same desk in daylight, warm paper with navy ink. Both scopes share one rule: nothing decorative competes with a number. Gold is the lamp. It lands on the one primary action, the active place in the navigation, the focus ring, and occasionally the one insight worth noticing, and nowhere else.

Density is medium. Pages are working documents rather than dashboards of tiles: a clear title, then content set as rows, tables and figures separated by hairline rules. Surfaces are flat at rest. Depth is tonal (page, card, raised surface step through one hue axis per scope) and real shadows are kept for things that float above the page. Motion is short and decelerating, and every screen must stay legible and correct with all motion and effects off.

The system rejects the trading-app register: no confetti, no glow, no neon, no gradient text, no mesh backgrounds, no celebratory motion around gains or losses, and no SaaS hero-metric tiles.

**Key Characteristics:**

- Dark-first, with a full warm light scope; one OKLCH hue axis per scope (navy 260, warm paper 85).
- Champagne/deep gold as a rare accent; green and red only for financial direction.
- Geist Sans throughout, tabular numerals wherever numbers meet.
- Flat surfaces, hairline rules, tonal layering; shadows only for overlays.
- Restrained and exact controls: crisp edges, quiet fills, one gold action per view.

## Colors

A two-scope palette on a single hue axis each: navy darks, warm-paper lights, with gold as the only brand accent and a separate, strictly semantic set for financial direction.

### Primary

- **Deep Gold** (deep-gold): the accent in the light scope. Primary button fill (carries white at 5.0:1), active nav text, links, focus ring, selected state, and accent text on the warm page (5.2:1). Chosen over champagne because champagne is 1.8:1 on the light page.
- **Champagne Gold** (champagne-gold): the accent in the dark scope and the brand gold of the logo. Primary button fill with obsidian ink on top (9.7:1). Never carries white text (1.96:1).
- **Precision Gold** (precision-gold): the dark scope's focus ring and selected highlight; the brightest gold, used only for state.

### Neutral

- **Warm Page** (warm-page): light-scope page background.
- **Card White** (card-white): light-scope cards and tables that need to lift off the page.
- **Warm Raised** (warm-raised): light-scope raised fills, calculated read-only cells, muted chips.
- **Sidebar Warm** (sidebar-warm): the light sidebar, one step off the page.
- **Warm Hairline** (warm-hairline): light borders and dividers; decorative, well under 3:1.
- **Warm Control Border** (warm-control-border): outlines a user must find (inputs, toggles); 3.6:1 on card.
- **Midnight Navy** (midnight-navy): light-scope primary text (15.7:1) and the dark scope's card surface.
- **Slate Secondary** (slate-secondary): light-scope secondary text, labels, table headers (6.9:1).
- **Obsidian** (obsidian): dark-scope page background and ink on gold.
- **Armor Blue** (armor-blue): dark-scope raised panels, popovers, read-only cells.
- **Deep Graphite** (deep-graphite): dark-scope supporting fills.
- **Platinum** (platinum): dark-scope primary text (12.0:1 on Armor).
- **Muted Silver** (muted-silver): dark-scope secondary text (6.1:1).
- **Navy Control Border** (navy-control-border): dark-scope input and control outlines (3.3:1 on Armor). Dark hairlines are alpha (`oklch(0.8 0.04 258 / 12%)`) so one token reads on page, card and sidebar.

### Financial semantics

Separate from brand, defined per scope, each ≥4.5:1 as text on the page and on a 12% chip of itself.

- **Gain** (gain-light / gain-dark): positive direction only.
- **Loss** (loss-light / loss-dark): negative direction only.
- **Warning** (warning-light / warning-dark): attention that is not a market move, e.g. over budget.
- **Information** (info-light / info-dark): neutral notices.
- **Flat** (flat-light / flat-dark): unchanged values.

### Named Rules

**The Lamp Rule.** Gold covers about 10% of a screen: the primary action, the active nav item, the focus ring, the selected row, at most one key insight. If two things on a screen are gold and neither is an action or a state, one of them is wrong.

**The Gold Is Not Money Rule.** Gold never means profit. Green and red mean direction and nothing else, and direction is never colour alone: it always carries a sign (+ / −), an arrow (▲ / ▼) or an accessible label.

## Typography

**Display Font:** Geist Sans (with -apple-system, Segoe UI, system-ui)
**Body Font:** Geist Sans (same stack)
**Label/Mono Font:** JetBrains Mono, for code, identifiers and API keys only

**Character:** One neutral grotesque in several weights, so hierarchy comes from size and weight rather than a second voice. Numbers set in tabular figures read as columns even outside tables.

### Hierarchy

- **Display** (600, 2.5rem, 1.05, -0.02em, tabular): the hero figure on a page, such as a portfolio value. One per view.
- **Headline** (700, 2rem, 2.375rem, -0.025em): the page title (`text-title1`). Balanced wrapping; a document page may scale it with clamp down to about 1.625rem.
- **Title** (600, 1.0625rem, 1.3): panel and section headings.
- **Body** (400, 1.0625rem, 1.375rem): card titles and primary row text. Reading prose (narratives, explanations) sits at 1rem with 1.6 line height and a 65ch measure.
- **Subhead** (400, 0.9375rem, 1.25rem): secondary copy, form fields, subtitles under a page title.
- **Label** (600, 0.8125rem): table headers, chips, small controls, notes under a row (often in secondary colour at weight 400–500).
- **Caption** (400, 0.75rem, 1rem): disclaimers, timestamps, fine print.

### Named Rules

**The Tabular Rule.** Any number that can sit next to another number (prices, P&L, percentages, budgets, dates in a column) uses tabular figures and right alignment in tables. A changing value in a table is never animated.

**The Sentence-Case Rule.** Headings and labels are sentence case and literal. No uppercase tracked eyebrows above sections.

## Layout

Pages live inside an app shell: a 16rem sidebar on desktop (collapsible to an icon rail), a top bar and five-tab bottom bar below 1024px, and a main area padded 1rem (1.25rem from 1024px). Every page column starts at the same left edge as the main gutter; pages never centre their own column, so the title does not move between pages.

Three page grammars set the column width:

- **Document** (54rem): reading and settings pages; digests, achievements, settings.
- **Deck** (72rem): working pages with panels and tables; notifications, portfolio, expenses.
- **Canvas / Overview** (up to 92rem from 1500px, 104rem from 1800px): the dashboard and markets.

Spacing follows a 4px base (0.25, 0.5, 0.75, 1, 1.5, 2rem). Related items group tightly (0.25–0.75rem), distinct groups separate at 1.25–1.5rem, page sections at 1.5–2rem. Tables collapse into horizontal scroll inside their own wrapper on narrow screens; the page itself never scrolls sideways.

### Named Rules

**The One Edge Rule.** Every app page starts at the main gutter, under the banner and beside the sidebar. Width varies by grammar; the left edge does not.

## Elevation & Depth

Flat by default. Depth comes from tonal steps on one hue axis (page → card → raised) and from hairline rules between sections. Inside a document, sections are separated by a 1px hairline rather than wrapped in cards. Cards are for discrete objects a user acts on (an achievement, a notification, a settings entry), never as the default wrapper for content. Shadows exist in three levels and belong to things that float: popovers, menus, dialogs, toasts. The current card style (1px border plus the low shadow) is the incumbent and stays where it is; new work should not add shadows to resting surfaces.

### Shadow Vocabulary

- **Panel** (`box-shadow: 0 1px 2px oklch(0.221 0.035 260 / 6%), 0 4px 10px oklch(0.221 0.035 260 / 4%)`; dark: `0 1px 2px oklch(0 0 0 / 24%), 0 6px 14px oklch(0 0 0 / 18%)`): the existing card; the ceiling for anything at rest.
- **Panel MD** (`0 2px 4px … / 6%, 0 8px 20px … / 6%`): popovers, dropdown menus.
- **Panel LG** (`0 4px 8px … / 8%, 0 16px 40px … / 8%`): dialogs and modal panels only.

### Named Rules

**The Rule-Over-Card Rule.** If content is read rather than acted on, separate it with a hairline, not a card. Nested cards are never allowed.

**The No-Glow Rule.** No glow, blur-as-decoration, mesh gradients or neon in either scope.

## Shapes

Gently rounded, never soft. Cards and primary buttons use a 1rem radius, controls 0.75rem, small elements 0.5rem, and the hero surface 1.25rem. Pills (999px) are only for badges and status chips. Borders are 1px; the only heavier mark is the 2px gold inset rule on the active sidebar item, drawn as an inset shadow so the row never shifts.

## Components

### Buttons

Restrained and exact: one filled gold action per view, everything else quiet.

- **Shape:** gently rounded (1rem).
- **Primary:** deep-gold fill with white text in light; champagne-gold fill with obsidian ink in dark. 0.625rem × 1rem padding, label weight. Full width on phones, auto width from 40rem.
- **Hover / Focus / Active:** brightness up 5% on hover; focus is the gold ring; disabled at 65% opacity. Loading shows an inline spinner and blocks the pointer.
- **Secondary (accent outline):** a 9% gold wash on the card with gold text and a hairline border; used for "add" and in-panel actions.

### Chips

- **Section sub-nav:** hairline border, secondary text, 0.75rem radius, label size. Active: gold text on the soft gold wash.
- **Pro badge:** a gold pill with white (light) or obsidian (dark) text at 10px bold. Static; no shimmer.
- **Direction pill:** sign + arrow + value on a 12–14% wash of gain, loss or flat.

### Cards / Containers

- **Corner Style:** 1rem.
- **Background:** card-white (light), midnight-navy (dark).
- **Shadow Strategy:** the Panel level at most (see Elevation & Depth).
- **Border:** 1px hairline.
- **Internal Padding:** 1rem, 1.25rem from 768px.

### Inputs / Fields

- **Style:** grouped-field look: a 4% foreground fill, transparent 1px border, 0.75rem radius, subhead size.
- **Focus:** the border turns gold; no glow ring.
- **Error / Disabled:** error text in loss colour under the field; disabled uses the disabled token and no fill change.

### Navigation

- **Sidebar:** grouped, collapsible sections, 15px rows. Active item: gold text, a 6% gold wash and a 2px gold inset rule on the leading edge.
- **Mobile:** a top bar with logo and two icon buttons, a section sub-nav of chips under the banner, and a five-tab bottom bar whose active tab is gold.

### Document Section (signature)

The digest pattern: a page title, a period line in the reader's locale, an optional narrative at a 65ch measure, a contents row of plain links, then sections separated by hairlines, each with a title and its figures as rows or a table. Arriving at a section from a deep link tints it with the soft gold wash for about two seconds; under reduced motion there is no tint.

## Do's and Don'ts

### Do:

- **Do** keep gold to the primary action, active nav, focus and selection (The Lamp Rule).
- **Do** use the gain/loss tokens with a sign or arrow for every directional figure.
- **Do** set numbers in tabular figures and right-align numeric table columns.
- **Do** separate read-only content with hairline rules; reserve cards for things a user acts on.
- **Do** start every app page at the main gutter and pick its width from Document, Deck or Canvas.
- **Do** use the motion tokens (140 / 240 / 320ms, decelerating) and make every animation degrade to nothing under reduced motion.
- **Do** check both scopes; light is a first-class user setting.

### Don't:

- **Don't** use gold to mean profit, or green and red as decoration.
- **Don't** put white text on champagne gold (1.96:1).
- **Don't** add glow, neon, mesh gradients, gradient text or decorative circuitry.
- **Don't** nest cards, or wrap every section in a card by default.
- **Don't** add shadows to resting surfaces beyond the Panel level.
- **Don't** put uppercase tracked eyebrows above sections.
- **Don't** animate changing values in tables, or celebrate gains and losses with motion.
- **Don't** gate content visibility on an animation; content is visible by default and motion only enhances it.
