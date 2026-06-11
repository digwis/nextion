# Blog Scaffold Design

## Context

`@notionx/create-nextion-app` can already provision a Notion database through
the `ntn` CLI, but the current default blog scaffold has two problems:

1. The seeded sample posts fail to insert because the code assumes the title
   property is named `Title`, while Notion may keep the canonical title field as
   `Name`.
2. The default blog schema is too generic for a blog-first flow. The desired
   behavior is a lightweight blog database where the list stores metadata and
   the actual article content lives in the Notion page body.

## Goals

- Name the default seeded blog database as `<projectName> Blog`.
- Make the default blog model use a minimal blog-oriented schema.
- Seed sample blog entries successfully even when Notion chooses `Name` as the
  title property.
- Seed article body blocks so the generated content looks like real blog posts.
- Keep non-blog content models available for more structured future use cases.

## Non-Goals

- Do not redesign other content model presets in this change.
- Do not change the runtime blog rendering contract beyond aligning the scaffold
  with fields the runtime already expects.
- Do not add a low-code content builder or page template management system.

## Default Blog Shape

The default scaffolded content source remains `blog`, but its generated Notion
schema becomes:

- `Name` (title)
- `Slug` (rich text)
- `Description` (rich text)
- `Published` (checkbox)
- `Date` (date)
- `Tags` (multi_select)
- `Cover` (files)

The article body is authored in the Notion page content blocks, not in a
separate long-text property.

## Provisioning Behavior

### Database Naming

When the scaffold provisions the default blog source, the created database title
should be `<projectName> Blog`. This affects the visible Notion database title,
not the internal content source id, which remains `blog`.

### Schema Creation

The provisioning layer must create blog properties using the minimal schema
above. The title field should be treated as canonical `Name` for the default
blog preset.

For future-proofing, seed logic must not assume the final title property name.
After database creation and data source patching, provisioning should inspect
the resulting schema and resolve the actual title property name before seeding
pages.

### Sample Posts

The default seed count remains 3 unless explicitly overridden.

Each sample post must include:

- a title
- a slug
- a short description
- `Published = true`
- a reasonable publish date
- one or more tags
- a cover image

Each sample post must also receive page body content with a blog-like structure:

- opening heading
- two short introductory paragraphs
- one section heading
- one short bullet list
- one closing paragraph

This ensures the generated project demonstrates the intended “metadata in the
database, full content in the page” editing workflow.

## Runtime Compatibility

The scaffolded blog schema should align with the runtime blog model already used
by the starter:

- `Published` controls public visibility
- `Date` supports publish ordering and metadata
- `Tags` supports basic taxonomy
- `Cover` supports list/detail presentation

This change reduces mismatch between the scaffolded Notion schema and the app’s
existing blog expectations.

## Implementation Outline

1. Update scaffold defaults for the blog content source so the generated model
   and docs reflect the minimal blog schema.
2. Update token rendering so the default blog database title becomes
   `<projectName> Blog`.
3. Refactor Notion provisioning helpers to:
   - create the desired schema
   - fetch the actual resulting data source schema
   - resolve the real title property name
   - seed pages using the resolved property names
4. Extend seeding to append page body blocks after page creation.
5. Keep non-blog content source behavior unchanged unless explicitly using the
   default blog preset.

## Risks

- Notion may continue to normalize title property names differently across API
  versions, so seeding must depend on observed schema rather than assumptions.
- File property seeding for `Cover` must use a form accepted by the public API;
  if direct property writes are constrained, external cover assignment on page
  creation remains an acceptable fallback for the first iteration.
- Adding blog-specific provisioning paths must not silently break generic
  content source generation.

## Validation

- Verify provisioning against a real Notion page id with `ntn`-backed auth.
- Confirm the created database title is `<projectName> Blog`.
- Confirm three sample entries are inserted.
- Confirm each seeded page has body blocks, not only list metadata.
- Confirm `Published` is set so the starter can surface the entries without
  manual property repair.
