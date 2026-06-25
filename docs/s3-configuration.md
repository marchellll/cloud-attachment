# S3 configuration

Required settings before upload:

| Field | Notes |
| --- | --- |
| Endpoint | S3-compatible URL (MinIO, R2, AWS) |
| Region | Use `auto` for Cloudflare R2 |
| Bucket | Target bucket name |
| Public base URL | HTTPS prefix used in link rewrite |
| Force path style | Usually `true` for MinIO |

Credentials: Access Key ID + Secret Access Key in settings (stored via Secret storage).

See also: [how-to-setup-aws-s3.md](./how-to-setup-aws-s3.md), [how-to-setup-cloudflare-r2.md](./how-to-setup-cloudflare-r2.md).
