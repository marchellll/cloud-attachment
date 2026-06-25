import { describe, expect, it } from 'vitest';
import { ReferenceService } from '../../src/service/reference-service';
import { LogService } from '../../src/service/log-service';
import {
	FakeLogRepo,
	FakeSettingsRepo,
	FakeVaultRepo,
	InMemoryUploadIndexRepo,
} from '../helpers/fake-repos';
import { DEFAULT_SETTINGS } from '../../src/settings';

describe('ReferenceService', () => {
	it('syncs note refs when tracking enabled', async () => {
		const index = new InMemoryUploadIndexRepo();
		const vault = new FakeVaultRepo();
		const settings = new FakeSettingsRepo({
			...DEFAULT_SETTINGS,
			referenceTrackingEnabled: true,
			publicBaseUrl: 'https://cdn.example.com',
		});
		const log = new LogService(new FakeLogRepo(), () => settings.get());
		const ref = new ReferenceService(index, vault, settings, log);

		await index.saveUpload({
			cloudKey: 'k1',
			publicUrl: 'https://cdn.example.com/k1',
			contentHash: 'h1',
			size: 1,
			uploadedAt: new Date().toISOString(),
			refCount: 0,
			referencingNotes: [],
		});
		vault.notes.set('note.md', '![](https://cdn.example.com/k1)');

		await ref.syncNotesBulk(['note.md']);
		const rec = index.getUpload('k1');
		expect(rec?.refCount).toBe(1);
		expect(rec?.referencingNotes).toContain('note.md');
	});
});
