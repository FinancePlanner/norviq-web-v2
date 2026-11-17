/**
 * A posted text field, as Go's r.FormValue read it: the string, or '' when the field is missing.
 * An uploaded file under the same name is not a value either, so it reads as '' rather than
 * being stringified to "[object File]".
 */
export function formValue(form: FormData | null | undefined, name: string): string {
	const value = form?.get(name);
	return typeof value === 'string' ? value : '';
}

/**
 * String(value) for a value of unknown shape that is meant to be text: strings as they are,
 * numbers, booleans and bigints as String() prints them, and '' for everything else. An object
 * would otherwise print as "[object Object]".
 */
export function scalarText(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
		return String(value);
	return '';
}
