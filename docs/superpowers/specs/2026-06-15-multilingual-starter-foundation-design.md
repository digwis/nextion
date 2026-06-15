# Multilingual Starter Foundation Design

## Summary

This design turns multilingual support into a first-class scaffold capability
for the four built-in site layers:

- `blog`
- `pages`
- `blocks`
- `site settings`

The goal is not to make every possible content model multilingual by magic.
Instead, the starter and `@notionx/core` should provide a stable, opinionated
foundation that new projects can ship with immediately, while existing projects
can add locales later through a dedicated `nextion` command.

The recommended product shape is:

- `create-nextion-app` generates a multilingual-ready foundation
- `@notionx/core` provides reusable locale/content helpers
- `npx nextion locale add <locale>` is the standard path for expanding an
  existing project
- skills/AI remain an optional customization layer, not the primary workflow

## Goals

- Make multilingual support a built-in starter capability rather than an
  ad-hoc customization.
- Cover the starter's four foundational models:
  - `blog`
  - `pages`
  - `blocks`
  - `site settings`
- Keep `@notionx/core` generic and reusable rather than hard-coding one
  project's specific domain models.
- Give existing projects a safe, standard way to add locales after
  installation.
- Ship default locale routing, locale switching, and model-level search in the
  scaffold.
- Preserve user freedom to add new content models beyond the built-in four.

## Non-Goals

- Do not make every user-defined content model multilingual automatically.
- Do not rely on a skill/agent as the main product entrypoint for adding
  languages.
- Do not automatically translate copy or body content.
- Do not turn the site into a general-purpose low-code page builder.
- Do not replace structured site configuration with free-form page blocks.
- Do not build a global cross-model search platform in the first phase.

## Current State

The current scaffold already has pieces of multilingual support, but they do
not yet form a complete product surface.

- The prompt supports language choices such as English, Chinese, and bilingual
  defaults.
- Generated projects carry `defaultLocale` and `locales`.
- `site settings`, `pages`, and `blocks` already exist as separate Notion
  concepts.
- Search helpers already exist and are used by starter projects such as
  `moviebluebook`.

However, the current product shape is incomplete:

- the built-in blog scaffold is still effectively single-language
- selecting bilingual mode does not automatically provision multilingual blog
  data
- there is no standard command for adding locales to an existing project
- `moviebluebook` proves a viable localized model pattern, but only for a
  domain-specific `movies` model rather than the starter foundation itself

## Product Boundary

### `create-nextion-app`

The scaffolder owns initial project creation.

It should:

- generate a single-language foundation when the user chooses one locale
- generate a multilingual-ready foundation when the user chooses a bilingual or
  multi-locale setup
- provision the built-in Notion models and starter code with the same locale
  assumptions

It should not be responsible for retrofitting an already-customized project.

### `@notionx/core`

`@notionx/core` should provide reusable building blocks:

- locale validation
- localized path helpers
- alternate link helpers
- base-content plus translation merging
- localized content lookup helpers
- localized search/index helpers where practical

It should not hard-code one specific starter's business rules.

### `npx nextion locale add <locale>`

This command is the standard path for existing projects.

It should:

- inspect the current project
- update locale configuration safely
- scaffold or repair the built-in translation models
- optionally create/update the corresponding Notion data sources
- print a clear report of what was changed and what still needs manual editing

It should not:

- re-run the full scaffold
- overwrite custom UI blindly
- invent translations
- assume all user-defined models should adopt the same locale strategy

### Skills / AI

Skills remain useful for:

- custom models beyond the built-in four
- unusual route structures
- special SEO rules
- project-specific content migrations

They are an extension layer, not the official primary path.

## Data Model Strategy

The built-in multilingual rule should be consistent:

- `base` data sources store stable structure and non-translated behavior
- `translations` data sources store locale-specific public copy and route
  fields

This is the same core pattern already proven in `moviebluebook`'s
`movies + movie-translations` approach, generalized to the starter foundation.

## Built-In Models

### Blog

The blog should adopt:

- `blog` base source
- `blog-translations` translation source

`blog` base owns stable editorial metadata such as:

