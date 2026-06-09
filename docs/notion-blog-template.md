# Notion Blog Setup

This project can use Notion as the public blog content source through the
official Notion API.

## Required Integration Setup

1. Create a Notion internal integration.
2. Copy the integration token into `NOTION_TOKEN`.
3. Share the blog data source with that integration.
4. Copy the data source ID into `NOTION_DATA_SOURCE_ID`.

Use the data source ID, not the parent database ID. Modern Notion API reads blog
rows through `dataSources.query`.

## Required Data Source Fields

- `Title` - title
- `Slug` - rich text, lowercase URL slug such as `my-first-post`
- `Description` - rich text
- `Date` - date
- `Author` - rich text or people
- `Tags` - multi-select
- `Status` - status with `Published`

Alternative publishing field:

- `Published` - checkbox

Optional fields:

- `Cover` - files
- `Canonical URL` - url
- `Summary` - rich text

## Environment Variables

```bash
NOTION_TOKEN=
NOTION_DATA_SOURCE_ID=
NOTION_EDIT_BASE_URL=
NOTION_WEBHOOK_VERIFICATION_TOKEN=
```

Use `POST /api/notion/webhook` as the Notion webhook URL. The endpoint responds
to Notion's verification handshake and stores Notion's `verification_token` in
the `CONTENT_CACHE` KV namespace. Later events are validated with
`X-Notion-Signature` using that stored token, or with
`NOTION_WEBHOOK_VERIFICATION_TOKEN` when you choose to pin it as a Worker
secret. After validation, the endpoint clears public HTML/API cache, Notion KV
content cache, and affected search-index rows. Page events are treated as
change signals: when Notion sends only a page id, the endpoint retrieves the
latest page properties before deriving the public slug to revalidate.

Notion may aggregate frequent page content edits before sending
`page.content_updated`; the site invalidates immediately after the event is
delivered.

`NOTION_EDIT_BASE_URL` is optional. It can point to a Notion data source view or
use `{pageId}` as a placeholder for direct page links.

## Publishing Flow

1. Create or edit a post in Notion.
2. Fill required metadata fields.
3. Add article body content to the page itself.
4. Mark the post as `Published` or check `Published`.
5. Wait for the site revalidation window.

## Media Guidance

Prefer stable external URLs for production media:

- R2 or another CDN for images
- YouTube or Vimeo for videos
- direct CDN `.mp4` or `.webm` URLs for self-hosted video

Notion-hosted images and videos are supported through stable app URLs like:

- `/api/notion/media/page/:pageId/cover`
- `/api/notion/media/block/:blockId`

The route refreshes Notion's expiring file URLs at request time.

## Supported V1 Blocks

- paragraphs
- headings
- lists
- quotes
- callouts
- dividers
- code blocks
- images
- videos
- embeds
- bookmarks
- files
- PDFs
- audio
- tables
- todos
- toggles
- simple columns

Unsupported blocks are skipped instead of breaking the article page.
