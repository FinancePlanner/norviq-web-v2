// ESLint runs only the Svelte-specific rules (template and runes checks that
// oxlint cannot see). Everything else, including type-aware rules, is oxlint:
// see .oxlintrc.json. eslint-plugin-oxlint turns off any ESLint rule that
// oxlint already covers, so the two never report the same thing twice.
import prettier from 'eslint-config-prettier';
import path from 'node:path';
import oxlint from 'eslint-plugin-oxlint';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');
const svelteFiles = ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'];

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	// Plain TypeScript is oxlint's job. Without this, an oxlint override that
	// names .ts files would pull them into ESLint, which has no parser for them.
	{ ignores: ['**/*.ts', '!**/*.svelte.ts'] },
	svelte.configs.recommended.map((config) => ({ ...config, files: svelteFiles })),
	svelte.configs.prettier.map((config) => ({ ...config, files: svelteFiles })),
	prettier,
	{
		files: svelteFiles,
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
			// Parse only: no projectService. No Svelte rule needs type
			// information, and building the TS program per file was the
			// 4-minute part of the old lint.
			parserOptions: { parser: ts.parser, extraFileExtensions: ['.svelte'] }
		},
		linterOptions: { reportUnusedDisableDirectives: 'off' },
		rules: {
			// No paths.base is configured, so plain hrefs and goto() targets are
			// already resolved.
			'svelte/no-navigation-without-resolve': 'off',
			// The flagged Map/URLSearchParams are local builders replaced wholesale,
			// never mutated in place as reactive state.
			'svelte/prefer-svelte-reactivity': 'off',
			// Reports a11y svelte-ignore comments that svelte-check still relies on.
			'svelte/no-unused-svelte-ignore': 'off',
			// Literal mustaches keep leading whitespace and embedded quotes.
			'svelte/no-useless-mustaches': 'off'
		}
	},
	...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json')
);
