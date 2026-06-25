export function getMinioConfig():
	| {
			endpoint: string;
			region: string;
			bucket: string;
			accessKeyId: string;
			secretAccessKey: string;
			publicBaseUrl: string;
	  }
	| null {
	const endpoint = process.env.MINIO_ENDPOINT;
	const bucket = process.env.MINIO_BUCKET ?? 'cloud-attachment-test';
	if (!endpoint) return null;
	return {
		endpoint,
		region: process.env.MINIO_REGION ?? 'us-east-1',
		bucket,
		accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
		secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
		publicBaseUrl:
			process.env.MINIO_PUBLIC_URL ??
			`${endpoint.replace(/\/$/, '')}/${bucket}`,
	};
}

export function skipWithoutMinio(): boolean {
	return !getMinioConfig();
}
