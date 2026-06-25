import { describe, expect, it, vi } from 'vitest';
import { UploadService } from '../../src/service/upload-service';
import { LinkService } from '../../src/service/link-service';
import { ReferenceService } from '../../src/service/reference-service';
import { QuotaService } from '../../src/service/quota-service';
import { LogService } from '../../src/service/log-service';
import {
	FakeCloudStorageRepo,
	FakeLogRepo,
	FakeSecretRepo,
	FakeSettingsRepo,
	FakeVaultRepo,
	InMemoryUploadIndexRepo,
} from '../helpers/fake-repos';
import { DEFAULT_SETTINGS } from '../../src/settings';

vi.mock('obsidian', () => ({
	Notice: class {},
}));

describe('UploadService dedup', () => {
	it('skips upload when content hash exists', async () => {
		const index = new InMemoryUploadIndexRepo();
		const vault = new FakeVaultRepo();
		const cloud = new FakeCloudStorageRepo();
		const settings = new FakeSettingsRepo({
			...DEFAULT_SETTINGS,
			bucket: 'b',
			publicBaseUrl: 'https://cdn.example.com',
			cloudRenameEnabled: false,
			respectGitignore: false,
		});
		const secrets = new FakeSecretRepo();
		const logRepo = new FakeLogRepo();
		const log = new LogService(logRepo, () => settings.get());
		const quota = new QuotaService(index, settings, log);
		const links = new LinkService(vault, log);
		const reference = new ReferenceService(index, vault, settings, log);

		const data = new Uint8Array([1, 2, 3]).buffer;
		vault.files.set('attachments/a.png', data);
		vault.notes.set('note.md', '![[a.png]]');

		await index.saveUpload({
			cloudKey: 'existing.png',
			publicUrl: 'https://cdn.example.com/existing.png',
			contentHash: await import('../../src/utils/content-hash').then((m) =>
				m.sha256Hex(data),
			),
			size: 3,
			uploadedAt: new Date().toISOString(),
			localPath: 'attachments/old.png',
			refCount: 0,
			referencingNotes: [],
		});

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

		await upload.uploadFiles(['attachments/a.png']);
		expect(cloud.objects.size).toBe(0);
	});
});
