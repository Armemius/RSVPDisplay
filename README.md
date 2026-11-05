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

Choose or drag in one UTF-8 `.rsvp` file, up to 10 MB. You can also select **Try an example** or download the editable [sample template](public/example.rsvp).

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

After import, the page shows metadata, word count, chapter navigation, a text preview, and the original source. The time estimate uses 250 words per minute. Replace or remove the current file at any time. If a replacement fails validation, the previous document remains available.

Processing happens entirely in the browser. Files are kept in memory for the current tab only; refreshing clears them. There is no backend, account, or document upload. EPUB, PDF, HTML, and plain-text conversion are outside this initial version: convert those to `.rsvp` first using RSVP Nano's companion.

## Checks

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Unit tests cover parsing, directives, Unicode, paragraph boundaries, file limits, and encoding errors. Playwright checks the upload, drop, replace, remove, sample, download, help, and preview flows in desktop and mobile Chromium layouts. Browser tests start and stop their own Vite server on port 4173; use a free port before running them.

## Project structure

- `src/App.tsx` — document import and preview page
- `src/lib/rsvp.ts` — typed, standalone parser and file validation
- `src/components/ui/` — shadcn/ui components
- `src/index.css` — Tailwind configuration and theme
- `src/App.css` — responsive page styles
- `public/example.rsvp` — downloadable template
- `tests/` — unit and browser tests

To add more shadcn/ui components:

```sh
npx shadcn@latest add <component>
```