- stable post identity
- author
- publish date
- tags
- cover/media
- status

`blog-translations` owns locale-specific fields such as:

- relation to base post
- `Locale`
- `Slug`
- `Title`
- `Description`
- `SEO Title`
- `SEO Description`
- translated body content or translated body source
- `Published`

This keeps per-locale publishing independent and allows language-specific slugs
and metadata.

### Pages

The pages layer should adopt:

- `pages` base source
- `page-translations` translation source

`pages` base owns structure:

- stable `Key`
- `Layout`
- `Show Header`
- `Show Footer`
- `Show in Nav`
- `Nav Order`
- `Show in Footer`
- `Footer Order`
- `Content Source`
- page-level structural references

`page-translations` owns locale-specific fields:

- relation to base page
- `Locale`
- `Slug`
- `Title`
- `Description`
- `SEO Title`
- `SEO Description`
- `Nav Label`
- `Footer Label`
- translated body blocks or translated body source
- `Published`

This keeps route structure stable while letting visible labels, metadata, and
page content vary by locale.

### Blocks

The blocks layer should adopt:

- `blocks` base source
- `block-translations` translation source

`blocks` base owns reusable structure:

- stable block key/slug
- `Type`
- `Page Keys`
- `Order`
- layout and theme controls
- display/count/layout configuration

`block-translations` owns locale-specific copy:

- relation to base block
- `Locale`
- `Title`
- `Description`
- `Eyebrow`
- `Headline`
- `Subheadline`
- `Body`
- `Quote`
- `Quote Attribution`
- `Primary CTA Label`
- `Secondary CTA Label`
- any other visible copy fields
- `Published`

This prevents structural duplication across languages and makes block reuse
practical.

### Site Settings

`site settings` should remain a singleton configuration model, but become
partially localized through a separate translation source:

- `site-settings` base source
- `site-settings-translations` translation source

`site-settings` base owns global configuration:

- `Default Locale`
- `Supported Locales`
- theme
- typography
- social links
- navigation ordering/shape
- default social image / brand assets
- global non-translated feature switches

`site-settings-translations` owns locale-specific global copy:

- relation to singleton settings row
- `Locale`
- `Tagline`
- `Description`
- `SEO Title`
- `SEO Description`
- translated navigation labels
- translated footer labels
- translated global fallback copy
- `Published`

This preserves a clean distinction between global config and page content.

## Why Site Settings Should Not Become Only Blocks

Some homepage and marketing content should absolutely live in `pages + blocks`,
for example:

- homepage hero
- story sections
- CTA sections
- promotional editorial sections

But `site settings` should continue to own real configuration:

- default locale
- supported locales
- theme values
- global SEO fallback
- social links
- navigation structure/order

The boundary should be:

- `site settings` = global configuration
- `pages + blocks` = visible page content

## Routing And Locale Behavior

The starter should ship locale-aware routing by default.

Recommended behavior:

- default locale routes may stay unprefixed, for example `/blog`
- non-default locale routes use a prefix, for example `/zh-CN/blog`

The same route rules should apply consistently across:

- `blog`
- `pages`
- `blocks`-backed pages
- `site settings`-driven metadata

`@notionx/core` should supply the helper layer; the scaffold should supply a
default route implementation.

## Locale Switcher

The starter should ship a built-in `LocaleSwitcher`.

Recommended behavior:

- list pages always switch to the same model's localized list route
- detail pages switch to the matching translated detail route when available
- if a detail translation does not exist, fall back to the localized list page
  instead of silently producing a broken experience

This keeps switching predictable without forcing fake fallback detail content.

## Fallback Rules

Fallback behavior should be explicit and model-specific.

Recommended rules:

- `site settings`
  - fall back to the default locale translation when a target locale copy is
    missing
- `pages`
  - if a localized page translation is missing, do not pretend the page exists
    in that locale; return a localized not-found or equivalent strict failure
- `blog`
  - if a post translation is missing, do not include it in that locale's list
- `blocks`
  - when a block translation is missing, allow fallback to the default locale
    block copy so page shells remain usable

