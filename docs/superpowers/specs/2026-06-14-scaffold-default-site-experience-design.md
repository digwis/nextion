# Scaffold Default Site Experience Design

## Summary

This design improves the default site that `@notionx/create-nextion-app`
generates so the first install feels like a coherent, content-rich starter
site instead of a mixed demo of partial defaults.

The change focuses on five linked problems in the current scaffold output:

- homepage naming uses project-name-derived labels where fixed semantic names
  are clearer
- the homepage mixes reusable structured blocks with a separate hard-coded hero
  section in the route template
- the default reusable block set includes `About Story`, which is less useful
  than a homepage-facing content block
- blog starter content is too sparse and can appear empty despite seeded
  published rows
- Site Settings does not seed a full editable default record, which leaves the
  navigation and icon experience inconsistent on first run

The goal is to make a fresh scaffold install immediately look like a believable
site with editable structure, visible starter content, and a stable navigation
model.

## Goals

- Rename default homepage-related records with fixed semantic names rather than
  project-name-derived names.
- Make the homepage default experience render through three reusable structured
  blocks instead of a hybrid of blocks plus separate hard-coded content.
- Replace the current default `About Story` reusable block with a homepage
  block that previews the latest posts.
- Seed six published blog posts by default so both the homepage and the blog
  index have enough visible content on first run.
- Render the blog index as a responsive card grid by default.
- Ensure the first generated project shows published blog posts immediately when
  the seeded Notion content source is wired correctly.
- Seed Site Settings with a complete editable default row, including navigation,
  footer, SEO fields, and a default icon/image entry.
- Make the default top navigation consistently show Home, About, and Blog on a
  fresh scaffold install.

## Non-Goals

- Do not build a general-purpose page builder.
- Do not introduce arbitrary user-defined structured block types in this
  change.
- Do not redesign the entire visual language of generated pages.
- Do not replace Notion as the source of truth for editable site settings.
- Do not remove the generic `NotionBlocks` compatibility path for legacy page
  content.

## Current State

The scaffold already provisions:

- a `Pages` data source with seeded Home, About, Blog, and Privacy pages
- a `Blocks` data source with structured reusable blocks
- a `Site Settings` data source and runtime loader
- a blog list page backed by a Notion content source

However, the generated defaults are not aligned:

- the homepage fallback page title is the project name rather than a semantic
  page title
- the homepage hero block is named `${projectName} Hero` rather than a stable
  `Homepage Hero`
- the default homepage structured block list contains only two blocks
- the homepage route template still renders its own top-of-page content shell
  before the structured blocks, creating a split authorship model
- the default block set includes `About Story`, which is useful as an example
  but less valuable than a third homepage-facing showcase block
- the fallback site navigation only includes the blog route, while page seeds
  separately mark About as `showInNav`
- Site Settings runtime prefers a Notion row when available, but the seeded row
  is effectively sparse, so defaults fall back inconsistently
- the blog scaffold seeds too few posts for a convincing starter grid, and the
  initial empty-state messaging can appear even when the operator expects the
  seeded rows to show up immediately

## Proposed Behavior

### Default Naming

The scaffold should use fixed semantic names for the seeded page and block
records.

For English installs:

- homepage page title: `Home`
- homepage hero block title: `Homepage Hero`
- homepage feature grid block title: `Homepage Feature Grid`
- homepage latest posts block title: `Homepage Latest Posts`
- about page title: `About`

For Chinese installs:

- homepage page title: `首页`
- homepage hero block title: `首页 Hero`
- homepage feature grid block title: `首页功能展示`
- homepage latest posts block title: `首页最新文章`
- about page title: `关于`

The project name should still appear in site branding, SEO defaults, and site
settings. It should not be used as the default semantic page title for Home or
as the reusable block title for the homepage hero.

### Homepage Default Structure

The homepage should render through three default structured blocks:

1. `Homepage Hero`
2. `Homepage Feature Grid`
3. `Homepage Latest Posts`

The existing separate homepage top section in `app/page.tsx.tmpl` should be
reduced to a minimal page shell. It may keep page-level metadata and shell
structure, but it should not remain a second authored marketing section that
duplicates what the structured blocks are supposed to demonstrate.

This change makes the homepage default authored entirely through the seeded
structured block system.

### Homepage Latest Posts Block

The new third homepage block should be implemented as a homepage-facing latest
posts block rather than a one-off hard-coded route section.

Behavior:

- it shows the latest published posts from the default content source
- it renders the same post-card visual language as the blog index
- it is seeded onto the homepage by default
- it replaces the current default `About Story` starter block

This block should be designed so the implementation can later evolve into a
more general reusable content-list block, but the current scope only requires
the homepage latest-posts use case.

### Remove About Story From Starter Seeds

The scaffold should stop seeding `About Story` as one of the default reusable
blocks.

The About page itself remains part of the default site. The change is only
about the reusable starter block set:

- remove the default `About Story` block row
- remove any default page block reference that expects it
- keep the About page content intact through the page seed itself

### Blog Starter Content

The default content source should seed six published posts instead of three.

Each seeded post should include:

- title
- slug
- description/excerpt
- date
- tags
- cover image
- body blocks

The six posts should be varied enough that the homepage latest-posts section
and the blog index do not look repetitive or empty.

### Blog Index Presentation

The default blog index should render a responsive card grid rather than a plain
vertical list.

Target layout:

- mobile: one column
- tablet: two columns
- desktop: three columns

Each card should render:

