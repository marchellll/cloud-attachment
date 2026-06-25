# Data model

## PluginData (`loadData` / `saveData`)

- `uploads`: cloud key → `UploadRecord`
- `byContentHash`, `byLocalPath`: lookup indexes
- `noteRefs`: note path → cloud keys (when reference tracking enabled)
- `queue`: offline retry queue
- `logs`: activity log ring buffer
- `totalBytesCached`, `lastReferenceScanAt`

Settings (`CloudAttachmentSettings`) are co-persisted in the same JSON blob under `settings`.

## Secrets

`accessKeyId` and `secretAccessKey` live in Obsidian Secret storage via `ObsidianSecretRepo`, never in plugin JSON.
