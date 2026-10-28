// Shared prop shapes for the Norviq kit (ports of the Go structs in
// internal/pages/components). Field names keep the Go meaning, camelCased.

/** components.Option — one choice in a SelectField / NativeSelect. */
export interface Option {
	value: string;
	label: string;
	selected?: boolean;
	disabled?: boolean;
	/** Extra attributes on the <option> itself (e.g. data-portfolio read back off selectedOptions). */
	attrs?: Record<string, unknown>;
}

/** components.SegmentItem */
export interface SegmentItem {
	label: string;
	path: string;
}

/** components.FilterChip (declared in kit.templ; no renderer). */
export interface FilterChip {
	id: string;
	label: string;
}

/** components.PinesSegmentItem (declared in pines.templ; no renderer). */
export interface PinesSegmentItem {
	id: string;
	label: string;
}

/** vigil sentiment for Metric / HeroDelta / ListRow / RowTrailing. */
export type Sentiment = 'positive' | 'negative' | '' | undefined;

/** components.ButtonProps role. */
export type ButtonRole = 'primary' | 'secondary' | 'ghost';

/** components.controlID: an explicit id wins, else the field name. */
export function controlID(id: string | null | undefined, name: string | null | undefined): string {
	return id || name || '';
}
