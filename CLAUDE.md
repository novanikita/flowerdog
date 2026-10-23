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

- `main` runs FDS 1.0; its rules are in `docs/fds.md` and on
  `/design-system`.
- FDS 2.0 (type ladder, clothing sizes, tablets) lives on branch `fds-2`
  and is not approved for the official site. The team looks at it in the
  before/after copy at `/preview/sravni-a2b0-3fca-6957/` (built by
  `scripts/make-compare-preview.py` from `scripts/compare-was/` and
  `scripts/compare-now/`). Never merge `fds-2` into `main` on your own:
  `main` carries a commit that put the site back to 1.0, so a merge needs
  the owner's go and a revert of that commit.
- Only FDS classes and tokens (`fds-`, `--fds-`). No selectors for a page,
  client, case or language; a difference is a modifier.

## Checking a change

`scripts/screenshots/`: `node shoot.mjs <label>` before and after,
`node compare.mjs <before> <after>`. Anything that changed and was not
agreed is a bug. Draft pages live in `preview/<token>/`, rebuilt with
`bash scripts/sync-preview-pages.sh`.
