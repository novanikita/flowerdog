# flowerdog.studio

Static site: HTML, CSS, JS, no bundler. `main` deploys to production
(Beget and the GitHub Pages mirror) on every push.

## Publishing

- Never push to `main` and never merge into it unless the owner writes
  "пушкомит". A request to fix something is a request to fix it locally.
- Before any push, list for the owner what will change on the live site
  and wait for a yes. A preview that has to go out through `main` is still
  a push.
- Work on a branch, commit locally, let the owner check in Safari on Mac and
  iPhone first.

## Design system (FDS)

Read `docs/fds.md` before touching CSS or markup; the living version is
`/design-system` (`design-system.html`). In short:

- Only FDS classes and tokens (`fds-`, `--fds-`). No selectors for a page,
  client, case or language; a difference is a modifier on one axis.
- Sizes are clothing sizes `2xs xs s m l xl`; no modifier means M.
- Text uses the ladder `fds-h1…fds-h4` (always medium), `fds-text` and
  `fds-caption` (with `--regular|--medium|--bold`); components use the
  `--fds-type-*` tokens.
- Spacing before a heading follows its level (H1/H2 XL, H3 L, H4 M);
  groups read together keep one spacing inside.
- One layout border: `@media (width <= 768px)`.
- New things go on `/design-system` first.

## Checking a change

`scripts/screenshots/`: `node shoot.mjs <label>` before and after,
`node compare.mjs <before> <after>`. Anything that changed and was not
agreed is a bug. Draft pages live in `preview/<token>/`, rebuilt with
`bash scripts/sync-preview-pages.sh`.