This balances editorial correctness with runtime resilience.

## Search

Search should be a built-in starter capability, but phase one should stay
model-oriented rather than becoming a giant site-wide search system.

Default scope:

- `blog` search is built in
- other public starter models can opt into the same model-level search helpers
- `blocks` are not directly a public search target
- `pages` search is optional and secondary, not the primary first-phase surface

`@notionx/core` should provide:

- search index helpers
- query/filter helpers
- invalidation helpers

The scaffold should provide:

- default search UI
- default placeholders
- default list-page behavior

## Starter Defaults

When multilingual mode is chosen during scaffolding, the generated project
should include:

- locale-aware route helpers
- locale config and runtime plumbing
- a built-in locale switcher
- multilingual-ready built-in models for:
  - `blog`
  - `pages`
  - `blocks`
  - `site settings`
- starter search for blog/public list views
- documentation that explains how built-in multilingual content is structured

Single-language projects should still generate a simpler shape, but the upgrade
path should remain predictable.

## Existing Project Expansion

The recommended command shape is:

```bash
npx nextion locale add <locale>
```

Potential follow-up forms:

```bash
npx nextion locale add ja-JP --copy-from en
npx nextion locale add fr-FR --with-notion
npx nextion locale status
```

### Command Responsibilities

The command should:

1. analyze the current project
2. identify whether it already uses the new multilingual foundation
3. produce a clear plan/dry-run
4. apply safe code/config/model changes
5. optionally create or repair Notion translation data sources
6. print a report and manual follow-up checklist

### Safe By Default

Default mode should be safe and local:

- update locale config
- update known scaffold-managed files
- scaffold the built-in translation model layer
- avoid mutating remote Notion unless the user opts in

Suggested flags:

- `--dry-run`
- `--with-notion`
- `--copy-from <locale>`

### What The Command Must Not Do

It must not:

- overwrite custom page UI automatically
- auto-translate content
- change the default locale without explicit user intent
- assume custom user-defined models should be localized in the same way

## User Freedom And Extension Rule

The framework should explicitly support this rule:

- the product guarantees a maintained multilingual foundation for the built-in
  four models
- users remain free to add custom models such as `movies`, `docs`, `products`,
  or `courses`
- those custom models can reuse the same `base + translations` strategy, but
  they are not automatically managed by the starter tooling unless explicitly
  adopted later

This preserves the "real foundation, not rigid CMS template" direction.

## Implementation Shape

This design should be implemented in phases.

### Phase 1

- define the multilingual foundation contract for the built-in four models
- add or refine generic locale/content helpers in `@notionx/core`
- update scaffold templates to generate multilingual-ready code paths
- keep the single-language path working

### Phase 2

- add `nextion locale add <locale>` with dry-run and safe local updates
- add optional Notion provisioning/repair for translation data sources
- add doctor/update checks for locale model drift

### Phase 3

- improve developer ergonomics and docs
- expose extension examples for custom content models
- add optional skill-assisted workflows on top of the command path

## Risks

- Over-automating multilingual support could make the scaffold too rigid.
- Under-structuring the model layer would make `locale add` unreliable.
- Treating all missing translations the same would create a confusing UX.
- Letting `site settings` drift into free-form content would weaken global site
  configuration.

## Open Design Decisions Resolved Here

The design resolves the following product choices:

- multilingual starter scope is the built-in four models:
  - `blog`
  - `pages`
  - `blocks`
  - `site settings`
- existing projects add languages through a dedicated `nextion` command
- command is the standard path; skill is auxiliary
- the canonical model strategy is `base + translations`
- `site settings` remains structured configuration rather than collapsing into
  blocks
- search is built in, but first stays model-level rather than becoming an
  all-in-one global search engine

## Success Criteria

This design is successful when:

- a new multilingual scaffold has a clear, documented structure for the built-in
  four models
- an existing scaffolded project can add a locale through a standard command
  rather than manual guesswork
- locale routing, switching, and fallback behavior are predictable
- `@notionx/core` exposes reusable multilingual primitives without becoming
  starter-specific
- users can still define new content models without fighting the framework
