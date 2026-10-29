// Port of norviq-web internal/server/assets/stock-analysis.js
// (Alpine `analysisScrollSpy`) as a Svelte attachment for the section nav.
//
// Go oddity kept: it watches `.fin-analysis-section[id]`, but vigil.Panel puts
// the section id on the <h2> (the panel only gets aria-labelledby), so in the
// Go markup — copied 1:1 here — no section matches, the spy returns early and
// no nav link is ever marked active. Same selectors, same result.
import type { Attachment } from 'svelte/attachments';

export interface ScrollSpyState {
	active: string;
}

export function analysisScrollSpy(state: ScrollSpyState): Attachment<HTMLElement> {
	return (el) => {
		const root = el.closest('.fin-analysis');
		if (!root) return;

		const sections = [...root.querySelectorAll<HTMLElement>('.fin-analysis-section[id]')];
		if (sections.length === 0) return;

		state.active = sections[0].id.replace(/^fin-/, '');

		if (typeof IntersectionObserver === 'undefined') return;

		const visible = new Map<string, number>();
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					visible.set(entry.target.id, entry.intersectionRatio);
				}

				let bestID = '';
				let bestRatio = 0;
				for (const section of sections) {
					const ratio = visible.get(section.id) ?? 0;
					if (ratio > bestRatio) {
						bestRatio = ratio;
						bestID = section.id;
					}
				}

				if (bestID) state.active = bestID.replace(/^fin-/, '');
			},
			{
				root: null,
				rootMargin: '-24% 0px -55% 0px',
				threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
			}
		);

		for (const section of sections) observer.observe(section);

		return () => observer.disconnect();
	};
}
