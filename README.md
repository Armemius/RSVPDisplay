# RSVP Display

A browser-based RSVP reader foundation built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui (Base UI primitives). This first version imports and previews documents; timed, word-by-word playback is not implemented yet.

## Run locally

Use Node.js 22.12+ (or a newer supported LTS release) and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To build and serve the production bundle:

```sh
npm run build
npm run preview
```

## Import a document

Choose or drag in one UTF-8 `.rsvp` file, up to 10 MB. The page opens directly to a dropzone, then shows a plain text viewer with a chapter selector. Use the upload and close icons in the header to replace or remove the document. You can also drop a replacement file onto the viewer. An editable [sample template](public/example.rsvp) is included in the repository.

The importer follows the [RSVP Nano version 1 format](https://github.com/ionutdecebal/rsvpnano/blob/main/docs/conversion/spec.md). The first three lines must contain the version, title, and source, in this order:

```text
@rsvp 1
@title My next read
@source my-document.txt
@author Optional author
@chapter The beginning
A paragraph of text can wrap across lines.
@para
A new paragraph starts here.
@@A readable line starting with @ must be escaped.
```

Supported optional directives: `@author`, `@converter`, `@chapter`, `@para`, `@language`, `@direction`, and `@writing-mode vertical-rl`. Language and direction changes are retained for each text segment. The preview respects vertical layout. UTF-8 BOM and Windows line endings are accepted. Unknown or malformed directives produce a line-specific error.

After import, the viewer shows the document title, author when available, and chapter text. Replace or remove the current file at any time. If a replacement fails validation, the previous document remains available.

Processing happens entirely in the browser. Files are kept in memory for the current tab only; refreshing clears them. There is no backend, account, or document upload. EPUB, PDF, HTML, and plain-text conversion are outside this initial version: convert those to `.rsvp` first using RSVP Nano's companion.

## Interface languages

The interface uses [react-i18next](https://react.i18next.com/) with English and Russian translations. Use the **EN / РУ** selector in the header to switch languages immediately. The initial language follows the browser preference, with English as the fallback for unsupported languages. Your selection is saved under `rsvp-display-language` in localStorage and takes priority on future visits. If browser storage is blocked, switching still works for the current page.

Translations are bundled locally in `src/locales/en.json` and `src/locales/ru.json`. Controls, accessibility text, validation errors, and page metadata follow the selected language. Numbers and the word count announced to screen readers use locale-specific formatting and plural forms. Document text, titles, author names, and file source stay as supplied; changing the interface language keeps the selected chapter.

To add a language:

1. Add a translation JSON file in `src/locales/`, using the English keys as the base and adding the new language's plural forms.
2. Import it into `src/i18n.ts`, register it in `resources`, and add its language code to `supportedLanguages`.
3. Add an option with its code to the language selector in `src/App.tsx`.
4. Run the unit and browser checks below. Translation keys are checked against English through `src/i18next.d.ts`.

The parser throws structured `ImportError` values with a stable `code`, optional interpolation `values`, and optional `line`. The interface translates those details at render time, so an existing error also changes language when you switch.

## Checks

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Unit tests cover parsing, directives, Unicode, paragraph boundaries, file limits, encoding errors, translation coverage, plural rules, and number formatting. Playwright checks the file selection, drag-and-drop, replacement, removal, chapter navigation, and viewer layouts in desktop and mobile Chromium layouts. Language tests also check detection, persistence, English fallback, storage restrictions, translated errors, and document preservation while switching languages. Browser tests start and stop their own Vite server on port 4173; use a free port before running them.

## Project structure

- `src/App.tsx` — document import and preview page
- `src/lib/rsvp.ts` — typed, standalone parser and file validation
- `src/components/ui/` — shadcn/ui components
- `src/i18n.ts` — language detection and i18next setup
- `src/locales/` — English and Russian translations
- `src/index.css` — Tailwind configuration and theme
- `src/App.css` — responsive page styles
- `public/example.rsvp` — downloadable template
- `tests/` — unit and browser tests

To add more shadcn/ui components:

```sh
npx shadcn@latest add <component>
```
