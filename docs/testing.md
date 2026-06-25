# Testing

## Unit tests (no Docker)

```bash
pnpm test
```

Uses fake repos in `tests/helpers/fake-repos.ts`.

## Integration tests (MinIO)

```bash
docker compose -f docker-compose.test.yml up -d
export MINIO_ENDPOINT=http://127.0.0.1:9000
export MINIO_BUCKET=cloud-attachment-test
pnpm test:integration
```

Integration tests skip automatically when `MINIO_ENDPOINT` is unset.

## CI

Unit tests run on all Node matrix versions. Integration runs in a separate job with Docker MinIO.
