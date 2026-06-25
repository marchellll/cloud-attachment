import {
	DeleteObjectCommand,
	ListObjectsV2Command,
	S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import type {
	CloudObjectSummary,
	ICloudStorageRepo,
	ISecretRepo,
	ISettingsRepo,
} from '../types';

export class S3CloudStorageRepo implements ICloudStorageRepo {
	private client: S3Client | null = null;

	constructor(
		private settings: ISettingsRepo,
		private secrets: ISecretRepo,
	) {}

	private async getClient(): Promise<S3Client> {
		if (this.client) return this.client;
		const s = this.settings.get();
		const accessKeyId = await this.secrets.getAccessKeyId();
		const secretAccessKey = await this.secrets.getSecretAccessKey();
		this.client = new S3Client({
			region: s.region || 'auto',
			endpoint: s.endpoint || undefined,
			forcePathStyle: s.forcePathStyle,
			credentials: { accessKeyId, secretAccessKey },
		});
		return this.client;
	}

	invalidateClient(): void {
		this.client = null;
	}

	async testConnection(): Promise<void> {
		const client = await this.getClient();
		const bucket = this.settings.get().bucket;
		await client.send(
			new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }),
		);
	}

	async putObject(
		key: string,
		body: ArrayBuffer,
		contentType: string,
		onProgress?: (pct: number) => void,
	): Promise<void> {
		const client = await this.getClient();
		const bucket = this.settings.get().bucket;
		const upload = new Upload({
			client,
			params: {
				Bucket: bucket,
				Key: key,
				Body: new Uint8Array(body),
				ContentType: contentType,
				CacheControl: 'public, max-age=31536000',
			},
			leavePartsOnError: true,
		});
		if (onProgress) {
			upload.on('httpUploadProgress', (p) => {
				if (p.loaded && p.total) {
					onProgress(Math.round((p.loaded / p.total) * 100));
				}
			});
		}
		await upload.done();
	}

	async deleteObject(key: string): Promise<void> {
		const client = await this.getClient();
		const bucket = this.settings.get().bucket;
		await client.send(
			new DeleteObjectCommand({ Bucket: bucket, Key: key }),
		);
	}

	async listObjects(): Promise<CloudObjectSummary[]> {
		const client = await this.getClient();
		const bucket = this.settings.get().bucket;
		const out: CloudObjectSummary[] = [];
		let token: string | undefined;
		do {
			const res = await client.send(
				new ListObjectsV2Command({
					Bucket: bucket,
					ContinuationToken: token,
				}),
			);
			for (const o of res.Contents ?? []) {
				if (o.Key) {
					out.push({
						key: o.Key,
						size: o.Size ?? 0,
						lastModified: o.LastModified?.toISOString(),
					});
				}
			}
			token = res.NextContinuationToken;
		} while (token);
		return out;
	}

	async getTotalBytes(): Promise<number> {
		const objects = await this.listObjects();
		return objects.reduce((s, o) => s + o.size, 0);
	}
}
