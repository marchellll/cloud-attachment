# Testing

## Unit tests (no Docker)

```bash
pnpm test
```

Uses fake repos in `tests/helpers/fake-repos.ts`.

## Integration tests (MinIO)

```bash
# run minio
docker compose -f docker-compose.test.yml up -d
# create bucket
docker compose -f docker-compose.test.yml run --rm createbuckets

# run integration test
export MINIO_ENDPOINT=http://127.0.0.1:9000
export MINIO_BUCKET=cloud-attachment-test
pnpm test:integration
```

Stop MinIO with `docker compose -f docker-compose.test.yml down`.

Integration tests skip automatically when `MINIO_ENDPOINT` is unset.

## Manual testing (Obsidian + MinIO)

Exercise the plugin in a real vault against the local MinIO instance from the integration setup above.

### 1. Build and load

From the plugin repo:

```bash
pnpm install
pnpm run dev   # watch build; or pnpm run build for a one-off
```

Install into a vault (skip if you already develop in `<Vault>/.obsidian/plugins/cloud-image/`):

1. Copy `main.js`, `manifest.json`, and `styles.css` (if present) to `<Vault>/.obsidian/plugins/cloud-attachment/`.
2. Open Obsidian, go to **Settings → Community plugins**, and enable **Cloud attachment**.
3. After code changes, reload the plugin (**Settings → Community plugins → Cloud attachment → toggle off/on**) or restart Obsidian.

### 2. Start MinIO

```bash
docker compose -f docker-compose.test.yml up -d
docker compose -f docker-compose.test.yml run --rm createbuckets
```

The `createbuckets` service also sets anonymous **download** on the test bucket so public URLs work in Obsidian reading view.

### 3. Configure plugin

Open **Settings → Cloud attachment**. Use these values for the test MinIO instance. Enable **Force path style**.

| Field | Value |
| --- | --- |
| Endpoint | `http://127.0.0.1:9000` |
| Region | `us-east-1` (any value works with MinIO; default `auto` is fine) |
| Bucket | `cloud-attachment-test` |
| Public base URL | `http://127.0.0.1:9000/cloud-attachment-test` |
| Access key ID | `minioadmin` |
| Secret access key | `minioadmin` |

Click **Test** under **Test connection**. Expect a **Connection OK** notice.

For manual testing, set **Post-upload local action** to **Keep** until you are confident uploads work.

### 4. Smoke test

1. Add a small image (for example `test.png`) to your vault attachment folder or the folder of an open note.
2. In a note, link to it with `![[test.png]]`.
3. Run **Upload attachments in current file** from the command palette.
4. Confirm:
   - Progress window completes without errors (if enabled in settings).
   - The markdown link rewrites to an `http://127.0.0.1:9000/cloud-attachment-test/...` URL.
   - The image renders in reading view.
   - **Cloud storage** sidebar (ribbon icon) lists the uploaded object.
   - **Open activity log** shows the upload entry.

Verify the object in MinIO:

```bash
docker run --rm --add-host=host.docker.internal:host-gateway --entrypoint /bin/sh minio/mc -c \
  'mc alias set local http://host.docker.internal:9000 minioadmin minioadmin && mc ls local/cloud-attachment-test'
```

### 5. Further checks

| Area | What to try |
| --- | --- |
| Asset folder upload | **Upload attachments from the asset folder** |
| Folder upload | Open a note in a folder with attachments → **Upload attachments from this folder** |
| Sync | **Sync from bucket** after uploading outside Obsidian |
| Duplicates | Upload the same file twice → **Find duplicate cloud files** |
| Filters | Set **Filename whitelist regex** or **Max file size** and confirm skipped files |
| Auto upload | Enable **Auto upload**, save a new attachment, wait for debounce |
| Reference tracking | Enable in settings → edit a linked note → **Scan attachment references** |
| Offline queue | Disable network, run an upload command, re-enable network and confirm drain |

### 6. Cleanup

```bash
docker compose -f docker-compose.test.yml down
```

Back up your vault before testing destructive **Post-upload local action** values (**Delete**, **Move to trash**, etc.).

## CI

Unit tests run on all Node matrix versions. Integration runs in a separate job with Docker MinIO.
