# Blog Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the default `create-nextion-app` blog scaffold provision a `<projectName> Blog` Notion database with a minimal blog schema and three seeded posts whose real content lives in page body blocks.

**Architecture:** Keep the scaffold’s public content source id as `blog`, but make the default blog preset explicit in prompt/render/provisioning code. Refactor Notion provisioning so it creates a richer blog schema, reads back the actual data source schema before seeding, then creates pages plus body blocks using the property names Notion actually returned.

**Tech Stack:** TypeScript, Node.js, `ntn` CLI, Notion public API, existing `@clack/prompts` scaffolder flow

---

## File Structure

### Modify

- `packages/create-nextion-app/src/prompt.ts`
  - Change the interactive defaults for the blog preset to the minimal blog schema.
- `packages/create-nextion-app/src/answers.ts`
  - Align non-interactive defaults and help text with the blog preset.
- `packages/create-nextion-app/src/render.ts`
  - Emit blog-specific UI metadata and capability flags that match page-body blog content.
- `packages/create-nextion-app/src/templates/lib/content/models.ts.tmpl`
  - Ensure the generated content source expects rich blocks, cover images, and blog metadata fields.
- `packages/create-nextion-app/src/templates/README.md.tmpl`
  - Document the new default blog schema and explain that article body content lives in page blocks.
- `packages/create-nextion-app/src/provision/index.ts`
  - Pass `<projectName> Blog` into provisioning while keeping the content source id `blog`.
- `packages/create-nextion-app/src/provision/notion.ts`
  - Fix title property resolution, add blog field typing, seed richer blog metadata, and append page body blocks.

### Create

- `packages/create-nextion-app/src/provision/notion.test.ts`
  - Unit tests for property typing, title-property resolution, metadata seeding, and body block payload building.

### Verify

- Real Notion CLI probe against a shared page id after implementation.

---

### Task 1: Add coverage for blog provisioning helpers

**Files:**
- Modify: `packages/create-nextion-app/package.json`
- Create: `packages/create-nextion-app/src/provision/notion.test.ts`
- Verify: `packages/create-nextion-app/src/provision/notion.ts`

- [ ] **Step 1: Add a failing test file for blog schema and seed payload helpers**

```ts
import { describe, expect, it } from "vitest";
import {
  _internal,
} from "./notion.js";

describe("default blog schema helpers", () => {
  it("maps minimal blog fields to the correct Notion property types", () => {
    const properties = _internal.buildProperties([
      { key: "title", notionName: "Name" },
      { key: "slug", notionName: "Slug" },
      { key: "description", notionName: "Description" },
      { key: "published", notionName: "Published" },
      { key: "date", notionName: "Date" },
      { key: "tags", notionName: "Tags" },
      { key: "cover", notionName: "Cover" },
    ]);

    expect(properties.Name).toEqual({ title: {} });
    expect(properties.Slug).toEqual({ rich_text: {} });
    expect(properties.Description).toEqual({ rich_text: {} });
    expect(properties.Published).toEqual({ checkbox: {} });
    expect(properties.Date).toEqual({ date: {} });
    expect(properties.Tags).toEqual({ multi_select: {} });
    expect(properties.Cover).toEqual({ files: {} });
  });

  it("resolves the actual title property name from returned schema", () => {
    const name = _internal.resolveTitlePropertyName({
      Description: { rich_text: {} },
      Name: { title: {} },
      Slug: { rich_text: {} },
    });

    expect(name).toBe("Name");
  });
});
```

- [ ] **Step 2: Add a failing test for sample post metadata and body blocks**

```ts
it("builds a published sample post plus page body blocks", () => {
  const page = _internal.buildSamplePage({
    index: 1,
    titlePropertyName: "Name",
    databaseId: "db-id",
    title: "my-app Blog",
    fieldNames: {
      title: "Name",
      slug: "Slug",
      description: "Description",
      published: "Published",
      date: "Date",
      tags: "Tags",
      cover: "Cover",
    },
  });

  expect(page.properties.Name.title[0].text.content).toContain("Sample Post 1");
  expect(page.properties.Published.checkbox).toBe(true);
  expect(page.children.some((block: { type: string }) => block.type === "heading_1")).toBe(true);
  expect(page.children.some((block: { type: string }) => block.type === "bulleted_list_item")).toBe(true);
});
```

