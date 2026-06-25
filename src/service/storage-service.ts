import { Notice, requestUrl } from 'obsidian';
import type {
	ICloudStorageRepo,
	ISettingsRepo,
	IUploadIndexRepo,
	IVaultRepo,
	UploadRecord,
} from '../types';
import { buildPublicUrl } from '../utils/cloud-key-builder';
import type { LogService } from './log-service';

export interface SyncFromBucketResult {
	added: number;
	missingInBucket: number;
}

export class StorageService {
	constructor(
		private cloud: ICloudStorageRepo,
		private index: IUploadIndexRepo,
		private vault: IVaultRepo,
		private settings: ISettingsRepo,
		private log: LogService,
	) {}

	list(): UploadRecord[] {
		return this.index.getAllUploads();
	}

	async deleteFromCloud(cloudKey: string): Promise<void> {
		await this.cloud.deleteObject(cloudKey);
		await this.index.removeUpload(cloudKey);
		await this.log.info('storage', 'Deleted from cloud', cloudKey);
	}

	async downloadToVault(cloudKey: string, destPath: string): Promise<void> {
		const rec = this.index.getUpload(cloudKey);
		if (!rec) throw new Error('Record not found');
		const res = await requestUrl({ url: rec.publicUrl });
		if (res.status >= 400) {
			throw new Error(`Download failed: ${res.status}`);
		}
		const buf = res.arrayBuffer;
		await this.vault.writeBinary(destPath, buf);
		await this.log.info('storage', 'Downloaded to vault', destPath);
	}

	async testConnection(): Promise<void> {
		await this.cloud.testConnection();
		await this.log.info('settings', 'Connection test succeeded');
	}

	async syncFromBucket(): Promise<SyncFromBucketResult> {
		const objects = await this.cloud.listObjects();
		const bucketKeys = new Set(objects.map((o) => o.key));
		let added = 0;
		const s = this.settings.get();

		for (const obj of objects) {
			if (this.index.getUpload(obj.key)) continue;
			const publicUrl = buildPublicUrl(s.publicBaseUrl, obj.key);
			await this.index.saveUpload({
				cloudKey: obj.key,
				publicUrl,
				contentHash: '',
				size: obj.size,
				uploadedAt: obj.lastModified ?? new Date().toISOString(),
				refCount: 0,
				referencingNotes: [],
				linkStatus: 'ok',
			});
			added++;
		}

		let missingInBucket = 0;
		for (const rec of this.index.getAllUploads()) {
			if (!bucketKeys.has(rec.cloudKey)) {
				missingInBucket++;
			}
		}

		const total = await this.cloud.getTotalBytes();
		await this.index.setTotalBytesCached(total);

		await this.log.info(
			'storage',
			'Sync from bucket',
			`added ${added}, missing in bucket ${missingInBucket}`,
		);
		new Notice(
			`Sync added ${added}, ${missingInBucket} index entries not in bucket`,
		);
		return { added, missingInBucket };
	}
}
