# Cloud Attachment

Upload vault attachments to S3-compatible storage with automatic link rewriting.

> **Always back up your vault before using this plugin.**

## Features

- Upload from attachment folder, current folder, or links in the active note
- Multipart/resumable uploads via AWS SDK
- Public HTTPS link rewrite (markdown + canvas)
- Regex whitelist/blacklist, `.gitignore` respect, size limits, usage quotas
- Optional uuidv7 cloud rename (`YYYY/MM/DD/<uuid>-name`)
- Post-upload: keep, trash, move, or delete local files
- Offline upload queue with online drain
- Storage sidebar: list, delete, download, sync from bucket
- Optional reference tracking (default off) with scan/reconcile commands
- Activity log view

## Installation

1. Open **Settings → Community plugins**
2. Search for **Cloud Attachment**
3. Install and enable

Requires Obsidian **1.11.4+** (Secret storage).

## Setup

1. Open **Settings → Cloud Attachment**
2. Configure S3 connection (endpoint, region, bucket, public base URL)
3. Enter access key ID and secret access key (stored in Secret storage)
4. Click **Test connection**

Guides:

- [AWS S3](docs/how-to-setup-aws-s3.md)
- [Cloudflare R2](docs/how-to-setup-cloudflare-r2.md)
- [General S3 notes](docs/s3-configuration.md)

## Usage

### Commands (command palette)

| Command | Action |
| --- | --- |
| Upload attachments from the asset folder | Upload default attachment folder + watch folders |
| Upload attachments from this folder | Upload active note's folder |
| Upload attachments in current file | Upload files linked from active note |
| Scan attachment references | Full vault reference reconciliation |
| Find duplicate cloud files | Review duplicate content hashes |
| Sync from bucket | Import bucket objects into local index |
| Open activity log | Open log sidebar |

### Ribbon

Click the cloud upload icon to open the **Cloud storage** sidebar.

### Reference tracking

Off by default. Enable in settings for debounced note edits and scheduled scans.

## Development

```bash
pnpm install
pnpm run dev      # watch build
pnpm run build
pnpm run lint
pnpm test         # unit tests
```

See [docs/testing.md](docs/testing.md) for integration tests with MinIO.
