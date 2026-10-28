// Norviq kit barrel: `import { Field, PrimaryButton, EmptyState } from '#lib/components/norviq/index.js'`.
// templUI primitives are namespaced like the Go packages:
//   import * as dialog from '#lib/components/norviq/tui/dialog/index.js'
//   import * as vigil from '#lib/components/norviq/vigil/index.js'
// See README.md for the templ → Svelte mapping.

export { default as AIConsentCard } from './AIConsentCard.svelte';
export { default as AIConsentDisclosure } from './AIConsentDisclosure.svelte';
export { default as AIConsentPage } from './AIConsentPage.svelte';
export { default as AppStoreBadge } from './AppStoreBadge.svelte';
export { default as AuthBrandPanel } from './AuthBrandPanel.svelte';
export { default as AuthMobileBrand } from './AuthMobileBrand.svelte';
export { default as BrandLogo } from './BrandLogo.svelte';
export { default as CSVImportFormatHint } from './CSVImportFormatHint.svelte';
export { default as CardHeader } from './CardHeader.svelte';
export { default as ChartEmbed } from './ChartEmbed.svelte';
export { default as ChartPlaceholder } from './ChartPlaceholder.svelte';
export { default as CheckboxField } from './CheckboxField.svelte';
export { default as CollapsibleSection } from './CollapsibleSection.svelte';
export { default as CongressTrades } from './CongressTrades.svelte';
export { default as ConnectAgentPill } from './ConnectAgentPill.svelte';
export { default as EmptyState } from './EmptyState.svelte';
export { default as EmptyStateInline } from './EmptyStateInline.svelte';
export { default as Field } from './Field.svelte';
export { default as FormErrorBanner } from './FormErrorBanner.svelte';
export { default as GhostButton } from './GhostButton.svelte';
export { default as GoogleLogoIcon } from './GoogleLogoIcon.svelte';
export { default as GooglePlayBadge } from './GooglePlayBadge.svelte';
export { default as IconButton } from './IconButton.svelte';
export { default as InsiderActivity } from './InsiderActivity.svelte';
export { default as InstitutionalOwnership } from './InstitutionalOwnership.svelte';
export { default as ListSkeleton } from './ListSkeleton.svelte';
export { default as MCPStateBadge } from './MCPStateBadge.svelte';
export { default as NativeButton } from './NativeButton.svelte';
export { default as NativeInput } from './NativeInput.svelte';
export { default as NativeSelect } from './NativeSelect.svelte';
export { default as NewsHeadlineList } from './NewsHeadlineList.svelte';
export { default as NorviqButton } from './NorviqButton.svelte';
export { default as PasswordField } from './PasswordField.svelte';
export { default as PasswordToggle } from './PasswordToggle.svelte';
export { default as PilotFollowingBanner } from './PilotFollowingBanner.svelte';
export { default as PinesModalShell } from './PinesModalShell.svelte';
export { default as PinesSearchField } from './PinesSearchField.svelte';
export { default as PrimaryButton } from './PrimaryButton.svelte';
export { default as ProFeatureRow } from './ProFeatureRow.svelte';
export { default as ProGate } from './ProGate.svelte';
export { default as ProGateHero } from './ProGateHero.svelte';
export { default as ProGateOverlay } from './ProGateOverlay.svelte';
export { default as ProGatePage } from './ProGatePage.svelte';
export { default as ProGateWrap } from './ProGateWrap.svelte';
export { default as SecondaryButton } from './SecondaryButton.svelte';
export { default as SecondarySubmitButton } from './SecondarySubmitButton.svelte';
export { default as SectionCard } from './SectionCard.svelte';
export { default as SegmentedControl } from './SegmentedControl.svelte';
export { default as SelectField } from './SelectField.svelte';
export { default as SentimentBadge } from './SentimentBadge.svelte';
export { default as ShareBar } from './ShareBar.svelte';
export { default as SkeletonBlock } from './SkeletonBlock.svelte';
export { default as StatPill } from './StatPill.svelte';
export { default as StoreBadges } from './StoreBadges.svelte';
export { default as SubmitButton } from './SubmitButton.svelte';
export { default as SwitchField } from './SwitchField.svelte';
export { default as TechnicalsStrip } from './TechnicalsStrip.svelte';
export { default as TextareaField } from './TextareaField.svelte';
export { default as ThemeToggle } from './ThemeToggle.svelte';
export { default as ThemeToggleCompact } from './ThemeToggleCompact.svelte';
export { default as ToastBanner } from './ToastBanner.svelte';
export { default as VaultTextField } from './VaultTextField.svelte';
export { default as VigFull } from './VigFull.svelte';
export { default as VigIcon } from './VigIcon.svelte';
export { default as VigMark } from './VigMark.svelte';
export { default as WatchlistCSVImportFormatHint } from './WatchlistCSVImportFormatHint.svelte';

// templUI primitives (non-namespaced ones)
export { default as Button, buttonClass } from './tui/Button.svelte';
export { default as Input } from './tui/Input.svelte';
export { default as Textarea } from './tui/Textarea.svelte';
export { default as Checkbox } from './tui/Checkbox.svelte';
export { default as Switch } from './tui/Switch.svelte';
export { default as Label } from './tui/Label.svelte';
export { default as Badge } from './tui/Badge.svelte';
export { default as CopyButton } from './tui/CopyButton.svelte';
export { default as BrandMark, hasBrandMark } from './tui/BrandMark.svelte';
export { default as Icon } from './tui/Icon.svelte';
export { iconRegistry } from './tui/icon-registry.js';

// helpers and types
export * from './types.js';
export { withSpinner } from './form-loading.js';
export { buildShareLinks, shareTag, captureShare, type ShareLinks, type ShareInput } from './share-links.js';
export type { ShareBarText } from './ShareBar.svelte';
export * from './market-signals.js';
export * from './sentiment.js';
export { mcpStateClass } from './mcp-status.js';
export { pilotFollowingFor, type PilotFollowingVM } from './PilotFollowingBanner.svelte';
export type { NewsHeadlineVM } from './NewsHeadlineList.svelte';
export { variantFor } from './NorviqButton.svelte';
export type { InputType } from './tui/Input.svelte';
export type { ButtonVariant, ButtonSize, ButtonType } from './tui/Button.svelte';