- cover image
- title
- description/excerpt
- date
- tags

The homepage latest-posts block should reuse this card presentation rather than
inventing a separate card style.

### Published Visibility Contract

A fresh scaffold install that completes provisioning successfully should show
the seeded published blog posts immediately on the blog index and, where
applicable, on the homepage latest-posts block.

The implementation must verify the entire chain:

1. seeded post rows write the `Published` field in the same shape the runtime
   expects
2. the generated content source maps the `Published` field correctly
3. the runtime list query filters against the correct field type/value
4. the generated routes read from the expected default content source id

The empty state message:

`No blog posts published yet.`

should remain only for the real empty case, not for the default seeded case.

### Site Settings Seed

The scaffold should seed one complete Site Settings row by default rather than
leaving most fields empty.

The seeded row should include:

- site name
- tagline
- description
- default locale
- meta title
- meta description
- navigation JSON
- footer columns JSON
- footer social JSON (may be empty)
- footer tagline
- footer copyright
- social image url
- OG image url

The navigation seed should default to:

- Home
- About
- Blog

The footer seed should default to:

- Company: Home, About
- Content: Blog
- Legal: Privacy

### Default Site Icon

The scaffold should provide a visible default icon/image path instead of
starting blank.

This should be done at two levels:

- seed the Site Settings image/icon-related field with a default image URL so
  operators can immediately see and edit it in Notion
- keep a static fallback in the generated project so the site still has a
  stable icon/image when the Site Settings row is missing or unreadable

This prevents the initial generated site from looking unfinished.

### Navigation Precedence

The default top navigation should be consistent across:

- page seeds
- Site Settings seed
- fallback site config

The intended first-run navigation is:

- Home
- About
- Blog

`Pages.showInNav` and related page fields remain useful page metadata, but the
generated starter should not rely on a mismatch between page seeds and Site
Settings defaults. The seed data for both sources must agree.

## Data Model Changes

### Pages Seed

The seeded Home page should:

- keep key `home`
- keep slug `""`
- use semantic title `Home` / `首页`
- reference three homepage blocks in order

The About page should remain present and marked visible in navigation.

### Blocks Seed

The default seeded reusable blocks should become:

- `Homepage Hero`
- `Homepage Feature Grid`
- `Homepage Latest Posts`

The latest-posts block needs a typed schema that supports:

- heading
- body/intro text
- item count
- source id or source mode (current scope can default to the primary content
  source)
- optional CTA

The exact runtime type can stay narrow in this phase so long as it clearly
represents “show latest posts from the default content source”.

### Site Settings Seed

The Site Settings provisioning path must insert a non-empty starter row on
create, and on reuse it must preserve existing operator-authored content unless
the row is still scaffold-owned starter content that should be refreshed.

This should match the existing stable-reuse philosophy used elsewhere in the
scaffold: preserve user-authored Notion content when possible, but do not leave
a brand-new project effectively unconfigured.

## Files Expected To Change

The eventual implementation is expected to touch at least these areas:

- `packages/create-nextion-app/src/provision/notion.ts`
- `packages/create-nextion-app/src/provision/notion.test.ts`
- `packages/create-nextion-app/src/templates/lib/pages/source.ts.tmpl`
- `packages/create-nextion-app/src/templates/app/page.tsx.tmpl`
- `packages/create-nextion-app/src/templates/app/{{contentSourceListPath}}/page.tsx.tmpl`
- `packages/create-nextion-app/src/templates/lib/site/config.ts.tmpl`
- `packages/create-nextion-app/src/templates/lib/site/settings.ts.tmpl`
- `packages/create-nextion-app/src/templates/components/page-blocks/*`
- `packages/create-nextion-app/src/render.test.ts`

The implementation may also require a new typed homepage latest-posts block
component and supporting runtime mapping.

## Testing And Verification

Implementation should verify all of the following:

- Notion seed tests confirm Home page title and homepage block names use fixed
  semantic names.
- Notion seed tests confirm the default reusable block set includes the new
  homepage latest-posts block and excludes `About Story`.
- Notion seed tests confirm six published blog posts are created by default.
- Template render tests confirm the homepage fallback block list now contains
  three entries.
- Template render tests confirm the blog index template renders a card grid.
- Site Settings seed tests confirm the default row is non-empty and includes
  navigation, footer, SEO, and image/icon defaults.
- Runtime tests confirm the generated blog list shows seeded published posts
  rather than the empty-state message.
- Navigation tests confirm Home, About, and Blog all appear in the default site
  navigation.

## Risks

- If the homepage route keeps too much old hard-coded content shell, the result
  will still feel like two competing homepage systems.
- If the latest-posts block becomes too generic too early, this change will
  grow into a larger block-system redesign.
- If Site Settings reuse logic is too aggressive, it could overwrite
  user-authored settings in existing projects.
- If Published visibility bugs are only patched in the UI, the underlying seed
  or mapping mismatch could persist and reappear elsewhere.

## Acceptance Criteria

- A fresh scaffold install shows a semantic Home page and three homepage blocks
  without project-name-derived homepage block titles.
- The default reusable block set contains no `About Story` starter block.
- The homepage includes a latest-posts block that previews published blog
  content.
- The default blog content source seeds six published posts.
- The blog index uses a responsive card grid.
- A first successful provision shows published blog content immediately.
- Site Settings contains a seeded editable row with navigation, footer, SEO,
  and default image/icon values.
- The default top navigation shows Home, About, and Blog consistently.
