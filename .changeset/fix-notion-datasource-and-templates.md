---
"@notionx/create-notionx-app": patch
---

Fix Notion relation properties to use `data_source_id` instead of `database_id`

Notion API now requires `data_source_id` in relation property definitions.
The scaffold was sending `database_id`, causing 400 errors when creating
translation databases (blog-translations, page-translations, block-translations,
site-settings-translations) and the Pages database `Blocks` relation.

Also fixes two template bugs that caused `vinext deploy` build failures:
- `models.ts.tmpl`: removed broken comment that produced unterminated template
  literal and double comma when `{{internalSourceVarNames}}` was replaced
- `locale-contract/index.ts.tmpl`: removed re-export of `defineLocaleContract`
  from non-existent `@notionx/core/locale-contract` subpath
