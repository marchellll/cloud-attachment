import { describe, expect, it } from 'vitest';
import { S3CloudStorageRepo } from '../../src/repository/s3-cloud-storage-repo';
import { FakeSecretRepo, FakeSettingsRepo } from '../helpers/fake-repos';
import { getMinioConfig, skipWithoutMinio } from '../helpers/minio-config';

describe.skipIf(skipWithoutMinio())('S3CloudStorageRepo integration', () => {
	it('puts and lists objects', async () => {
		const cfg = getMinioConfig()!;
		const settings = new FakeSettingsRepo({
			endpoint: cfg.endpoint,
			region: cfg.region,
			bucket: cfg.bucket,
			publicBaseUrl: cfg.publicBaseUrl,
			forcePathStyle: true,
		} as never);
		const secrets = new FakeSecretRepo(cfg.accessKeyId, cfg.secretAccessKey);
		const repo = new S3CloudStorageRepo(settings, secrets);
		await repo.testConnection();
		const body = new TextEncoder().encode('hello').buffer;
		const key = `test/${Date.now()}.txt`;
		await repo.putObject(key, body, 'text/plain');
		const objects = await repo.listObjects();
		expect(objects.some((o) => o.key === key)).toBe(true);
		await repo.deleteObject(key);
	});
});
