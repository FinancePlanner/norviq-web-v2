import { page } from '$app/state';
import { translator, type Locale, type T } from './index';

// Components read the active locale from root layout data, so `t()` works in
// any component without prop drilling: `import { t } from '#lib/i18n/context.svelte'`.

export function locale(): Locale {
	return (page.data?.locale as Locale | undefined) ?? 'en';
}

export const t: T = (id, ...args) => translator(locale())(id, ...args);
