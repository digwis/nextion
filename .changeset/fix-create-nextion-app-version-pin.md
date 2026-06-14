---
"@notionx/create-nextion-app": patch
---

Fix: generated projects now pin `@notionx/create-nextion-app` to the
actual published scaffolder version instead of reusing `nextionSource`.
This prevents `pnpm install` from failing when `@notionx/core` has
advanced beyond the latest published scaffolder release.
