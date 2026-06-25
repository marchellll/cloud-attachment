# AWS S3 setup

1. Create an S3 bucket and enable public read (or front with CloudFront).
2. Create an IAM user with `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`.
3. In plugin settings:
   - Endpoint: leave empty or use regional endpoint
   - Region: e.g. `us-east-1`
   - Bucket: your bucket name
   - Public base URL: `https://your-bucket.s3.amazonaws.com` or CloudFront URL
   - Force path style: off for AWS (unless using custom endpoint)
4. Enter access key + secret in settings, then **Test connection**.