- [ ] **Step 3: Add a test runner for the scaffolder package**

```json
{
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 4: Run the tests to verify they fail first**

Run:

```bash
pnpm --filter @notionx/create-nextion-app test
```

Expected: FAIL with missing `_internal` exports or wrong property types.

- [ ] **Step 5: Commit**

```bash
git add packages/create-nextion-app/package.json packages/create-nextion-app/src/provision/notion.test.ts
git commit -m "test: add blog scaffold provisioning coverage"
```

### Task 2: Update the default blog preset used by the scaffolder

**Files:**
- Modify: `packages/create-nextion-app/src/prompt.ts`
- Modify: `packages/create-nextion-app/src/answers.ts`
- Modify: `packages/create-nextion-app/src/render.ts`
- Modify: `packages/create-nextion-app/src/templates/lib/content/models.ts.tmpl`
- Modify: `packages/create-nextion-app/src/templates/README.md.tmpl`

- [ ] **Step 1: Change the interactive default fields to the minimal blog schema**

```ts
contentSource: {
  id: "blog",
  title: "Blog",
  fields: [
    { key: "title", notionName: "Name" },
    { key: "slug", notionName: "Slug" },
    { key: "description", notionName: "Description" },
    { key: "published", notionName: "Published" },
    { key: "date", notionName: "Date" },
    { key: "tags", notionName: "Tags" },
    { key: "cover", notionName: "Cover" },
  ],
},
```

- [ ] **Step 2: Align non-interactive defaults and CLI help text**

```ts
const DEFAULT_FIELDS = "Name, Slug, Description, Published, Date, Tags, Cover";
```

```text
--notion-seed-count <n>      Number of sample blog pages to seed into the
                             new database (default 3, 0 to skip).
```

- [ ] **Step 3: Make the generated content model blog-friendly**

```ts
const isBlog = id === "blog";

return {
  ...
  contentSourceListDescription: isBlog
    ? "Blog posts backed by Notion metadata and page body content."
    : `${answers.contentSource.title} entries backed by Notion.`,
  contentSourceEmptyState: isBlog
    ? "No blog posts published yet."
    : `No ${answers.contentSource.title.toLowerCase()} entries yet.`,
  contentSourceRichBlocks: isBlog ? "true" : "false",
  contentSourceCoverImages: isBlog ? "true" : "false",
};
```

- [ ] **Step 4: Update the content model template capabilities**

```ts
  capabilities: {
    richBlocks: {{contentSourceRichBlocks}},
    coverImages: {{contentSourceCoverImages}},
    gatedAssets: false,
  },
```

- [ ] **Step 5: Update README guidance for the default blog schema**

```md
- `Name`, `Slug`, `Description`, `Published`, `Date`, `Tags`, `Cover`
- Article body content lives in the Notion page content blocks.
```

- [ ] **Step 6: Run the focused tests to confirm template defaults still render**

Run:

```bash
pnpm --filter @notionx/create-nextion-app test
```

Expected: FAIL only on provisioning-helper expectations until Task 3 lands.

- [ ] **Step 7: Commit**

```bash
git add packages/create-nextion-app/src/prompt.ts packages/create-nextion-app/src/answers.ts packages/create-nextion-app/src/render.ts packages/create-nextion-app/src/templates/lib/content/models.ts.tmpl packages/create-nextion-app/src/templates/README.md.tmpl
git commit -m "feat: switch default scaffold to minimal blog schema"
```

### Task 3: Fix Notion provisioning and seed rich sample posts

**Files:**
- Modify: `packages/create-nextion-app/src/provision/index.ts`
- Modify: `packages/create-nextion-app/src/provision/notion.ts`
- Test: `packages/create-nextion-app/src/provision/notion.test.ts`

- [ ] **Step 1: Pass `<projectName> Blog` into the Notion database creation call**

```ts
const notionDatabaseTitle = `${answers.projectName} ${answers.contentSource.title}`;

