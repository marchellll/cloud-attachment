# Link rewriting

After upload, `LinkService` rewrites vault references to the public HTTPS URL:

- Markdown wiki links: `![[file.png]]` → `![](https://…/key)`
- Markdown image syntax with matching basename
- Canvas JSON nodes: `file` → `url`, `file` removed

Plugin writes are marked in `vaultInternalGuard` so auto-upload and reference debounce skip them.
