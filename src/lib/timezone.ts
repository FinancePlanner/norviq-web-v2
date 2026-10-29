// scripts.js rememberTimezone. The backend counts check-in days and streaks in
// the user's own zone; the server reads this cookie into the X-Timezone header,
// validating it there, so a missing or odd value only means UTC.
export function rememberTimezone(): void {
	try {
		const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (!zone || zone.length > 64) return;
		const current = document.cookie.split('; ').find((part) => part.startsWith('tz='));
		if (current === 'tz=' + zone) return;
		const secure = location.protocol === 'https:' ? '; Secure' : '';
		document.cookie = 'tz=' + zone + '; Path=/; Max-Age=31536000; SameSite=Lax' + secure;
	} catch {
		/* no Intl or cookies blocked: the server falls back to UTC */
	}
}