const r = await ensureNotionDatabase({
  apiToken: notionInputs.apiToken,
  parentPageId: notionInputs.parentPageId,
  title: notionDatabaseTitle,
  fields: answers.contentSource.fields,
  seedCount: notionInputs.seedCount,
});
```

- [ ] **Step 2: Expand Notion property typing and export helper internals for tests**

```ts
function notionPropertyType(key: string, notionName: string): string {
  if (key === "title" || notionName.toLowerCase() === "name") return "title";
  if (key === "published") return "checkbox";
  if (key === "date") return "date";
  if (key === "tags") return "multi_select";
  if (key === "cover") return "files";
  return "rich_text";
}

function resolveTitlePropertyName(
  properties: Record<string, { [type: string]: unknown }>
): string {
  const entry = Object.entries(properties).find(([, value]) => "title" in value);
  return entry?.[0] ?? "Name";
}
```

- [ ] **Step 3: Read back the actual data source schema after creation**

```ts
async function getDataSourceSchema(
  apiToken: string,
  dataSourceId: string
): Promise<Record<string, { [type: string]: unknown }>> {
  const stdout = await runOrThrowNtn(
    ["api", `v1/data_sources/${dataSourceId}`],
    { env: { NOTION_API_TOKEN: apiToken } }
  );
  const raw = JSON.parse(stdout) as { properties?: Record<string, { [type: string]: unknown }> };
  return raw.properties ?? {};
}
```

- [ ] **Step 4: Build page properties from resolved field names instead of assumptions**

```ts
const schema = await getDataSourceSchema(input.apiToken, dataSourceId);
const titlePropertyName = resolveTitlePropertyName(schema);

const fieldNames = {
  title: titlePropertyName,
  slug: findMatchingField(schema, input.fields, "slug", "Slug"),
  description: findMatchingField(schema, input.fields, "description", "Description"),
  published: findMatchingField(schema, input.fields, "published", "Published"),
  date: findMatchingField(schema, input.fields, "date", "Date"),
  tags: findMatchingField(schema, input.fields, "tags", "Tags"),
  cover: findMatchingField(schema, input.fields, "cover", "Cover"),
};
```

- [ ] **Step 5: Seed each page with metadata plus body blocks**

```ts
const body = {
  parent: { type: "database_id", database_id: databaseId },
  cover: {
    type: "external",
    external: {
      url: `https://picsum.photos/seed/${slugify(title)}-${i}/1200/600`,
    },
  },
  properties: {
    [fieldNames.title]: {
      title: [{ text: { content: `Sample Post ${i}` } }],
    },
    [fieldNames.slug]: {
      rich_text: [{ text: { content: `sample-post-${i}` } }],
    },
    [fieldNames.description]: {
      rich_text: [{ text: { content: `Sample summary for post ${i}.` } }],
    },
    [fieldNames.published]: { checkbox: true },
    [fieldNames.date]: { date: { start: `2026-06-0${i}` } },
    [fieldNames.tags]: {
      multi_select: [{ name: "Getting Started" }, { name: "Sample" }],
    },
  },
  children: [
    {
      object: "block",
      type: "heading_1",
      heading_1: {
        rich_text: [{ type: "text", text: { content: `Sample Post ${i}` } }],
      },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: "This starter stores article metadata in the database and the real post body in page content blocks." } }],
      },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: "Use this page as the editing surface for long-form writing, embeds, and richer Notion-native content." } }],
      },
    },
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "What to edit next" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Replace this sample intro with your own opening." } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Update the tags, date, and cover in the database columns." } }],
      },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: "Once Published is checked, the generated site can surface this post publicly." } }],
      },
    },
  ],
};
```

- [ ] **Step 6: Run tests until they pass**

Run:

```bash
pnpm --filter @notionx/create-nextion-app test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/create-nextion-app/src/provision/index.ts packages/create-nextion-app/src/provision/notion.ts packages/create-nextion-app/src/provision/notion.test.ts
git commit -m "feat: seed minimal blog posts into notion"
```

### Task 4: Run an end-to-end Notion CLI verification

**Files:**
- Verify only: real shared page id used during development

- [ ] **Step 1: Build the scaffolder package so the runtime code matches the source**

Run:

```bash
pnpm --filter @notionx/create-nextion-app build
```

Expected: PASS and refreshed `dist/` output.

- [ ] **Step 2: Re-run the real Notion provisioning probe against the shared page id**

Run:

```bash
set +H
node --input-type=module <<'EOF'
import { readNtnToken } from './packages/create-nextion-app/dist/provision/ntn-credentials.js'
import { ensureNotionDatabase } from './packages/create-nextion-app/dist/provision/notion.js'

