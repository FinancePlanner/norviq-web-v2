// See https://svelte.dev/docs/kit/types#app.d.ts
import type { Locale, T } from '#lib/i18n/index.js';
import type { Session } from '#lib/server/session.js';

declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		interface Locals {
			session: Session;
			locale: Locale;
			t: T;
		}

		interface Error {
			message: string;
			/** Set by requireFeature: render the Pro gate for this feature name. */
			proGate?: string;
		}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
