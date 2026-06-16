---
"@notionx/core": minor
"@notionx/create-nextion-app": minor
---

Registry Protocol v2 + SearchAdapter abstraction (P0-P6)

- Registry Protocol v2: 8 composable items with install/remove/add commands,
  dependency enforcement, and fallback template rendering
- SearchAdapter: pluggable search interface with D1 default implementation
- 6 toggleable feature flags with --no-* env vars
- Scaffolder: conditional template rendering, managed file tracking,
  migration skip rules, fallback templates for clean removal
- Core cleanup: removed stale hooks/, auth.ts, cloudflare-runtime.ts
- Merged multilingual foundation (locale add/list commands) with v2 registry
