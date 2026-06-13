---
"@notionx/create-nextion-app": patch
---

Fix three scaffolder bugs surfaced by a fresh end-to-end scaffold run:

- **Notion API 2025-09-03 compatibility**: the "find existing database" lookups
  now filter by `data_source` (the only `object` value the new API accepts)
  and transparently handle both `data_source` and legacy `database` results,
  so re-running the scaffolder against a workspace that already has the
  content sources no longer fails with an "invalid object" error.
- **Missing `.dev.vars.example` template**: the scaffolder used to read
  `.dev.vars.example` from the rendered project but the template file was
  never shipped, causing `pnpm install` to abort with `ENOENT`. The new
  `templates/.dev.vars.example.tmpl` ships the full set of bindings
  (D1, KV, Turnstile, Notion, Resend, Google) and the per-project
  `.gitignore` now whitelists the rendered file so it is committed.
- **`{{nextionSource}}` not substituted**: the generated `package.json`
  used to leave a literal `{{nextionSource}}` token in place of the
  `@notionx/core` version. The dependency block builder now takes the
  resolved version directly, so every preset renders a real semver.
