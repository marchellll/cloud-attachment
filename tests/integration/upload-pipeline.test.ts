import { describe, expect, it, vi } from 'vitest';
import { UploadService } from '../../src/service/upload-service';
import { LinkService } from '../../src/service/link-service';
import { ReferenceService } from '../../src/service/reference-service';
import { QuotaService } from '../../src/service/quota-service';
import { LogService } from '../../src/service/log-service';
import { S3CloudStorageRepo } from '../../src/repository/s3-cloud-storage-repo';
import {
	FakeLogRepo,
	FakeSecretRepo,
	FakeSettingsRepo,
	FakeVaultRepo,
	InMemoryUploadIndexRepo,
} from '../helpers/fake-repos';
import { DEFAULT_SETTINGS } from '../../src/settings';
import { getMinioConfig, skipWithoutMinio } from '../helpers/minio-config';

vi.mock('obsidian', () => ({
	Notice: class {},
}));

describe.skipIf(skipWithoutMinio())('upload pipeline integration', () => {
	it('uploads file to MinIO and indexes record', async () => {
		const cfg = getMinioConfig()!;
		const index = new InMemoryUploadIndexRepo();
		const vault = new FakeVaultRepo();
		const settings = new FakeSettingsRepo({
			...DEFAULT_SETTINGS,
			endpoint: cfg.endpoint,
			region: cfg.region,
			bucket: cfg.bucket,
			publicBaseUrl: cfg.publicBaseUrl,
			forcePathStyle: true,
			cloudRenameEnabled: false,
		});
		const secrets = new FakeSecretRepo(cfg.accessKeyId, cfg.secretAccessKey);
		const cloud = new S3CloudStorageRepo(settings, secrets);
		const log = new LogService(new FakeLogRepo(), () => settings.get());
		const quota = new QuotaService(index, settings, log);
		const links = new LinkService(vault, log);
		const reference = new ReferenceService(index, vault, settings, log);

		const data = new Uint8Array([9, 9, 9]).buffer;
		const key = `pipeline-${Date.now()}.bin`;
		vault.files.set(key, data);
		vault.notes.set('n.md', `![[${key.split('/').pop()}]]`);

		const upload = new UploadService(
			{} as never,
			settings,
			secrets,
			index,
			cloud,
			vault,
			quota,
			links,
			reference,
			log,
		);

		await upload.uploadFiles([key]);
		expect(index.getAllUploads().length).toBeGreaterThan(0);
		const objects = await cloud.listObjects();
		expect(objects.length).toBeGreaterThan(0);
	});
});
