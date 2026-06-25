# Cloudflare R2 setup

1. Create an R2 bucket in Cloudflare dashboard.
2. Create R2 API token (Object Read & Write).
3. Enable public access or bind a custom domain for `publicBaseUrl`.
4. In plugin settings:
   - Endpoint: `https://<account-id>.r2.cloudflarestorage.com`
   - Region: `auto`
   - Bucket: bucket name
   - Public base URL: your R2 public/custom domain URL
   - Force path style: on
5. Enter R2 access key ID + secret, then **Test connection**.