const credential = await readNtnToken()
if (!credential) throw new Error('No Notion credential available')

const result = await ensureNotionDatabase({
  apiToken: credential.token,
  parentPageId: 'a0a91f9703d2458a8b5fa7a88b92c138',
  title: 'vinext Blog',
  fields: [
    { key: 'title', notionName: 'Name' },
    { key: 'slug', notionName: 'Slug' },
    { key: 'description', notionName: 'Description' },
    { key: 'published', notionName: 'Published' },
    { key: 'date', notionName: 'Date' },
    { key: 'tags', notionName: 'Tags' },
    { key: 'cover', notionName: 'Cover' },
  ],
  seedCount: 3,
})

console.log(JSON.stringify({
  dataSourceId: result.dataSourceId,
  databaseId: result.databaseId,
  seeded: result.seeded,
  url: result.url,
}, null, 2))
EOF
```

Expected: `seeded` equals `3`.

- [ ] **Step 3: Spot-check the created data source schema and one seeded page**

Run:

```bash
set +H
node --input-type=module <<'EOF'
import { readNtnToken } from './packages/create-nextion-app/dist/provision/ntn-credentials.js'
const credential = await readNtnToken()
process.env.NOTION_API_TOKEN = credential.token
const { runNtn } = await import('./packages/create-nextion-app/dist/provision/shell.js')

const ds = process.argv[1]
const schema = await runNtn(['api', `v1/data_sources/${ds}`])
console.log(JSON.parse(schema.stdout).properties)
EOF
<DATA_SOURCE_ID>
```

Expected: properties include `Name`, `Slug`, `Description`, `Published`, `Date`, `Tags`, and `Cover`.

- [ ] **Step 4: Run diagnostics on edited files**

Run VS Code diagnostics for:

- `packages/create-nextion-app/src/prompt.ts`
- `packages/create-nextion-app/src/answers.ts`
- `packages/create-nextion-app/src/render.ts`
- `packages/create-nextion-app/src/templates/lib/content/models.ts.tmpl`
- `packages/create-nextion-app/src/provision/index.ts`
- `packages/create-nextion-app/src/provision/notion.ts`
- `packages/create-nextion-app/src/provision/notion.test.ts`

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add packages/create-nextion-app/src packages/create-nextion-app/dist
git commit -m "fix: align blog scaffold provisioning with notion schema"
```

## Self-Review

- **Spec coverage:** Task 2 covers default minimal blog schema and generated content model changes. Task 3 covers title-field resolution, seeded metadata, and page-body content. Task 4 covers real `ntn` verification and confirms `<projectName> Blog` provisioning behavior.
- **Placeholder scan:** No `TODO`, `TBD`, or ambiguous “handle appropriately” language remains. The only manual substitution is `<DATA_SOURCE_ID>` in the schema spot-check step, which is produced by the previous command and immediately reused.
- **Type consistency:** The plan consistently uses `Name / Slug / Description / Published / Date / Tags / Cover` for the default blog schema and keeps the content source id as `blog`.
